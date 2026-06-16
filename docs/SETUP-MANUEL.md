# 🔧 Bakchich — Ce que TU dois faire à la main

> Tout le code est prêt. Ce qui reste, ce sont les comptes externes que je ne peux pas créer pour toi (ils demandent ton identité, ta CB, ta validation). Suis cette liste dans l'ordre. Coche au fur et à mesure.

Légende : ⏱️ = temps estimé · 💶 = coûte de l'argent · 🆓 = gratuit

---

## 1. Nom de domaine — `bakchich.dev` 🆓→💶 ⏱️ 10 min

1. Achète **bakchich.dev** chez un registrar (OVH, Gandi, Namecheap, Cloudflare…). ~12–15 €/an. La zone `.dev` **impose le HTTPS** (c'est géré par certbot plus tard, rien à faire ici).
2. Dans la zone DNS, crée 3 enregistrements **A** pointant vers l'IP de ton VPS (étape 5) :
   - `@`   → `IP_DU_VPS`
   - `www` → `IP_DU_VPS`
   - `api` → `IP_DU_VPS`
3. (Optionnel) un domaine court pour les liens de clic (ex. `bakch.li`) — pas nécessaire au lancement, le clic passe par `api.bakchich.dev/c/...`.

> Tu peux faire le VPS (étape 5) avant le domaine pour avoir l'IP, puis revenir ici.

---

## 2. Google OAuth (connexion des devs) 🆓 ⏱️ 15 min

But : permettre « Se connecter avec Google » dans l'extension et sur le dashboard.

1. Va sur **console.cloud.google.com** → crée un projet « Bakchich ».
2. Menu **APIs & Services → OAuth consent screen** :
   - Type : **External**. Renseigne nom de l'app « Bakchich », email support, logo (ton `logo.png`), domaine `bakchich.dev`, email dev.
   - Scopes : ajoute `openid`, `email`, `profile` (rien de plus — on ne lit que l'email).
   - Au début l'app est en mode **Test** : ajoute ton email dans « Test users » pour pouvoir te connecter. Pour ouvrir à tous → bouton **Publish app** (validation Google rapide pour ces scopes basiques).
3. Menu **Credentials → Create credentials → OAuth client ID** :
   - Type : **Web application**.
   - **Authorized redirect URIs** → ajoute EXACTEMENT :
     `https://api.bakchich.dev/auth/google/callback`
     (et pour tester en local si besoin : `http://localhost:3939/auth/google/callback`)
4. Copie le **Client ID** et le **Client secret** → tu les mettras dans le `.env` du serveur :
   ```
   GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=xxxxx
   ```

---

## 3. Stripe — encaisser les annonceurs + payer les devs 🆓 (commissions par transaction) ⏱️ 45 min

> ⚠️ Fais TOUT en **mode Test** d'abord (toggle en haut à droite du dashboard Stripe). Tu basculeras en **Live** au tout dernier moment.

### 3.1 Compte
1. Crée un compte sur **dashboard.stripe.com**. Renseigne ton entreprise (voir §6 ci-dessous pour le statut juridique).
2. Active le **paiement par carte** (Settings → Payments).

### 3.2 Clé secrète (pour encaisser via Checkout)
3. **Developers → API keys** → copie la **Secret key** (`sk_test_...` en test, `sk_live_...` en live) :
   ```
   STRIPE_SECRET_KEY=sk_test_xxxxx
   ```

### 3.3 Webhook (pour activer la campagne après paiement)
4. **Developers → Webhooks → Add endpoint** :
   - URL : `https://api.bakchich.dev/webhooks/stripe`
   - Événement à écouter : **`checkout.session.completed`** (tu peux en ajouter d'autres plus tard).
5. Copie le **Signing secret** (`whsec_...`) :
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```
   > En local, pour tester le webhook sans domaine public : installe le **Stripe CLI** et lance
   > `stripe listen --forward-to localhost:3939/webhooks/stripe` → il t'affiche un `whsec_...` temporaire.

### 3.4 Stripe Connect (pour reverser aux devs) — l'argument n°1 du projet
6. **Connect → Get started** → choisis le type **Express** (Stripe gère KYC, infos fiscales, IBAN à ta place).
7. Renseigne ta « platform/business profile » (nom Bakchich, logo, site, description courte).
8. Rien d'autre à coder : le bouton « Configurer mes virements » du dashboard appelle déjà `POST /api/me/connect/onboard` qui crée le compte Express et la page d'onboarding Stripe.

### 3.5 TVA (facturation annonceurs)
9. (Recommandé) Active **Stripe Tax** (Settings → Tax) pour la TVA FR 20 % automatique + factures auto. Une ligne est déjà prête à décommenter dans le code (`automatic_tax`).

### 3.6 Test bout-en-bout (mode Test)
10. Crée une campagne depuis `/annonceurs` → paie avec la carte de test **4242 4242 4242 4242** (date future, CVC au hasard).
11. Vérifie que le webhook passe la campagne en modération, valide-la via l'admin, et qu'elle apparaît dans l'enchère.
12. Crée un compte dev, onboard Connect (Stripe te donne un formulaire de test), génère un peu de solde, teste « Retirer ».

### 3.7 Passage en LIVE
13. Bascule le toggle **Live**, refais les clés (`sk_live_`, nouveau webhook `whsec_`), remplace dans le `.env`, redémarre. Fais **un vrai achat à 1 €** pour valider.

---

## 4. Marketplace VS Code — publier l'extension 🆓 ⏱️ 30 min (+ 1–2 j de validation au 1er coup)

1. Crée un compte **Azure DevOps** (dev.azure.com) avec le même email.
2. Génère un **Personal Access Token (PAT)** : organisation « All accessible », scope **Marketplace → Manage**.
3. Le **publisher `bakchich`** est déjà créé/validé (cf. brief). Connecte-toi dessus.
4. Côté code (je te prépare tout sauf l'icône PNG) :
   - Exporte `logo.png` en **128×128** → `extension/media/icon.png` (le SVG est déjà fourni dans `extension/media/`).
   - `cd extension && npm run package` → génère le `.vsix`.
   - `npx vsce login bakchich` (avec le PAT) puis `npx vsce publish`.
5. Soigne la page Marketplace : GIF de démo (le spinner qui change + le compteur qui monte), lien vers le repo public.

---

## 5. VPS + mise en ligne 💶 (~5 €/mois) ⏱️ 1 h

> Tout est scripté. Le runbook détaillé est dans **`docs/DEPLOIEMENT.md`**. Résumé :

1. Prends un VPS Ubuntu/Debian (Hetzner, Scaleway, OVH…). Note son **IP** → mets-la dans le DNS (§1).
2. Connecte-toi en SSH, suis `docs/DEPLOIEMENT.md` : installe Node 20, clone le repo dans `/opt/bakchich`, crée l'utilisateur `bakchich`.
3. Crée le fichier `.env` à partir de `ops/env.production.example` et **remplis-le** avec tout ce que tu as collecté ci-dessus :
   ```
   BASE_URL=https://api.bakchich.dev
   SITE_URL=https://bakchich.dev          # ⚠️ OBLIGATOIRE (sinon paiement + login cassés)
   GOOGLE_CLIENT_ID=...   GOOGLE_CLIENT_SECRET=...
   STRIPE_SECRET_KEY=...  STRIPE_WEBHOOK_SECRET=...
   ADMIN_SECRET=$(openssl rand -hex 32)   # génère un vrai secret, ne laisse JAMAIS la valeur par défaut
   DB_PATH=/opt/bakchich/backend/bakchich.db
   ```
4. Installe les fichiers nginx + systemd (cf. runbook), lance **certbot** pour le SSL des 3 domaines.
5. Lance `ops/deploy.sh` → il déploie le backend, synchronise le front et recharge nginx.
6. Mets en place le **cron de backup** (`ops/backup-db.sh`) et le monitoring `/health` (UptimeRobot gratuit).

---

## 6. Juridique / structure (à voir en parallèle) ⏱️ variable

- **Statut** : micro-entreprise (BNC) suffit pour démarrer ; bascule SASU si ça décolle (seuils TVA/CA).
- **Mentions légales** : éditeur (toi/ta structure), hébergeur (ton VPS provider), SIRET → à compléter dans `legal/mentions-legales.md`.
- **RGPD** : on ne collecte que email + événements pub. Base légale = exécution du contrat. Désigne un contact `privacy@bakchich.dev`.
- **CGU / CGV / Confidentialité** : modèles dans `legal/` — **fais-les relire par un juriste** avant le lancement.
- **Disclaimer Anthropic** : « Projet indépendant, non affilié à Anthropic » est déjà affiché partout. Ne pas utiliser les marques Claude/Anthropic dans le nom/logo.
- **Modération** : valide manuellement chaque créa via l'admin avant diffusion (pas de scam/crypto douteuse/contenu adulte).

---

## Récap des variables `.env` à remplir

| Variable | Où la récupérer | §  |
|---|---|---|
| `BASE_URL` | fixe = `https://api.bakchich.dev` | 1 |
| `SITE_URL` | fixe = `https://bakchich.dev` (**obligatoire**) | 1 |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Cloud Console | 2 |
| `STRIPE_SECRET_KEY` | Stripe → API keys | 3.2 |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks | 3.3 |
| `ADMIN_SECRET` | `openssl rand -hex 32` | 5 |
| `DB_PATH` | fixe = `/opt/bakchich/backend/bakchich.db` | 5 |

## Ordre conseillé
1. VPS (pour avoir l'IP) → 2. Domaine + DNS → 3. Google OAuth → 4. Stripe (test) → 5. Déploiement + certbot → 6. Test e2e complet → 7. Stripe live → 8. Publication extension → 9. Lancement 🚀
