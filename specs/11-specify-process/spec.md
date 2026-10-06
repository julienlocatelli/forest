# Feature Specification: Processus Specify pour les tickets Notion

**Feature Branch**: `main` (branche actuelle ; aucun hook de création installé)
**Created**: 2026-10-06
**Status**: Validated for planning
**Input**: Ticket Notion 11 « specify process » : préparer la branche, exécuter Specify de Spec Kit, identifier le dossier par le numéro Notion, publier la spécification et passer le ticket de To Define à To Do.

## Clarifications

### Session 2026-10-06

- Q: Depuis quelle branche faut-il créer la nouvelle branche d’un ticket ? → A: Depuis `main` locale ; bloquer si elle est absente, sans récupération réseau automatique.

- Q: Si quelqu’un modifie le ticket Notion pendant la rédaction, que doit faire le workflow avant de publier la spécification ? → A: Relire le ticket, intégrer les changements et revalider ; demander une clarification si nécessaire.

- Q: Le nouveau processus Specify doit-il s’appliquer uniquement à Forest ou à tous tes projets utilisant le skill personnel `/specify` ? → A: Installation dans Forest uniquement ; le skill personnel reste inchangé.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Démarrer la spécification sur la bonne branche (Priority: P1)

En tant que contributeur, je lance la spécification d'un ticket et retrouve tous ses nouveaux fichiers sur une branche identifiée par sa nature et son numéro.

**Why this priority**: Évite de commencer le travail sur une branche sans lien avec le ticket.
**Independent Test**: Sur un dépôt sans modifications locales, spécifier un ticket numéroté et observer la branche active avant la première écriture.

**Acceptance Scenarios**:

1. **Given** le ticket 11 de maintenance et aucune branche associée, **When** je lance sa spécification, **Then** une branche telle que `chore/11-git-branch-process` est créée depuis la révision de `main` locale et sélectionnée avant toute création ou modification d'artefact de spécification.
2. **Given** un ticket de nouvelle fonctionnalité, **When** la spécification démarre, **Then** son préfixe est `feature/` et sa description contient entre un et quatre mots normalisés.
3. **Given** un ticket inaccessible, sans numéro ou avec une nature indéterminable, **When** je lance la spécification, **Then** le workflow explique la donnée manquante et attend sa résolution sans créer de branche ni écrire les artefacts.

### User Story 2 - Reprendre le même ticket sans duplication (Priority: P2)

En tant que contributeur, je relance une spécification sans créer une autre branche ni perdre les modifications déjà réalisées.

**Why this priority**: Les spécifications évoluent et doivent garder leur continuité.
**Independent Test**: Relancer le même ticket depuis sa branche puis depuis une autre branche dans un dépôt propre.

**Acceptance Scenarios**:

1. **Given** une branche locale déjà associée au ticket, **When** je relance sa spécification, **Then** cette branche est réutilisée et sélectionnée avant l'écriture ; aucun suffixe de duplication n'est ajouté.
2. **Given** plusieurs branches candidates ou une branche de même nom associée à un autre ticket, **When** je lance le workflow, **Then** il explique l'ambiguïté et attend une sélection explicite avant toute écriture.
3. **Given** un titre modifié et une association existante valide, **When** je reprends le ticket, **Then** la branche existante conserve son nom.

### User Story 3 - Comprendre et résoudre un blocage (Priority: P2)

En tant que contributeur, je sais pourquoi la préparation de branche a échoué et je peux reprendre sans perdre mon travail.

**Why this priority**: Un changement automatique de branche ne doit pas déplacer silencieusement du travail indépendant.
**Independent Test**: Déclencher une spécification avec des modifications locales sur une autre branche ou hors dépôt.

**Acceptance Scenarios**:

1. **Given** des modifications suivies ou non suivies sur une autre branche, **When** un changement de branche serait nécessaire, **Then** le workflow bloque et indique les fichiers concernés sans les modifier, les remiser ou les valider automatiquement.
2. **Given** la branche du ticket déjà active et des modifications locales, **When** je reprends la spécification, **Then** la préparation de branche est sans effet et le travail indépendant est préservé.
3. **Given** une erreur de création ou de sélection, un dépôt absent, un état de fusion/rebasage en cours ou une révision détachée, **When** le workflow démarre, **Then** il bloque avant l'écriture, expose la cause et indique la branche active si elle existe.
4. **Given** la branche préparée mais la rédaction interrompue, **When** je relance, **Then** la branche est réutilisée sans supprimer automatiquement son travail.

### User Story 4 - Livrer une spécification prête à planifier (Priority: P1)

En tant que contributeur, je lance une seule fois Specify sur un ticket et retrouve une spécification locale et sa version complète dans Notion, avec un statut indiquant sa disponibilité.

**Why this priority**: Une branche seule ne garantit ni une spécification disponible ni un ticket prêt.
**Independent Test**: Spécifier un ticket To Define et vérifier successivement la préparation de branche, le résultat Spec Kit, le dossier, la publication puis le statut.

**Acceptance Scenarios**:

1. **Given** une branche préparée pour le ticket 11, **When** le workflow poursuit, **Then** il exécute Specify de Spec Kit avec le besoin du ticket et produit les artefacts dans un dossier tel que `specs/11-specify-process`, identifié par TASK plutôt que par le prochain numéro séquentiel.
2. **Given** une spécification validée localement, **When** elle est publiée, **Then** le ticket reçoit le contenu complet dans une seule section dédiée, ses notes initiales sont préservées et la publication est relue avant le passage de To Define à To Do.
3. **Given** une question bloquante, un échec Spec Kit ou une publication non vérifiée, **When** le workflow termine, **Then** le statut ne passe pas à To Do et le résultat indique l'étape échouée et les artefacts disponibles.
4. **Given** une publication réussie mais un changement de statut refusé, **When** je relance, **Then** le workflow reprend sans dupliquer la branche, le dossier ou la section et vérifie le statut final.
5. **Given** un dossier historique associé au ticket mais numéroté séquentiellement, **When** il est repris, **Then** il est réutilisé ; les nouveaux dossiers utilisent le numéro du ticket. Aucun déplacement automatique d'artefacts existants n'est requis.
6. **Given** un ticket déjà To Do ou dans un statut ultérieur, **When** sa spécification est actualisée, **Then** son statut est conservé sans régression.

7. **Given** un besoin modifié dans Notion pendant la rédaction, **When** le workflow prépare la publication, **Then** il relit le ticket, intègre les modifications et revalide ; une ambiguïté bloquante suspend la publication et la transition de statut.

### Edge Cases

- Modification concurrente du ticket : relire juste avant publication, intégrer le besoin actualisé et revalider. Si une ambiguïté bloquante apparaît, suspendre la publication et la transition vers To Do jusqu’à clarification.

- `main` locale absente : bloquer avant création de branche et écriture des artefacts, sans récupération réseau automatique.

- Accents, espaces et ponctuation du titre : description en minuscules, mots séparés par des tirets, accents translittérés et ponctuation supprimée ; nom valide ou blocage explicite.
- Titre long : résumé pertinent limité à quatre mots ; aucun titre complet imposé au nom de branche.
- Type de correction : `fix/` retenu par défaut ; `bugfix/` accepté sur demande explicite ou branche existante.
- Correction urgente de production : `hotfix/` seulement si cette urgence est explicitement établie.
- Branche uniquement distante : blocage avec indication de cette candidate ; aucune récupération réseau implicite.
- Nom explicite non conforme : explication de la règle enfreinte et demande de correction avant mutation.
- Numéro absent : ne jamais substituer l'UUID Notion ou le numéro séquentiel du répertoire de spécification.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Un skill installé dans le projet Forest uniquement, sans modification du skill personnel `/specify`, doit permettre la préparation de branche lors de l'invocation de Specify sur un ticket Notion, avant toute écriture de spécification, checklist, association ou pointeur de fonctionnalité (story 1).
- **FR-002**: Le nom doit respecter `<type>/<ticket>-<description>`, où ticket est la valeur numérique de la propriété TASK du ticket, et non son UUID (story 1, cas limites).
- **FR-003**: Les types permis sont `feature`, `fix`, `bugfix`, `hotfix`, `release`, `docs` et `chore`. La sélection doit correspondre respectivement à une fonctionnalité, correction, correction, urgence de production, préparation de version, documentation ou maintenance ; une ambiguïté doit être résolue avant mutation (stories 1 et 3).
- **FR-004**: La description doit être un résumé intelligible de un à quatre mots normalisés, avec trois ou quatre mots privilégiés lorsque cela améliore la compréhension (story 1, cas limites).
- **FR-005**: La branche préparée doit être active avant l'écriture ; une préparation non réussie doit interrompre la spécification sans modifier ses artefacts (stories 1 et 3).
- **FR-006**: Une nouvelle branche doit partir de la révision de `main` locale dans un dépôt propre ; si `main` locale est absente, le workflow doit bloquer avant création et sans récupération réseau automatique ; le workflow doit présenter son nom et sa révision de départ dans le résultat (story 1).
- **FR-007**: Une branche locale déjà associée doit être réutilisée sans renommage ni duplication ; une association ambiguë ou contradictoire doit bloquer jusqu'à résolution (story 2).
- **FR-008**: Le workflow doit préserver les fichiers locaux, les commits et les branches existantes ; il ne doit pas automatiquement remiser, valider, supprimer ou écraser du travail pour réussir un changement de branche (story 3).
- **FR-009**: Hors dépôt, en révision détachée, lors d'une fusion ou d'un rebasage en cours, ou si la création/sélection échoue, le workflow doit expliquer le blocage avant l'écriture (story 3).
- **FR-010**: Un nom explicitement fourni doit être utilisé sans transformation s'il respecte la convention et correspond au ticket ; sinon il doit être refusé avec la raison (cas limites).
- **FR-011**: Le workflow doit conserver une association ticket-branche permettant la reprise malgré un changement de titre, après sélection réussie de la branche ; le répertoire de spécification est identifié par le numéro Notion pour les nouveaux tickets, indépendamment du type de branche (story 2).
- **FR-012**: La préparation ne doit ni publier de branche, ni effectuer de récupération réseau, ni créer de commit ou de demande de fusion (story 3, cas limites).

- **FR-013**: Après préparation réussie de la branche, le workflow doit exécuter Specify de Spec Kit avec le besoin extrait du ticket, respecter le template actif, la constitution, les hooks applicables et la validation de qualité (story 4).
- **FR-014**: Un nouveau dossier doit suivre `specs/<ticket>-<description>` sans compteur séquentiel de substitution. Le pointeur de fonctionnalité et l'association au ticket doivent désigner ce dossier ; une collision avec un autre ticket doit bloquer sans écrasement (story 4, cas limites).
- **FR-015**: Juste avant publication, le workflow doit relire le ticket, intégrer les changements intervenus depuis la lecture initiale et revalider la spécification ; une ambiguïté bloquante doit suspendre la publication et le passage à To Do jusqu’à clarification. Le workflow doit publier la spécification complète dans une unique section dédiée du ticket, préserver ses notes et propriétés hors statut, puis relire la publication pour vérifier son contenu avant toute transition (story 4).
- **FR-016**: Un ticket To Define doit passer à To Do uniquement après validation de la spécification et vérification de sa publication ; les autres statuts sont conservés. La transition doit être relue et confirmée dans le résultat (story 4).
- **FR-017**: Toute erreur doit arrêter les étapes dépendantes et laisser les résultats déjà réussis récupérables. Une réponse d'écriture incertaine doit être suivie d'une lecture avant une nouvelle tentative ; aucune duplication ne doit résulter d'une reprise (story 4).

### Key Entities

- **Ticket** : besoin Notion identifié par son UUID, son numéro TASK, son titre et sa nature.
- **Branche de travail** : nom conforme, révision de départ, état actif et association à un ticket.
- **Spécification** : artefacts d'un ticket, écrits seulement après sélection réussie de sa branche.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Sur les sept types autorisés, 100 % des cas d'acceptation produisent un nom conforme et une description de quatre mots au plus.
- **SC-002**: Sur tous les scénarios de démarrage réussi, 100 % des premières écritures de spécification interviennent après sélection de la branche associée.
- **SC-003**: Trois invocations successives pour le même ticket produisent une seule branche associée, même si son titre change.
- **SC-004**: Dans tous les scénarios de blocage de préparation de branche, aucun fichier préexistant, commit ou branche n'est perdu et aucun artefact de spécification n'est écrit.
- **SC-005**: Lors d'une validation avec un contributeur, celui-ci retrouve le ticket et la nature du travail à partir de chacun des sept exemples de nom, sans consulter la spécification.

- **SC-006**: Pour 100 % des nouveaux tickets testés, le dossier porte leur numéro Notion et aucun numéro issu d'un compteur indépendant.
- **SC-007**: Sur tous les parcours réussis, une seule section complète est publiée et le ticket initialement To Define termine To Do après vérification.
- **SC-008**: Sur les échecs simulés de rédaction, validation ou publication, aucun ticket ne passe prématurément à To Do ; trois reprises après une erreur de statut conservent un seul dossier et une seule section.

## Assumptions

- Périmètre : installation et utilisation dans Forest uniquement, sans modification du skill personnel ni des autres projets ; orchestration de la préparation de branche locale, Specify de Spec Kit, publication Notion et transition de statut pour un ticket ; exclusion des autres commandes, des stratégies de fusion, du déploiement, des conventions de commit et du renommage des branches historiques.
- Fait source : le ticket impose la création avant les fichiers, le numéro Notion et le format uniforme ; la propriété TASK du ticket source vaut 11.
- Hypothèse : `release/v1.2.0` est un exemple général, pas une exception au format imposé ; une release issue de Specify conserve donc le numéro du ticket.
- Décision clarifiée : une nouvelle branche part de `main` locale. Son absence bloque le workflow ; sa mise à jour depuis un dépôt distant reste une action distincte du contributeur.
- Hypothèse : bloquer les modifications locales lors d'un changement de branche privilégie la traçabilité du travail ; cela impose parfois au contributeur de ranger son travail avant de poursuivre.
- Dépendances : ticket lisible, numéro TASK numérique, dépôt local exploitable, permission de créer et sélectionner des branches, workflow Specify capable d'attendre le résultat de cette préparation.
- Constat pour cette invocation : aucun fichier d'extension de hooks n'est présent ; la création automatique demandée est le comportement à implémenter ultérieurement, pas un comportement déjà disponible.

- Hypothèse de compatibilité : un dossier historique déjà associé est réutilisé plutôt que déplacé ; la convention à numéro Notion s’applique aux nouveaux dossiers. Le dossier actif de cette clarification est `specs/11-specify-process`.
- Hypothèse : la transition To Define vers To Do est un comportement du workflow à implémenter ; cette invocation spécifie ce comportement sans installer le skill ni changer le statut du ticket source.
- Dépendances supplémentaires : accès en écriture au corps du ticket et permission de transition vers To Do ; les états attendus doivent exister dans sa base.
