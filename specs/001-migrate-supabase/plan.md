# Implementation Plan: Migration Supabase

**Branch**: `main` (Git réel ; le script fournit l'identifiant logique `001-migrate-supabase`)
**Date**: 2026-10-05 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-migrate-supabase/spec.md`

## Summary

Conserver NestJS, TypeORM et les contrats utilisateur. Remplacer la connexion locale par
PostgreSQL Supabase avec TLS vérifié, migrations explicites et séparation des rôles.
Retirer `infra/db/`, ses références de workspace et de lockfile après validation de la
destination. La source est vide selon l'utilisateur : aucune inspection, sauvegarde
ou migration de données locales. Le service et son volume dédié peuvent être supprimés.
Aucun changement applicatif ni aucune opération distante n'est exécuté par ce plan.

## Technical Context

**Language/Version**: TypeScript 6.0.2 dans l'API, ESM/NodeNext, Node 24.16.0,
Bun 1.3.14 ; versions confirmées par manifests, lockfile et mise.toml.
**Primary Dependencies**: NestJS 12.0.1, @nestjs/typeorm 12.0.2, TypeORM 1.1.1, pg 8.23.0.
**Storage**: PostgreSQL Supabase ; table existante `public.user`, pas de reprise locale.
**Testing**: Vitest 4.1.2, Supertest ; ajouter des tests de configuration et des scénarios
CRUD/migrations sur un projet Supabase de test isolé. Tests unitaires sans réseau.
**Target Platform**: Serveur Node persistant ; pooler session IPv4 par défaut,
connexion directe IPv6 possible. Le serverless est hors du choix initial.
**Project Type**: Monorepo web, frontend Next.js et API NestJS ; frontend inchangé.
**Performance Goals**: Aucun SLO chiffré dans la spec ; préserver les parcours existants.
Pool initial de 5 connexions par processus, attente de connexion 10 s, délai requête 15 s,
retries de démarrage bornés à 3 tentatives ; paramètres ajustables selon quotas et replicas.
**Constraints**: Secrets serveur uniquement ; TLS avec validation de certificat ;
aucun synchronize ou migrationsRun au démarrage ; aucun accès Data API supplémentaire.
**Scale/Scope**: Une entité, quatre opérations CRUD ; aucun nouveau système d'authentification.
Projet de test distinct de production requis pour validation distante, sans secret dans les docs.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Avant recherche | Après conception |
| --- | --- | --- |
| Décisions argumentées | PASS : options et risques identifiés | PASS : research.md documente verdicts et confiance |
| Simplicité | PASS : conserver l'ORM | PASS : une configuration partagée, aucun nouveau framework |
| Contrats explicites | PASS : CRUD conservé | PASS : contracts/users.md, erreurs existantes caractérisées |
| Sécurité et données | PASS avec exception explicite | PASS : TLS, rôles séparés, absence d'accès Data API, migrations |
| Validation proportionnée | PASS : scénarios ciblés | PASS : quickstart.md et tests aux frontières |

Exception IV : l'utilisateur autorise la suppression de la source vide sans inventaire,
sauvegarde ni récupération. Justification consignée dans spec.md / Clarifications.
Limite : uniquement PostgreSQL local et stockage dédié ; réexamen si périmètre modifié.
Écart existant : routes sans authentification et DTO sans validation runtime. Pas d'ajout
implicite d'authentification ou de nouvelles règles d'entrée ; ces écarts restent hors
périmètre et empêchent de qualifier l'application de prête à une exposition publique.
Aucune autre violation injustifiée ; aucun point de clarification bloquant.

## Project Structure

### Documentation (this feature)

```text
specs/001-migrate-supabase/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── users.md
│   └── database-configuration.md
└── checklists/requirements.md
```

`tasks.md` sera produit par speckit-tasks, pas par ce plan.

### Source Code (repository root)

```text
apps/api/
├── src/app.module.ts                # configuration TypeOrmModule à adapter
├── src/main.ts                      # diagnostic de démarrage sans secret si nécessaire
├── src/database/                    # à créer
│   ├── database.config.ts           # parsing partagé API/CLI, sans connexion à l'import
│   ├── data-source.ts               # DataSource des migrations
│   └── migrations/                  # schéma, rôles/grants pour les objets gérés
├── src/users/                       # contrats et repository conservés
├── test/                            # configuration, CRUD et migrations ciblés
├── .env.example                     # à créer, sans secret
├── package.json                     # scripts migration:run et migration:show
└── README.md                        # instructions effectives à actualiser
package.json                        # retirer infra/db des workspaces
bun.lock                            # régénérer sans autre upgrade
infra/db/                           # à supprimer pendant l'implémentation
```

**Structure Decision**: Une configuration de connexion pure commune à l'API et au
DataSource CLI ; migrations compilées avec les imports ESM existants. Exécuter un runner de migrations
TypeORM sur les fichiers JS compilés, sans nouvelle dépendance ts-node ; celui-ci filtre
les erreurs que la CLI standard affiche brutes.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| IV : suppression locale sans sauvegarde/reprise | Instruction explicite, source déclarée vide | Inspection et sauvegarde ne répondent à aucun besoin dans ce périmètre |

## Phase 0 — Research

Voir research.md : ORM, connexion, TLS, migrations, permissions et défaut de métadonnées
`id: Number`. Tous les choix de conception sont résolus. Les accès au projet et le certificat
constituent des prérequis opérationnels à fournir, pas une décision d'architecture en suspens.

## Phase 1 — Design

1. Configuration externe avec DATABASE_URL et MIGRATION_DATABASE_URL séparées, TLS
   obligatoire, délais/pool validés, erreurs sans valeurs sensibles.
2. Rôle forest_app sans DDL ni BYPASSRLS ; rôle de migration distinct propriétaire des
   objets Forest. Provisionnement initial documenté avec un accès administrateur privé.
3. Migration initiale explicite de `public.user`, séquence, RLS/politique pour forest_app
   et grants ; refuser une table existante non suivie plutôt que l'écraser. Aucun changement
   aux schémas gérés par Supabase. Ne pas installer les extensions UUID inutilisées.
4. Désactiver toute création automatique de schéma/extension côté runtime. Corriger
   `id: Number` en `number` avec type SQL integer explicite si nécessaire pour les
   métadonnées, sans modifier la représentation publique de l'identifiant.
5. Valider les contrats, la persistance, les erreurs et l'absence d'accès via Data API ;
   retirer ensuite le dossier et ses références. Supprimer uniquement le service/volume
   local identifié par le fichier Compose, sans contrôle de contenu ni prune global.

Constitution réévaluée : PASS avec la seule exception locale documentée ci-dessus.
La sécurité ne dépend pas de la suppression de la source ; préserver les données Supabase
lors d'une erreur et ne jamais déclencher automatiquement de rollback destructif.
