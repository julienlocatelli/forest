# Tasks: Migration de TypeORM vers Prisma

**Input**: `specs/10-migrate-prisma/` — spec, plan, research, data-model, contracts et quickstart.

**Tests**: requis par FR-008. Écrire ou adapter les scénarios avant le changement concerné ; caractériser l’existant, puis vérifier les nouvelles attentes échouent pour la bonne raison. Aucun test distant n’est déclaré exécuté par ce document.

**Format**: `- [X] Txxx [P?] [USx?] Description avec chemin`. [P] signifie fichiers distincts et indépendance dans le groupe indiqué ci-dessous, après ses prérequis. Chemins relatifs à la racine Forest. Ne cocher qu’après preuve.

## Phase 1: Setup

**Purpose**: relever les contrats et préparer le tooling déterministe.

- [X] T001 Caractériser les réponses TypeORM avant remplacement, dont DELETE invalide/absent et POST incomplet, depuis `apps/api/test/users.e2e-spec.ts` ; consigner commandes, résultats réels ou indisponibilité distante dans `specs/10-migrate-prisma/quickstart.md` sans inventer de preuve.
- [X] T002 Ajouter `prisma`, `@prisma/client` et `@prisma/adapter-pg` exactement en 7.10.0 dans `apps/api/package.json` et `bun.lock`, conserver pg, vérifier les exigences Node 24/ESM et les APIs dans les docs versionnées ; ne pas installer latest.
- [X] T003 Configurer génération ESM explicite, sortie `apps/api/src/generated/prisma`, scripts prisma:generate/prisma:validate et génération avant build dans `apps/api/package.json` ; adapter si nécessaire `apps/api/tsconfig.build.json`, exclure le client généré dans `.gitignore` et vérifier les imports .js NodeNext.

## Phase 2: Foundational

**Purpose**: socle commun requis avant les parcours ; aucun changement distant implicite.

- [X] T004 [P] Ajouter les attentes de configuration runtime/CLI dans `apps/api/src/database/database.config.spec.ts` : URLs sans paramètres arbitraires, entiers positifs, CA et expansion HOME/PWD, valeurs 5/10000/15000, credentials séparés, erreurs sans secrets ; préserver les tests d’isolation dans `apps/api/src/database/test-environment.spec.ts`.
- [X] T005 [P] Définir le modèle partagé User dans `apps/api/prisma/schema.prisma` avec mapping `public.user` et contraintes exactes : id integer « clé primaire, auto-incrément », firstName/lastName character varying « non nul, aucune longueur nouvelle », isActive boolean « non nul, défaut true » ; aucune relation, unicité des noms ou champ supplémentaire.
- [X] T006 Adapter `apps/api/src/database/database.config.ts` pour produire les paramètres pg structurés avec TLS vérifié, CA, pool et délais explicites ; conserver le validateur d’URL et ne jamais laisser une connectionString surcharger l’objet TLS (après T004).
- [X] T007 Créer `apps/api/prisma.config.ts` pour chemin de modèle/historique et URL CLI migration séparée ; permettre generate/validate offline sans secret migration, valider les credentials pour les commandes réseau et ne pas utiliser la cible applicative comme shadow database (après T005–T006).
- [X] T008 Ajouter les tests lifecycle dans `apps/api/src/database/prisma.service.spec.ts`, puis créer `apps/api/src/database/prisma.service.ts` et `apps/api/src/database/database.module.ts` : singleton adapter-pg, connexion avant readiness, fermeture client/pool, erreurs assainies et aucun DDL au démarrage (après T006–T007).

**Checkpoint**: client générable et fournisseur injectable ; configuration testée. Les preuves SQL réelles restent dans US2.

## Phase 3: US1 — Conserver les opérations utilisateurs (P1)

**Goal**: remplacer l’accès métier en préservant les quatre opérations HTTP.

**Independent Test**: sur une base isolée initialisée selon US2, créer/lister/consulter/supprimer, redémarrer et vérifier les données restantes et les cas d’absence. Aucun autre changement fonctionnel requis.

- [X] T009 [P] [US1] Étendre `apps/api/test/users.e2e-spec.ts` pour champs exacts, identifiants uniques, actif par défaut, lecture absente 200 vide/nulle, suppression répétée 200, GET invalide 400, POST incomplet 500 et DELETE invalide selon T001 ; conserver les fixtures propres et le scénario redémarrage.
- [X] T010 [P] [US1] Définir `apps/api/src/users/user.ts` comme forme publique indépendante de Prisma avec id, firstName, lastName, isActive ; conserver les types/valeurs de `specs/10-migrate-prisma/data-model.md`.
- [X] T011 [US1] Ajouter les tests d’opérations/mapping dans `apps/api/src/users/users.service.spec.ts`, puis remplacer le Repository TypeORM dans `apps/api/src/users/users.service.ts` par le fournisseur Prisma : create/findMany/findUnique, projection de réponse explicite et suppression deleteMany pour préserver l’absence sans erreur (après T010).
- [X] T012 [US1] Câbler DatabaseModule dans `apps/api/src/users/user.module.ts` et `apps/api/src/app.module.ts`, adapter les imports du contrat dans `apps/api/src/users/users.controller.ts` sans nouvelles routes, validation DTO ou authentification ; retirer le démarrage TypeORM (après T008 et T011).
- [X] T013 [US1] Exécuter la suite contrats/persistance de `apps/api/test/users.e2e-spec.ts` après initialisation US2 ; vérifier les réponses et le redémarrage, résoudre toute régression de mapping et consigner les preuves assainies dans `specs/10-migrate-prisma/quickstart.md` (après T009, T012 et T021).

**Checkpoint**: US1 est démontrable indépendamment sur un schéma préparé ; sa validation réelle dépend de l’initialisation US2.

## Phase 4: US2 — Initialiser une installation neuve (P1)

**Goal**: installer le modèle et les permissions avec un historique unique et une procédure répétable.

**Independent Test**: base neuve isolée → application de migration → insertion d’une fixture → seconde application → fixture intacte, historique à jour, droits vérifiés et connexion runtime sans DDL.

- [X] T014 [P] [US2] Adapter `apps/api/test/database-migrations.e2e-spec.ts` pour initialisation Prisma, colonnes/contraintes, seconde application avec données conservées, conflit d’historique TypeORM non suivi et marqueur intact via globalSetup ; permettre le même projet de test isolé, conformément à l’ajustement autorisé et supprimer seulement les fixtures créées par le test.
- [X] T015 [P] [US2] Adapter `apps/api/test/database-permissions.e2e-spec.ts` aux clients pg/Prisma : CRUD runtime permis, DDL/Auth/Storage refusés, absence de superuser/BYPASSRLS, RLS active, table/séquence/historique interdits à PUBLIC/anon/authenticated et historique interdit au runtime.
- [X] T016 [P] [US2] Ajouter `apps/api/src/database/migrate.spec.ts` pour CLI local uniquement, chargement .env sans écrasement, codes de sortie, état en attente, capture des sorties, timeout configurable 120000 ms, terminaison du processus et absence de secrets ; couvrir configuration TLS CLI distincte et refus de paramètres arbitraires.
- [X] T017 [US2] Générer puis revoir `apps/api/prisma/migrations/<timestamp>_initial_users/migration.sql` depuis le modèle T005 avec migrate diff --from-empty hors connexion (pas de shadow nécessaire pour cette initialisation) ; fixer le vrai dossier généré, inclure transaction explicite, RLS forest_app_crud, droits table/séquence et protection `_prisma_migrations` ; ne pas modifier les rôles ou objets fournisseur ni les grants globaux.
- [X] T018 [US2] Remplacer `apps/api/src/database/migrate.ts` par un wrapper de migrate deploy/status installé 7.10.0 : environnement migration séparé, TLS CLI construit, messages fixes, statut nonzero préservé, deadline bornée et relecture d’état après timeout ; refuser destination inattendue ou historique TypeORM avant première initialisation, sans reset/adoption/resolve automatique (après T016–T017).
- [X] T019 [US2] Mettre à jour migration:run/migration:show dans `apps/api/package.json` et l’initialisation partagée des suites dans `apps/api/test/database-test-environment.ts` et `apps/api/vitest.config.e2e.ts` ; remapper les credentials de test seulement après la garde existante et utiliser le wrapper T018 (après T018).
- [X] T020 [US2] Ajouter et exécuter `apps/api/test/database-connectivity.e2e-spec.ts` sur cibles isolées : CA correcte/incorrecte runtime ET CLI, refus de connexion, délais configurés, diagnostics sans secrets, arrêt du client/pool ; vérifier les paramètres CLI 7.10.0 réellement supportés et corriger leur construction sans désactiver TLS (après T019).
- [X] T021 [US2] Exécuter les suites `apps/api/test/database-migrations.e2e-spec.ts` et `apps/api/test/database-permissions.e2e-spec.ts` sur projets autorisés ; vérifier version PostgreSQL, répétition, historique/droits, conflit intact et reprise après échec/timeout ; consigner résultats réels dans `specs/10-migrate-prisma/quickstart.md` (après T014–T020).

**Checkpoint**: initialisation et droits prouvés ; si un projet isolé manque, conserver les tâches de validation ouvertes et expliciter le blocage.

## Phase 5: US3 — Maintenir un seul mécanisme (P2)

**Goal**: éliminer le workflow TypeORM et documenter le workflow Prisma reproductible.

**Independent Test**: suivre uniquement le README pour préparer une base isolée ; generate/build offline sans secret migration, démarrage sans DDL, scripts run/show cohérents, aucune dépendance opérationnelle TypeORM.

- [X] T022 [P] [US3] Compléter `apps/api/src/database/prisma.service.spec.ts` pour le démarrage sans credential migration et sans appel de migration, et ajouter les contrôles scripts/config offline dans `apps/api/test/prisma-tooling.spec.ts` : generate/validate/build et import Node du dist sans loader TypeScript (après T012 et T019).
- [X] T023 [P] [US3] Réécrire les instructions de `apps/api/README.md` : versions figées, génération/build, variables runtime/CLI/CA distinctes, droits préprovisionnés, dev/shadow isolés, migration:run/show, nonzero sur attente, diagnostic/reprise après timeout et interdiction de reset implicite ; fournir exemples sans secrets.
- [X] T024 [US3] Retirer TypeORM et @nestjs/typeorm de `apps/api/package.json` et `bun.lock`, supprimer `apps/api/src/users/user.entity.ts`, `apps/api/src/database/data-source.ts`, `apps/api/src/database/database.logger.ts` et l’ancienne migration `apps/api/src/database/migrations/1791158400000-CreateForestUsers.ts` ; rechercher et adapter toute référence opérationnelle restante sans effacer les documents historiques (après T013 et T021).
- [X] T025 [US3] Vérifier `apps/api/package.json`, `apps/api/tsconfig.build.json` et `apps/api/test/prisma-tooling.spec.ts` après retrait : génération/build sans secret migration, client dist importable, scripts run/show à jour, runtime sans DDL ; rejouer le guide `apps/api/README.md` sur projet isolé et consigner la preuve dans `specs/10-migrate-prisma/quickstart.md` (après T022–T024).

## Phase 6: Polish & validation transversale

**Purpose**: confirmer tous les critères et rendre les limites vérifiables.

- [X] T026 Exécuter install frozen-lockfile, prisma:validate, prisma:generate, build, lint, test et test:e2e selon `apps/api/package.json` ; vérifier arrêt des processus, absence de TypeORM opérationnel et de secrets dans le diff/logs, puis enregistrer résultats, échecs préexistants et contrôles indisponibles dans `specs/10-migrate-prisma/quickstart.md` (après T025).
- [X] T027 Rapprocher les preuves des FR-001 à FR-009 et SC-001 à SC-004 dans `specs/10-migrate-prisma/quickstart.md`, revalider la constitution et les contrats `specs/10-migrate-prisma/contracts/` ; ne déclarer complet qu’après preuves TLS, permissions, migrations répétées et compatibilité HTTP (après T026).

## Dependencies & Execution Order

Phase 1 → Phase 2 → développement US1/US2 → US2 validée → US1 validée → US3 → validation finale.

- T001 précède les remplacements ; T002 → T003.
- Après Setup, T004 et T005 sont indépendantes ; T004 → T006 ; T005/T006 → T007 → T008.
- US1 : T009 et T010 parallèles après fondations ; T010 → T011 → T012. T013 attend T021 : une vraie base initialisée est nécessaire à la preuve HTTP.
- US2 : T014/T015/T016 parallèles après fondations ; T017 → T018 → T019 → T020 → T021. T018 attend aussi T016. La preuve T021 attend toutes les suites de US2.
- US3 : T022 et T023 parallèles après T012/T019 ; T024 attend les validations T013/T021 ; T025 attend T022/T023/T024.
- T026 → T027 : validation complète, aucune publication Git ou opération de déploiement prévue par ce document.

## Parallel Examples

- **US1** : après Phase 2, T009 (`test/users.e2e-spec.ts`) et T010 (`src/users/user.ts`) peuvent avancer ensemble ; T011/T012 restent séquentielles.
- **US2** : T014 (migrations), T015 (permissions) et T016 (wrapper) modifient des fichiers distincts ; attendre T019 avant exécutions SQL, sans lancer plusieurs suites contre les mêmes fixtures.
- **US3** : après T012/T019, T022 (tests lifecycle/tooling) et T023 (README) sont indépendantes. T024 ne s’exécute pas en parallèle de mutations du manifest ou du lockfile.
- US1 et US2 peuvent être développées ensemble après fondations, mais T013 attend l’initialisation validée. Ne pas paralléliser T003/T019/T024 sur `apps/api/package.json` ni les écritures partagées de preuves.

## Implementation Strategy

MVP démontrable : fondations + opérations US1 + initialisation US2 nécessaire à leurs tests. US1 seule n’est pas livrable sur une base neuve sans cette initialisation ; ne pas masquer cette dépendance pour respecter un MVP théorique.

Conserver les contrats avant toute correction fonctionnelle. Préparer puis valider la configuration/client, développer les deux parcours P1, prouver droits/TLS/migrations et HTTP, puis supprimer TypeORM et finaliser le workflow P2. Un accès distant absent laisse ses tâches ouvertes ; les contrôles offline peuvent continuer. Les tâches sont une préparation de l’implémentation, aucune n’a été exécutée par Tasks.
