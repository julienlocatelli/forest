# Research — Processus Specify

## Éléments vérifiés
- Spec Kit local 1.0.13, d'après .specify/init-options.json.
- common.sh résout SPECIFY_FEATURE_DIRECTORY avant .specify/feature.json ; la résolution ne dépend pas d'un préfixe de branche.
- setup-plan.sh --json a résolu ce dossier ; son champ BRANCH représente ici le nom de fonctionnalité, pas la branche Git. git branch --show-current retourne chore/11-specify-process.
- create-new-feature.sh produit un numéro formaté sur trois chiffres et peut substituer un autre numéro en cas de collision. Ce chemin ne garantit pas l'identité TASK.
- Aucun fichier .specify/extensions.yml présent.
- speckit-specify inclut désormais Automatic Clarification après les hooks ; conserver cet ajout.
- L'association Notion existante contient url et page_id, sans branche. Compatibilité nécessaire.

## 1. Orchestration locale
**Decision**: Ajouter .agents/skills/specify/SKILL.md comme entrée Forest pour un lien Notion. Elle compose un skill local de branche, speckit-specify puis la publication Notion.
**Rationale**: Conserve les workflows de rédaction et clarification existants ; aucun changement du skill personnel.
**Alternatives considered**: Modifier le skill personnel affecterait les autres projets ; intégrer toutes les opérations Notion au skill Spec Kit générique mélangerait deux responsabilités.
**Verdict / confiance**: Retenu, élevée. À réexaminer si l'environnement ne permet pas de sélectionner le skill du projet : l'invocation explicite par son chemin reste le point d'entrée vérifiable.

## 2. Préparation Git
**Decision**: Skill local git-ticket-branch et helper Python 3 utilisant uniquement la bibliothèque standard et Git par arguments, sans shell=True. Git fait autorité pour valider les références. Le helper reçoit les données déjà lues, ne contacte pas Notion et n'écrit pas les specs.
**Rationale**: Les contrôles de fichiers, Unicode, JSON et références sont testables sans agent ni service externe ; Python 3 est déjà disponible localement.
**Alternatives considered**: Commandes improvisées à chaque invocation augmentent le risque ; Bash seul reste possible mais complexifie Unicode et JSON ; aucun paquet supplémentaire nécessaire.
**Verdict / confiance**: Retenu, élevée. Dépend de Python 3 disponible chez les contributeurs.

## 3. Numérotation et reprise
**Decision**: Fournir explicitement specs/<TASK>-<description> à speckit-specify ; rechercher d'abord les notion-source.json par UUID. Ne pas utiliser create-new-feature.sh --number pour ce parcours.
**Rationale**: Évite le compteur et ses substitutions ; les associations existantes priment sur le titre.
**Alternatives considered**: Modifier les scripts upstream créerait un fork inutile ; renommer les répertoires historiques romprait des liens.
**Verdict / confiance**: Retenu, élevée. Une association dupliquée ou une collision bloque et demande résolution.

## 4. Ordre, clarification et hooks
**Decision**: Lecture → branche → rédaction/checklist/hooks Specify → Clarify automatique → relecture du ticket → intégration/revalidation → publication vérifiée → transition de statut vérifiée.
**Rationale**: La version publiée doit inclure les réponses. Passer To Do avant Clarify serait prématuré.
**Alternatives considered**: Publication avant clarification rend la version distante obsolète ; hook global Notion rendrait toutes les invocations dépendantes du service.
**Verdict / confiance**: Retenu, élevée. Un hook qui a déjà clarifié la même version ne doit pas relancer la boucle. Une relecture qui change matériellement le besoin réouvre uniquement les décisions affectées.

## 5. Publication et reprise
**Decision**: Utiliser le connecteur Notion et sa documentation actuelle ; section délimitée unique, édition ciblée, relecture avant toute nouvelle tentative après un résultat incertain. Relire schéma et statut avant transition.
**Rationale**: Préserve notes et propriétés, empêche les doublons et les régressions de statut.
**Alternatives considered**: Remplacement du corps entier perdrait des notes ; client Notion dédié demanderait des secrets et une dépendance supplémentaires.
**Verdict / confiance**: Retenu, élevée. La relecture réduit le risque concurrent sans garantir une transaction distante : si le connecteur n'offre pas de contrôle atomique de version, annoncer cette limite et ne jamais prétendre à une exclusion mutuelle.

## 6. Validation
**Decision**: Tests Python unittest dans des dépôts Git temporaires pour le helper, puis scénarios agent/connecteur sur ticket de test explicitement autorisé.
**Rationale**: Les tests prouvent les effets Git et les erreurs ; un contrôle Markdown seul ne prouve pas que l'agent lance Clarify ou préserve les notes.
**Alternatives considered**: Tests de chaînes copiées depuis le skill insuffisants ; tests sur le ticket métier lors de planification hors périmètre.
**Verdict / confiance**: Retenu, élevée. Les scénarios distants resteront non exécutés tant qu'aucun ticket de test n'est autorisé.
