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

      -- Photo de profil : rangée dans la même table que les photos de
      -- publication, donc servie par /photos/[id] avec le même cache immuable.
      -- Elle n'appartient à aucune publication, d'où le dossier facultatif.
      ALTER TABLE photos ALTER COLUMN dossier_id DROP NOT NULL;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_photo_id INTEGER
        REFERENCES photos(id) ON DELETE SET NULL;

      -- Notifications. Tout est en cascade : effacer une publication ou un
      -- compte doit effacer ce qui y renvoyait, sinon la page en garderait la
      -- trace après coup.
      CREATE TABLE IF NOT EXISTS notifications (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        actor_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        kind       TEXT NOT NULL,
        dossier_id INTEGER NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        read_at    TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS notifications_inbox
        ON notifications (user_id, created_at DESC);
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

export type User = {
  id: number;
  email: string;
  handle: string;
  avatarPhotoId: number | null;
  /** Notifications non lues, ramenées avec la session (voir la requête). */
  unread: number;
};
type UserRow = User & { password_hash: string };

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function findUserByEmail(email: string): Promise<UserRow | undefined> {
  const rows = await query<UserRow>(
    `SELECT id, email, handle, password_hash, avatar_photo_id AS "avatarPhotoId", 0 AS unread
       FROM users WHERE email = $1`,
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
    `INSERT INTO users (email, handle, password_hash) VALUES ($1, $2, $3)
     RETURNING id, email, handle, avatar_photo_id AS "avatarPhotoId", 0 AS unread`,
    [normalizeEmail(input.email), input.handle, input.passwordHash],
  );
  return rows[0];
}

export async function findPasswordHash(userId: number): Promise<string | undefined> {
  const rows = await query<{ password_hash: string }>(
    "SELECT password_hash FROM users WHERE id = $1",
    [userId],
  );
  return rows[0]?.password_hash;
}

export async function updatePassword(userId: number, passwordHash: string): Promise<void> {
  await query("UPDATE users SET password_hash = $2 WHERE id = $1", [userId, passwordHash]);
}

/**
 * Suppression du compte. Tout part avec lui : publications, photos, likes,
 * commentaires, sessions — les clés étrangères sont en cascade. Un membre qui
 * s'en va ne doit pas laisser de trace qu'il ne peut plus effacer lui-même.
 */
export async function deleteUser(userId: number): Promise<void> {
  await query("DELETE FROM users WHERE id = $1", [userId]);
}

/* --------------------------------------------------------------- profils */

export type Profile = {
  id: number;
  handle: string;
  avatarPhotoId: number | null;
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
            u.avatar_photo_id AS "avatarPhotoId",
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

/**
 * Remplace la photo de profil. L'ancienne est supprimée : une seule est
 * affichée, la garder ne ferait que remplir la base. Le nouvel enregistrement
 * a un nouvel identifiant, donc une nouvelle URL — le cache immuable de
 * /photos/[id] reste correct.
 */
export async function setAvatar(
  userId: number,
  photo: { data: Buffer; mime: string },
): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const previous = await client.query<{ avatar_photo_id: number | null }>(
      "SELECT avatar_photo_id FROM users WHERE id = $1 FOR UPDATE",
      [userId],
    );
    const inserted = await client.query<{ id: number }>(
      "INSERT INTO photos (dossier_id, data, mime, byte_size) VALUES (NULL, $1, $2, $3) RETURNING id",
      [photo.data, photo.mime, photo.data.byteLength],
    );
    await client.query("UPDATE users SET avatar_photo_id = $2 WHERE id = $1", [
      userId,
      inserted.rows[0].id,
    ]);
    const old = previous.rows[0]?.avatar_photo_id;
    if (old) await client.query("DELETE FROM photos WHERE id = $1", [old]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export type MemberSummary = {
  id: number;
  handle: string;
  avatarPhotoId: number | null;
  car: string;
  city: string;
  postCount: number;
  likesReceived: number;
  createdAt: Date;
};

/** Annuaire des membres, les plus actifs d'abord. */
export async function listMembers(): Promise<MemberSummary[]> {
  return query<MemberSummary>(
    `SELECT u.id,
            u.handle,
            u.avatar_photo_id AS "avatarPhotoId",
            u.car,
            u.city,
            u.created_at AS "createdAt",
            (SELECT count(*)::int FROM dossiers d WHERE d.user_id = u.id) AS "postCount",
            (SELECT count(*)::int
               FROM likes l
               JOIN dossiers d ON d.id = l.dossier_id
              WHERE d.user_id = u.id) AS "likesReceived"
       FROM users u
      ORDER BY "postCount" DESC, u.created_at
      LIMIT 200`,
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
    // Le compteur de non-lues est ramené ici plutôt que par une requête à
    // part : l'en-tête l'affiche sur chaque page, et la base est à Francfort
    // quand le serveur est à Paris — un aller-retour de moins à chaque vue.
    `SELECT u.id, u.email, u.handle, u.avatar_photo_id AS "avatarPhotoId", s.expires_at,
            (SELECT count(*)::int FROM notifications n
              WHERE n.user_id = u.id AND n.read_at IS NULL) AS unread
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
  return {
    id: row.id,
    email: row.email,
    handle: row.handle,
    avatarPhotoId: row.avatarPhotoId,
    unread: row.unread,
  };
}

/** Après un changement de mot de passe : les autres appareils sont déconnectés. */
export async function deleteSessionsOfUser(userId: number): Promise<void> {
  await query("DELETE FROM sessions WHERE user_id = $1", [userId]);
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
  avatarPhotoId: number | null;
  body: string;
  createdAt: Date;
};

export type FeedEntry = {
  id: number;
  handle: string;
  avatarPhotoId: number | null;
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
/** Nombre de publications ramenées par page de fil. */
export const FEED_PAGE = 20;

async function listPosts(
  viewerId: number | null,
  where: string,
  params: unknown[],
  limit = 50,
) {
  return query<FeedEntry>(
    `SELECT d.id,
            u.handle,
            u.avatar_photo_id AS "avatarPhotoId",
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
                         cu.avatar_photo_id AS "avatarPhotoId",
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
      -- L'identifiant départage : la pagination avance dessus, l'ordre doit
      -- donc rester le même quand deux publications partagent la seconde.
      ORDER BY d.created_at DESC, d.id DESC
      LIMIT ${limit}`,
    // 0 ne correspond à aucun identifiant : un visiteur non connecté n'aime rien.
    [viewerId ?? 0, ...params],
  );
}

/** Une publication précise, avec ses commentaires. */
export async function findPost(postId: number, viewerId: number | null): Promise<FeedEntry | undefined> {
  const rows = await listPosts(viewerId, "WHERE d.id = $2", [postId]);
  return rows[0];
}

/**
 * Fil public, le plus récent d'abord. `before` est l'identifiant de la
 * dernière publication déjà vue : une pagination par curseur, et non par
 * décalage, car un décalage saute une publication dès qu'une nouvelle est
 * postée pendant la lecture.
 *
 * Une page de plus est demandée que nécessaire, juste pour savoir s'il faut
 * proposer la suite — sans quoi le lien mènerait parfois à une page vide.
 */
export async function listFeed(
  viewerId: number | null,
  before?: number,
): Promise<{ posts: FeedEntry[]; more: boolean }> {
  const rows = before
    ? await listPosts(viewerId, "WHERE d.id < $2", [before], FEED_PAGE + 1)
    : await listPosts(viewerId, "", [], FEED_PAGE + 1);
  return { posts: rows.slice(0, FEED_PAGE), more: rows.length > FEED_PAGE };
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
  if (removed.length > 0) {
    // Retirer son like retire la notification : sinon, aimer puis se raviser
    // en boucle remplirait la boîte de l'auteur.
    await query(
      "DELETE FROM notifications WHERE kind = 'like' AND dossier_id = $1 AND actor_id = $2",
      [postId, userId],
    );
    return false;
  }

  // ON CONFLICT : deux clics simultanés ne doivent pas lever d'erreur.
  await query(
    "INSERT INTO likes (dossier_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
    [postId, userId],
  );
  await notify("like", postId, userId);
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
  await notify("comment", postId, userId);
}

/* -------------------------------------------------------- notifications */

/**
 * Prévient l'auteur d'une publication. Le destinataire est déduit en base :
 * l'appelant n'a pas à le connaître, et la clause `<> $3` écarte le cas où
 * l'on agit sur sa propre publication — personne n'a besoin d'être averti de
 * ce qu'il vient de faire.
 */
async function notify(kind: "like" | "comment", postId: number, actorId: number): Promise<void> {
  await query(
    `INSERT INTO notifications (user_id, actor_id, kind, dossier_id)
     SELECT d.user_id, $2, $1, d.id FROM dossiers d WHERE d.id = $3 AND d.user_id <> $2`,
    [kind, actorId, postId],
  );
}

export type Notification = {
  id: number;
  kind: "like" | "comment";
  postId: number;
  handle: string;
  avatarPhotoId: number | null;
  caption: string;
  photoId: number | null;
  createdAt: Date;
  isNew: boolean;
};

export async function listNotifications(userId: number): Promise<Notification[]> {
  return query<Notification>(
    `SELECT n.id,
            n.kind,
            n.dossier_id AS "postId",
            a.handle,
            a.avatar_photo_id AS "avatarPhotoId",
            d.caption,
            (SELECT p.id FROM photos p
              WHERE p.dossier_id = d.id
              ORDER BY p.created_at DESC LIMIT 1) AS "photoId",
            n.created_at AS "createdAt",
            n.read_at IS NULL AS "isNew"
       FROM notifications n
       JOIN users a ON a.id = n.actor_id
       JOIN dossiers d ON d.id = n.dossier_id
      WHERE n.user_id = $1
      ORDER BY n.created_at DESC
      LIMIT 50`,
    [userId],
  );
}

export async function markNotificationsRead(userId: number): Promise<void> {
  await query("UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL", [
    userId,
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
