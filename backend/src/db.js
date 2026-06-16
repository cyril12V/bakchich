/**
 * Base SQLite — schéma complet de Bakchich.
 * Le ledger (table events) est immuable : le solde de chacun est
 * recalculable et auditable à tout moment.
 */
import Database from "better-sqlite3";

export const db = new Database(process.env.DB_PATH ?? "bakchich.db");
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id                 TEXT PRIMARY KEY,            -- uuid
  email              TEXT UNIQUE NOT NULL,
  name               TEXT,
  created_at         INTEGER NOT NULL,
  banned             INTEGER NOT NULL DEFAULT 0,  -- anti-fraude : compte gelé
  stripe_account_id  TEXT                          -- compte Stripe Connect Express (payouts)
);

CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER                      -- NULL = pas d'expiration (tokens de seed/dev)
);

-- Déduplication des webhooks Stripe (Stripe garantit « au moins une » livraison).
CREATE TABLE IF NOT EXISTS stripe_events (
  id           TEXT PRIMARY KEY,
  processed_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS campaigns (
  id                 TEXT PRIMARY KEY,
  advertiser_email   TEXT NOT NULL,
  text               TEXT NOT NULL,        -- la ligne du spinner (max 80 car.)
  url                TEXT NOT NULL,        -- destination du clic
  bid_cents          INTEGER NOT NULL,     -- prix d'1 bloc (1000 impressions)
  blocks             INTEGER NOT NULL,     -- blocs achetés
  impressions        INTEGER NOT NULL DEFAULT 0,
  clicks             INTEGER NOT NULL DEFAULT 0,
  status             TEXT NOT NULL DEFAULT 'pending',
                     -- pending_payment | pending (à modérer) | active | exhausted | rejected | paused
  brand_name         TEXT,                                       -- affiché sur le leaderboard (optionnel)
  brand_icon         TEXT,                                       -- data URL ≤ 64 Ko (optionnel)
  show_on_leaderboard INTEGER NOT NULL DEFAULT 0,
  created_at         INTEGER NOT NULL
);

-- LEDGER immuable. event_id fourni par le client = idempotence garantie.
CREATE TABLE IF NOT EXISTS events (
  event_id     TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id),
  campaign_id  TEXT NOT NULL REFERENCES campaigns(id),
  type         TEXT NOT NULL CHECK (type IN ('impression','click')),
  credit_cents REAL NOT NULL,              -- part du dev (50 %)
  created_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_user_time ON events(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_events_campaign  ON events(campaign_id);

CREATE TABLE IF NOT EXISTS payouts (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id),
  amount_cents INTEGER NOT NULL,
  stripe_ref   TEXT,
  status       TEXT NOT NULL DEFAULT 'pending_review',
               -- pending_review (review manuelle) | paid (viré) | rejected (annulé, libère la réserve)
  created_at   INTEGER NOT NULL
);

-- Config clé/valeur : kill-switch, etc.
CREATE TABLE IF NOT EXISTS config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT OR IGNORE INTO config (key, value) VALUES ('killswitch', '0');
`);

/**
 * Migrations idempotentes pour les bases déjà créées avant l'ajout d'une colonne.
 * SQLite ne sait pas faire « ADD COLUMN IF NOT EXISTS » → on inspecte le schéma.
 */
function ensureColumn(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}
ensureColumn("users", "stripe_account_id", "TEXT");
ensureColumn("sessions", "expires_at", "INTEGER");
ensureColumn("campaigns", "brand_name", "TEXT");
ensureColumn("campaigns", "brand_icon", "TEXT"); // data URL (≤ 64 Ko)
ensureColumn("campaigns", "show_on_leaderboard", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("campaigns", "advertiser_user_id", "TEXT"); // compte annonceur (si créée connecté) → liaison portail

export const now = () => Date.now();
