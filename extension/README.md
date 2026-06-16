# Bakchich

**Sois payé pendant que ça tourne.** Touche jusqu'à 50 % des revenus pub.

[bakchich.dev](https://bakchich.dev) · [Mon tableau de bord](https://bakchich.dev/me) · [Devenir annonceur](https://bakchich.dev/annonceurs)

---

## Comment ça marche

Quand Claude Code « réfléchit », son spinner affiche un verbe au hasard
(« Percolating… », « Discombobulating… »). Bakchich remplace ce verbe par une
**ligne sponsorisée discrète et cliquable**. Des annonceurs enchérissent pour la
place ; **jusqu'à 50 % des revenus pub** te sont crédités.

Ton solde s'affiche dans la barre de statut de VS Code et se met à jour en temps réel :
`⚡ Bakchich : 0,42 € aujourd'hui (7,11 € au total)`

## Fonctionnalités

- **Gains passifs** : les impressions s'accumulent pendant que Claude Code travaille. Un clic vaut 50× une impression.
- **Partage de revenus** : jusqu'à 50 % des revenus pub, crédités par impression et par clic.
- **Totalement réversible** : un clic restaure Claude Code à son état d'origine, à l'octet près.
- **Zéro interférence** : ne lit jamais ton code, tes prompts ni tes complétions.
- **Opt-in strict** : rien ne s'injecte tant que tu n'es pas connecté.

## Démarrage

1. Installe l'extension depuis le Marketplace VS Code (cherche **Bakchich**).
2. Clique sur **Activer Bakchich** dans la barre de statut (ou palette → « Bakchich : Se connecter »).
3. Authentifie-toi avec Google.
4. Utilise Claude Code normalement. Tes gains démarrent automatiquement.

## Barre de statut

| État | Signification |
| --- | --- |
| `⚡ Activer Bakchich` | Pas encore connecté. Clique pour t'authentifier. |
| `⚡ Bakchich : 0,42 € aujourd'hui (7,11 € au total)` | Connecté, en train de gagner. |
| `⏸ Bakchich (pause)` | Tu as mis en pause. Clique pour reprendre. |
| `⊘ Bakchich (suspendu)` | Diffusion suspendue côté serveur (kill-switch de sécurité). |
| `☁ Bakchich (hors-ligne)` | Backend temporairement injoignable : on réessaie tout seul. |
| `⚠ Bakchich (Claude Code introuvable)` | Claude Code n'est pas détecté sur cette machine. |

Clique sur la barre de statut pour ouvrir le **menu Bakchich** (connexion/déconnexion,
pause, restaurer Claude Code, diagnostic, tableau de bord).

## Confidentialité

Bakchich ne communique qu'avec le backend Bakchich (`api.bakchich.dev`). Il envoie :

- Un **identifiant d'appareil anonyme** (non lié à ton identité tant que tu n'es pas connecté).
- Des **événements d'impression** (ID de pub, temps visible, clic).
- Ton **email Google uniquement après connexion**, pour créditer tes gains.

Bakchich **ne lit jamais** ton code, tes prompts, tes complétions, ni aucun contenu de conversation.

L'injection se fait en éditant **uniquement** le champ `spinnerVerbs` de
`~/.claude/settings.json` (un verbe spinner sponsorisé), à partir d'une sauvegarde
de l'original. **Tout est réversible** : choisis « Restaurer Claude Code » dans le
menu à tout moment, et l'original est remis à l'identique.

## Commandes

Palette de commandes (Ctrl+Shift+P / Cmd+Shift+P) :

| Commande | Description |
| --- | --- |
| Bakchich : Se connecter | S'authentifier avec Google. |
| Bakchich : Se déconnecter | Se déconnecter et arrêter les gains. |
| Bakchich : Menu | Ouvrir le menu complet. |
| Bakchich : Activer / Désactiver | Mettre en pause / reprendre. |
| Bakchich : Restaurer Claude Code | Rendre le spinner d'origine. |
| Bakchich : Diagnostic | Vérifier l'état de la connexion. |
| Bakchich : Mon tableau de bord | Ouvrir bakchich.dev/me. |

## Réglages

| ID | Description | Défaut |
| --- | --- | --- |
| `bakchich.apiUrl` | URL de l'API Bakchich. | `https://api.bakchich.dev` |
| `bakchich.viewThresholdSeconds` | Temps de visibilité cumulé (s) avant qu'une pub compte comme « vue » et soit créditée. | `5` |

## Compatibilité

Bakchich agit sur le **spinner-verbe de Claude Code (CLI terminal)** via
`~/.claude/settings.json`. Si Claude Code n'est pas détecté, l'extension ne fait
**rien** : elle ne cassera jamais ton éditeur ni ton terminal.

## FAQ

**Est-ce que ça affecte Claude Code ?** Non. Le seul changement est le texte du
spinner. Toutes les fonctionnalités de Claude Code marchent exactement comme avant.

**Comment je suis payé ?** Tes gains sont suivis sur le backend Bakchich. Va sur
[bakchich.dev/me](https://bakchich.dev/me) pour voir ton solde et configurer tes
retraits (Stripe).

**Je peux désactiver ?** Oui. Clique sur la barre de statut → « Mettre en pause »,
ou « Restaurer Claude Code » pour tout remettre d'origine.

**Mon code est-il en sécurité ?** Bakchich n'a aucun accès à ton code, tes prompts
ou les réponses de l'IA. Il ne modifie que le texte d'affichage du spinner.

---

Bakchich n'est pas affilié à Anthropic.
