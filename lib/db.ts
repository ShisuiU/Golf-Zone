import "server-only";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

/**
 * Persistance des comptes.
 *
 * SQLite via le module `node:sqlite` intégré à Node : zéro dépendance, zéro
 * compilation native. Volontairement le seul fichier qui connaît le moteur de
 * stockage — le reste du code passe par les fonctions exportées ici, pour que
 * le passage à Postgres ne touche que ce module.
 *
 * Attention : un fichier SQLite local ne survit pas à un hébergement au
 * système de fichiers éphémère (Vercel & co). À remplacer par une base gérée
 * avant toute mise en ligne réelle.
 */

const DB_PATH = process.env.ZONE_GOLF_DB ?? ".data/zone-golf.db";

let database: DatabaseSync | undefined;

function connect(): DatabaseSync {
  mkdirSync(dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT NOT NULL UNIQUE,
      handle        TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS sessions_user_id ON sessions(user_id);
  `);
  return db;
}

function db(): DatabaseSync {
  // En développement, le rechargement à chaud réévalue ce module : on garde la
  // connexion sur globalThis pour ne pas rouvrir un handle à chaque édition.
  const store = globalThis as typeof globalThis & { __zoneGolfDb?: DatabaseSync };
  database ??= store.__zoneGolfDb ??= connect();
  return database;
}

export type User = {
  id: number;
  email: string;
  handle: string;
};

type UserRow = User & { password_hash: string };

/** L'e-mail sert d'identifiant de connexion : toujours comparé en minuscules. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function findUserByEmail(email: string): UserRow | undefined {
  return db()
    .prepare("SELECT id, email, handle, password_hash FROM users WHERE email = ?")
    .get(normalizeEmail(email)) as UserRow | undefined;
}

export function handleTaken(handle: string): boolean {
  const row = db()
    .prepare("SELECT 1 AS taken FROM users WHERE handle = ? COLLATE NOCASE")
    .get(handle);
  return row !== undefined;
}

export function emailTaken(email: string): boolean {
  return findUserByEmail(email) !== undefined;
}

export function createUser(input: {
  email: string;
  handle: string;
  passwordHash: string;
}): User {
  const email = normalizeEmail(input.email);
  const result = db()
    .prepare("INSERT INTO users (email, handle, password_hash) VALUES (?, ?, ?)")
    .run(email, input.handle, input.passwordHash);
  return { id: Number(result.lastInsertRowid), email, handle: input.handle };
}

export function insertSession(tokenHash: string, userId: number, expiresAt: Date): void {
  db()
    .prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
    .run(tokenHash, userId, expiresAt.toISOString());
}

/** Renvoie le membre d'une session encore valide, et purge celle qui a expiré. */
export function findUserBySessionToken(tokenHash: string): User | undefined {
  const row = db()
    .prepare(
      `SELECT u.id, u.email, u.handle, s.expires_at AS expiresAt
         FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ?`,
    )
    .get(tokenHash) as (User & { expiresAt: string }) | undefined;

  if (!row) return undefined;
  if (new Date(row.expiresAt).getTime() <= Date.now()) {
    deleteSessionByHash(tokenHash);
    return undefined;
  }
  return { id: row.id, email: row.email, handle: row.handle };
}

export function deleteSessionByHash(tokenHash: string): void {
  db().prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
}
