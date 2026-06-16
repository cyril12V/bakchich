/**
 * Seed de dev : crée un utilisateur de test + 2 campagnes actives,
 * pour tester l'extension en local sans OAuth ni Stripe.
 * Usage : npm run seed → token de test affiché en console.
 */
import crypto from "crypto";
import { db, now } from "./db.js";

const userId = crypto.randomUUID();
const token = "dev-token-" + crypto.randomBytes(8).toString("hex");

db.prepare(`INSERT INTO users (id,email,name,created_at) VALUES (?,?,?,?)`)
  .run(userId, `dev+${userId.slice(0, 6)}@bakchich.dev`, "Dev Test", now());
db.prepare(`INSERT INTO sessions (token,user_id,created_at) VALUES (?,?,?)`)
  .run(token, userId, now());

const campaigns = [
  { id: "demo0001", text: "Scaleway, le cloud européen dès 0 €/mois", url: "https://www.scaleway.com", bid: 1000, blocks: 10 },
  { id: "demo0002", text: "Ta startup ici, enchéris dès 1 € sur bakchich.dev", url: "https://bakchich.dev", bid: 500, blocks: 5 },
];
for (const c of campaigns) {
  db.prepare(
    `INSERT INTO campaigns (id,advertiser_email,text,url,bid_cents,blocks,status,created_at)
     VALUES (?,?,?,?,?,?, 'active', ?)`
  ).run(c.id, "seed@bakchich.dev", c.text, c.url, c.bid, c.blocks, now());
}

console.log("✅ Seed OK");
console.log("   Token de test :", token);
console.log("   → Dans VS Code : bakchich.apiUrl = http://localhost:3939");
console.log("   → Pour tester l'API : curl -H 'Authorization: Bearer " + token + "' http://localhost:3939/api/state");
