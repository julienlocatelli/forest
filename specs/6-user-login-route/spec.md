# Feature Specification: Connexion utilisateur à l’API

**Created**: 2026-10-05
**Feature Branch**: `feature/6-login-api-route`
**Status**: Clarifiée — plan et implémentation disponibles
**Input**: Ticket Notion « login route api », tâche 6, relu le 2026-10-07 avec ajout du compte initial configuré par environnement.

## Clarifications

### Session 2026-10-07

Réponses humaines lues dans la spécification publiée du ticket, conservées lors de la reprise :

- Q: Quelle route utiliser ? → A: POST /auth/login ; préserver POST /users pour la création.
- Q: Quel flux d’identité retenir ? → A: Choix initial OAuth/OIDC avec Authorization Code + PKCE via fournisseur, remplacé par la réponse suivante.
- Q: Quel client et quelle sortie retenir ? → A: Application web avec access token et refresh token en cookies HttpOnly sécurisés.

- Q: Où créer le compte initial et qui vérifie le mot de passe ? → A: Option B pour le moment : compte dans Forest et connexion directe email/password via /auth/login ; le flux OAuth/OIDC délégué est retiré du périmètre actuel.

- Q: Quand créer le compte initial ? → A: Au démarrage de l’application, créer le compte dans Forest uniquement si l’email configuré n’existe pas en base ; conserver tout compte existant.

- Q: Inclure le cycle complet de session ? → A: Oui : login, refresh, logout et vérification me dans ce ticket.
- Q: Protéger les routes users maintenant ? → A: Conserver leur contrat public et signaler le risque.
- Q: Quel déploiement navigateur et quelles durées ? → A: Même site frontend/API ; accès de 15 minutes et session de 7 jours absolus.

## User Scenarios & Testing

### User Story 1 — Connexion d’un utilisateur connu (Priority: P1)

Un utilisateur possédant un compte et des justificatifs valides obtient une session lui permettant de poursuivre son utilisation du service.

**Why this priority**: La connexion constitue le parcours principal demandé.
**Independent Test**: Présenter des justificatifs valides pour un compte de test actif et constater le succès ainsi que la délivrance du justificatif de renouvellement demandé.

**Acceptance Scenarios**:
1. **Given** un compte connu et autorisé à se connecter, **When** les justificatifs sont vérifiés avec succès, **Then** la connexion réussit et une réponse HTTP 200 établit un access token et un refresh token en cookies HttpOnly sécurisés, sans tokens dans le corps.
2. **Given** un compte connu, **When** le mot de passe fourni à Forest est incorrect, **Then** la connexion est refusée avec HTTP 401 et aucun token n’est délivré.

### User Story 2 — Refus sans divulgation d’existence du compte (Priority: P1)

Un appelant reçoit un refus générique lorsque l’authentification échoue, sans pouvoir distinguer un email inconnu d’un mot de passe incorrect.

**Why this priority**: Le ticket impose que le motif détaillé reste interne.
**Independent Test**: Comparer les réponses d’une tentative avec email inconnu et d’une tentative avec mot de passe incorrect.

**Acceptance Scenarios**:
1. **Given** un email inconnu, **When** une connexion est tentée, **Then** le refus public a le même statut, la même structure et le même message que pour un mot de passe incorrect.
2. **Given** une tentative refusée, **When** la réponse est examinée, **Then** elle ne contient aucun diagnostic interne ni secret.

### User Story 3 — Diagnostic interne (Priority: P2)

Un opérateur habilité identifie l’issue d’une tentative de connexion, sans accéder au mot de passe ou aux tokens.

**Why this priority**: Ce diagnostic est explicitement demandé pour l’exploitation.
**Independent Test**: Déclencher une réussite, un compte inconnu et un mot de passe incorrect ; vérifier les catégories dans les seuls journaux internes.

**Acceptance Scenarios**:
1. **Given** une authentification email/mot de passe, **When** une tentative aboutit, **Then** un événement interne distingue réussite, compte inconnu et mot de passe incorrect.
2. **Given** un utilisateur public, **When** il consulte la réponse ou les surfaces accessibles, **Then** ces motifs internes ne sont pas exposés.

### User Story 4 — Compte initial utilisable (Priority: P1)

Au démarrage de l’application, Forest crée le compte réel défini par la configuration externe si son email est absent de la base.

**Why this priority**: Le ticket demande explicitement un utilisateur réel avec des identifiants configurables.
**Independent Test**: Démarrer l’application dans un environnement isolé puis effectuer une connexion avec les identifiants configurés, sans exposer leurs valeurs.

**Acceptance Scenarios**:
1. **Given** une configuration valide et aucun compte correspondant, **When** l’application démarre, **Then** un compte réel est créé et peut réussir le parcours de connexion retenu.
2. **Given** un compte déjà provisionné, **When** l’application redémarre, **Then** aucun doublon n’est créé et ses justificatifs et droits ne sont pas remplacés silencieusement.
3. **Given** une configuration absente ou invalide, **When** l’application démarre, **Then** aucun compte partiel n’est créé et le diagnostic ne révèle aucun secret.

### Edge Cases

- Champs manquants, types invalides, email malformé ou mot de passe vide : rejet avant authentification, sans token.
- Compte inactif : connexion refusée et erreur publique générique (hypothèse).
- Service de vérification indisponible : erreur opérationnelle générique distincte d’un refus de justificatifs, sans token.
- Tentatives répétées : protections contre les essais automatisés et l’énumération ; seuils à définir dans le plan.
- Démarrages concurrents : un seul compte est créé pour l’email configuré, sans écrasement des données existantes.
- Configuration initiale invalide ou base indisponible : démarrage refusé, diagnostic sans secret et aucune création partielle.
- Échec du diagnostic interne : aucun secret divulgué et aucune authentification injustifiée.
- Requête provenant d’une origine non autorisée : aucune session créée ; les opérations utilisant les cookies doivent être protégées contre les requêtes intersites non autorisées.

## Requirements

### Functional Requirements

- **FR-001**: Le système MUST vérifier l’authentification d’un compte connu avant de délivrer un token ; l’existence d’un email ne suffit pas.
- **FR-002**: POST /auth/login MUST accepter email et password, vérifier les justificatifs dans Forest et répondre HTTP 200 avec access token et refresh token dans des cookies HttpOnly sécurisés ; aucun token ne figure dans le corps. Les justificatifs invalides produisent HTTP 401 avec un message générique.
- **FR-003**: Le système MUST refuser les justificatifs invalides sans délivrer de token.
- **FR-004**: Les refus pour compte inconnu et mot de passe incorrect MUST être indiscernables par statut, structure et message publics ; les protections de temps de réponse contre l’énumération seront évaluées au plan.
- **FR-005**: Les événements internes MUST distinguer les issues effectivement connues et être accessibles uniquement aux opérateurs habilités.
- **FR-006**: Le système MUST exclure des corps de réponse et journaux les mots de passe, tokens, secrets de configuration et corps de requête non expurgés.
- **FR-007**: Les entrées MUST être validées côté serveur et les données invalides MUST être rejetées sans session.
- **FR-008**: La connexion MUST préserver le contrat actuel de création d’utilisateur, sauf transition explicitement décidée.
- **FR-009**: Les erreurs opérationnelles MUST être distinguées en interne des refus d’authentification, avec une réponse publique sans détail sensible.
- **FR-010**: Le système MUST transmettre les justificatifs et tokens via un transport protégé et empêcher la mise en cache de réponses contenant des tokens.
- **FR-011**: Le renouvellement MUST être associé à un compte/session, avoir une expiration définie et un mécanisme de révocation ; sa politique et son intégration à un parcours de renouvellement sont des dépendances à résoudre au plan.
- **FR-012**: Le système MUST appliquer les protections contre les tentatives automatisées prévues par la politique retenue, sans divulguer l’existence des comptes.

- **FR-013**: Au démarrage de l’application, le système MUST créer dans Forest, uniquement si l’email configuré est absent de la base, un compte réel utilisable pour le parcours de connexion retenu à partir de `DEFAULT_USER_EMAIL` et `DEFAULT_USER_PASSWORD`, fournis par configuration externe (`.env` dans l’environnement local). Un simulacre de compte ne satisfait pas cette exigence.
- **FR-014**: Le provisionnement MUST être idempotent : deux exécutions avec la même identité ne créent pas de doublon et ne réinitialisent pas silencieusement le mot de passe ou les droits d’un compte existant.
- **FR-015**: Une configuration absente ou invalide MUST empêcher le démarrage avec un diagnostic sans valeurs sensibles. Un échec du provisionnement ou de l’accès à la base MUST également empêcher le démarrage, sans laisser de compte partiel. Aucun identifiant de secours codé en dur ne doit être utilisé.
- **FR-017**: Des démarrages simultanés MUST aboutir à un seul compte pour le même email ; aucune concurrence ne doit remplacer les justificatifs ou droits d’un compte existant.

- **FR-018**: Le compte initial MUST recevoir uniquement les droits ordinaires d’un utilisateur, sans privilège administratif implicite.

- **FR-016**: Le mot de passe initial MUST être exclu des fichiers versionnés, réponses publiques et journaux ; il ne doit pas être conservé en clair dans la persistance applicative.

- **FR-019**: Le système MUST permettre le renouvellement et la déconnexion, avec rotation des tokens, révocation de la session lors de réutilisation d’un refresh consommé et vérification de la session courante. L’accès expire après 15 minutes et la session après 7 jours absolus.
- **FR-020**: Le système MUST conserver les routes users publiques pour cette livraison ; le risque de suppression publique reste documenté. Le frontend et l’API doivent être déployés sur le même site.

### Key Entities

- **Compte**: Identité persistée dans Forest, email unique, justificatif de mot de passe non réversible et état autorisant ou refusant la connexion. La normalisation de l’email et le mécanisme de protection du justificatif seront définis au plan.
- **Session**: Connexion authentifiée et durée de validité.
- **Refresh token**: Justificatif sensible permettant le renouvellement, associé à une session.
- **Événement d’authentification**: Issue connue d’une tentative et données de corrélation non secrètes.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Tous les scénarios de connexion avec justificatifs valides pour un compte de test actif produisent le résultat de succès retenu.
- **SC-002**: Aucun scénario de justificatifs invalides ou d’entrée malformée ne délivre de token.
- **SC-003**: Les réponses des scénarios email inconnu et mot de passe incorrect ont le même statut, la même structure et le même message.
- **SC-004**: Aucun mot de passe ou token n’apparaît dans les journaux examinés pour les scénarios d’acceptation.
- **SC-005**: Chaque issue connue est correctement classée dans les journaux internes et aucun motif interne n’est exposé au client.
- **SC-006**: Les scénarios de création d’utilisateur existants restent conformes au contrat préservé ou à une transition explicitement validée.

- **SC-007**: Le compte initial réussit le parcours de connexion réel dans l’environnement de validation.
- **SC-008**: Deux démarrages successifs ou simultanés produisent un seul compte sans modifier ses justificatifs ni ses droits.
- **SC-009**: Les scénarios de configuration absente ou invalide ne créent aucun compte partiel et n’exposent aucune valeur sensible.

## Assumptions

- Le périmètre concerne la connexion ; inscription publique (le provisionnement du compte initial est inclus), récupération de mot de passe, interface utilisateur et implémentation complète d’un fournisseur OAuth sont exclus sauf nouvelle décision.
- Un compte inactif n’est pas autorisé à se connecter.
- Le provisionnement du compte initial fait partie du périmètre ; il est créé dans Forest. Le renouvellement et la déconnexion sont inclus dans le périmètre confirmé.
- Le modèle utilisateur actuel ne contient ni email ni justificatif de mot de passe : le plan doit prévoir la persistance des identités locales et sa migration, en préservant les consommateurs existants.
- Les exigences de sécurité complémentaires ci-dessus sont des propositions dérivées de la constitution, pas des détails explicitement fournis dans le ticket.

### Contraintes explicites du ticket

Le besoin initial demandait POST /users, email/password, HTTP 200 avec refresh token, HTTP 401 et des motifs détaillés uniquement internes. Les décisions humaines retiennent désormais POST /auth/login, une authentification locale propriétaire et les tokens en cookies. L’exigence initiale de conformité OAuth/OIDC est retirée pour cette version : l’émission de tokens ne constitue pas à elle seule un protocole OAuth. Keycloak, les redirections et PKCE sont hors périmètre actuel.

### Décisions reprises du ticket Notion

- **Route** : utiliser POST /auth/login et préserver la création via POST /users.
- **Flux d’identité** : connexion directe email/password, compte et vérification dans Forest ; décision temporaire, sans intégration Keycloak.
- **Client et sortie** : application web avec access token et refresh token en cookies HttpOnly sécurisés.

### Avis sur les décisions

- **Route**: Préserver la création et séparer la connexion. Confiance élevée : POST /users est déjà utilisé pour créer un utilisateur. Une décision explicite de rupture et de migration modifierait ce verdict.
- **Identité locale** : cohérente avec le contrat direct retenu, confiance élevée sur cette cohérence. Elle impose à Forest la protection des mots de passe, la résistance aux essais automatisés et la gestion des sessions ; elle ne bénéficie pas des fonctions d’un fournisseur dédié. Un besoin de SSO ou d’authentification multifacteur pourrait justifier une nouvelle décision vers OIDC.
- **Tokens**: Un refresh token seul ne démontre pas comment accéder aux ressources protégées. Confiance élevée ; un contrat de renouvellement existant documenté pourrait justifier ce choix.

Les décisions de parcours et de provisionnement sont résolues. Les durées, la révocation, les seuils et la migration sont documentés dans le plan et le contrat HTTP.


Ajout du ticket repris : créer un utilisateur réel à partir de `DEFAULT_USER_EMAIL` et `DEFAULT_USER_PASSWORD`, sans lire ni publier les valeurs de `.env`.
