# Quickstart — Validation après implémentation

Ce guide décrit les contrôles à exécuter après création du helper et des skills. Le plan seul ne les rend pas encore disponibles.

## Prérequis
Git, Python 3, projet Spec Kit et skills du projet installés. Pour le parcours distant, utiliser un ticket Notion de test dont l'édition et la transition sont explicitement autorisées ; le ticket 11 n'est pas une fixture automatique.

## Contrôles locaux
Depuis la racine Forest, après implémentation :
```sh
python3 -m unittest discover -s .agents/skills/git-ticket-branch/tests -p 'test_*.py'
git diff --check
```
Les tests créent et nettoient leurs dépôts temporaires et ne changent pas la branche Forest.

Pour une démonstration manuelle isolée :
```sh
demo_repo=$(mktemp -d)
git init -b main "$demo_repo"
git -C "$demo_repo" -c user.name=Fixture -c user.email=fixture@example.invalid commit --allow-empty -m fixture
python3 .agents/skills/git-ticket-branch/scripts/prepare_branch.py --repo "$demo_repo" --page-id 00000000-0000-4000-8000-000000000011 --ticket 11 --type chore --description specify-process
git -C "$demo_repo" branch --show-current
git -C "$demo_repo" rev-parse refs/heads/main
git -C "$demo_repo" rev-parse HEAD
```
Attendu : chore/11-specify-process, JSON ACTION=created et SHA HEAD égal à main. Une seconde exécution identique retourne reused sans nouveau commit ni branche. Le helper seul ne crée pas de specs.

## Matrice Git
| Scénario | Résultat attendu |
| --- | --- |
| Sept types, accents normalisés par le skill, titre long | Nom conforme, quatre mots au plus |
| main locale absente | MAIN_MISSING, aucune branche ni spec créée |
| Autre branche avec fichier modifié ou non suivi | DIRTY_WORKTREE, fichier intact |
| Branche du ticket déjà active avec travail local | Reused, fichiers indépendants intacts |
| HEAD détachée, fusion/rebase/cherry-pick en cours | Blocage explicite avant mutation |
| Association UUID contradictoire, numéro déjà attribué | ASSOCIATION_CONFLICT |
| Branche distante seule | REMOTE_ONLY_BRANCH, aucun réseau |
| Branche occupée dans autre worktree | BRANCH_IN_OTHER_WORKTREE |
| Deux préparations concurrentes | Une sélection contrôlée, autre bloquée ; aucune corruption |
| Titre changé avec association existante | Même branche et même dossier |

## Parcours agent et Notion
1. Invoquer explicitement .agents/skills/specify/SKILL.md avec le ticket de test To Define ; vérifier qu'il s'agit du skill Forest.
2. Observer la branche sélectionnée avant toute écriture ; nouveau dossier specs/<TASK>-<description>, association correcte et pointeur actif.
3. Vérifier que Specify lance Clarify sans nouvelle invocation. Avec un besoin complet : pas de question artificielle. Avec une ambiguïté réelle : question séquentielle, attente de réponse et intégration dans spec.md.
4. Modifier le besoin du ticket pendant la rédaction : vérifier relecture, intégration et revalidation. Une ambiguïté bloquante suspend publication et statut.
5. Vérifier la section complète unique, les notes initiales préservées, la spec finale incluant réponses, puis To Do seulement après vérification de publication.
6. Relancer trois fois ; même branche, même dossier, une seule section et aucun changement d'un statut ultérieur.
7. Simuler refus de statut : publication conservée, résultat partiel explicite ; reprise relit puis termine sans duplication.
8. Simuler timeout de publication et réponse asynchrone : attendre ou relire avant retry ; au plus une correction ciblée. Délimiteurs incomplets/dupliqués : blocage sans écrasement.
9. Tester dossier historique associé et changement de titre ; vérifier réutilisation plutôt que renumérotation.
10. Vérifier qu'aucun skill personnel, autre ticket, commit ni branche distante n'a été modifié.

Consigner pour chaque scénario l'état avant/après, le résultat et les limites. Les inspections Markdown et git diff --check ne remplacent pas ces observations.

## Validation d'implémentation — 2026-10-06

- Helper et deux skills locaux implémentés, sans dépendance Python additionnelle ; Python 3.9.6 et Git 2.54.0 constatés.
- Red : 12 tests échouaient avant le helper ; green : 17 tests passent dans des dépôts temporaires (5,1 s environ).
- Couverture observée : sept types, départ main, trois reprises, main absente, entrées invalides, fichiers suivis/non suivis, branche active sale, HEAD détachée, six états d'opération Git, branche distante, verrou détenu, autre worktree, association historique, duplication d'UUID, titre changé, candidat explicite et suppression des effets du hook post-checkout.
- `git diff --check` passe ; .gitignore couvre les caches Python. Aucun frontend/backend ni skill personnel modifié.
- Revue des skills effectuée avec skill-creator et writing-for-agents. Le validateur fourni quick_validate.py ne peut pas démarrer avec le Python système : module PyYAML absent. Vérification indépendante des métadonnées et liens effectuée sans installer de paquet ; ce contrôle ne vaut pas une exécution du validateur fourni.
- Transition réelle du ticket 11 de To Do vers Doing vérifiée via le connecteur avant travail. Ce ticket n'a pas été utilisé comme fixture d'échec ou de publication concurrente.
- T027 reste ouverte : pas de ticket distant de test autorisé à ce stade. Les scénarios de concurrence Notion, timeout, refus de statut, réponse asynchrone et parcours complet Specify/Clarify sont décrits mais ne sont pas déclarés exécutés.
- Limite : les tests du helper ne prouvent pas le comportement de l'agent dans la boucle Notion ; la revue des instructions ne remplace pas cette validation.
- Validation indépendante : un agent a créé feature/42-add-login dans un dépôt temporaire depuis main, puis repris deux fois avec conservation d'un fichier non suivi. Aucun artefact spec créé par le helper ; aucun bug observé. Les réponses aux changements du besoin et publication incertaine ont été relues, sans exécution distante.
