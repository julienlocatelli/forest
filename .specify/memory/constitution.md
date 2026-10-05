<!--
Sync Impact Report — temporaire, à retirer avant commit.
Version : modèle non ratifié → 1.0.0 (constitution initiale).
Principes : les cinq emplacements du modèle deviennent Décisions argumentées,
Simplicité et responsabilités, Contrats explicites, Sécurité et intégrité des données,
Validation proportionnée.
Sections renseignées : Core Principles, Contraintes techniques,
Workflow de développement, Governance. Sections supprimées : aucune.
TODO différés : aucun. Ratification initiale : 2026-10-05.
Les templates restent inchangés et lisent la constitution à l'exécution.
-->

# Forest Constitution

## Core Principles

### I. Décisions argumentées

Toute décision modifiant une dépendance structurante, une frontière de module,
un contrat public ou la persistance DOIT préciser le problème, les faits, les hypothèses,
les alternatives, les coûts et les risques. La recommandation DOIT inclure un verdict,
un niveau de confiance et les éléments susceptibles de le modifier. Les revues DOIVENT
rechercher les objections et signaler les limites sans valider automatiquement les propositions.
Cette règle évite les changements motivés uniquement par une préférence ou une tendance.

### II. Simplicité et responsabilités

Chaque changement DOIT répondre à un besoin spécifié ou à un défaut reproduit.
Les modules DOIVENT regrouper des responsabilités cohérentes et exposer des interfaces
explicites. La logique métier DOIT pouvoir être vérifiée sans démarrer l'interface
utilisateur ni contacter un service distant.
Toute nouvelle abstraction, dépendance ou couche DOIT résoudre un problème identifié
et être comparée à une solution plus simple. Un changement d'hébergement ne justifie
pas, à lui seul, un remplacement de l'ORM.

### III. Contrats explicites

Les entrées aux frontières de confiance DOIVENT être validées côté serveur.
Les opérations exposées DOIVENT définir leurs entrées, sorties, erreurs et autorisations.
Un changement de contrat ou de modèle persistant DOIT identifier ses consommateurs
et prévoir leur compatibilité ou une transition documentée. Une migration d'infrastructure
DOIT préserver les comportements publics, sauf modification explicitement spécifiée.
Les types statiques ne remplacent pas la validation des données reçues à l'exécution.

### IV. Sécurité et intégrité des données

Les secrets DOIVENT être fournis par une configuration externe et exclus des fichiers
versionnés, du navigateur et des journaux. La configuration indispensable DOIT être
validée au démarrage avec des erreurs sans valeurs sensibles.
Les accès aux données DOIVENT appliquer les autorisations prévues avec des privilèges
adaptés. Lorsque plusieurs chemins d'accès existent, le plan DOIT préciser où les
permissions sont appliquées et comment elles sont vérifiées pour chaque chemin.

Les changements de schéma DOIVENT être versionnés avec un outil de migration faisant
autorité. La synchronisation automatique est interdite sur une base distante partagée
ou de production. Développement et tests DOIVENT utiliser des données isolées de la
production. Toute migration de données ou suppression d'infrastructure DOIT prévoir
la validation de la reprise, la sauvegarde nécessaire et une procédure de retour ou
récupération avant l'opération destructive.

### V. Validation proportionnée

Chaque changement DOIT disposer d'une preuve adaptée à son risque : contrôles statiques,
test de comportement, test d'intégration ou scénario manuel reproductible.
Une correction de bug DOIT vérifier la reproduction et le comportement corrigé.
Une modification de contrat, de permission ou de persistance DOIT vérifier la frontière
concernée et ses principaux cas d'échec.
Les tests DOIVENT vérifier les comportements observables plutôt que recopier l'implémentation.
Une modification documentaire ou cosmétique réversible ne nécessite pas de nouveaux tests
automatisés. Les résultats, contrôles impossibles et limites DOIVENT être consignés sans
présenter une vérification non exécutée comme réussie.

## Contraintes techniques

Le socle constaté à la ratification est un monorepo Bun avec un frontend Next.js/React,
une API NestJS/TypeScript et une persistance PostgreSQL via TypeORM.
Ce constat décrit le point de départ ; il ne rend pas ces choix immuables.

Les versions et scripts effectifs DOIVENT être déterminés depuis les manifests et le
lockfile. Les règles locales applicables et la documentation correspondant aux versions
installées DOIVENT être consultées avant de modifier une API de framework.
Les contrôles DOIVENT utiliser les scripts réels du workspace concerné.

Les commandes de démarrage, variables requises et procédures de migration DOIVENT être
documentées avec des exemples sans secrets. Les opérations réseau DOIVENT disposer de
délais d'attente et de pools explicitement adaptés au mode de déploiement lorsqu'ils
sont applicables. Les erreurs opérationnelles DOIVENT permettre le diagnostic sans
révéler de données sensibles.
Le fournisseur de base, l'ORM et l'emplacement des autorisations relèvent des spécifications
et plans des features ; leur adoption DOIT respecter les principes ci-dessus.

## Workflow de développement

Une feature planifiée avec Spec Kit DOIT disposer d'une spécification active contenant
son périmètre, ses exclusions et ses critères d'acceptation avant la génération du plan.
Le plan DOIT vérifier cette constitution avant et après la conception, résoudre les
incertitudes bloquantes et décrire la validation. Les tâches précèdent l'implémentation
dans ce workflow. Les commandes de constitution et de planification ne réalisent pas
la migration applicative.

Chaque livraison DOIT rester dans le périmètre demandé, préserver le travail indépendant
présent et expliciter les écarts constatés dans le code existant.
La revue DOIT examiner les contrats, permissions, données, dépendances et preuves de
validation concernés. Les contrôles applicables de compilation, lint et tests DOIVENT
être exécutés. Un échec préexistant ou un contrôle indisponible DOIT être identifié et
son impact décrit avant de conclure sur la livraison.

## Governance

Cette constitution définit les critères de conformité des spécifications, plans et revues.
Les instructions explicites de l'utilisateur et les contraintes de sécurité de
l'environnement restent prioritaires. Un conflit DOIT être signalé et documenté.
Les écarts préexistants ne sont pas implicitement corrigés par cette ratification.

Tout amendement DOIT préciser sa motivation, les principes concernés, les conséquences
sur les travaux en cours et les adaptations nécessaires.
Une exception DOIT préciser la règle concernée, sa justification, son périmètre et une
condition de réexamen dans le plan ou la revue. Elle ne constitue pas un amendement implicite.

Le versionnement suit MAJOR.MINOR.PATCH : MAJOR pour une suppression ou redéfinition
incompatible, MINOR pour un nouveau principe ou un élargissement substantiel, PATCH pour
une clarification sans changement de sens. La date de ratification initiale reste fixe ;
la date du dernier amendement change uniquement lors d'une modification.
Chaque plan et revue DOIT consigner sa conformité ou les exceptions justifiées.

**Version**: 1.0.0 | **Ratified**: 2026-10-05 | **Last Amended**: 2026-10-05
