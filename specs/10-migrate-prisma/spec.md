# Feature Specification: Migration de TypeORM vers Prisma

**Feature Branch**: `chore/10-migrate-prisma`

**Created**: 2026-10-06

**Status**: Ready for planning

**Input**: Ticket Notion #10 : « Migrate typeORM to Prisma. No need to securise this migration, the database is empty and new ».

## Clarifications

### Session 2026-10-06

- Q: Quel bénéfice principal attends-tu du remplacement de TypeORM par Prisma ? → A: Simplifier le modèle et les migrations avec un workflow unique.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Conserver les opérations utilisateurs (Priority: P1)

Les consommateurs de Forest continuent à créer, lister, consulter et supprimer les utilisateurs après le remplacement du mécanisme de persistance.

**Why this priority**: Une migration interne doit préserver les contrats des consommateurs.

**Independent Test**: Exécuter les quatre opérations sur une base de test isolée, puis redémarrer l’application et vérifier les données restantes.

**Acceptance Scenarios**:

1. **Given** une base initialisée vide, **When** un utilisateur est créé avec prénom et nom, **Then** la réponse contient un identifiant entier unique, ces noms et un statut actif par défaut.
2. **Given** plusieurs utilisateurs enregistrés, **When** un consommateur les liste ou consulte un identifiant existant, **Then** les mêmes champs et valeurs restent disponibles.
3. **Given** un utilisateur enregistré, **When** il est supprimé, **Then** il ne figure plus dans la liste ni dans les données persistantes.
4. **Given** un identifiant absent, **When** il est consulté ou supprimé, **Then** les réponses restent conformes aux comportements constatés avant migration, y compris la consultation retournant une valeur nulle.

### User Story 2 - Initialiser une installation neuve (Priority: P1)

Le mainteneur prépare une base vide avec une procédure versionnée et reproductible, puis démarre Forest.

**Why this priority**: Le ticket vise une base neuve sans reprise de données métier.

**Independent Test**: Initialiser une base de test vide, répéter la procédure puis démarrer l’application avec les seuls droits nécessaires à son fonctionnement.

**Acceptance Scenarios**:

1. **Given** une base neuve, **When** la procédure documentée est exécutée, **Then** les objets Forest et leurs droits sont installés et les opérations utilisateurs fonctionnent.
2. **Given** une base déjà initialisée, **When** la même procédure est répétée, **Then** aucun changement déjà appliqué n’est rejoué et aucune donnée n’est effacée.
3. **Given** une configuration absente ou une connexion refusée, **When** la procédure ou l’application démarre, **Then** l’échec est explicite sans révéler les secrets.

### User Story 3 - Maintenir un seul mécanisme de persistance (Priority: P2)

Le développeur utilise un workflow documenté unique pour modifier le modèle et appliquer ses évolutions.

**Why this priority**: Éviter deux sources concurrentes de vérité après le remplacement.

**Independent Test**: Vérifier que les commandes documentées et les tests du workspace utilisent le mécanisme retenu, sans dépendance de production au précédent ORM.

**Acceptance Scenarios**:

1. **Given** le dépôt migré, **When** un développeur suit la documentation, **Then** il sait configurer, initialiser et vérifier la persistance sans ancien runner.
2. **Given** l’application démarrée avec le rôle courant, **When** elle traite des requêtes, **Then** elle n’applique aucune modification de structure implicitement.

### Edge Cases

- Une base annoncée vide contient des données métier ou des objets Forest existants : arrêter toute initialisation destructive et signaler la divergence avant de poursuivre.
- Une erreur de connexion, de certificat ou de droits produit un diagnostic sans identifiants ni URL sensibles.
- Une interruption d’initialisation ne doit pas être présentée comme une réussite ; la procédure indique comment vérifier l’état et reprendre.
- Les schémas et objets gérés par le fournisseur, notamment l’authentification et le stockage, restent hors périmètre.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Le projet MUST remplacer TypeORM par Prisma pour tous les accès persistants Forest actuellement gérés par TypeORM. Le bénéfice attendu est de simplifier la maintenance du modèle et des migrations avec un workflow unique ; les détails de conception relèvent du plan.
- **FR-002**: Les opérations utilisateurs MUST préserver les routes, entrées, champs de sortie, valeurs par défaut et comportements de succès/échec existants. Les défauts préexistants sont consignés sans correction implicite.
- **FR-003**: Le modèle MUST conserver les identifiants entiers uniques, prénom, nom et statut actif des utilisateurs sans nouvelle donnée métier.
- **FR-004**: Le projet MUST fournir une initialisation versionnée, reproductible et vérifiable d’une base neuve ; une répétition ne doit ni réappliquer les évolutions terminées ni supprimer les données.
- **FR-005**: L’application MUST conserver les garanties d’accès existantes : connexion vérifiée, secrets externes, séparation des droits d’exécution et de modification du schéma, restrictions des accès publics aux données Forest.
- **FR-006**: L’application MUST démarrer sans modifier automatiquement le schéma et échouer explicitement sur une configuration indispensable invalide sans exposer de secrets.
- **FR-007**: Le dépôt MUST retirer les dépendances, intégrations, runner et références opérationnelles TypeORM devenus inutiles, et adapter documentation, commandes et tests au workflow unique retenu.
- **FR-008**: La validation MUST couvrir les quatre opérations utilisateurs, la persistance après redémarrage, l’initialisation répétée, les erreurs de configuration/connexion et les permissions existantes sur une base isolée.
- **FR-009**: Aucune reprise de données métier, sauvegarde de données inexistantes, coexistence des deux ORM ou bascule sans interruption n’est requise pour cette base vide. Cette exemption ne permet pas la destruction d’une base contenant des données inattendues.

### Key Entities

- **Utilisateur Forest** : identifiant entier unique, prénom, nom, indicateur actif vrai par défaut ; ne se confond pas avec le compte d’authentification du fournisseur.
- **Évolution de schéma** : changement versionné dont l’état appliqué peut être consulté et dont la répétition respecte l’historique.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Les quatre opérations utilisateurs passent tous leurs scénarios de compatibilité avant/après, sans modification requise de leurs consommateurs.
- **SC-002**: Une installation neuve et une seconde exécution de l’initialisation réussissent ; zéro donnée enregistrée après initialisation n’est perdue lors de la répétition ou du redémarrage.
- **SC-003**: Tous les scénarios de droits et de configuration définis par FR-008 passent ; aucun secret n’apparaît dans les diagnostics examinés.
- **SC-004**: Un développeur peut préparer puis vérifier une base de test en suivant uniquement la documentation mise à jour, sans étape dépendant de l’ancien workflow.

## Assumptions

- La base cible est neuve et vide selon le ticket ; ce fait sera vérifié avant toute opération de modification distante.
- PostgreSQL, le fournisseur actuel, l’authentification, les accès du frontend et les contrats publics ne changent pas.
- Le modèle constaté dans `apps/api/src/users/user.entity.ts` et les contrats des contrôleurs constituent la référence de compatibilité.
- La simplification du modèle et des migrations est le bénéfice attendu ; aucun gain de performance n’est présumé. Sa validation repose sur le workflow unique et la procédure reproductible de SC-004.
- Hors périmètre : nouvelles fonctionnalités métier, refonte des permissions, correction des défauts préexistants, migration d’hébergement, déploiement ou reset d’une base distante durant Specify.
