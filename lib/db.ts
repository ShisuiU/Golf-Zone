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

/**
 * Crée le schéma au premier accès. Idempotent.
 *
 * En cas d'échec, la promesse mémorisée est effacée pour que la requête
 * suivante réessaie : une base momentanément injoignable — Neon qui se
 * réveille trop lentement, par exemple — casserait sinon l'instance
 * définitivement, alors que le problème a duré une seconde.
 */
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

      -- Jetons à usage unique : réinitialisation de mot de passe et
      -- confirmation d'e-mail. Même principe que les sessions — seule
      -- l'empreinte est en base, le jeton en clair ne vit que dans le lien
      -- envoyé par courrier.
      CREATE TABLE IF NOT EXISTS tokens (
        token_hash TEXT PRIMARY KEY,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        purpose    TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at    TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS tokens_user ON tokens (user_id, purpose);

      ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

      -- Tentatives de connexion ratées, comptées par e-mail et par adresse IP.
      CREATE TABLE IF NOT EXISTS login_attempts (
        key          TEXT PRIMARY KEY,
        failures     INTEGER NOT NULL DEFAULT 0,
        locked_until TIMESTAMPTZ,
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      -- Signalements. Le rapporteur peut disparaître sans emporter le
      -- signalement (SET NULL), mais un contenu supprimé emporte le sien :
      -- il n'y a plus rien à modérer.
      CREATE TABLE IF NOT EXISTS reports (
        id          SERIAL PRIMARY KEY,
        reporter_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        dossier_id  INTEGER REFERENCES dossiers(id) ON DELETE CASCADE,
        comment_id  INTEGER REFERENCES comments(id) ON DELETE CASCADE,
        reason      TEXT NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        handled_at  TIMESTAMPTZ,
        CHECK ((dossier_id IS NULL) <> (comment_id IS NULL))
      );
      CREATE INDEX IF NOT EXISTS reports_open ON reports (handled_at, created_at DESC);
    `);
  })().catch((error) => {
    schemaReady = undefined;
    throw error;
  });
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

/* ----------------------------------------------------------------- jetons */

export type TokenPurpose = "reset" | "verify";

export async function insertToken(
  tokenHash: string,
  userId: number,
  purpose: TokenPurpose,
  expiresAt: Date,
): Promise<void> {
  await query(
    "INSERT INTO tokens (token_hash, user_id, purpose, expires_at) VALUES ($1, $2, $3, $4)",
    [tokenHash, userId, purpose, expiresAt],
  );
}

/**
 * Consomme un jeton : il est marqué utilisé dans la même requête que sa
 * lecture, donc deux clics simultanés sur le même lien ne peuvent pas le
 * valider deux fois.
 */
export async function spendToken(
  tokenHash: string,
  purpose: TokenPurpose,
): Promise<number | undefined> {
  const rows = await query<{ user_id: number }>(
    `UPDATE tokens SET used_at = now()
      WHERE token_hash = $1 AND purpose = $2 AND used_at IS NULL AND expires_at > now()
      RETURNING user_id`,
    [tokenHash, purpose],
  );
  return rows[0]?.user_id;
}

/** Un nouveau lien invalide les précédents du même usage. */
export async function dropTokens(userId: number, purpose: TokenPurpose): Promise<void> {
  await query("DELETE FROM tokens WHERE user_id = $1 AND purpose = $2", [userId, purpose]);
}

export async function markEmailVerified(userId: number): Promise<void> {
  await query("UPDATE users SET email_verified_at = now() WHERE id = $1", [userId]);
}

export async function isEmailVerified(userId: number): Promise<boolean> {
  const rows = await query<{ verified: boolean }>(
    "SELECT email_verified_at IS NOT NULL AS verified FROM users WHERE id = $1",
    [userId],
  );
  return rows[0]?.verified ?? false;
}

/* ------------------------------------------------- tentatives de connexion */

/**
 * Compte les échecs et verrouille temporairement. Une seule requête fait tout :
 * incrémente, et pose la date de déblocage au passage du seuil. Le verrou est
 * en base parce que chaque instance serverless a sa propre mémoire — un
 * compteur en RAM ne protégerait rien.
 */
export async function recordLoginFailure(
  key: string,
  threshold: number,
  lockMinutes: number,
): Promise<void> {
  await query(
    `INSERT INTO login_attempts (key, failures, updated_at)
     VALUES ($1, 1, now())
     ON CONFLICT (key) DO UPDATE
        SET failures = login_attempts.failures + 1,
            updated_at = now(),
            locked_until = CASE
              WHEN login_attempts.failures + 1 >= $2 THEN now() + ($3 || ' minutes')::interval
              ELSE login_attempts.locked_until
            END`,
    [key, threshold, String(lockMinutes)],
  );
}

/** Secondes restantes avant de pouvoir réessayer, 0 si la voie est libre. */
export async function lockedFor(keys: string[]): Promise<number> {
  const rows = await query<{ seconds: number }>(
    `SELECT ceil(extract(epoch FROM max(locked_until) - now()))::int AS seconds
       FROM login_attempts
      WHERE key = ANY($1) AND locked_until > now()`,
    [keys],
  );
  return rows[0]?.seconds ?? 0;
}

/** Une connexion réussie remet les compteurs à zéro. */
export async function clearLoginFailures(keys: string[]): Promise<void> {
  await query("DELETE FROM login_attempts WHERE key = ANY($1)", [keys]);
}

/* ---------------------------------------------------------- signalements */

export async function addReport(input: {
  reporterId: number;
  postId?: number;
  commentId?: number;
  reason: string;
}): Promise<void> {
  await query(
    "INSERT INTO reports (reporter_id, dossier_id, comment_id, reason) VALUES ($1, $2, $3, $4)",
    [input.reporterId, input.postId ?? null, input.commentId ?? null, input.reason],
  );
}

export type Report = {
  id: number;
  reason: string;
  createdAt: Date;
  reporter: string | null;
  postId: number | null;
  commentId: number | null;
  /** Publication à ouvrir pour voir le contenu en contexte, commentaire compris. */
  contextPostId: number;
  author: string;
  content: string;
  photoId: number | null;
};

/** Signalements en attente, le plus ancien d'abord : on traite dans l'ordre. */
export async function listOpenReports(): Promise<Report[]> {
  return query<Report>(
    `SELECT r.id,
            r.reason,
            r.created_at AS "createdAt",
            rep.handle AS reporter,
            r.dossier_id AS "postId",
            r.comment_id AS "commentId",
            COALESCE(r.dossier_id, c.dossier_id) AS "contextPostId",
            COALESCE(du.handle, cu.handle) AS author,
            COALESCE(d.caption, c.body) AS content,
            (SELECT p.id FROM photos p
              WHERE p.dossier_id = COALESCE(r.dossier_id, c.dossier_id)
              ORDER BY p.created_at DESC LIMIT 1) AS "photoId"
       FROM reports r
       LEFT JOIN users rep ON rep.id = r.reporter_id
       LEFT JOIN dossiers d ON d.id = r.dossier_id
       LEFT JOIN users du ON du.id = d.user_id
       LEFT JOIN comments c ON c.id = r.comment_id
       LEFT JOIN users cu ON cu.id = c.user_id
      WHERE r.handled_at IS NULL
      ORDER BY r.created_at
      LIMIT 100`,
  );
}

export async function countOpenReports(): Promise<number> {
  const rows = await query<{ count: number }>(
    "SELECT count(*)::int AS count FROM reports WHERE handled_at IS NULL",
  );
  return rows[0]?.count ?? 0;
}

export async function closeReport(reportId: number): Promise<void> {
  await query("UPDATE reports SET handled_at = now() WHERE id = $1", [reportId]);
}

/** Suppression par la modération : le signalement se ferme avec le contenu. */
export async function deletePostAsModerator(postId: number): Promise<void> {
  await query("DELETE FROM dossiers WHERE id = $1", [postId]);
}

export async function deleteCommentAsModerator(commentId: number): Promise<void> {
  await query("DELETE FROM comments WHERE id = $1", [commentId]);
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
export async function listMembers(limit = 200): Promise<MemberSummary[]> {
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
      LIMIT $1`,
    [limit],
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
