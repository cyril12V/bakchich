# ✅ BAKCHICH : Checklist complète du projet

> Sois payé pendant que ça tourne. Régie publicitaire du spinner Claude Code, version 🇫🇷.

---

## 1. PRODUIT (extension VS Code)

- [ ] Injection du texte sponsorisé dans `~/.claude/settings.json` → champ `spinnerVerbs`
- [ ] **Backup automatique** des verbes d'origine + restauration à la déconnexion / désinstallation / kill-switch
- [ ] Rotation des pubs : appel API toutes les 60 s pour récupérer la campagne gagnante de l'enchère
- [ ] Tracking d'impressions : tick de 5 s uniquement si fenêtre VS Code active + terminal ouvert
- [ ] Idempotence : chaque événement a un `eventId` unique (jamais compté deux fois)
- [ ] Clics trackés **côté serveur** via lien de redirection court (`/c/:campaignId`) : fiable à 100 %
- [ ] Barre de statut : solde en temps réel (`Bakchich ✓ 0,42 € auj. · 7,11 €`)
- [ ] Connexion Google OAuth → token stocké dans le **SecretStorage VS Code** (trousseau OS)
- [ ] Mode pause (commande `Bakchich: Pause`) : l'utilisateur garde le contrôle
- [ ] **Kill-switch serveur** : un flag côté backend désactive tout et restaure les spinners de TOUS les clients
- [ ] Rien ne s'affiche avant le sign-in explicite (opt-in strict)
- [ ] Ne JAMAIS lire le code, les prompts ou les fichiers du dev : uniquement settings.json
- [ ] Self-update via le Marketplace (automatique)
- [ ] Tests : suite vitest sur l'injection/restauration (le fichier settings.json ne doit JAMAIS être corrompu)

## 2. BACKEND (API + enchères)

- [ ] API : `GET /api/ad/current` (pub gagnante), `POST /api/events` (impressions), `GET /c/:id` (clic + redirect)
- [ ] Enchère ascendante : la campagne active avec le bid le plus haut diffuse en premier, les autres font la queue
- [ ] 1 bloc = 1 000 impressions de 5 s · clic facturé 50× l'impression · le dev touche 50 %
- [ ] Ledger : table `events` immuable, solde = somme des crédits (auditable)
- [ ] Anti-fraude v1 : plafond impressions/jour/utilisateur, intervalle mini 5 s entre ticks, rate-limit IP, event-id idempotent
- [ ] Anti-fraude v2 (post-lancement) : détection multi-comptes, fingerprint machine, review manuelle des gros soldes avant payout
- [ ] Auth Google OAuth (flow : extension → navigateur → callback localhost)
- [ ] Endpoint kill-switch + endpoint santé
- [ ] Sauvegardes DB automatiques

## 3. ARGENT

- [ ] **Encaissement annonceurs** : Stripe Checkout (paiement à l'achat de blocs, à partir de 1 €)
- [ ] **Reversement devs** : Stripe Connect Express (payout SEPA en €) : **ouvert dès le jour 1** (leur faiblesse = ton arme)
- [ ] Seuil de payout mini (ex. 10 €) pour limiter les frais
- [ ] Collecte des infos fiscales des devs via Stripe Connect (il gère le KYC pour toi)
- [ ] CGU : préciser que les gains sont des revenus imposables à déclarer par l'utilisateur
- [ ] Ta structure : micro-entreprise possible au début (BNC), bascule SASU si ça décolle (seuils TVA/CA)
- [ ] Facturation annonceurs avec TVA française (20 %) : Stripe Tax peut automatiser

## 4. LÉGAL / RGPD

- [ ] Politique de confidentialité (fournie dans `/legal`) : données minimales = email, nom, événements pub. JAMAIS le code/les prompts
- [ ] CGU utilisateurs + CGV annonceurs (fournies dans `/legal`)
- [ ] Mentions légales (obligatoires en France : éditeur, hébergeur, SIRET)
- [ ] Base légale RGPD : exécution du contrat (pas besoin de bannière cookies si pas de tracker tiers sur le site)
- [ ] Registre des traitements (simple doc interne)
- [ ] DPO non obligatoire à ta taille, mais désigner un contact privacy : privacy@tondomaine
- [ ] Modération des pubs : validation manuelle de chaque créa avant diffusion (pas de scam, crypto douteuse, contenu adulte)
- [ ] Code de l'extension en **miroir public GitHub** (transparence = confiance) avec licence "source-available" (lisible mais pas réutilisable : comme eux)
- [ ] Ne pas utiliser les marques "Claude", "Anthropic", "Codex" dans ton nom/logo (les citer de façon descriptive est OK : « compatible avec Claude Code »)
- [ ] Disclaimer visible : « Projet indépendant, non affilié à Anthropic »

## 5. DISTRIBUTION

- [ ] Compte éditeur Azure DevOps + publisher Marketplace VS Code (gratuit, prévoir 1-2 j de validation)
- [ ] Nom de domaine : bakchich.dev (+ un domaine court pour les liens de clic, ex. bakch.li)
- [ ] Page Marketplace soignée : GIF de démo, badges, lien vers le code public
- [ ] Landing page (fournie dans `/landing`) avec démo live du spinner
- [ ] v2 : installeur CLI (npm/brew) pour les devs hors VS Code

## 6. LANCEMENT (la recette qui a fait péter l'original)

- [ ] Le one-liner : « Le spinner de Claude Code est la ligne la plus regardée de France. J'en ai fait une régie pub. »
- [ ] Ton autodérision assumé (« projet shitpost ultra-travaillé »)
- [ ] Vidéo démo < 60 s : le spinner qui change + le compteur qui monte
- [ ] Amorcer l'inventaire : démarcher 5-10 startups dev FR (SaaS, hébergeurs, formations) avec des blocs OFFERTS
- [ ] Poster : X/Twitter FR, LinkedIn, r/france + r/programmation, Discord/Twitch dev FR, Hacker News (version EN)
- [ ] Payouts ouverts jour 1 + le mettre en avant partout (différenciation n°1 vs Kickbacks)
- [ ] Préparer la FAQ aux objections : « c'est de la merde les pubs » → transparence, opt-in, pause, 50 %, code public

## 7. AVANT D'APPUYER SUR LE BOUTON

- [ ] Tester l'extension sur macOS + Linux + Windows (chemins `~/.claude` différents)
- [ ] Tester la restauration du spinner dans TOUS les cas (crash, désinstallation, kill-switch)
- [ ] Charger le kill-switch et vérifier qu'il marche en < 60 s
- [ ] Stripe en mode test → mode live
- [ ] Backups + monitoring (UptimeRobot gratuit suffit)
