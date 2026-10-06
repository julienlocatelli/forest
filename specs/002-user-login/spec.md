# Feature Specification: Connexion utilisateur à l’API

**Created**: 2026-10-05
**Status**: Brouillon — trois décisions de contrat à clarifier
**Input**: Ticket Notion « login route api », tâche 6.

## User Scenarios & Testing

### User Story 1 — Connexion d’un utilisateur connu (Priority: P1)

Un utilisateur possédant un compte et des justificatifs valides obtient une session lui permettant de poursuivre son utilisation du service.

**Why this priority**: La connexion constitue le parcours principal demandé.
**Independent Test**: Présenter des justificatifs valides pour un compte de test actif et constater le succès ainsi que la délivrance du justificatif de renouvellement demandé.

**Acceptance Scenarios**:
1. **Given** un compte connu et autorisé à se connecter, **When** les justificatifs sont vérifiés avec succès, **Then** la connexion réussit et un refresh token est délivré selon le contrat retenu.
2. **Given** un compte connu, **When** le mot de passe est incorrect dans l’option email/mot de passe, **Then** la connexion est refusée et aucun token n’est délivré.

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
3. **Given** un flux délégué à un fournisseur, **When** celui-ci ne révèle pas le motif détaillé, **Then** les journaux consignent uniquement les faits connus, sans inventer une cause.

### Edge Cases

- Champs manquants, types invalides, email malformé ou mot de passe vide : rejet avant authentification, sans token.
- Compte inactif : connexion refusée et erreur publique générique (hypothèse).
- Service de vérification indisponible : erreur opérationnelle générique distincte d’un refus de justificatifs, sans token.
- Tentatives répétées : protections contre les essais automatisés et l’énumération ; seuils à définir dans le plan.
- Échec du diagnostic interne : aucun secret divulgué et aucune authentification injustifiée.
- Fournisseur externe : motif exact indisponible et gestion des refus/interactions supplémentaires selon le flux retenu.

## Requirements

### Functional Requirements

- **FR-001**: Le système MUST vérifier l’authentification d’un compte connu avant de délivrer un token ; l’existence d’un email ne suffit pas.
- **FR-002**: Le système MUST délivrer un refresh token après une connexion réussie, selon le contrat de sortie à clarifier.
- **FR-003**: Le système MUST refuser les justificatifs invalides sans délivrer de token.
- **FR-004**: Les refus pour compte inconnu et mot de passe incorrect MUST être indiscernables par statut, structure et message publics ; les protections de temps de réponse contre l’énumération seront évaluées au plan.
- **FR-005**: Les événements internes MUST distinguer les issues effectivement connues et être accessibles uniquement aux opérateurs habilités.
- **FR-006**: Le système MUST exclure des réponses et journaux les mots de passe, tokens, secrets de configuration et corps de requête non expurgés.
- **FR-007**: Les entrées MUST être validées côté serveur et les données invalides MUST être rejetées sans session.
- **FR-008**: La connexion MUST préserver le contrat actuel de création d’utilisateur, sauf transition explicitement décidée.
- **FR-009**: Les erreurs opérationnelles MUST être distinguées en interne des refus d’authentification, avec une réponse publique sans détail sensible.
- **FR-010**: Le système MUST transmettre les justificatifs et tokens via un transport protégé et empêcher la mise en cache de réponses contenant des tokens.
- **FR-011**: Le renouvellement MUST être associé à un compte/session, avoir une expiration définie et un mécanisme de révocation ; sa politique et son intégration à un parcours de renouvellement sont des dépendances à résoudre au plan.
- **FR-012**: Le système MUST appliquer les protections contre les tentatives automatisées prévues par la politique retenue, sans divulguer l’existence des comptes.

### Key Entities

- **Compte**: Identité connue du service et état autorisant ou refusant la connexion.
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

## Assumptions

- Le périmètre concerne la connexion ; inscription, récupération de mot de passe, interface utilisateur et implémentation complète d’un fournisseur OAuth sont exclus sauf nouvelle décision.
- Un compte inactif n’est pas autorisé à se connecter.
- Le stockage/provisionnement des identités et le parcours de renouvellement sont des dépendances ; leur existence n’est pas établie dans le code lu.
- Le modèle utilisateur actuel ne contient ni email ni justificatif de mot de passe : une source d’identité reste à choisir, sans présumer de migration de schéma.
- Les exigences de sécurité complémentaires ci-dessus sont des propositions dérivées de la constitution, pas des détails explicitement fournis dans le ticket.

### Contraintes explicites du ticket

Le ticket demande POST /users avec un corps email/password, un succès HTTP 200 avec refresh token, un refus HTTP 401 et une différenciation des motifs uniquement dans les journaux internes. Ces contraintes sont consignées mais leur compatibilité avec le flux OAuth demandé n’est pas validée. Une réponse OAuth standard et une route propriétaire n’ont pas nécessairement le même contrat d’erreur.

### Questions ouvertes

- **Q1 — Route**: [NEEDS CLARIFICATION: conserver POST /users pour la création et ajouter POST /auth/login, ou remplacer la route existante avec une transition documentée ?]
- **Q2 — Flux d’identité**: [NEEDS CLARIFICATION: OAuth/OIDC avec Authorization Code + PKCE via fournisseur, ou connexion propriétaire email/mot de passe sans revendication de conformité OAuth ?]
- **Q3 — Client et sortie**: [NEEDS CLARIFICATION: application web avec access token et refresh token en cookie HttpOnly sécurisé, client API/mobile avec tokens JSON, ou uniquement le refresh token demandé ?]

### Avis sur les décisions

- **Route**: Préserver la création et séparer la connexion. Confiance élevée : POST /users est déjà utilisé pour créer un utilisateur. Une décision explicite de rupture et de migration modifierait ce verdict.
- **OAuth**: Pour une exigence OAuth actuelle, retenir un flux délégué adapté et éviter le grant password. Confiance élevée : [RFC 9700, section 2.4](https://www.rfc-editor.org/rfc/rfc9700.html#section-2.4) interdit le Resource Owner Password Credentials grant. Une connexion propriétaire change la qualification du contrat ; elle ne devient pas OAuth par l’émission d’un refresh token.
- **Tokens**: Un refresh token seul ne démontre pas comment accéder aux ressources protégées. Confiance élevée ; un contrat de renouvellement existant documenté pourrait justifier ce choix.

Le brouillon est prêt pour clarification, pas pour planification ou implémentation.

