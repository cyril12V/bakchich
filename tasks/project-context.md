# Contexte projet — Bakchich

> Établi à partir du cahier des charges (1re session, 2026-06-15).

## Identité
- **Nom** : Bakchich
- **Pitch** : le spinner de Claude Code devient un espace publicitaire aux enchères. Le dev touche **50 %** des revenus, en €, dès le jour 1. Opt-in, transparent, code public.
- **Type** : régie publicitaire / marketplace (extension dev + backend + Stripe).
- **Cible** : devs FR utilisant Claude Code (B2C côté dev) + annonceurs SaaS/hébergeurs/formations (B2B).
- **Déploiement** : VPS Ubuntu/Debian, domaine `bakchich.dev` (`.dev` ⇒ HTTPS obligatoire), nginx + certbot + systemd.
- **Priorités** : transparence/confiance, sécurité (ne JAMAIS lire code/prompts), simplicité (code public lisible en 5 min), time-to-launch.

## Stack (imposée — ne pas réinventer)
- **Extension** : TypeScript, bundle esbuild, tests vitest.
- **Backend** : Node 20+, Express, better-sqlite3 (SQLite au lancement ; Postgres plus tard si volume).
- **Paiement** : Stripe Checkout (annonceurs) + Stripe Connect Express (payouts devs).
- **Front** : HTML léger + fetch (pas de SPA lourde).

## Règles économiques (NON négociables — déjà codées dans auction.js)
- 1 bloc = **1 000 impressions** de 5 s
- 1 clic facturé **50×** une impression (CLICK_MULTIPLIER=50)
- part du dev = **50 %** (DEV_SHARE=0.5)
- enchère **ascendante** : bid le plus haut diffuse en premier, les autres en file
- bid minimum = **1 €** le bloc (MIN_BID_CENTS=100)

## État au démarrage de session
| Brique | État |
|---|---|
| Extension (injection spinner, tracking, kill-switch) | ✅ codée + tests vitest |
| Backend API (enchères, ledger, anti-fraude, OAuth, admin) | ✅ codé |
| Google OAuth | 🟡 flow serveur codé, credentials Google à créer + tester e2e |
| Stripe encaissement annonceurs | 🔴 TODO server.js:207 |
| Stripe payouts Connect | 🔴 à faire |
| Dashboard dev (solde, retrait) | 🔴 à faire |
| Portail annonceurs (créer campagne) | 🟡 endpoint OK, UI à faire |
| Landing page | ✅ existe (FR), à adapter charte noir/blanc + vert accent |
| Déploiement VPS (nginx/SSL/systemd) | 🔴 à faire |

## Garde-fous (rappel permanent)
- L'extension ne touche QUE `spinnerVerbs` de `~/.claude/settings.json` — jamais code/prompts/fichiers.
- Écriture atomique + backup + restore exact. Les 6 tests de `claudeCli.test.ts` doivent rester verts.
- Données envoyées par l'extension : `eventId, type, campaignId, timestamp, token` — rien d'autre.
- Kill-switch testé AVANT lancement (couper tout < 60 s, restaurer partout).
- Disclaimer partout : « Projet indépendant, non affilié à Anthropic. »
- Modération manuelle de chaque créa avant diffusion.
