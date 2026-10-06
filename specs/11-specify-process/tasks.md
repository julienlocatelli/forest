# Tasks: Processus Specify pour les tickets Notion

**Input**: Documents de conception dans specs/11-specify-process/.
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/workflow.md, quickstart.md.
**Tests**: Validation observable demandée par la spec (scénarios et SC-001 à SC-008) ; tests Git dans dépôts temporaires et parcours agent/Notion sur ticket de test autorisé. Aucun test ni implémentation exécuté pendant la génération.
**Organization**: Phases par story ; US1 et US4 P1 avant US2 et US3 P2. Les gardes de base sont fondation pour éviter un MVP qui déplacerait du travail indépendant.

## Format: ID, parallèle, story, description
[P] signifie fichiers distincts et absence de dépendance dans le groupe proposé. Les tâches portant sur le même fichier restent séquentielles.
## Path Conventions
Chemins depuis Forest ; skills uniquement sous .agents/skills/. Aucun changement du skill personnel.

## Phase 1: Setup
**Purpose**: Préparer les emplacements sans ajouter de dépendance.
- [X] T001 Créer les répertoires prévus et vérifier la disponibilité de Git/Python 3 pour .agents/skills/git-ticket-branch/scripts/prepare_branch.py et .agents/skills/git-ticket-branch/tests/test_prepare_branch.py.
- [X] T002 Définir dans .agents/skills/git-ticket-branch/SKILL.md le périmètre local, les sept types, la normalisation des accents et la description de un à quatre mots, avec invocation du helper par arguments.

## Phase 2: Foundational
**Purpose**: Contrats et garde de sécurité avant toute story.
- [X] T003 Créer les fixtures de dépôts temporaires et assertions d'intégrité dans .agents/skills/git-ticket-branch/tests/test_prepare_branch.py ; aucun test ne doit modifier la branche Forest.
- [X] T004 Implémenter parsing et validation dans .agents/skills/git-ticket-branch/scripts/prepare_branch.py selon contracts/workflow.md : « ticket_number : entier positif issu de TASK ; rendu décimal sans compteur alternatif », UUID valide, sept types et référence Git validée sans shell=True.
- [X] T005 Implémenter dans .agents/skills/git-ticket-branch/scripts/prepare_branch.py les erreurs structurées, dépôt absent, HEAD détachée, fusion/rebase/cherry-pick, fichiers suivis/non suivis et blocage d'un changement de branche sale ; branche cible déjà active = préserver les fichiers.
- [X] T006 Ajouter dans .agents/skills/git-ticket-branch/scripts/prepare_branch.py le verrou de préparation dans le répertoire Git commun, la détection de branche active ailleurs et les erreurs CONCURRENT_RUN/BRANCH_IN_OTHER_WORKTREE ; libérer le verrou sur erreur sans toucher aux artefacts.
**Checkpoint**: Entrées et états dangereux refusés avant sélection et écriture d'artefacts.

## Phase 3: US1 — Démarrer sur la bonne branche (P1)
**Goal**: Créer une branche depuis main locale et écrire seulement ensuite.
**Independent Test**: Dépôt propre avec main ; observer SHA de départ, branche active et première écriture ; main absente = aucune écriture.
- [X] T007 [US1] Ajouter dans .agents/skills/git-ticket-branch/tests/test_prepare_branch.py les scénarios des sept types, SHA égal à main, main absente, référence explicite incompatible et absence d'artefacts après blocage.
- [X] T008 [US1] Implémenter dans .agents/skills/git-ticket-branch/scripts/prepare_branch.py la création depuis refs/heads/main, la vérification de branche active et JSON BRANCH_NAME/TICKET_NUMBER/BASE_REF/BASE_COMMIT/ACTION, sans fetch ni écriture de spec.
- [X] T009 [US1] Créer dans .agents/skills/specify/SKILL.md la lecture du ticket et du schéma, la validation TASK/nature, puis le skill de branche ; bloquer sur donnée manquante avant artefact et utiliser explicitement le skill Forest.
- [X] T010 [US1] Ajouter dans .agents/skills/specify/SKILL.md la résolution specs/<TASK>-<description> sans compteur et « Les chemins doivent rester dans specs du dépôt ; aucune traversée de chemin » ; après succès Git seulement, écrire association et .specify/feature.json et fixer SPECIFY_FEATURE_DIRECTORY.
**Checkpoint**: MVP local US1, sans publication distante anticipée.

## Phase 4: US4 — Livrer la spécification (P1)
**Goal**: Orchestrer Spec Kit, Clarify, publication complète et statut vérifié.
**Independent Test**: Ticket de test To Define ; spec locale complète et une section distante incluant réponses, puis To Do uniquement après publication vérifiée.
- [X] T011 [US4] Définir les scénarios agent sans/avec clarification, ambiguïté bloquante et arrêt de génération dans specs/11-specify-process/quickstart.md avec résultats attendus et ticket de test autorisé.
- [X] T012 [US4] Compléter .agents/skills/specify/SKILL.md pour exécuter speckit-specify dans le dossier explicite et attendre Clarify, les réponses et la checklist ; signaler skill indisponible ou génération échouée.
- [X] T013 [US4] Vérifier et ajuster .agents/skills/speckit-specify/SKILL.md pour conserver Automatic Clarification après les hooks, dédupliquer une clarification déjà faite pour cette version, et réserver publication/statut au wrapper après son retour.
- [X] T014 [US4] Ajouter dans .agents/skills/specify/SKILL.md la relecture avant publication, l'intégration et revalidation des changements du besoin, avec suspension sur ambiguïté bloquante et sans écrasement des notes.
- [X] T015 [US4] Implémenter dans .agents/skills/specify/SKILL.md la publication Notion via documentation et schéma actuels : section unique, insert/update ciblé, attente asynchrone, relecture après réponse incertaine, au plus une correction ciblée, blocage sur délimiteurs ambigus.
- [X] T016 [US4] Ajouter dans .agents/skills/specify/SKILL.md la relecture schéma/statut, transition uniquement To Define → To Do après publication vérifiée et contrôle final ; autres statuts conservés et échec de transition explicitement rapporté.
**Checkpoint**: Parcours nominal complet ; pas d'implémentation ni de publication Git déclenchée par le skill.

## Phase 5: US2 — Reprendre sans duplication (P2)
**Goal**: Réutiliser association, branche et dossier malgré le changement de titre.
**Independent Test**: Trois invocations du même UUID, titre changé et dossier historique ; une branche, un dossier, une section.
- [X] T017 [US2] Ajouter dans .agents/skills/git-ticket-branch/tests/test_prepare_branch.py les tests de reprise active/non active, ancien format d'association, titre changé, collision UUID/numéro et candidates multiples.
- [X] T018 [US2] Implémenter dans .agents/skills/git-ticket-branch/scripts/prepare_branch.py la priorité de branche associée et les conflits : « Un UUID correspond à un seul dossier et une seule branche » ; branche sans association = sélection explicite avant revendication, BASE_COMMIT null si provenance inconnue.
- [X] T019 [US2] Compléter .agents/skills/specify/SKILL.md pour rechercher notion-source.json par UUID avant allocation, garder url/page_id, enrichir ticket_number/branch_name/base_ref/base_commit après succès et préserver l'origine inconnue ; collision de numéro avec autre UUID = blocage.
- [X] T020 [US2] Définir dans .agents/skills/specify/SKILL.md la conservation des dossiers historiques et la reprise après interruption ou statut refusé par relecture de l'état réel, sans duplication ni renommage lié au titre.
**Checkpoint**: Reprise indépendante vérifiable avec association préexistante.

## Phase 6: US3 — Comprendre les blocages (P2)
**Goal**: Couvrir les échecs et préserver intégralement le travail.
**Independent Test**: Dépôt sale/hors dépôt, conflit de worktree et réponse distante incertaine ; erreur explicite et résultats précédents récupérables.
- [X] T021 [US3] Compléter .agents/skills/git-ticket-branch/tests/test_prepare_branch.py pour fichiers suivis/non suivis, dépôt absent, HEAD détachée, opérations en cours, branche distante seule, autre worktree, concurrence et erreur Git ; vérifier fichiers/SHA et absence d'artefacts.
- [X] T022 [US3] Compléter .agents/skills/git-ticket-branch/scripts/prepare_branch.py et les diagnostics de .agents/skills/git-ticket-branch/SKILL.md : codes du contrat, current_branch et affected_files utiles, sans secrets ni stash/commit/reset/suppression/réseau.
- [X] T023 [US3] Ajouter dans .agents/skills/specify/SKILL.md les résultats partiels et arrêts des étapes dépendantes, limites de concurrence Notion, reprise après timeout et préservation des résultats réussis.
**Checkpoint**: Aucun blocage n'entraîne de perte ou succès annoncé sans preuve.

## Phase 7: Polish & Cross-Cutting Concerns
**Purpose**: Vérifier conformité et livrabilité des skills.
- [X] T024 [P] Relire .agents/skills/specify/SKILL.md et .agents/skills/git-ticket-branch/SKILL.md avec skill-creator et writing-for-agents ; vérifier portée Forest et sélection explicite sans modifier le skill personnel.
- [X] T025 [P] Actualiser specs/11-specify-process/quickstart.md avec les commandes finales, compréhension des sept préfixes (SC-005), fixture distante autorisée et limites des validations disponibles.
- [X] T026 Exécuter les tests unittest de .agents/skills/git-ticket-branch/tests/test_prepare_branch.py et git diff --check ; consigner résultats et scénarios non exécutés dans specs/11-specify-process/quickstart.md.
- [ ] T027 Valider les parcours agent/Notion autorisés de specs/11-specify-process/quickstart.md, y compris trois reprises, changement concurrent, publication incertaine et statut refusé ; consigner preuves ou blocages sans modifier le ticket 11 comme fixture implicite.

## Dependencies & Execution Order
Setup T001 → T002 ; fondation T003 → T004 → T005 → T006 bloque toutes les stories.
US1 : T007 → T008 → T009 → T010.
US4 dépend de US1 pour le parcours complet : T011 → T012 → T013 → T014 → T015 → T016.
US2 dépend du helper US1 : T017 → T018 → T019 → T020.
US3 dépend des gardes de fondation et complète les échecs : T021 → T022 → T023.
Comme le helper, le test et le wrapper sont partagés, appliquer les phases US1 → US4 → US2 → US3 séquentiellement. Les tests de chaque story peuvent être exécutés avec des fixtures propres sans disposer des autres parcours métier.
Polish : T024 et T025 après toutes les stories, en parallèle ; puis T026 → T027.

## Parallel Examples by User Story
- US1 : aucune tâche entière en parallèle, le test et l'implémentation du helper ont une dépendance.
- US4 : aucune tâche entière en parallèle ; même wrapper et ordre rédaction/publication/statut requis.
- US2 : aucune tâche entière en parallèle ; tests puis helper puis association.
- US3 : aucune tâche entière en parallèle ; compléter les diagnostics après les scénarios.
- Final : T024 (skills) et T025 (guide) peuvent avancer ensemble sur fichiers distincts. Ne pas inventer du parallélisme sur les mêmes fichiers.

## Implementation Strategy
MVP local : Setup + fondation + US1, puis valider création depuis main et absence d'écriture en cas d'échec.
Livraison fonctionnelle : US4 ajoute le parcours complet avec Clarify avant publication ; US2 ajoute reprise et compatibilité ; US3 complète les erreurs.
Les ajouts Automatic Clarification et publication plan/tasks déjà présents doivent être préservés ; ces tâches n'ajoutent pas rétroactivement un planning au ticket.
Aucune tâche n'est déclarée réalisée sur la seule base d'une instruction Markdown ; validation observable requise.
