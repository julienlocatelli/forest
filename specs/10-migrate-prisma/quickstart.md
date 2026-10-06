# Validation guide — Prisma

Guide proposé après implémentation. Aucune commande de migration ni suite distante n’a été exécutée pendant Plan. Exécuter depuis `apps/api` ; consulter les contrats `users-api.md` et `persistence-workflow.md` et le modèle avant validation.

## Prerequisites

Node 24, Bun 1.3.14, dépendances figées 7.10.0 dans le lockfile. Un projet Supabase neuf et isolé, avec forest_app et forest_migration préprovisionnés suivant le README API ; accès réseau direct ou session5432 et CA vérifiée. Aucun rôle runtime BYPASSRLS. Le conflit peut utiliser le même projet de test isolé : son globalSetup précède toutes les suites et retire uniquement sa propre fixture d’historique TypeORM. Configurer les variables externes de test décrites dans le contrat ; ne pas les copier dans Git ou dans les logs.

Vérifier les références des projets et l’absence d’objets Forest avant première application. Les schémas Auth/Storage ne sont pas supprimés. La suite rejette une destination production ou le projet applicatif configuré. Une base contenant des données inattendues impose un arrêt et une replanification.

## Offline checks

Scripts proposés, à créer pendant l’implémentation :

```bash
bun install --frozen-lockfile
bun run prisma:validate
bun run prisma:generate
bun run build
bun run lint
bun run test
```

Attendu : génération et build sans MIGRATION_DATABASE_URL, types/imports ESM valides, aucun TypeORM opérationnel restant ; tests unitaires configuration, URL, CA, délais, lifecycle et mapping. Le runtime de production doit importer le client compilé sans loader TypeScript. Vérifier les chemins dist après génération.

## Isolated integration

```bash
bun run test:e2e
```

La suite doit initialiser le projet de test avec les credentials migration remappés par sa garde, appliquer deux fois et vérifier historique + schéma. Ne pas lancer migration:run directement sur les valeurs applicatives de `.env` pour contourner cette garde.

| Scénario | Résultat attendu |
| --- | --- |
| Initialisation neuve puis répétition | état à jour, aucune réapplication, lignes conservées |
| Création/liste/lecture/suppression | contrats HTTP inchangés |
| Redémarrage et suppression répétée | données restantes persistantes, suppression absente 200 |
| Entrées invalides existantes | GET invalide 400, POST incomplet 500 ; DELETE caractérisé |
| Droits runtime | CRUD permis, DDL et accès Auth/Storage interdits |
| Accès publics | table, séquence et historique interdits aux rôles publics |
| TLS/CA, runtime et CLI séparément | CA correcte acceptée, incorrecte rejetée, aucune désactivation TLS |
| Secrets/config manquants | échec diagnostiquable, aucune valeur sensible dans logs |
| Timeout/connexion refusée | échec borné ; état distant vérifié avant reprise |
| Destination avec table non suivie | arrêt, marqueur existant intact, aucun reset/adoption |
| Arrêt applicatif | pool/client libérés, processus termine |

## Operator workflow

Une fois les credentials de la destination autorisée configurés et vérifiés, les scripts migration:show et migration:run permettent consultation et application explicites. Les commandes ne démarrent pas avec l’application ; aucun déploiement automatique ajouté.

Une migration en échec est examinée avant toute réparation. Si la transaction initiale a échoué, vérifier objets et historique ; une résolution Prisma nécessite une décision opérateur explicite documentée. Après arrivée de données, aucune procédure d’effacement n’est autorisée par ce ticket.

## Evidence to record

Consigner versions, commandes, codes de sortie, cas testés et résultats assainis. Une suite distante non exécutée reste un blocage de preuve, pas un test réussi. Vérifier que tout SC-001 à SC-004 est couvert avant clôture de l’implémentation ; aucun gain de latence revendiqué.

## Implementation evidence — 2026-10-06

T001 : validation TypeORM distante indisponible : aucune variable TEST_* configurée. Contrats inspectés dans les tests existants ; DELETE invalide reste à caractériser réellement. Première installation bloquée par workspace infra/db absent ; référence obsolète retirée.

Adaptation constatée : les suites existantes sont database-migrations.e2e-spec.ts et database-permissions.e2e-spec.ts ; chemins corrigés dans tasks.md. SQL initial généré avec migrate diff --from-empty, sans base shadow ni connexion. Retrait des fichiers TypeORM avancé pour garder un build cohérent après changement de configuration ; T024 et livraison restent conditionnés aux preuves distantes.

### État réel des contrôles locaux

- Installation frozen-lockfile : PASS après retrait de la référence infra/db absente.
- Prisma validate/generate offline : PASS sans DATABASE_URL ni MIGRATION_DATABASE_URL (tests subprocess).
- Build Nest et import du client compilé/app.module.js en Node ESM : PASS.
- Vitest : 30 tests / 7 fichiers PASS ; configuration, isolation, processus CLI, projection User et connexion refusée locale.
- Typecheck tsc --noEmit sur sources ET tests : PASS ; lint : zéro avertissement/erreur.
- Test de readiness : RED avec $connect seul (pool lazy), GREEN après SELECT 1 réel avant readiness.
- TypeORM e2e de référence : non exécutée, garde TEST_DATABASE_CONFIRM_ISOLATED absente ; aucune connexion distante.
- Intégration Prisma HTTP/SQL/CA : non exécutée faute de variables TEST_* des projets isolés.

### Tâches restant ouvertes

T009 : DELETE invalide reste à caractériser sur l’existant pour compléter son scénario. T013, T020, T021 : preuves distantes HTTP, TLS, migrations/droits/reprise. T024 : retrait local effectué mais gate de validation préalable non satisfait. T025 : procédure README à rejouer sur base isolée. T026/T027 : validation globale et couverture finale impossibles sans ces preuves. Ticket maintenu Doing ; pas de Review, commit, push ou PR automatique.

### Couverture provisoire

FR-001/003/006/007 : code et contrôles locaux fournis ; FR-002 et SC-001 attendent e2e HTTP. FR-004/005/008 et SC-002/003 attendent SQL, CA réelle et permissions. FR-009 : aucune donnée distante touchée, garde de conflit implémentée, preuve d’intégration restante. SC-004 attend le rejeu opérateur. Ne pas utiliser les tests unitaires comme preuve SQL.

### Validation TLS et intégration — 2026-10-06

Le CLI Prisma natif macOS refuse la chaîne du pooler (P1011), tandis que Node
valide sa chaîne et son nom. Le mode explicite MIGRATION_CLI_MODE=docker
exécute le CLI Prisma 7.10.0 sous Linux avec sslmode=require et sslaccept=strict,
sans modifier le trousseau macOS ni accepter des certificats invalides. Image
construite et mode configuré localement ; instructions dans le README API.

Depuis la racine, `bun run --filter @forest/api test:e2e` : 5 fichiers, 8 tests
réussis sur le projet jetable. Preuves : refus du conflit et préservation de sa
fixture, migrations répétées, persistance HTTP après redémarrage, permissions
SQL, connexion runtime et CLI vérifiée, rejet d’une CA invalide dans les deux
parcours. La base applicative n’a pas été migrée par cette validation.

## Validation finale pour la PR — 2026-10-06

- Ancien repository TypeORM 1.1.1 exécuté sur la base isolée avec le modèle
  équivalent, sans synchronisation : DELETE non numérique rejette avec SQLSTATE
  22P02. Nest mappe cette exception non interceptée en 500. La suite HTTP Prisma
  vérifie 500 pour DELETE invalide, dont notation scientifique, et la conservation
  de la ligne visée ; GET invalide 400 et POST incomplet 500 sont préservés.
- Frozen lockfile, validate, generate et build : succès. Import dist en Node ESM
  sans loader et typecheck sources/tests : succès. Lint : zéro erreur/avertissement.
- Unitaires : 31/31. E2E : 9/9, 5 fichiers, sur PostgreSQL Supabase 17.11.
  Timeout CLI forcé (1 ms) : code 124, historique inchangé relu avant reprise,
  show puis run réussis. Aucun rollback n’est présumé lors d’une interruption
  réelle d’un DDL ; l’opérateur doit inspecter historique et schéma avant réparation.
- Guide opérateur rejoué depuis la racine avec les credentials de test externes :
  show/run/run/show tous code 0. Aucun conteneur forest-prisma résiduel.
- Aucun TypeORM opérationnel dans sources/tests/manifests/lockfile. Les mentions
  des artefacts historiques décrivent le point de départ. Aucun déploiement ni
  migration de la base applicative réalisé.

| Critères | Preuves finales |
| --- | --- |
| FR-001, FR-007 | client Prisma unique, retrait ORM/runner, recherche opérationnelle et lockfile |
| FR-002, FR-003, SC-001 | HTTP création/liste/lecture/suppression, champs exacts, IDs uniques, défaut true, cas invalides et absence |
| FR-004, SC-002 | première installation réellement passée, répétition avec fixture conservée, persistance après redémarrage |
| FR-005, SC-003 | SQL permissions/RLS, CA acceptée et rejetée runtime/CLI, erreurs fixes sans secrets |
| FR-006 | readiness par SELECT 1, runtime sans DDL, droits sans CREATE, arrêt client/pool |
| FR-008 | 31 unitaires et 9 e2e ; timeout, reprise et historique relu |
| FR-009 | conflit préservé puis seule fixture retirée, aucun reset/adoption automatique |
| SC-004 | guide rejoué, scripts documentés et client offline importable |

Constitution 1.0.0 revalidée : changement limité au ticket, contrats préservés,
permissions et secrets conservés, preuves réelles de persistance. Les deux écarts
au plan sont documentés : projet de test unique autorisé et CLI Docker explicite
pour TLS macOS. Confiance élevée sur la livraison testée ; risque principal :
initialisation applicative encore à effectuer explicitement après revue, sans
adoption automatique d’un éventuel historique TypeORM. Les preuves partielles
ci-dessus sont historiques ; cette section donne l’état final.
