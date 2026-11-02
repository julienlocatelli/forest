# Forest API — PostgreSQL sur Neon

NestJS utilise Prisma ORM 7.10.0 (CLI, client et adapter-pg figés) ; Neon héberge PostgreSQL.
Aucun accès direct aux données depuis le navigateur n'est ajouté. Les routes utilisateurs
existantes restent sans authentification : ne pas exposer cette API publiquement sans
traiter ce point dans une feature dédiée.

## Environnements

Forest utilise un seul projet Neon et deux de ses branches :

- la branche par défaut porte la base de l'application (`DATABASE_URL`,
  `MIGRATION_DATABASE_URL`) ;
- la branche enfant `test` porte la base des suites `test:e2e` et des scénarios Cucumber
  (`TEST_DATABASE_URL`, `TEST_MIGRATION_DATABASE_URL`).

Chaque branche a son propre endpoint, identifié par l'ID `ep-…` de son hôte, et une seule
base `neondb`. Une branche copie les rôles, mots de passe compris, et les données de sa
branche parente au moment de sa création. Réinitialiser la branche `test` depuis la branche
par défaut, ou la recréer, y copie donc les données de l'application : le faire seulement
quand ces données peuvent servir aux tests, et sinon vider les tables Forest de `test`
avant de lancer les suites.

## Provisionnement initial

1. Dans la console Neon, créer le projet, puis ouvrir **SQL Editor** sur la base `neondb`
   de la branche par défaut avec le rôle propriétaire (`neondb_owner`). Les rôles créés en
   SQL ne reçoivent pas `neon_superuser`, contrairement à ceux créés depuis la console.

   ```sql
   CREATE ROLE forest_migration LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
   CREATE ROLE forest_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
   GRANT CONNECT ON DATABASE neondb TO forest_app, forest_migration;
   REVOKE CREATE ON SCHEMA public FROM PUBLIC;
   GRANT USAGE, CREATE ON SCHEMA public TO forest_migration;
   GRANT USAGE ON SCHEMA public TO forest_app;
   ```

   Si un rôle existe déjà, examiner sa définition avant de poursuivre plutôt que de le
   remplacer silencieusement. Le rôle de migration possède les objets Forest qu'il crée.
   Ne donner aucune appartenance à un rôle administrateur au runtime.

2. Définir les mots de passe depuis `psql` connecté avec le rôle propriétaire. Neon
   n'accepte que des mots de passe en clair : `\password` échoue, car il envoie un hash.
   `\prompt` lit le mot de passe sans l'afficher ; `PSQL_HISTORY=/dev/null` évite de
   l'écrire dans l'historique.

   ```text
   \prompt 'Mot de passe forest_migration : ' pw
   ALTER ROLE forest_migration WITH PASSWORD :'pw';
   \prompt 'Mot de passe forest_app : ' pw
   ALTER ROLE forest_app WITH PASSWORD :'pw';
   ```

   Ne pas inscrire les mots de passe dans un script versionné, une commande shell ou un
   éditeur SQL conservant son historique.

3. Créer la branche enfant `test` depuis la branche par défaut tant que celle-ci ne contient
   aucune donnée de l'application. Elle hérite des rôles et de leurs mots de passe ; un
   mot de passe changé ensuite sur l'une des branches ne change pas sur l'autre.

## Connexion et TLS

Dans **Connect**, copier pour chaque branche deux URL sans query parameters, en encodant
les caractères réservés du mot de passe :

| Variable | Branche | Rôle | Hôte |
| --- | --- | --- | --- |
| `DATABASE_URL` | par défaut | `forest_app` | poolé, `ep-…-pooler` |
| `MIGRATION_DATABASE_URL` | par défaut | `forest_migration` | direct, `ep-…` |
| `TEST_DATABASE_URL` | `test` | `forest_app` | poolé, `ep-…-pooler` |
| `TEST_MIGRATION_DATABASE_URL` | `test` | `forest_migration` | direct, `ep-…` |

Le runtime passe par le pooler ; le CLI de migration exige une connexion directe. Les
migrations s'exécutent nativement, y compris sous macOS.

Le client impose TLS avec validation du certificat ; ne jamais utiliser
`rejectUnauthorized=false`. Aucun fichier CA n'est nécessaire : Neon présente un
certificat d'une autorité publique, vérifié avec les racines du système par l'API et par
le CLI de migration.

Neon suspend le calcul d'une branche après 5 minutes d'inactivité. La première connexion
le réveille en quelques secondes, dans le délai `DATABASE_CONNECT_TIMEOUT_MS` (10 s par
défaut).

## Garde-fou des tests

Après vérification de la branche `test` dans la console, définir
`TEST_DATABASE_CONFIRM_ISOLATED=true`. Le garde-fou identifie chaque branche par l'ID
d'endpoint `ep-…` de son hôte et refuse de démarrer les suites si :

- une URL n'est pas un endpoint Neon ;
- `TEST_DATABASE_URL` n'utilise pas l'hôte poolé, ou `TEST_MIGRATION_DATABASE_URL` pas
  l'hôte direct ;
- les deux URL de test ne partagent pas le même endpoint ;
- l'endpoint de test est celui de l'application ou `PRODUCTION_DATABASE_PROJECT_REF`
  (ID d'endpoint de production, ou `none` si aucune production n'existe).

Les rôles d'administration de Neon (`neondb_owner`, `neon_service`) lisent et écrivent
toutes les tables via `pg_read_all_data` et `pg_write_all_data` ; les tests de permissions
les excluent, comme les superutilisateurs, et vérifient qu'aucun autre rôle que le runtime
et le propriétaire des tables (le rôle de migration) n'accède aux tables Forest.

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
pool aux limites de connexions de Neon et au nombre de réplicas. La connexion doit réussir avant que le serveur accepte les requêtes ; le client est fermé au shutdown.
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
Renseigner les variables `TEST_*` avec la branche `test` (voir
[Garde-fou des tests](#garde-fou-des-tests)). Fournir l'endpoint de production via
PRODUCTION_DATABASE_PROJECT_REF (ou none si aucune production n'existe).
Sans cette garde, les suites refusent de démarrer. Elles exécutent les migrations et
créent/nettoient uniquement leurs propres fiches. Aucune lecture de la base locale.
Les suites vérifient CRUD, persistance après redémarrage, migrations répétées et permissions.
La suite database-connectivity.e2e-spec.ts vérifie la connexion runtime et CLI, le refus d'un certificat non vérifiable (CA auto-signée générée avec `openssl`), le refus de connexion et la fermeture des ressources.

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

## Workflow du modèle

`prisma/schema.prisma` décrit le modèle ; `prisma/migrations` porte le SQL revu et les droits/RLS non représentés par le modèle. Le client généré dans `src/generated/prisma` est exclu de Git et doit être régénéré avant compilation. generate/validate/build ne nécessitent aucun secret migration. Aucun DDL au démarrage.

Pour une évolution future, générer un draft `prisma migrate dev --create-only` seulement sur développement et shadow dédiés, avec les rôles nécessaires préprovisionnés. Ne jamais utiliser production comme shadow. L’initialisation de ce ticket a été générée offline avec migrate diff --from-empty puis complétée par les droits SQL.

Le runtime utilise DATABASE_URL sans query parameters et un objet TLS pg vérifié. Le wrapper construit séparément la configuration TLS du moteur CLI via MIGRATION_DATABASE_URL, avec `sslmode=require` et `sslaccept=strict`. Ne jamais contourner un échec de vérification par une désactivation TLS. Les credentials migration ne sont pas nécessaires au démarrage applicatif.

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
the explicitly isolated `test` branch and remove owned fixtures. Never target application or
production databases. Full validation guide: `specs/6-user-login-route/quickstart.md`.
