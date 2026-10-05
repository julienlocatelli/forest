# Quickstart — Validation de la migration

Les scripts migration:run, migration:show et les suites e2e sont maintenant livrés.
Les validations distantes restent à exécuter avec les accès Supabase.

## Prérequis

- Outils de mise.toml installés : Node 24.16.0 et Bun 1.3.14.
- Projet Supabase de test dédié, distinct de production ; connexion session pooler IPv4
  ou directe IPv6 copiée depuis Connect.
- Rôles API et migration provisionnés selon contracts/database-configuration.md,
  avec mots de passe conservés hors dépôt ; CA du serveur si nécessaire.
- Aucun démarrage, inventaire, export ou sauvegarde de l'ancienne base locale.

## Configuration

Depuis la racine du dépôt, installer puis se placer dans l'API :

```sh
bun install --frozen-lockfile
cd apps/api
cp .env.example .env
```

Renseigner .env localement selon contracts/database-configuration.md. Aucun secret dans
une capture, un historique partagé ou le dépôt. Les commandes de migration chargent ce
fichier explicitement via leurs scripts. Le runner e2e utilise les variables TEST_ prévues.

## Préparation et contrôles

Depuis apps/api :

```sh
bun run build
bun run lint
bun run test
bun run migration:show
bun run migration:run
bun run migration:run
bun run migration:show
bun run test:e2e
```

Attendus : migration initiale appliquée une fois ; second passage sans changement ;
CRUD et erreurs de contracts/users.md vérifiés. Runtime sans DDL ni accès auth/storage.
Une cible avec table user non suivie doit échouer sans altération de cette table.
Tester ce conflit sur une destination jetable distincte, pas sur une cible contenant
les données d'un autre service.

## Parcours manuel

Démarrer l'API sur un port distinct du frontend :

```sh
PORT=3001 bun run dev
```

Dans un autre terminal :

```sh
curl -i -X POST http://localhost:3001/users -H 'Content-Type: application/json' -d '{"firstName":"Validation","lastName":"Supabase"}'
curl -i http://localhost:3001/users
```

Noter l'id retourné. Redémarrer l'API puis consulter /users/ID avec cet id ; valeurs et
id restent identiques. Créer une seconde fiche, supprimer uniquement la première avec
DELETE /users/ID ; vérifier la seconde inchangée. Nettoyer uniquement les fiches du test.
Aucun reset global ni truncate de table partagée.

## Scénarios d'échec et permissions

- Le test de configuration sans DATABASE_URL, avec protocole invalide ou délai non entier
  échoue avant connexion et ne révèle aucune valeur sensible.
- Des credentials invalides et une destination inaccessible échouent après un nombre
  borné de tentatives ; ne jamais logger l'erreur brute du driver.
- Une CA incorrecte échoue ; elle ne déclenche pas de connexion TLS non vérifiée.
- Le test RLS/grants vérifie que anon/authenticated ne lisent ni n'écrivent user,
  tandis que forest_app réalise le CRUD. Si Data API activée, répéter avec la clé publique
  sans la logger : aucun accès aux fiches.
- Le runner e2e refuse une cible non isolée ou correspondant à la production.

## Retrait local après validation

Retirer infra/db des workspaces puis régénérer bun.lock avec bun install, sans upgrade
indépendant. Supprimer le dossier et actualiser les instructions de démarrage.
Pour le conteneur et le volume vide, identifier les ressources dédiées via la définition
Compose avant de retirer son fichier, puis les supprimer de façon ciblée. Il ne s'agit
pas d'une vérification du contenu de la base ; aucun inventaire de données ni sauvegarde.
Ne pas utiliser docker system prune ou volume prune.

Depuis la racine :

```sh
bun install --frozen-lockfile
bun run dev
```

Attendus : aucun service de l'ancien workspace lancé ; frontend et API restent démarrables
avec des ports distincts. Une recherche de infra/db et @forest/db dans les manifests,
lockfile et instructions actives ne retrouve aucune dépendance opérationnelle.
Les mentions historiques dans specs ne sont pas des dépendances.

## Compte rendu

Relier les résultats à SC-001 à SC-006 dans spec.md : CRUD/erreurs, zéro reprise locale,
guide exécutable, erreurs sans secret, persistance après redémarrage et retrait des
références. Distinguer contrôles exécutés, échecs et prérequis manquants. Aucun test distant
ni aucune suppression n'a été exécuté pendant la rédaction du plan.

## Résultats d'implémentation — 2026-10-05

- Tests unitaires : 17 réussis (configuration, isolation et contrôleur existant).
- Compilation Nest, typecheck complet sans émission et lint : réussis.
- Configuration e2e : refus explicite avant accès réseau faute de déclaration de cible isolée.
- Démarrage sans DATABASE_URL : sortie en échec avec diagnostic générique sans secret.
- migration:show : sortie en échec avec diagnostic générique, credentials Supabase absents.
- Aucun test distant, migration distante, accès Docker ou suppression locale exécuté.
- SC-001/003/005/006 : validation distante/retrait en attente ; SC-002 : aucune tâche de
  reprise locale ajoutée ; SC-004 : validation locale du parseur et des diagnostics réussie,
  échecs réseau et certificat réel restant à valider.
- Variables supplémentaires : PRODUCTION_DATABASE_PROJECT_REF et
  TEST_CONFLICT_MIGRATION_DATABASE_URL (troisième projet jetable pour le scénario de conflit).
- Écarts corrigés du plan : tsconfig.build.json utilise rootDir=src, d'où dist/database/ ;
  runner TypeORM direct avec erreurs filtrées plutôt que CLI standard à sortie brute.
- T014/T018 bloquent le retrait T021–T023 selon la spécification. Les autres changements
  indépendants sont livrés sans prétendre que la migration complète est terminée.
