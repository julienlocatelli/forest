# Research — Migration Supabase

Date : 2026-10-05. Recherche sur documentation officielle et code du dépôt.

## ORM

- Decision: conserver TypeORM 1.1.1 et pg 8.23.0. Verdict : pertinent, confiance élevée.
- Rationale: une entité et un CRUD existants ; PostgreSQL distant n'exige aucun autre ORM.
- Alternatives considered: Prisma ajoute un changement de modèle et de client sans besoin
  fonctionnel ; supabase-js/Data API change le chemin d'accès et les contrats d'autorisation.
- Réexamen : nouvelle architecture avec accès frontend ou besoin démontré d'un autre outil.
- Source : [TypeORM PostgreSQL](https://typeorm.io/docs/drivers/postgres/).

## Connexion et TLS

- Decision: session pooler IPv4 pour le serveur persistant ; connexion directe si IPv6
  accessible. Copie des paramètres depuis Connect, pas de hostname recomposé.
- Rationale: pas besoin de transaction pooling serverless. TLS obligatoire avec certificat
  vérifié, CA explicite si nécessaire ; aucune option rejectUnauthorized=false.
- Alternatives considered: transaction pooler exclu du choix initial ; nécessite une revue
  des prepared statements et de l'état de session.
- Activer SSL enforcement côté projet et utiliser sa CA pour la connexion directe si nécessaire.
- Confiance élevée ; à réexaminer si le déploiement devient serverless.
- Sources : [Supabase connexion](https://supabase.com/docs/guides/database/connecting-to-postgres),
  [node-postgres SSL](https://node-postgres.com/features/ssl).
- Attention : sslmode/sslcert dans l'URL peuvent remplacer l'objet SSL du driver.
  Le parseur rejettera ces options contradictoires ; SSL sera configuré explicitement.

## Migrations et environnements

- Decision: TypeORM est l'unique autorité pour les objets Forest, migrations versionnées
  exécutées par CLI compilée ESM. synchronize=false, migrationsRun=false,
  installExtensions=false côté API. Rôle et URL de migration distincts du runtime.
- Rationale: contrôle explicite, pas de mutation au démarrage ; aucune dépendance ts-node.
- Alternatives considered: migrations Supabase CLI possibles mais ajouteraient un second
  outil de gestion ; synchronisation automatique incompatible avec la constitution.
- Confiance élevée ; vérifier les chemins compilés et la CLI installée à l'implémentation.
- Source : [TypeORM migrations](https://typeorm.io/docs/migrations/creating/).
- Destination avec table user déjà présente sans historique : échec explicite, pas de
  DROP, de fake automatique ni de CREATE IF NOT EXISTS masquant une divergence.
- Aucune sauvegarde/import/inspection de la base locale ; déclaration utilisateur suffisante.

## Permissions

- Decision: conserver NestJS comme unique chemin applicatif. Runtime forest_app limité aux
  objets Forest ; rôle de migration séparé. RLS sur user, politique réservée à forest_app,
  aucun grant à anon/authenticated/PUBLIC sur table et séquence.
- Rationale: les tables public peuvent être atteintes via la Data API si les permissions
  le permettent. Une clé Supabase ne doit pas créer un nouveau chemin vers ces fiches.
- Alternatives considered: déplacer dans un schéma privé est valable mais change le mapping ;
  désactiver toute la Data API affecterait potentiellement d'autres usages du projet.
- Confiance élevée ; à réexaminer lors d'un futur accès frontend aux données.
- Source : [Supabase sécuriser la Data API](https://supabase.com/docs/guides/api/securing-your-api).
- Les routes NestJS sont actuellement sans guard : ceci n'est pas corrigé par RLS et demeure
  un écart connu. La migration n'ajoute pas d'authentification implicitement.

- Recherche déléguée : recommande aussi de désactiver la Data API inutilisée. Pour un
  projet dédié à Forest, la désactiver lors du provisionnement est une protection
  supplémentaire recommandée. Si le projet sert d'autres usages, ne pas modifier ce
  réglage global ; les grants et RLS des seuls objets Forest restent obligatoires.
- Source TLS complémentaire : [Supabase SSL enforcement](https://supabase.com/docs/guides/platform/ssl-enforcement).

## Modèle et tests

- Decision: garder id entier, noms et isActive ; typer explicitement les colonnes dans
  la migration. id: Number actuel peut produire une métadonnée non attendue ; utiliser
  number et integer explicite sans changement de format JSON.
- Rationale: supprimer l'ambiguïté des métadonnées et vérifier le comportement réel plutôt
  que reproduire des intentions absentes du code. GET inconnu rend null au niveau service ;
  DELETE n'utilise pas ParseIntPipe ; caractériser ces réponses avant adaptation.
- Alternatives considered: changer les erreurs en 404 ou ajouter une validation métier
  serait un changement de contrat non demandé.
- Confiance moyenne sur les erreurs exactes tant que les tests de caractérisation ne sont
  pas exécutés ; ce sont des vérifications d'implémentation, pas une nouvelle décision métier.
- Tests distants seulement sur cible isolée ; unitaires de parsing sans réseau.

## Résolution

Aucune clarification de périmètre restante. Les inconnues initiales (mode de connexion,
TLS, autorité de migration, protection Data API, source de données et CLI ESM) ont une
solution retenue. Projet Supabase, credentials et quotas réels sont à fournir au déploiement.
