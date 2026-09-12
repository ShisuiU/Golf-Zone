import "server-only";
import { Pool } from "pg";

/**
 * Persistance : PostgreSQL.
 *
 * Même moteur en développement et en production — un fichier SQLite local ne
 * survivait pas à un hébergement au système de fichiers éphémère, et faire
 * tourner deux moteurs différents revient à ne tester qu'à moitié.
 *
 * Seul module qui connaît le SQL : le reste du code passe par les fonctions
 * exportées ici.
 */

export const DATABASE_URL = process.env.DATABASE_URL?.trim();

/** Sans base configurée, le site fonctionne en vitrine (voir lib/flags.ts). */
export const HAS_DATABASE = Boolean(DATABASE_URL);

let pool: Pool | undefined;
let schemaReady: Promise<void> | undefined;

function getPool(): Pool {
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL absent : aucune base configurée.");
  }
  // Le rechargement à chaud réévalue ce module : garder le pool sur globalThis
  // évite d'ouvrir une nouvelle grappe de connexions à chaque édition.
  const store = globalThis as typeof globalThis & { __zoneGolfPool?: Pool };
  const isLocal = /localhost|127\.0\.0\.1/.test(DATABASE_URL);
  pool ??= store.__zoneGolfPool ??= new Pool({
    connectionString: DATABASE_URL,
    // Les bases gérées imposent TLS ; en local, non.
    ssl: isLocal ? undefined : { rejectUnauthorized: true },
    // Neon réclame `channel_binding=require` dans son URL, mais pg n'utilise
    // SCRAM-SHA-256-PLUS que sur demande explicite : sans cette option, le
    // paramètre serait ignoré et l'authentification perdrait sa protection
    // contre l'interception.
    enableChannelBinding: !isLocal,
    // Chaque instance serverless ouvre son propre pool : on reste modeste, et
    // c'est le pooler de Neon qui absorbe la concurrence.
    max: 5,
    // Neon endort son calcul après quelques minutes ; le réveil peut prendre
    // plusieurs secondes. Sans plafond, une page resterait bloquée à attendre
    // (mesuré : plus de 30 s sur une base endormie). Ces limites laissent le
    // temps d'un réveil normal, mais bornent le pire cas.
    connectionTimeoutMillis: 10_000,
    query_timeout: 10_000,
  });
  return pool;
}

/** Crée le schéma au premier accès. Idempotent. */
function ensureSchema(): Promise<void> {
  schemaReady ??= (async () => {
    await getPool().query(`
      CREATE TABLE IF NOT EXISTS users (
        id            SERIAL PRIMARY KEY,
        email         TEXT NOT NULL UNIQUE,
        handle        TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS users_handle_lower ON users (lower(handle));

      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS sessions_user_id ON sessions (user_id);

      CREATE TABLE IF NOT EXISTS dossiers (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        model      TEXT NOT NULL,
        caption    TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS dossiers_recent ON dossiers (created_at DESC);

      CREATE TABLE IF NOT EXISTS photos (
        id         SERIAL PRIMARY KEY,
        dossier_id INTEGER NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
        data       BYTEA NOT NULL,
        mime       TEXT NOT NULL,
        byte_size  INTEGER NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS photos_dossier ON photos (dossier_id, created_at DESC);
    `);
  })();
  return schemaReady;
}

async function query<T extends Record<string, unknown>>(
  text: string,
  values: unknown[] = [],
): Promise<T[]> {
  await ensureSchema();
  const result = await getPool().query(text, values);
  return result.rows as T[];
}

/* ------------------------------------------------------------------ users */

export type User = { id: number; email: string; handle: string };
type UserRow = User & { password_hash: string };

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function findUserByEmail(email: string): Promise<UserRow | undefined> {
  const rows = await query<UserRow>(
    "SELECT id, email, handle, password_hash FROM users WHERE email = $1",
    [normalizeEmail(email)],
  );
  return rows[0];
}

export async function emailTaken(email: string): Promise<boolean> {
  return (await findUserByEmail(email)) !== undefined;
}

export async function handleTaken(handle: string): Promise<boolean> {
  const rows = await query("SELECT 1 FROM users WHERE lower(handle) = lower($1)", [handle]);
  return rows.length > 0;
}

export async function createUser(input: {
  email: string;
  handle: string;
  passwordHash: string;
}): Promise<User> {
  const rows = await query<User>(
    "INSERT INTO users (email, handle, password_hash) VALUES ($1, $2, $3) RETURNING id, email, handle",
    [normalizeEmail(input.email), input.handle, input.passwordHash],
  );
  return rows[0];
}

/* --------------------------------------------------------------- sessions */

export async function insertSession(
  tokenHash: string,
  userId: number,
  expiresAt: Date,
): Promise<void> {
  await query("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)", [
    tokenHash,
    userId,
    expiresAt,
  ]);
}

/** Renvoie le membre d'une session valide, et purge celle qui a expiré. */
export async function findUserBySessionToken(tokenHash: string): Promise<User | undefined> {
  const rows = await query<User & { expires_at: Date }>(
    `SELECT u.id, u.email, u.handle, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1`,
    [tokenHash],
  );
  const row = rows[0];
  if (!row) return undefined;
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await deleteSessionByHash(tokenHash);
    return undefined;
  }
  return { id: row.id, email: row.email, handle: row.handle };
}

export async function deleteSessionByHash(tokenHash: string): Promise<void> {
  await query("DELETE FROM sessions WHERE token_hash = $1", [tokenHash]);
}

/* --------------------------------------------------------- dossiers/photos */

export type FeedEntry = {
  id: number;
  handle: string;
  model: string;
  caption: string;
  photoId: number | null;
  createdAt: Date;
};

/**
 * Crée un dossier et sa photo dans une transaction : un dossier sans image
 * n'aurait rien à montrer dans le feed.
 */
export async function createDossier(input: {
  userId: number;
  model: string;
  caption: string;
  photo: { data: Buffer; mime: string };
}): Promise<number> {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const dossier = await client.query(
      "INSERT INTO dossiers (user_id, model, caption) VALUES ($1, $2, $3) RETURNING id",
      [input.userId, input.model, input.caption],
    );
    const dossierId = dossier.rows[0].id as number;
    await client.query(
      "INSERT INTO photos (dossier_id, data, mime, byte_size) VALUES ($1, $2, $3, $4)",
      [dossierId, input.photo.data, input.photo.mime, input.photo.data.byteLength],
    );
    await client.query("COMMIT");
    return dossierId;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/** Derniers dossiers déposés, avec leur photo la plus récente. */
export async function listRecentDossiers(limit = 4): Promise<FeedEntry[]> {
  return query<FeedEntry>(
    `SELECT d.id,
            u.handle,
            d.model,
            d.caption,
            d.created_at AS "createdAt",
            (SELECT p.id FROM photos p
              WHERE p.dossier_id = d.id
              ORDER BY p.created_at DESC LIMIT 1) AS "photoId"
       FROM dossiers d
       JOIN users u ON u.id = d.user_id
      ORDER BY d.created_at DESC
      LIMIT $1`,
    [limit],
  );
}

export async function listDossiersOfUser(userId: number): Promise<FeedEntry[]> {
  return query<FeedEntry>(
    `SELECT d.id, u.handle, d.model, d.caption, d.created_at AS "createdAt",
            (SELECT p.id FROM photos p
              WHERE p.dossier_id = d.id
              ORDER BY p.created_at DESC LIMIT 1) AS "photoId"
       FROM dossiers d
       JOIN users u ON u.id = d.user_id
      WHERE d.user_id = $1
      ORDER BY d.created_at DESC`,
    [userId],
  );
}

export async function countDossiers(): Promise<number> {
  const rows = await query<{ count: string }>("SELECT count(*)::text AS count FROM dossiers");
  return Number(rows[0]?.count ?? 0);
}

export type StoredPhoto = { data: Buffer; mime: string };

export async function findPhoto(id: number): Promise<StoredPhoto | undefined> {
  const rows = await query<StoredPhoto>("SELECT data, mime FROM photos WHERE id = $1", [id]);
  return rows[0];
}

/** Un membre ne peut supprimer que ses propres dossiers. */
export async function deleteDossierOwnedBy(dossierId: number, userId: number): Promise<boolean> {
  const rows = await query("DELETE FROM dossiers WHERE id = $1 AND user_id = $2 RETURNING id", [
    dossierId,
    userId,
  ]);
  return rows.length > 0;
}
