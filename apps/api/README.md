# Forest API — Supabase PostgreSQL

NestJS conserve TypeORM ; Supabase héberge PostgreSQL. Aucun Auth, Storage, Realtime
ou accès direct aux données depuis le navigateur n'est ajouté. Les routes utilisateurs
existantes restent sans authentification : ne pas exposer cette API publiquement sans
traiter ce point dans une feature dédiée.

## Environnements et accès

Créer un projet Supabase pour l'application et un autre projet dédié aux tests.
Activer SSL enforcement dans les réglages de base de données. Dans Connect, copier
une connexion directe si IPv6 disponible ou Session pooler IPv4 sur port 5432.
Ne pas recomposer l'hôte. Pour un rôle personnalisé via pooler, utiliser
forest_app.PROJECT_REF ou forest_migration.PROJECT_REF comme nom de connexion.
Encoder les caractères réservés du mot de passe et retirer les query parameters de l'URL.
Le client impose TLS avec validation du certificat. Si une CA est requise, télécharger
le certificat du projet et fournir son chemin via DATABASE_SSL_CA_PATH ; ne jamais
utiliser rejectUnauthorized=false.

## Provisionnement initial

Dans chaque projet dédié, exécuter en administrateur privé les commandes suivantes.
Elles ne contiennent pas de secrets ; si un rôle existe déjà, examiner sa définition
avant de poursuivre plutôt que de le remplacer silencieusement.

```sql
CREATE ROLE forest_migration LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
CREATE ROLE forest_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
GRANT CONNECT ON DATABASE postgres TO forest_app, forest_migration;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO forest_migration;
GRANT USAGE ON SCHEMA public TO forest_app;
```

La révocation de CREATE pour PUBLIC concerne un projet dédié ; si le projet est partagé,
évaluer préalablement ses autres consommateurs. Le rôle de migration possède les objets
Forest qu'il crée. Ne donner aucune appartenance à un rôle administrateur au runtime.
Configurer les mots de passe avec un client PostgreSQL interactif connecté en administrateur :

```text
\password forest_migration
\password forest_app
```

Ne pas inscrire les mots de passe dans un script versionné, une commande shell ou un
éditeur SQL conservant son historique. Les rôles runtime et migration ne doivent pas
avoir de grants sur auth/storage. Vérifier les grants hérités dans le projet ; les tests
signalent toute permission excessive. Sur un projet uniquement utilisé par Forest,
désactiver la Data API inutilisée. Sinon conserver ses réglages globaux : la migration
révoque les droits anon/authenticated/PUBLIC sur les seuls objets Forest et active RLS.

## Installation et configuration

Depuis la racine : `bun install --frozen-lockfile`. Les versions Node et Bun sont dans
mise.toml. Dans apps/api :

```sh
cp .env.example .env
bun run build
bun run migration:show
bun run migration:run
bun run migration:run
bun run migration:show
PORT=3001 bun run dev
```

Renseigner .env avant les commandes ; il est exclu de Git. PORT=3001 évite le port 3000
du frontend. Les scripts de migration chargent .env explicitement et utilisent
le runner TypeORM compilé sous dist/database/migrate.js ; aucun ts-node n'est nécessaire.
Le second migration:run ne doit appliquer aucune migration. Le runtime ne demande
que DATABASE_URL, ne crée aucune extension et n'exécute pas de DDL/migration au démarrage.
MIGRATION_DATABASE_URL n'est utilisé que par les commandes de migration.

Paramètres : pool 5 connexions par processus, connexion 10 s, requête 15 s ; adapter le
pool aux quotas Supabase et au nombre de réplicas. Trois tentatives de démarrage au maximum.
DATABASE_POOL_SIZE, DATABASE_CONNECT_TIMEOUT_MS et DATABASE_QUERY_TIMEOUT_MS doivent
être des entiers positifs. Les logs excluent les URL, erreurs brutes du driver et SQL.

## Validation

```sh
bun run test
bun run build
bun run lint
bun run test:e2e
```

test:e2e compile l'application pour préserver les métadonnées NestJS puis charge .env.
Renseigner TEST_DATABASE_URL et TEST_MIGRATION_DATABASE_URL avec le même projet isolé,
distinct des URLs applicatives. Fournir la référence de production via
PRODUCTION_DATABASE_PROJECT_REF (ou none si aucun projet de production n'existe).
Après confirmation du projet dans le Dashboard, définir TEST_DATABASE_CONFIRM_ISOLATED=true.
Sans cette garde, les suites refusent de démarrer. Elles exécutent les migrations et
créent/nettoient uniquement leurs propres fiches. Aucune lecture de la base locale.
Les suites vérifient CRUD, persistance après redémarrage, migrations répétées et permissions.
TEST_CONFLICT_MIGRATION_DATABASE_URL vise un troisième projet jetable, provisionné avec
les rôles mais sans table user ni historique. La suite y crée puis supprime uniquement
sa table fixture ; elle refuse les objets préexistants et ne modifie pas la source locale.
Le test nettoie aussi son historique créé sur ce projet initialement vide.
Les essais Data API/TLS défaillant restent manuels selon le quickstart.

## Échecs et retrait de l'ancien service

Une table public.user déjà présente sans historique bloque la migration : aucun DROP,
reset ou adoption silencieuse. Une migration échouée est transactionnelle ; aucun rollback
destructif automatique n'est proposé. Les commandes indiquent un échec générique sans
secret ; vérifier configuration, rôles, certificat, réseau et conflits de schéma.
Le statut show indique s'il reste des migrations, sans imprimer de paramètres sensibles.

La base locale est déclarée vide par l'utilisateur : aucun contrôle de contenu, sauvegarde
ou import n'est requis. Après validation Supabase, retirer l'ancien workspace et ses
ressources dédiées selon les tâches de la feature. Aucun prune global ni effacement
Supabase n'est autorisé par cette instruction.

## Chemin du certificat avec variables

DATABASE_SSL_CA_PATH accepte `${HOME}` (répertoire personnel) et `${PWD}` (répertoire
courant du processus). Depuis apps/api, par exemple :

```dotenv
DATABASE_SSL_CA_PATH=${PWD}/../../infra/cert/prod-supabase.crt
```

Ou depuis n'importe quel répertoire sur cette machine :

```dotenv
DATABASE_SSL_CA_PATH=${HOME}/Developer/forest/infra/cert/prod-supabase.crt
```

Cette expansion s'applique au chemin du certificat dans l'API et le runner de migrations.
Les URL et mots de passe sont conservés littéralement. Les autres variables de chemin
sont refusées avec un diagnostic sans valeur sensible.
