# Persistence workflow contract

## Configuration

Variables préservées : DATABASE_URL pour forest_app, MIGRATION_DATABASE_URL pour forest_migration ; DATABASE_SSL_CA_PATH avec expansion HOME/PWD existante ; DATABASE_POOL_SIZE=5, DATABASE_CONNECT_TIMEOUT_MS=10000, DATABASE_QUERY_TIMEOUT_MS=15000 par défaut. Entiers strictement positifs et URLs PostgreSQL complètes sans paramètres arbitraires. Secrets uniquement externes.

Le runtime exige uniquement sa configuration et ne lit pas les credentials migration. Adapter pg avec TLS vérifié ; CA invalide/refusée échoue. La CLI charge la configuration migration et construit ses paramètres TLS indépendamment ; l’objet TLS runtime ne la configure pas. Le wrapper borne l’exécution à 120000 ms par défaut via MIGRATION_COMMAND_TIMEOUT_MS proposé, validé positif.

## Commands

| Script API cible | Effet | Conditions / sortie |
| --- | --- | --- |
| prisma:generate | génération client ESM | offline, pas de secret migration nécessaire |
| prisma:validate | validation du modèle/config | offline, pas de secret migration nécessaire |
| build | génération puis compilation Nest | sortie dist importable en Node ESM |
| migration:show | Prisma migrate status | état assaini ; 0 si à jour, nonzero si migrations en attente ou anomalie |
| migration:run | Prisma migrate deploy | migrations versionnées en attente uniquement ; sortie assainie |
| test:e2e | build puis suites isolées | garde d’isolation exécutée avant toute connexion |

Le wrapper appelle le CLI 7.10.0 installé sans téléchargement opportuniste, charge `.env` sans écraser les variables fournies, garde stdout/stderr privés et renvoie messages fixes/codes de sortie. show distingue attente, divergence et panne si le code/format du CLI le permet sans parsing fragile ; sinon message générique et état nonzero, sans annoncer succès.

## Safety and lifecycle

Runtime singleton connecté avant readiness et fermé au shutdown. Aucun DDL, auto-sync ou migration au démarrage. Droits et RLS vérifiés après initialization. Migration exclusive avec le mécanisme Prisma et timeout borné ; timeout ne prouve pas un rollback. Historique relu avant nouvelle tentative. Aucun reset, db push, résolution d’historique ou commande destructive implicite.

Tests utilisent TEST_DATABASE_URL, TEST_MIGRATION_DATABASE_URL, TEST_DATABASE_CONFIRM_ISOLATED=true et PRODUCTION_DATABASE_PROJECT_REF ; préservation de la garde existante. Le scénario de conflit peut réutiliser le même projet isolé : globalSetup vérifie un historique TypeORM factice puis retire uniquement sa fixture avant les suites. TEST_CONFLICT_MIGRATION_DATABASE_URL peut donc être identique à TEST_MIGRATION_DATABASE_URL. Aucune variable réelle ne figure dans les artefacts.

Mode explicite MIGRATION_CLI_MODE=native (défaut) ou docker. Le mode Docker utilise
l’image locale Prisma 7.10.0 construite depuis le Dockerfile.cli, monte modèle et
certificat en lecture seule et maintient sslmode=require/sslaccept=strict. Il
contourne le refus TLS natif macOS sans désactiver la vérification. Le conteneur
est supprimé après exécution, y compris après deadline.
