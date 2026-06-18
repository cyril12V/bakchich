# Changelog

Toutes les modifications notables de l'extension Bakchich sont documentées ici.
Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/)
et le projet respecte le [versionnage sémantique](https://semver.org/lang/fr/).

## [0.4.1] - 2026-06-18

### Corrigé
- **Crédit uniquement quand `claude` tourne vraiment** : on ne se fie plus au nom
  du terminal. Un terminal nommé « claude » mais sans commande en cours (curseur
  au prompt, pas de spinner) ne crédite plus rien. Fenêtre réduite / non
  focalisée → aucun gain.

### Modifié
- Cadence par défaut : 1 impression comptée toutes les **15 s** de visibilité
  continue (avant 5 s). Réglable de 1 à 60 s via `bakchich.viewThresholdSeconds`.

## [0.4.0] - 2026-06-18

Première version finale stabilisée, prête pour publication.

### Modifié
- Stabilisation générale du crédit : une pub n'est comptée que si elle est
  **réellement affichée** et **visible en continu** pendant le seuil configuré
  (`bakchich.viewThresholdSeconds`, 5 s par défaut).
- Documentation : ajout de ce CHANGELOG et préparation du paquet pour le Marketplace.

### Sécurité
- Le token de session est stocké uniquement dans le stockage sécurisé de VS Code
  (`SecretStorage`), jamais en clair sur le disque.
- L'identifiant d'appareil reste un UUID anonyme, non lié à l'identité.

## [0.3.9] - 2026-06-18

### Corrigé
- Ne créditer que lorsque le **terminal actif** est celui qui exécute `claude`
  (et non un autre terminal ouvert en arrière-plan).

## [0.3.8] - 2026-06-18

### Ajouté
- Démarrage sans facturation tant que Claude n'a pas démarré ; alignement avec
  l'expérience « CLI-only ».

### Corrigé
- Affichage = paiement : exposition continue vérifiée, UI bloquée pendant la mesure.
- Ne créditer que pendant une session `claude` active en terminal.

## [0.3.7] - 2026-06-18

### Corrigé
- Écriture de `spinnerVerbs` au format objet `{ mode, verbs }` (compatibilité Claude Code v2.1.x).
- Création d'un `settings.json` minimal s'il est absent.
- Rejet des `settings.json` au format tableau (cas limite).

## [0.3.0] - antérieur

### Ajouté
- Injection/restauration de la ligne sponsorisée dans le spinner, opt-in et
  réversible en un clic.
- Connexion Google (OAuth), tableau de bord des gains, diagnostic.

[0.4.0]: https://github.com/cyril12V/bakchich/releases/tag/v0.4.0
[0.3.9]: https://github.com/cyril12V/bakchich/releases/tag/v0.3.9
[0.3.8]: https://github.com/cyril12V/bakchich/releases/tag/v0.3.8
[0.3.7]: https://github.com/cyril12V/bakchich/releases/tag/v0.3.7
