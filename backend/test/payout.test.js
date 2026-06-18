/**
 * Tests de la logique d'argent critique (sans Stripe) :
 *   · solde retirable = gains − réserves
 *   · réservation atomique (pas de double-retrait)
 *   · 1er retrait → review manuelle ; gros montant → review manuelle
 *   · refus → libère la réserve
 *
 * On utilise une base SQLite temporaire isolée (DB_PATH) avant d'importer les modules.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

const tmpDb = path.join(os.tmpdir(), `bakchich-test-${crypto.randomUUID()}.db`);
process.env.DB_PATH = tmpDb;

const { db, now } = await import("../src/db.js");
const { recordImpression, recordClick, currentWinner, balanceOf, reservePayout, markPayoutPaid, markPayoutRejected } =
  await import("../src/auction.js");

const RULES = { minPayoutCents: 1000, reviewThresholdCents: 10000 };

function makeUser() {
  const id = crypto.randomUUID();
  db.prepare(`INSERT INTO users (id,email,name,created_at) VALUES (?,?,?,?)`)
    .run(id, `${id}@t.dev`, "T", now());
  return id;
}
function makeCampaign(bidCents = 1000, blocks = 100) {
  const id = crypto.randomUUID().slice(0, 8);
  db.prepare(
    `INSERT INTO campaigns (id,advertiser_email,text,url,bid_cents,blocks,status,created_at)
     VALUES (?,?,?,?,?,?, 'active', ?)`
  ).run(id, "a@t.dev", "pub", "https://x.dev", bidCents, blocks, now());
  return db.prepare(`SELECT * FROM campaigns WHERE id=?`).get(id);
}
/** Crédite `cents` centimes à un user via N impressions (0.5¢ chacune à bid 1000). */
function credit(userId, campaign, cents) {
  const per = (campaign.bid_cents / 1000) * 0.5; // = 0.5¢ à bid 1000
  const ticks = Math.round(cents / per);
  for (let i = 0; i < ticks; i++) recordImpression(crypto.randomUUID(), userId, campaign);
}

after(() => {
  try { db.close(); fs.rmSync(tmpDb, { force: true }); fs.rmSync(tmpDb + "-wal", { force: true }); fs.rmSync(tmpDb + "-shm", { force: true }); } catch {}
});

test("solde retirable reflète les gains cumulés", () => {
  const u = makeUser();
  const c = makeCampaign(1000);
  credit(u, c, 1500); // 15 €
  const b = balanceOf(u);
  assert.equal(b.availableCents, 1500);
  assert.equal(b.lifetimeCents, 1500);
});

test("retrait sous le minimum (10 €) est refusé", () => {
  const u = makeUser();
  const c = makeCampaign(1000);
  credit(u, c, 500); // 5 €
  const r = reservePayout(u, RULES);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "below_min");
});

test("1er retrait valide part en review manuelle et réserve le solde", () => {
  const u = makeUser();
  const c = makeCampaign(1000);
  credit(u, c, 1500); // 15 €
  const r = reservePayout(u, RULES);
  assert.equal(r.ok, true);
  assert.equal(r.needsReview, true); // 1er retrait
  assert.equal(r.status, "pending_review");
  assert.equal(r.amountCents, 1500);
  // Réserve prise → plus rien de retirable.
  assert.equal(balanceOf(u).availableCents, 0);
});

test("pas de double-retrait : seconde demande refusée tant que la 1re tient la réserve", () => {
  const u = makeUser();
  const c = makeCampaign(1000);
  credit(u, c, 2000); // 20 €
  const r1 = reservePayout(u, RULES);
  assert.equal(r1.ok, true);
  const r2 = reservePayout(u, RULES);
  assert.equal(r2.ok, false);
  assert.equal(r2.reason, "below_min");
});

test("refus d'un retrait libère la réserve", () => {
  const u = makeUser();
  const c = makeCampaign(1000);
  credit(u, c, 1500);
  const r = reservePayout(u, RULES);
  markPayoutRejected(r.payoutId);
  assert.equal(balanceOf(u).availableCents, 1500); // récupéré
});

test("retrait > 100 € part en review même après un 1er retrait déjà payé", () => {
  const u = makeUser();
  const c = makeCampaign(1000);
  // 1er retrait payé pour ne plus être "premier".
  credit(u, c, 1500);
  const first = reservePayout(u, RULES);
  markPayoutPaid(first.payoutId, "tr_test");
  // Gros solde additionnel.
  credit(u, c, 15000); // +150 €
  const big = reservePayout(u, RULES);
  assert.equal(big.ok, true);
  assert.equal(big.needsReview, true); // > 100 €
});

test("petit retrait après un 1er payé passe en auto (processing)", () => {
  const u = makeUser();
  const c = makeCampaign(1000);
  credit(u, c, 1500);
  const first = reservePayout(u, RULES);
  markPayoutPaid(first.payoutId, "tr_test");
  credit(u, c, 2000); // +20 € (< 100 €)
  const r = reservePayout(u, RULES);
  assert.equal(r.ok, true);
  assert.equal(r.needsReview, false);
  assert.equal(r.status, "processing");
});

test("les clics consomment le budget équivalent à 50 impressions", () => {
  const u = makeUser();
  const c = makeCampaign(1000, 1);
  for (let i = 0; i < 20; i++) recordClick(crypto.randomUUID(), u, c);
  const after = db.prepare(`SELECT clicks, status FROM campaigns WHERE id=?`).get(c.id);
  assert.equal(after.clicks, 20);
  assert.equal(after.status, "exhausted");
  assert.equal(currentWinner()?.id === c.id, false);
});
