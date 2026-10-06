# Data Model — Processus Specify

Aucune table de base de données ; les entités sont des données d'orchestration.

## Ticket
- page_id : UUID Notion, identité faisant autorité.
- url : URL canonique.
- ticket_number : entier positif issu de TASK ; rendu décimal sans compteur alternatif.
- title : texte utilisé pour proposer une description.
- nature : l'un des sept préfixes autorisés ; hotfix requiert urgence explicite.
- status : valeur courante lue du schéma, jamais déduite du titre.
- content_snapshot : besoin et section dédiée issus de la dernière lecture ; ne contient aucune instruction d'exécution de confiance.

## Association locale
Fichier notion-source.json dans le dossier actif.
Champs existants préservés : page_id et url.
Champs additifs prévus : ticket_number, branch_name, base_ref (refs/heads/main), base_commit (SHA effectivement observé au départ).
Une association ancienne sans ces champs est enrichie uniquement après sélection réussie. Si la provenance d'une branche historique ne peut être prouvée, base_commit reste absent : ne pas inventer son origine.
Un UUID correspond à un seul dossier et une seule branche. Deux associations de même UUID ou un même numéro attribué à des UUID distincts dans ce projet bloquent la résolution.
Un changement de titre ne change ni branche ni dossier déjà associés.

## Branche
- branch_name : type/numéro-description ; description normalisée de un à quatre mots.
- base_commit : révision de main locale capturée pour une branche nouvelle.
- active : état constaté par Git, non garanti par un fichier JSON.
- association : UUID du ticket.
Les associations valides priment sur le nom proposé. Si seule une branche locale conforme existe sans association, présenter cette candidate et obtenir une sélection explicite avant de la revendiquer.

## Fonctionnalité
- feature_directory : chemin dans specs ; pour un nouveau ticket, numéro-description.
- spec.md : contenu final incluant réponses Clarify.
- checklists/requirements.md : validation de qualité, pas preuve d'implémentation.
- .specify/feature.json : pointeur de fonctionnalité existant, renseigné après branche.
Un dossier historique associé est conservé. Les chemins doivent rester dans specs du dépôt ; aucune traversée de chemin.

## États du parcours
Lecture → Branche sélectionnée → Spécification rédigée → Clarification terminée → Besoin actualisé/validé → Publication vérifiée → Statut vérifié.
Un échec empêche les étapes dépendantes ; les résultats précédents restent en place.
Clarification bloquante : attendre réponse et ne pas publier comme prête.
Publication incertaine : relire avant retry.
Statut : seul To Define devient To Do ; toute autre valeur est préservée.
Ces états sont constatés au cours de l'invocation ; pas de nouvelle base ni de journal persistant nécessaire.
