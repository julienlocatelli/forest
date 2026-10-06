# Implementation Plan: Processus Specify pour les tickets Notion

**Branch**: `chore/11-specify-process` | **Date**: 2026-10-06 | **Spec**: [spec.md](spec.md)
**Input**: specs/11-specify-process/spec.md ; instruction complémentaire : Clarify automatique après Specify.

## Summary
Créer une entrée Specify propre à Forest qui lit le ticket, prépare sa branche depuis main locale, fournit un dossier identifié par TASK au workflow Spec Kit, attend sa clarification automatique, publie la version finale et vérifie la transition To Define → To Do. Réutiliser les skills existants ; isoler les mutations Git dans un helper déterministe. Le skill personnel reste inchangé.

## Technical Context
**Language/Version**: Markdown pour les skills ; Python 3 standard pour le helper ; scripts Spec Kit Bash compatibles avec Bash 3.2 local.
**Primary Dependencies**: Git (2.54.0 constaté), Python 3 local, Spec Kit 1.0.13, connecteur Notion accessible à l'agent.
**Storage**: Fichiers Markdown/JSON du dépôt et page Notion ; aucune base applicative.
**Testing**: unittest avec dépôts Git temporaires ; validation manuelle du parcours agent et du connecteur sur ticket de test autorisé.
**Target Platform**: Forest sur macOS ; commandes Git et Python portables, sans intégration Windows supplémentaire.
**Project Type**: Skills d'agent et utilitaire CLI local.
**Performance Goals**: Une préparation locale par invocation ; pas de cible de latence produit imposée. Les attentes de clarification dépendent des réponses humaines.
**Constraints**: Aucun réseau Git, commit, push, stash ou écrasement automatique ; aucun artefact avant sélection de branche ; TASK exact ; préserver les notes et statuts avancés.
**Scale/Scope**: Un ticket par invocation, sept préfixes ; sérialiser les invocations sur un même dépôt ; aucun changement frontend/backend.

## Constitution Check
| Principe | Avant recherche | Après conception |
| --- | --- | --- |
| I. Décisions argumentées | Conforme : besoin et décisions clarifiées | Conforme : alternatives, verdicts et limites dans research.md |
| II. Simplicité et responsabilités | Conforme : orchestration et Git séparables | Conforme : bibliothèque standard, réemploi de Spec Kit, aucun service ajouté |
| III. Contrats explicites | Conforme : identité et erreurs définies | Conforme : CLI, association et parcours Notion dans contracts/workflow.md |
| IV. Sécurité et intégrité | Conforme : travail indépendant préservé | Conforme : aucune clé stockée, édition ciblée, absence de mutation destructive |
| V. Validation proportionnée | Conforme : tests nécessaires pour Git | Conforme : tests temporaires et scénario distant distinct, sans prétendre exécutés |
Aucune exception nécessaire. Vérification de constitution effectuée avant recherche et après conception.

## Project Structure
### Documentation (this feature)
```text
specs/11-specify-process/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/workflow.md
├── notion-source.json
└── checklists/requirements.md
```
tasks.md sera produit par speckit-tasks.

### Source Code (repository root)
Structure prévue, non créée lors de cette planification :
```text
.agents/skills/
├── specify/SKILL.md
├── git-ticket-branch/
│   ├── SKILL.md
│   ├── scripts/prepare_branch.py
│   └── tests/test_prepare_branch.py
├── speckit-specify/SKILL.md
└── speckit-clarify/SKILL.md
.specify/feature.json
```
**Structure Decision**: Entrée locale specify pour orchestration Notion ; skill git-ticket-branch pour préparation Git ; garder la génération et Clarify dans leurs skills existants. Pointer explicitement vers le skill du projet pour éviter l'ambiguïté avec le skill personnel homonyme. Aucun changement à ce dernier ni aux scripts upstream de numérotation.

## Design Sequence
1. Lire ticket et schéma Notion ; valider TASK et nature ; résoudre les associations en lecture seule.
2. Préparer la branche avec le helper, après contrôle des collisions et du dépôt. Créer depuis refs/heads/main ou reprendre la branche associée. Sérialiser cette préparation par verrou dans le répertoire Git commun, sans écrire d'artefact de spec ; une concurrence détectée bloque.
3. Après sélection réussie, persister l'association compatible et le pointeur ; fixer SPECIFY_FEATURE_DIRECTORY au dossier résolu.
4. Exécuter speckit-specify avec ce dossier, son template et sa constitution. Préserver la section Automatic Clarification déjà ajoutée ; attendre questions, écritures et revalidation.
5. Relire le ticket ; intégrer tout besoin changé et revalider. Réouvrir les décisions affectées si nécessaire, sans relancer aveuglément les cinq questions.
6. Publier une seule section complète ; vérifier sa lecture, puis changer uniquement To Define vers To Do après relecture du statut et du schéma.
7. Vérifier statut et rapporter le résultat réel. Une reprise relit d'abord l'état courant, sans journal d'étape local présenté comme preuve distante.

## Validation et livraison
Les tests du helper couvrent les sept types, main absente, branche active, titre changé, dépôt sale, HEAD détachée, opérations en cours, références invalides, collision, branche distante seule et branche active dans un autre worktree. Vérifier SHA de départ, intégrité des fichiers et absence d'artefacts en cas de blocage.
Les parcours agent couvrent Clarify sans questions et avec réponses, édition concurrente, section ambiguë, retour incertain, statut refusé et reprise trois fois. Consulter quickstart.md.
La planification ne lance aucune mutation Notion ni installation. L'implémentation doit utiliser skill-creator et writing-for-agents ; toute modification éventuelle d'AGENTS.md relève aussi de ces règles.

## Risks and Limits
- main locale peut être en retard : pas de fetch implicite ; le contributeur la met à jour séparément.
- La sélection du skill homonyme doit être vérifiée par invocation locale explicite.
- Aucun hook de publication ou de transition ne doit précéder Clarify ; détecter ces hooks lors de l'implémentation et résoudre le conflit plutôt que doubler les effets.
- Une relecture Notion ne garantit pas l'atomicité contre une modification après lecture ; préserver les notes et signaler les limites du connecteur.
- Une mise à jour upstream de Spec Kit peut écraser la personnalisation Automatic Clarification ; garder ce changement dans le diff versionné.
