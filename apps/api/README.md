# Forest API — Supabase PostgreSQL

NestJS utilise Prisma ORM 7.10.0 (CLI, client et adapter-pg figés) ; Supabase héberge PostgreSQL. Aucun Auth, Storage, Realtime
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
bun run prisma:validate
bun run prisma:generate
bun run build
bun run migration:show
bun run migration:run
bun run migration:run
bun run migration:show
PORT=3001 bun run dev
```

Renseigner .env avant les commandes ; il est exclu de Git. PORT=3001 évite le port 3000
du frontend. Les scripts de migration chargent .env explicitement et utilisent
le wrapper du CLI Prisma local compilé sous dist/database/migrate.js ; aucun ts-node n'est nécessaire.
Le second migration:run ne doit appliquer aucune migration. Le runtime ne demande
que DATABASE_URL, ne crée aucune extension et n'exécute pas de DDL/migration au démarrage.
MIGRATION_DATABASE_URL n'est utilisé que par les commandes de migration.

Paramètres : pool 5 connexions par processus, connexion 10 s, requête 15 s ; adapter le
pool aux quotas Supabase et au nombre de réplicas. La connexion doit réussir avant que le serveur accepte les requêtes ; le client est fermé au shutdown.
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
La suite database-connectivity.e2e-spec.ts vérifie séparément la CA runtime et CLI, le refus de connexion et la fermeture des ressources.

## Échecs et reprise

Une table public.user déjà présente sans historique bloque la migration : aucun DROP,
reset ou adoption silencieuse. La migration initiale utilise une transaction explicite ; un timeout impose une relecture de l’état distant avant reprise. Aucun rollback
destructif automatique n'est proposé. Les commandes indiquent un échec générique sans
secret ; vérifier configuration, rôles, certificat, réseau et conflits de schéma.
Le statut show retourne 0 quand le schéma est à jour et nonzero en cas d’attente ou d’anomalie, sans imprimer de paramètres sensibles. Le wrapper borne le CLI à 120000 ms (MIGRATION_COMMAND_TIMEOUT_MS, entier positif) et masque sa sortie brute.

Une base neuve utilise `migration:run`. Une table utilisateur sans historique Prisma
bloque cette commande ; aucune suppression ou adoption implicite.

Le schéma courant est géré par Prisma. La reprise ponctuelle de la base de
développement a été effectuée ; aucun mécanisme TypeORM ne reste dans l’application.
Depuis la racine, `bun dev` lance les workspaces et charge `apps/api/.env` pour l’API.
Les tables absentes produisent un diagnostic `DATABASE_SCHEMA`, sans erreur brute
ni secret. Le démarrage HTTP ne modifie pas le schéma.

## Chemin du certificat avec variables

DATABASE_SSL_CA_PATH accepte `${HOME}` (répertoire personnel) et `${PWD}` (répertoire
courant du processus). Depuis apps/api, par exemple :

```dotenv
DATABASE_SSL_CA_PATH=${PWD}/../../infra/certs/prod-supabase.crt
```

Ou depuis n'importe quel répertoire sur cette machine :

```dotenv
DATABASE_SSL_CA_PATH=${HOME}/Developer/forest/infra/certs/prod-supabase.crt
```

Cette expansion s'applique au chemin du certificat dans l'API et le runner de migrations.
Les URL et mots de passe sont conservés littéralement. Les autres variables de chemin
sont refusées avec un diagnostic sans valeur sensible.

## Workflow du modèle

`prisma/schema.prisma` décrit le modèle ; `prisma/migrations` porte le SQL revu et les droits/RLS non représentés par le modèle. Le client généré dans `src/generated/prisma` est exclu de Git et doit être régénéré avant compilation. generate/validate/build ne nécessitent aucun secret migration. Aucun DDL au démarrage.

Pour une évolution future, générer un draft `prisma migrate dev --create-only` seulement sur développement et shadow dédiés, avec les rôles nécessaires préprovisionnés. Ne jamais utiliser production comme shadow. L’initialisation de ce ticket a été générée offline avec migrate diff --from-empty puis complétée par les droits SQL.

Le runtime utilise DATABASE_URL sans query parameters et un objet TLS pg vérifié. Le wrapper construit séparément la configuration TLS du moteur CLI via MIGRATION_DATABASE_URL ; DATABASE_SSL_CA_PATH est validé puis transmis comme sslcert. Cette compatibilité doit être confirmée sur le projet de test avant livraison. Ne jamais contourner un échec CA par une désactivation TLS. Les credentials migration ne sont pas nécessaires au démarrage applicatif.

### CLI de migration sous Linux sur macOS

Le moteur TLS natif macOS de Prisma peut refuser la chaîne du pooler Supabase
alors que le driver Node la valide. Utiliser MIGRATION_CLI_MODE=docker pour
les migrations locales dans ce cas. Docker doit fonctionner. Construire depuis
la racine : `docker build -t forest-prisma-cli:7.10.0 -f apps/api/prisma/Dockerfile.cli apps/api/prisma`.
Puis lancer depuis la racine `bun run --filter @forest/api migration:show` ou
`migration:run`. Le code et le certificat sont montés en lecture seule ; le
secret est transmis par environnement. Le CLI conserve sslmode=require et
sslaccept=strict. Le runtime continue à utiliser Node avec rejectUnauthorized=true.
Le mode native reste le défaut pour Linux ; aucun basculement silencieux.

## Local authentication

The API requires `DEFAULT_USER_EMAIL`, `DEFAULT_USER_PASSWORD` (12–128 characters)
and `AUTH_ALLOWED_ORIGINS` (comma-separated exact origins). Apply the additive Prisma
migration before starting. Startup creates an ordinary active account only if its
normalized email is absent. Existing accounts, even inactive ones, keep their password
and profile. Changing the password in `.env` does not reset it; changing the email can
create another account. Invalid configuration, unavailable database or provisioning
failure prevents HTTP readiness. No DDL or migrations run during application startup.

Endpoints: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`.
POST requests require `X-Forest-Request: 1`; login requires JSON `{email,password}`.
Tokens are returned only as HttpOnly Secure SameSite=Lax cookies. Browser clients use
`credentials: 'include'` with an allow-listed Origin. Use localhost locally, HTTPS
otherwise. Independent frontend/API sites are out of scope; proxy IP headers are not
trusted by default. Existing `/users` routes remain public, including DELETE: this
feature does not secure the entire API. OAuth/Keycloak, public registration, password
recovery and a frontend are excluded.

Access lasts 15 minutes, sessions expire absolutely after seven days. Refresh rotates
both tokens and invalidates old access. Reusing a consumed refresh token revokes the
session. Serialize refresh calls across tabs; a lost refresh response can require a
new login. Logout revokes the session and clears cookies. Expired sessions/rate windows
are cleaned at startup and hourly. Password changes require a separate future workflow.

Login limits: 20/IP and 5/email per five-minute fixed window; refresh: 60/IP per minute.
PostgreSQL counters are shared. Email limits can temporarily block a targeted account;
there is no permanent lockout. Internal audit events contain only outcome, correlation
and optional user ID. Passwords, emails, tokens, bodies and raw driver errors are excluded.
Scrypt permits two active jobs and sixteen waiting per process; overflow returns 503.

E2E tests always replace `.env` auth credentials with unique synthetic accounts, target
the explicitly isolated project and remove owned fixtures. Never target application or
production databases. Full validation guide: `specs/6-user-login-route/quickstart.md`.
