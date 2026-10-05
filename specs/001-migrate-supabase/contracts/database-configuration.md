# Contrat de configuration et migrations

| Variable | Usage | Règle |
| --- | --- | --- |
| DATABASE_URL | connexion API | obligatoire, URL postgres/postgresql complète, rôle forest_app |
| MIGRATION_DATABASE_URL | CLI uniquement | obligatoire pour migrations, rôle de migration distinct |
| DATABASE_SSL_CA_PATH | CA serveur | optionnel si chaîne reconnue ; fichier PEM lisible sinon |
| DATABASE_POOL_SIZE | runtime | entier positif, défaut 5 |
| DATABASE_CONNECT_TIMEOUT_MS | connexion | entier positif, défaut 10000 |
| DATABASE_QUERY_TIMEOUT_MS | requête | entier positif, défaut 15000 |
| TEST_DATABASE_URL | e2e | obligatoire pour tests distants, remplace DATABASE_URL uniquement dans le runner |
| TEST_MIGRATION_DATABASE_URL | préparation e2e | accès migration au même projet de test isolé |
| TEST_CONFLICT_MIGRATION_DATABASE_URL | e2e conflit | troisième projet jetable sans table user ni historique |
| PRODUCTION_DATABASE_PROJECT_REF | garde e2e | référence production obligatoire, ou none si aucun projet production |
| TEST_DATABASE_CONFIRM_ISOLATED | garde e2e | valeur true obligatoire avant toute écriture de test |

Aucun fallback DB_USER/DB_PASSWORD/DB_NAME ou localhost. Rejeter URL incomplète, protocole
incorrect, conflit d'options SSL dans l'URL et nombres invalides. Ne jamais inclure les
valeurs saisies dans le diagnostic. TLS vérifié dans l'API et la CLI ; aucun mode insecure.
Les URLs de test et de migration doivent viser le même projet isolé et ne pas correspondre
au projet de production configuré. Le runner refuse de démarrer si la cible n'est pas
explicitement déclarée isolée. Le drapeau seul n'est pas une preuve de cette isolation :
les instructions font vérifier le projet sélectionné avant lancement.

Scripts à livrer dans apps/api/package.json : migration:run et migration:show.
Ils chargent la configuration explicitement et utilisent le DataSource JS compilé
via dist/database/migrate.js (tsconfig.build.json impose rootDir=src).
Le runner utilise directement le DataSource TypeORM, pour filtrer les erreurs de la CLI standard.
Le processus de migration ne démarre pas NestJS. Le runtime ne requiert pas les credentials
DDL et n'exécute pas de migrations automatiquement.

Provisionnement initial par administrateur privé : rôles séparés, grants nécessaires au
rôle de migration pour ses objets seulement, secret transmis hors dépôt. Migrations :
création de table/séquence, RLS et grants forest_app ; revoke anon/authenticated/PUBLIC.
Le rôle API ne peut ni altérer le schéma, ni lire auth/storage. Une seconde migration:run
sans changement ne crée aucun doublon. Une table user non suivie déclenche un échec.

En cas d'échec : arrêt explicite, pas de DROP/reset automatique. Le retrait de l'ancienne
base vide est autorisé ; cette permission n'autorise pas un effacement Supabase.
