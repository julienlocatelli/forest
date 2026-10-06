# Contracts — Specify Forest

## Entrée agent
Invocation du skill du projet .agents/skills/specify/SKILL.md avec une URL de page Notion et d'éventuelles précisions. Une URL de base ou vue ne remplace pas le ticket.
Cette invocation autorise la préparation locale, la rédaction, Clarify, la publication sur cette seule page et la transition To Define → To Do. Elle n'autorise pas push, commit, autre page ou modification du skill personnel.

## CLI prévu pour git-ticket-branch
```text
python3 .agents/skills/git-ticket-branch/scripts/prepare_branch.py \
  --repo <repo> --page-id <uuid> --ticket <TASK> \
  --type <prefix> --description <slug> [--branch-name <name>] \
  [--association <notion-source.json>]
```
Le helper est à implémenter ; cette commande décrit son interface.
Entrées validées avant mutation : dépôt, numéro positif, UUID, type, description ASCII normalisée, référence Git valide et correspondance ticket. Appels Git par liste d'arguments, sans interprétation shell.
Sortie succès JSON : BRANCH_NAME, TICKET_NUMBER, BASE_REF, BASE_COMMIT, ACTION (created ou reused). BASE_COMMIT peut être null pour reprise d'origine inconnue ; aucune fausse provenance.
Exit 0 après vérification de branche active. Exit non nul : JSON erreur avec code, message, current_branch si connu, affected_files si pertinents ; aucune valeur sensible.
Codes attendus : INVALID_INPUT, NOT_GIT_REPOSITORY, DETACHED_HEAD, GIT_OPERATION_IN_PROGRESS, MAIN_MISSING, DIRTY_WORKTREE, ASSOCIATION_CONFLICT, REMOTE_ONLY_BRANCH, BRANCH_IN_OTHER_WORKTREE, CONCURRENT_RUN, GIT_FAILURE.
Un nom explicite conforme est utilisé tel quel. Un type/numéro incompatible est refusé. Une branche distante seule ne déclenche pas de fetch.
Le helper n'écrit ni dossier spec, ni pointeur, ni association. Un verrou temporaire dans le répertoire Git commun assure une préparation à la fois ; son échec est CONCURRENT_RUN. La portée de ce verrou ne prétend pas protéger les éditions Notion.

## Passage à Spec Kit
L'orchestrateur fixe SPECIFY_FEATURE_DIRECTORY au chemin résolu et fournit le besoin à speckit-specify. Il n'utilise pas create-new-feature.sh --number pour l'identité Notion.
La préparation de branche précède toute écriture des artefacts, association et pointeur. Le skill Spec Kit utilise le template actif ; Clarify s'exécute après ses hooks sur le même dossier, au plus une fois pour la même version déjà clarifiée.
Si des questions sont nécessaires, attendre les réponses et les intégrer. La disponibilité pour planification se juge sur le résultat final, pas sur un statut intermédiaire de rédaction.

## Publication Notion
Lire la documentation Markdown et le schéma des outils disponibles lors de l'exécution.
Délimiteurs possédés par le workflow :
```text
## Spécification — Specify
[contenu complet]
## Fin de la spécification — Specify
```
Aucune section : ajout en fin. Une section complète unique : remplacement ciblé depuis la dernière lecture. Délimitation ambiguë : demander résolution sans suppression.
Relire juste avant l'écriture, intégrer les changements et revalider ; ambiguïté bloquante = aucune transition.
Attendre toute tâche asynchrone, puis relire et vérifier exigences, section unique et notes voisines. Après résultat incertain, relire avant tentative ; au plus une correction ciblée si un défaut est confirmé, puis rapporter le blocage.
Relire schéma et statut avant transition ; si encore To Define, écrire uniquement Status=To Do, puis vérifier. Autre statut : conserver.
Limite : en l'absence d'opération conditionnelle atomique du connecteur, une course après relecture ne peut être éliminée ; ne pas annoncer une garantie transactionnelle.

## Résultat utilisateur
Branche réelle, dossier, spec et checklist ; nombre de clarifications, publication vérifiée ou blocage, statut vérifié ou conservé ; aucun succès annoncé pour une étape non vérifiée.
