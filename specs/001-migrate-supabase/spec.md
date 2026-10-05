# Feature Specification: Migrer vers Supabase et retirer la base locale

**Feature Branch**: `main` (aucun hook de création de branche configuré)

**Created**: 2026-10-05

**Status**: Draft

**Input**: User description: "Use supabase and delete db (infra/db/)"

## Clarifications

### Session 2026-10-05

- Q: Faut-il vérifier, sauvegarder ou reprendre les données PostgreSQL locales avant
  suppression ? → A: Non. L'utilisateur déclare la base locale vide et autorise sa
  suppression sans vérification ni migration de données, y compris son stockage local dédié.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Conserver les opérations sur les utilisateurs (Priority: P1)

Un utilisateur de Forest continue à créer, consulter et supprimer les fiches utilisateur
après le passage à Supabase, sans modifier sa manière d'utiliser le service.

**Why this priority**: Le changement d'hébergement ne doit pas interrompre les fonctions existantes.

**Independent Test**: Sur un environnement isolé, créer une fiche, consulter la liste et
la fiche par son identifiant, redémarrer le service, puis supprimer la fiche.

**Acceptance Scenarios**:

1. **Given** un environnement Supabase prêt et correctement configuré, **When** une fiche
   est créée, **Then** elle reçoit un identifiant et conserve son prénom, son nom et son
   état actif initial avec les mêmes résultats observables qu'avant la migration.
2. **Given** une fiche créée, **When** le service redémarre et la fiche est consultée,
   **Then** ses valeurs et son identifiant restent identiques.
3. **Given** plusieurs fiches, **When** une fiche est supprimée, **Then** elle n'apparaît
   plus dans les consultations et les autres fiches restent inchangées.
4. **Given** un identifiant absent ou une entrée invalide, **When** une opération est
   demandée, **Then** le comportement public observé avant migration reste inchangé.

---

### User Story 2 - Préparer la destination sans reprise de données (Priority: P1)

Le responsable prépare Supabase pour les opérations existantes. La source locale est
vide selon la déclaration de l'utilisateur ; aucune vérification de son contenu,
sauvegarde, reprise de données ou récupération de cette source n'est requise.

**Why this priority**: Une destination fonctionnelle est nécessaire pour poursuivre
le développement, sans ajouter un travail de reprise inutile sur une source vide.

**Independent Test**: Préparer une destination isolée puis créer et consulter une nouvelle
fiche sans accéder à la source locale.

**Acceptance Scenarios**:

1. **Given** la déclaration de l'utilisateur consignée dans les clarifications,
   **When** la destination est préparée, **Then** aucune étape de contrôle, sauvegarde
   ou reprise des données locales n'est demandée.
2. **Given** une destination préparée, **When** une nouvelle fiche est créée puis consultée,
   **Then** son identifiant et ses valeurs sont retrouvés sans dépendance à la source locale.
3. **Given** une destination contenant déjà des données, **When** la préparation est lancée,
   **Then** aucun écrasement silencieux n'a lieu ; les conflits sont signalés.
4. **Given** un échec de préparation, **When** le responsable interrompt l'opération,
   **Then** l'échec est explicite et aucune suppression de données Supabase existantes
   n'est effectuée pour le contourner.

---

### User Story 3 - Développer sans l'ancien service local (Priority: P2)

Un développeur peut configurer et démarrer Forest avec un environnement Supabase isolé,
sans devoir installer ni démarrer l'ancien service de base locale.

**Why this priority**: C'est la simplification d'exploitation demandée par le retrait de `infra/db/`.

**Independent Test**: Suivre les instructions depuis une copie du dépôt sans ancien service
local actif et exécuter le scénario de création et de consultation.

**Acceptance Scenarios**:

1. **Given** la migration validée, **When** un développeur consulte le dépôt,
   **Then** `infra/db/` est absent et les commandes, références de workspace et instructions
   actives ne nécessitent plus ce dossier.
2. **Given** les accès à un environnement de développement isolé, **When** il suit les
   instructions de configuration et démarrage, **Then** il peut créer et consulter une fiche
   sans démarrer l'ancien service local.
3. **Given** une configuration manquante ou invalide, **When** le service démarre,
   **Then** il signale la configuration à corriger sans afficher de secret et sans utiliser
   implicitement l'ancienne base locale.
4. **Given** la base locale déclarée vide et sa suppression autorisée,
   **When** son service et son stockage dédié sont supprimés,
   **Then** aucune vérification, sauvegarde ou reprise locale n'est exigée et aucun
   stockage d'un autre service ni aucune donnée Supabase n'est supprimé.

### Edge Cases

- Destination indisponible ou accès refusé : signaler l'échec sans secret, sans succès apparent
  ni bascule silencieuse vers l'ancienne base.
- Configuration pointant vers la production pendant un test : interdire l'exécution des
  scénarios destructifs tant que l'isolation de la cible n'est pas établie.
- Destination partiellement préparée : identifier les étapes déjà réalisées et les conflits
  avant de poursuivre ; ne pas dupliquer ou écraser les données silencieusement.
- Stockage local dédié à l'ancienne base : sa suppression est autorisée sans contrôle de
  contenu ; cette autorisation ne couvre pas les stockages d'autres services.
- Échec après la bascule : signaler le problème sans revenir implicitement à la source
  locale supprimée et sans effacer les nouvelles données Supabase.
- Accès aux données par un nouveau chemin fourni par l'hébergeur : aucun accès public
  supplémentaire aux fiches ou aux secrets ne doit être introduit.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Forest DOIT utiliser Supabase comme destination de persistance pour les
  opérations existantes sur les fiches utilisateur après la bascule (Story 1).
- **FR-002**: La migration DOIT préserver les opérations de création, liste, consultation
  par identifiant et suppression, leurs résultats et leurs comportements d'erreur existants
  (Story 1, scénarios 1–4).
- **FR-003**: Les fiches et leurs identifiants DOIVENT persister après redémarrage du service
  (Story 1, scénario 2).
- **FR-004**: Les accès à la destination DOIVENT être configurables par environnement ; une
  configuration absente ou invalide DOIT empêcher le démarrage normal avec un diagnostic
  sans secret et sans retour implicite vers la source (Story 3, scénario 3).
- **FR-005**: Les secrets de connexion DOIVENT rester hors des fichiers versionnés, des
  contenus transmis au navigateur et des journaux ; leur absence DOIT pouvoir être vérifiée
  dans les exemples de configuration et les diagnostics (Story 3, scénario 3).
- **FR-006**: La préparation et les évolutions de la destination DOIVENT être versionnées,
  exécutables selon une procédure documentée et sans modification implicite du schéma
  au démarrage du service sur une destination partagée (Story 2, scénarios 1–3).
- **FR-007**: La source locale DOIT être considérée vide sur la déclaration explicite
  de l'utilisateur ; aucune vérification, sauvegarde ou reprise de ses données n'est
  requise (Story 2, scénario 1).
- **FR-008**: Une préparation Supabase échouée DOIT être signalée sans imposer de récupération
  de la source locale et sans supprimer de données Supabase existantes (Story 2, scénario 4).
- **FR-009**: Le dossier `infra/db/` et ses références actives dans les workspaces,
  commandes et instructions DOIVENT être retirés après validation de la destination
  (Story 3, scénarios 1–2).
- **FR-010**: La suppression du service PostgreSQL local et de son stockage dédié est
  autorisée sans vérification ni sauvegarde. Elle DOIT rester limitée à cette source
  et préserver les stockages d'autres services et les données Supabase (Story 3, scénario 4).
- **FR-011**: Les développeurs DOIVENT disposer d'instructions sans secrets couvrant les
  prérequis, la configuration, la préparation de la destination, le démarrage et la validation
  sans dépendance à l'ancien service local (Story 3, scénario 2).
- **FR-012**: Les validations et opérations de développement DOIVENT cibler des données
  isolées de la production ; l'accès aux fiches NE DOIT PAS être élargi par le changement
  d'hébergeur (Edge Cases : cible de production et nouveaux chemins d'accès).
- **FR-013**: Une indisponibilité, un refus d'accès ou un conflit de données DOIT être signalé
  comme un échec sans résultat de réussite trompeur, sans secret et sans écrasement silencieux
  (Story 2, scénario 3 ; Edge Cases : indisponibilité et préparation partielle).

### Key Entities *(include if feature involves data)*

- **Fiche utilisateur** : enregistrement existant portant un identifiant, un prénom,
  un nom et un état actif. Il ne représente pas un nouveau compte d'authentification.
- **Environnement de persistance** : destination identifiée comme développement, test ou
  production, avec ses accès privés et ses données isolées.
- **État de bascule** : déclaration de source locale vide, autorisation de suppression
  et résultats de validation de la destination. Il s'agit d'une trace opérationnelle,
  pas d'une nouvelle fonctionnalité utilisateur.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100 % des scénarios de création, liste, consultation, suppression et erreurs
  définis dans Story 1 produisent les mêmes résultats observables avant et après migration.
- **SC-002**: Zéro étape de vérification, sauvegarde ou reprise de données locales est
  nécessaire pour préparer la destination et réussir une première création puis consultation.
- **SC-003**: Un développeur peut suivre le guide depuis une copie du dépôt et réussir
  une création puis une consultation sans étape non documentée ni ancien service local.
- **SC-004**: Les scénarios de configuration absente, configuration invalide, accès refusé
  et destination indisponible échouent explicitement avec zéro secret exposé.
- **SC-005**: 100 % des nouvelles fiches de référence restent consultables avec les mêmes
  valeurs et identifiants après redémarrage, indépendamment de la suppression de la source locale.
- **SC-006**: Zéro dépendance active à l'ancien service local demeure dans les commandes
  et instructions de démarrage livrées ; son retrait ne supprime aucune donnée de la
  destination ni aucun stockage d'un autre service.

## Assumptions

- Supabase est utilisé ici pour héberger la persistance existante. L'ajout d'authentification,
  de stockage de fichiers, de temps réel ou d'accès direct depuis le navigateur est hors périmètre.
- L'architecture applicative et les comportements publics restent inchangés. Le remplacement
  de l'outil d'accès aux données n'est pas demandé ; ses modalités relèvent du plan.
- Le responsable du projet fournit un environnement Supabase accessible et les accès privés
  nécessaires. Aucun secret n'est requis pour rédiger la spécification.
- L'utilisateur déclare la base PostgreSQL locale vide et autorise sa suppression sans
  vérification ni migration de données. Cette déclaration est acceptée sans inspection
  de la base ; la sauvegarde et la récupération de cette source sont hors périmètre.
- Cette instruction explicite prévaut pour cette source vide sur les exigences générales
  de sauvegarde et de récupération de la constitution. Elle ne s'étend pas aux données
  Supabase ni aux autres services ; elle sera réexaminée si l'utilisateur change le périmètre.
- Une fenêtre de suspension des écritures peut être prévue pour la bascule ; une migration
  sans interruption et une synchronisation continue sont hors périmètre.
- Les défauts préexistants sans rapport avec la migration ne sont pas implicitement corrigés.
- Cette spécification définit le retrait de `infra/db/` pour l'implémentation ; sa rédaction
  ne modifie pas l'application et ne détruit aucune donnée.
