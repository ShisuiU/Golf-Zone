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

      -- Une question n'a ni photo ni génération : les deux deviennent optionnels.
      ALTER TABLE dossiers ALTER COLUMN model DROP NOT NULL;

      -- Un membre ne peut aimer qu'une fois : la clé primaire s'en charge.
      CREATE TABLE IF NOT EXISTS likes (
        dossier_id INTEGER NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (dossier_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS comments (
        id         SERIAL PRIMARY KEY,
        dossier_id INTEGER NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        body       TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS comments_dossier ON comments (dossier_id, created_at);

      -- Fiche de profil. On garde l'année de naissance et non l'âge : un âge
      -- stocké devient faux au premier anniversaire venu.
      ALTER TABLE users ADD COLUMN IF NOT EXISTS bio        TEXT NOT NULL DEFAULT '';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS car        TEXT NOT NULL DEFAULT '';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS city       TEXT NOT NULL DEFAULT '';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_year INTEGER;
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

/* --------------------------------------------------------------- profils */

export type Profile = {
  id: number;
  handle: string;
  bio: string;
  car: string;
  city: string;
  birthYear: number | null;
  createdAt: Date;
  postCount: number;
  likesReceived: number;
};

/**
 * Fiche complète d'un membre, compteurs inclus : une seule requête, comme
 * pour le fil. Les likes reçus se comptent sur toutes ses publications.
 */
export async function findProfile(handle: string): Promise<Profile | undefined> {
  const rows = await query<Profile>(
    `SELECT u.id,
            u.handle,
            u.bio,
            u.car,
            u.city,
            u.birth_year AS "birthYear",
            u.created_at AS "createdAt",
            (SELECT count(*)::int FROM dossiers d WHERE d.user_id = u.id) AS "postCount",
            (SELECT count(*)::int
               FROM likes l
               JOIN dossiers d ON d.id = l.dossier_id
              WHERE d.user_id = u.id) AS "likesReceived"
       FROM users u
      WHERE lower(u.handle) = lower($1)`,
    [handle],
  );
  return rows[0];
}

export async function updateProfile(
  userId: number,
  fields: { bio: string; car: string; city: string; birthYear: number | null },
): Promise<void> {
  await query(
    "UPDATE users SET bio = $2, car = $3, city = $4, birth_year = $5 WHERE id = $1",
    [userId, fields.bio, fields.car, fields.city, fields.birthYear],
  );
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

/* ------------------------------------------------------- publications/photos */

/*
 * Note : les tables s'appellent encore `dossiers` et `photos`. Le vocabulaire
 * visible est passé à « publication », mais renommer une table qui contient
 * déjà des données de production n'apporterait rien à l'utilisateur — seul le
 * code parle SQL ici.
 */

export type Comment = {
  id: number;
  handle: string;
  body: string;
  createdAt: Date;
};

export type FeedEntry = {
  id: number;
  handle: string;
  model: string | null;
  caption: string;
  photoId: number | null;
  createdAt: Date;
  likeCount: number;
  likedByMe: boolean;
  comments: Comment[];
};

/**
 * Crée une publication. La photo est facultative : une question se poste sans
 * image. Quand il y en a une, les deux écritures tiennent dans une
 * transaction pour éviter une publication à l'image manquante.
 */
export async function createPost(input: {
  userId: number;
  model: string | null;
  caption: string;
  photo?: { data: Buffer; mime: string };
}): Promise<number> {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const post = await client.query(
      "INSERT INTO dossiers (user_id, model, caption) VALUES ($1, $2, $3) RETURNING id",
      [input.userId, input.model, input.caption],
    );
    const postId = post.rows[0].id as number;
    if (input.photo) {
      await client.query(
        "INSERT INTO photos (dossier_id, data, mime, byte_size) VALUES ($1, $2, $3, $4)",
        [postId, input.photo.data, input.photo.mime, input.photo.data.byteLength],
      );
    }
    await client.query("COMMIT");
    return postId;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Le fil, en une seule requête.
 *
 * Compteurs de likes et commentaires sont agrégés côté base : la base est à
 * Francfort et le serveur à Paris, donc chaque aller-retour supplémentaire se
 * paierait sur chaque affichage du fil.
 */
async function listPosts(viewerId: number | null, where: string, params: unknown[]) {
  return query<FeedEntry>(
    `SELECT d.id,
            u.handle,
            d.model,
            d.caption,
            d.created_at AS "createdAt",
            (SELECT p.id FROM photos p
              WHERE p.dossier_id = d.id
              ORDER BY p.created_at DESC LIMIT 1) AS "photoId",
            (SELECT count(*)::int FROM likes l WHERE l.dossier_id = d.id) AS "likeCount",
            EXISTS (
              SELECT 1 FROM likes l
               WHERE l.dossier_id = d.id AND l.user_id = $1
            ) AS "likedByMe",
            COALESCE((
              SELECT json_agg(c ORDER BY c."createdAt")
                FROM (
                  SELECT cm.id,
                         cu.handle,
                         cm.body,
                         cm.created_at AS "createdAt"
                    FROM comments cm
                    JOIN users cu ON cu.id = cm.user_id
                   WHERE cm.dossier_id = d.id
                   ORDER BY cm.created_at
                ) c
            ), '[]'::json) AS comments
       FROM dossiers d
       JOIN users u ON u.id = d.user_id
      ${where}
      ORDER BY d.created_at DESC
      LIMIT 50`,
    // 0 ne correspond à aucun identifiant : un visiteur non connecté n'aime rien.
    [viewerId ?? 0, ...params],
  );
}

/** Fil public, le plus récent d'abord. */
export async function listFeed(viewerId: number | null): Promise<FeedEntry[]> {
  return listPosts(viewerId, "", []);
}

/**
 * Publications d'un membre. `viewerId` reste distinct de `userId` : sur le
 * profil d'un autre membre, ce sont bien les likes du visiteur qu'il faut
 * refléter, pas ceux de l'auteur.
 */
export async function listPostsOfUser(
  userId: number,
  viewerId: number | null,
): Promise<FeedEntry[]> {
  return listPosts(viewerId, "WHERE d.user_id = $2", [userId]);
}

export type StoredPhoto = { data: Buffer; mime: string };

export async function findPhoto(id: number): Promise<StoredPhoto | undefined> {
  const rows = await query<StoredPhoto>("SELECT data, mime FROM photos WHERE id = $1", [id]);
  return rows[0];
}

/** Aime ou retire son like. Renvoie l'état après coup. */
export async function toggleLike(postId: number, userId: number): Promise<boolean> {
  const removed = await query(
    "DELETE FROM likes WHERE dossier_id = $1 AND user_id = $2 RETURNING dossier_id",
    [postId, userId],
  );
  if (removed.length > 0) return false;

  // ON CONFLICT : deux clics simultanés ne doivent pas lever d'erreur.
  await query(
    "INSERT INTO likes (dossier_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
    [postId, userId],
  );
  return true;
}

export async function addComment(
  postId: number,
  userId: number,
  body: string,
): Promise<void> {
  await query("INSERT INTO comments (dossier_id, user_id, body) VALUES ($1, $2, $3)", [
    postId,
    userId,
    body,
  ]);
}

/** Un membre ne peut supprimer que son propre commentaire. */
export async function deleteCommentOwnedBy(
  commentId: number,
  userId: number,
): Promise<boolean> {
  const rows = await query(
    "DELETE FROM comments WHERE id = $1 AND user_id = $2 RETURNING id",
    [commentId, userId],
  );
  return rows.length > 0;
}

export async function deletePostOwnedBy(postId: number, userId: number): Promise<boolean> {
  const rows = await query("DELETE FROM dossiers WHERE id = $1 AND user_id = $2 RETURNING id", [
    postId,
    userId,
  ]);
  return rows.length > 0;
}
