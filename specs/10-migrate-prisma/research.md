# Research and decisions — Prisma

## 1. Version et exécution

**Decision** : figer les trois paquets Prisma à 7.10.0 ; conserver Node 24 et ESM. Générateur `prisma-client`, sortie dans `src/generated/prisma`, génération explicite avant build, import et sortie compatibles `.js` NodeNext.

**Rationale** : le registre npm consulté le 2026-10-06 liste 7.10.0 comme dernière 7 stable et un tag latest 8.0.0-rc.20. Node local 24.16.0 satisfait ses engines. Le guide v7 impose un adapter et une sortie explicite. Le guide NestJS doit être adapté à l’ESM existant, sans convertir en CommonJS. Sources : [registre](https://registry.npmjs.org/prisma), [release 7.10.0](https://github.com/prisma/orm/releases/tag/7.10.0), [upgrade v7](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7), [NestJS v7](https://www.prisma.io/docs/guides/v7/frameworks/nestjs).

**Alternatives considered** : v8 change simultanément les contrats et commandes ; v6 impose un socle ancien. Aucun bénéfice v8 requis par le ticket.

**Verdict** : v7 explicite, confiance élevée sur le choix, compatibilité de build à démontrer. Réexaminer si une incompatibilité vérifiée de TypeScript/NestJS apparaît ; ne pas installer latest par défaut.

## 2. Frontières des modules

**Decision** : DatabaseModule fournit un singleton Prisma avec adapter-pg ; UsersService conserve ses quatre opérations et la propriété des écritures. Un type User simple porte le contrat de réponse.

**Rationale** : l’API est un petit monolithe modulaire avec un modèle. La génération ne doit pas devenir un contrat HTTP. Connexion eager au démarrage et fermeture des ressources au shutdown évitent les erreurs différées et fuites.

**Alternatives considered** : repository générique ou architecture hexagonale complète ajoutent des interfaces sans besoin actuel ; client par requête multiplie les pools.

**Verdict** : frontière minimale, confiance élevée. Un second stockage ou une logique métier plus riche pourrait justifier un port ultérieurement.

## 3. Connexions, TLS et délais

**Decision** : runtime via `PrismaPg` et paramètres pg structurés issus de la configuration validée ; max=5, connectionTimeoutMillis=10000, query_timeout et statement_timeout=15000 par défaut. Préserver la validation de certificats et la CA personnalisée. Garder URL runtime sans paramètres arbitraires ; ne jamais laisser une URL surcharger l’objet TLS. Sources : [node-postgres TLS](https://node-postgres.com/features/ssl), [configuration pg](https://node-postgres.com/apis/client), [pool pg](https://node-postgres.com/apis/pool).

**Rationale** : l’adapter utilise pg ; les réglages et la CA du runtime ne configurent pas le moteur CLI Prisma. La connexion CLI utilise uniquement MIGRATION_DATABASE_URL, avec paramètres TLS construits par le wrapper : sslmode=require, sslaccept=strict et sslcert pour la CA si configurée. Cette syntaxe est une proposition fondée sur la documentation versionnée v6, pas une compatibilité v7 démontrée. Vérifier ces paramètres avec le CLI 7.10.0 et une CA invalide avant acceptation ; ne pas diminuer la validation TLS pour faire passer un test. Source : [paramètres PostgreSQL documentés en v6](https://docs.prisma.io/docs/orm/v6/overview/databases/postgresql).

**Alternatives considered** : passer une URL avec sslmode au runtime peut écraser l’objet CA pg ; utiliser les valeurs par défaut perd les limites actuelles. Réutiliser les identifiants migration au runtime élargit inutilement les droits.

**Verdict** : configuration séparée, confiance élevée pour pg, moyenne pour l’intégration CLI/CA tant qu’elle n’est pas testée. Ajouter un délai global borné au wrapper migration (120 s configurable), tuer le processus enfant et signaler l’incertitude si expiration ; consulter l’historique avant toute reprise.

Connexions directes 5432 ou pooler session 5432 suivant réseau ; éviter transaction6543 pour CLI. Pas de changement global de mode de connexion ni adoption automatique de rôle BYPASSRLS. Source : [connexions Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres).

## 4. Modèle et historique

**Decision** : User mappe `public.user`, id Int auto-incrémenté, noms varchar non nuls, actif true. Prisma Migrate devient la seule autorité pour le schéma Forest ; migration initiale revue avec SQL complémentaire RLS/grants et transaction BEGIN/COMMIT. Source : [migrations personnalisées v7](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/customizing-migrations).

**Rationale** : modèle seul insuffisant pour les politiques. Conserver forest_app sans DDL/BYPASSRLS, forest_migration propriétaire des objets ; révoquer PUBLIC/anon/authenticated sur table et séquence, politique explicite Forest. L’historique Prisma doit lui aussi être inaccessible aux rôles publics et runtime.

**Alternatives considered** : db push ignore le workflow versionné ; conserver deux runners crée deux autorités ; baseline d’objets existants n’est pas nécessaire sur destination vide. Si une table ou un historique TypeORM existe, arrêter et réévaluer ; aucune suppression/adoption silencieuse.

**Verdict** : initialisation neuve, confiance élevée sous précondition vérifiée. Pas de sauvegarde/reprise de données inexistantes ; un état inattendu invalide ce verdict.

## 5. Commandes et compatibilité

**Decision** : maintenir les scripts publics migration:run/show, derrière un wrapper local du CLI installé (deploy/status), avec sorties assainies. generate/validate exécutés hors connexion dans des scripts distincts ; aucune migration au démarrage. Source : [développement et production v7](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/development-and-production), [config Prisma v7](https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference).

**Rationale** : migrate deploy applique les migrations sans shadow database ; migrate dev n’est destiné qu’au développement isolé. Pour générer un draft, utiliser une base de développement et une shadow dédiées avec les rôles nécessaires préprovisionnés, jamais la base cible partagée. Le build ne doit pas nécessiter un secret migration ; la config choisit la validation obligatoire seulement pour les commandes qui contactent la base.

**Alternatives considered** : exécuter un CLI téléchargé par bunx rend la version non déterministe ; exposer sa sortie brute peut révéler des informations. Ne pas utiliser reset, db push ou migrate resolve automatiquement.

**Verdict** : wrapper ciblé, confiance élevée ; vérifier codes de sortie et logs sur les cas négatifs réels.

## 6. Écarts existants et preuve

**Decision** : caractériser avant remplacement puis rejouer les tests existants : GET invalide 400, POST avec lastName absent 500, consultation absente 200 corps vide/nul, suppression absente 200. Supprimer avec deleteMany plutôt que delete pour conserver l’idempotence. Ne pas prétendre qu’une simulation client prouve les permissions SQL.

**Rationale** : l’ORM peut changer erreurs et sérialisation. Aucun nouveau contrat ni correction de DTO n’est demandé. Source locale : `apps/api/test/users.e2e-spec.ts` et contrôleurs.

**Verdict** : compatibilité stricte, confiance élevée. Les anomalies sont conservées explicitement et pourront faire l’objet d’un ticket distinct.

## 7. Changelog et limites

Changelog Supabase consulté le 2026-10-06. L’avis PostgreSQL 15.19/17.11 porte notamment sur extensions et opérateurs non utilisés par le modèle Forest constaté ; aucun correctif de ces objets n’est introduit ici. Ceci ne constitue pas un audit de la base distante. Source : [avis PostgreSQL](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes).

Aucun paquet installé, aucune connexion SQL, aucun test de migration exécuté pendant la recherche. Les preuves distantes sont des gates de livraison dans quickstart.
