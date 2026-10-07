# Implementation Plan: Migration vers Prisma

**Branch**: `chore/10-migrate-prisma` | **Date**: 2026-10-06 | **Spec**: [spec.md](spec.md)

**Input**: `specs/10-migrate-prisma/spec.md`

## Summary

Remplacer TypeORM dans `apps/api` par Prisma ORM 7.10.0, sans changer les contrats HTTP ni le fournisseur PostgreSQL/Supabase. Un client partagé, un modèle User et un historique Prisma remplacent les intégrations et le runner TypeORM. Les droits et RLS restent dans des migrations SQL versionnées. La base est déclarée vide : aucune reprise de données ni coexistence d’ORM n’est prévue.

## Technical Context

**Language/Version**: TypeScript 6.0.2 dans l’API, ESM NodeNext/ES2023 ; Node local 24.16.0 ; Bun 1.3.14 pour le workspace.

**Primary Dependencies**: NestJS 12.0.1, pg 8.23.0 ; cible `prisma`, `@prisma/client`, `@prisma/adapter-pg` 7.10.0, versions exactes et lockfile. Prisma non installé pendant Plan.

**Storage**: PostgreSQL hébergé sur Supabase ; table `public.user`, droits Forest existants. Version distante non interrogée ; relever celle du projet de test lors de la validation.

**Testing**: Vitest 4.1.2, Supertest 7.0.0, compilation Nest, oxlint ; tests unitaires de configuration et tests d’intégration sur projet Supabase isolé.

**Target Platform**: Service Node 24 ; connexions directes ou pooler session 5432 suivant accessibilité réseau. Aucun changement d’hébergement.

**Project Type**: Monorepo Bun, API NestJS et frontend Next.js.

**Performance Goals**: Aucun gain présumé. Conserver pool runtime 5 par défaut, connexion 10 s et requêtes 15 s ; limites configurables et vérifiées. Adapter le budget de connexions au nombre de réplicas avant déploiement.

**Constraints**: TLS vérifié avec CA personnalisée si nécessaire, secrets externes, rôle runtime sans DDL ni BYPASSRLS, rôle migration distinct ; pas de mutation distante pendant Plan.

**Scale/Scope**: Un modèle persistant, quatre opérations utilisateurs, configuration/migrations/tests/documentation de l’API. Frontend et Auth restent inchangés.

## Constitution Check

Gate avant recherche : PASS — le besoin de workflow unique est clarifié ; contrats et sécurité sont des invariants ; la base vide dispense de reprise métier, sans autoriser un effacement inattendu.

Gate après conception : PASS pour les cinq principes :

1. Décisions argumentées : version, architecture, TLS et migrations comparés dans `research.md` avec confiance et conditions de réexamen.
2. Simplicité : conserver UsersModule et UsersService ; ajouter seulement un DatabaseModule qui fournit un client singleton. Aucun repository générique, CQRS ou nouvelle couche métier.
3. Contrats : forme User indépendante du type ORM ; garder les réponses absentes, suppression idempotente et erreurs historiques.
4. Intégrité : migration initiale versionnée, droits/RLS explicites, aucun DDL au démarrage, arrêt sur destination inattendue ; aucune suppression distante autorisée par ce plan.
5. Validation : compilation/lint/unitaires et scénarios SQL/HTTP réels ; tests non exécutés à ce stade. Une validation distante indisponible reste une limite explicite.

Aucune exception constitutionnelle. Le principe de reprise depuis ancien schéma ne s’applique pas à une base neuve ; si ce prérequis est faux, replanifier au lieu d’adopter ou de supprimer silencieusement les objets.

## Project Structure

### Documentation (this feature)

```text
specs/10-migrate-prisma/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    ├── users-api.md
    └── persistence-workflow.md
```

### Source Code (repository root)

Structure cible, fichiers proposés non créés pendant Plan :

```text
apps/api/
├── prisma.config.ts
├── prisma/schema.prisma
├── prisma/migrations/<timestamp>_initial_users/migration.sql
├── src/database/database.module.ts
├── src/database/prisma.service.ts
├── src/database/database.config.ts
├── src/generated/prisma/              # généré, exclu du Git
├── src/users/user.ts                  # contrat sans décorateurs ORM
├── src/users/users.service.ts
├── src/users/users.controller.ts
├── src/users/user.module.ts
├── src/app.module.ts
└── test/                              # scénarios existants adaptés
```

**Structure Decision**: DatabaseModule exporte un fournisseur privé de pool/client partagé à UsersModule ; UsersService possède les écritures User. Le contrôleur dépend du contrat User simple, pas du client généré. Les tests de service peuvent substituer le fournisseur ; seuls les tests réels prouvent SQL et droits.

## Phase 0 — Research

Recherche terminée dans `research.md`. Cible 7.10.0 vérifiée dans le registre npm et les sources Prisma ; ESM, pool et TLS étudiés. Aucun choix bloquant non résolu. La preuve réseau/CA distante est un contrôle d’implémentation requis, pas une réussite présumée.

## Phase 1 — Design

1. Définir configuration commune validée sans secrets : séparer runtime et CLI, conserver limites et expansion des chemins CA.
2. Générer le client ESM dans `src/generated/prisma` avant compilation, avec extensions d’import compatibles NodeNext. Fournisseur partagé : connexion au démarrage, fermeture au shutdown ; absence de migration automatique.
3. Adapter UsersService aux opérations Prisma ; mapping de réponse explicite. Utiliser une suppression sans erreur sur zéro résultat ; conserver `findOne` nul et les erreurs observées. Ne pas ajouter de validation DTO ou d’authentification dans ce ticket.
4. Initialiser l’historique Prisma sur destination neuve. Revoir le SQL généré et y intégrer les droits/RLS existants dans une transaction explicite. Les rôles préexistent ; aucune création de rôle fournisseur ni changement global de grants.
5. Remplacer les scripts migration par un wrapper CLI qui charge `.env`, construit une URL migration vérifiée, masque toute erreur sensible et propage le code de sortie. Conserver noms publics `migration:run` et `migration:show`.
6. Adapter tests et documentation, supprimer TypeORM et ses fichiers devenus inutiles une fois les scénarios passés. Garder le lockfile Bun cohérent.

## Validation and delivery gates

Matrice et commandes dans `quickstart.md`. Les artefacts de plan ne prouvent pas la migration. Ne déclarer l’implémentation complète qu’après validation du build ESM, des réponses HTTP, des droits, de la CA et des migrations répétées. Aucune installation, migration, modification d’API, génération de tasks ou publication Git à ce stade.

## Ajustements validés pendant implémentation

Réutilisation du projet jetable pour les tests de conflit et CRUD, autorisée par
l’utilisateur pour rester dans le quota gratuit. Un globalSetup termine la
fixture d’historique TypeORM avant toute suite et ne supprime aucun objet préexistant.
CLI Prisma sous Linux via mode Docker explicite pour résoudre le refus TLS natif
macOS ; même certificat, vérification maintenue. Coût : Docker local requis pour
ce mode. Verdict : retenu, confiance élevée grâce aux tests CA positive/négative
et e2e réels ; réexaminer si la chaîne Supabase devient compatible avec macOS.
