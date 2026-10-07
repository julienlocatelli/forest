# Validation guide — Local authentication

## Prerequisites

Node 24.16.0, Bun 1.3.14 (mise), dépendances installées ; base isolée dédiée pour tests.
Depuis apps/api, configurer les connexions et certificat existants sans les imprimer.
Configurer DEFAULT_USER_EMAIL, DEFAULT_USER_PASSWORD (12–128 caractères) et
AUTH_ALLOWED_ORIGINS=http://localhost:3000 pour développement. Ne pas versionner .env.

## Commands

Depuis apps/api :

```sh
bun run prisma:validate
bun run test
bun run build
bun run lint
bun run test:e2e
```

test:e2e compile puis utilise le projet isolé confirmé par
TEST_DATABASE_CONFIRM_ISOLATED=true, TEST_DATABASE_URL, TEST_MIGRATION_DATABASE_URL et
PRODUCTION_DATABASE_PROJECT_REF. Toutes les gardes existantes sont conservées. Les
identifiants de compte initial sont remplacés par des fixtures synthétiques uniques,
jamais ceux du .env utilisateur. Le setup finit les migrations avant les tests ; le
teardown supprime seulement ses profils. Ne pas utiliser la base applicative en tests.

## Manual deployment smoke scenario (not executed against application DB)

Après revue de la cible et sauvegarde selon l’environnement, appliquer la migration
additive avec bun run migration:run, vérifier bun run migration:show, démarrer l’API.
Aucune migration au démarrage. Configuration invalide ou création impossible => serveur
non prêt. Le compte créé a des noms vides ; redémarrer ne doit rien modifier.

Avec un client HTTP qui conserve les cookies Secure (localhost ou HTTPS) :
1. POST /auth/login, Content-Type application/json, X-Forest-Request: 1, email/password
   configurés via saisie privée, pas de secrets dans l’historique shell. Attendu 200,
   authenticated=true et deux cookies protégés, aucun token dans le JSON.
2. GET /auth/me avec cookies : 200 et projection publique.
3. POST /auth/refresh avec cookies et en-tête : 200, nouveaux cookies. Ancien accès => 401.
4. POST /auth/logout : 204, cookies effacés. Ancien accès/refresh => 401.

Browser : credentials: include et Origin exact autorisé. Même site frontend/API.
Les origines non autorisées et POST sans en-tête doivent échouer 403 sans création.
Tester les deux refus login (email inconnu/mauvais mot de passe) : même corps/statut,
seuls les journaux internes distinguent leurs catégories.

## Automated coverage and observed results

2026-10-07 : prisma:validate/build/lint réussis, 39 tests unitaires/HTTP et 17 tests E2E
sur PostgreSQL isolé réussis. Couverture : provisioning, hash salé et saturation,
contrats HTTP, origines/cookies, démarrages concurrents, conservation compte inactif,
création atomique rollback, persistences après restart, rotation, rejeu concurrent,
expiration, compte désactivé/supprimé, logout, compteurs partagés, permissions et /users.
Aucune migration appliquée à la base applicative.

Benchmark local scrypt (6 paires, concurrence 2, Node 24.16.0) :
117/115/136/114/116/140 ms, RSS 109 Mio. Résultat local, pas une garantie de débit.

## Operational limits and rollback

Les tokens refresh sont à usage unique ; sérialiser les appels entre onglets. Après
réponse perdue ou rejeu, reconnexion possible. Les limites email peuvent produire un
blocage temporaire ciblé. Les IP proxy ne sont pas acceptées sans décision explicite.
Changer DEFAULT_USER_PASSWORD ne change pas le hash existant ; changer l’email peut
créer un nouveau compte. La suppression utilisateur publique est un risque inchangé.

Rollback : revenir à l’ancienne application en gardant les tables et l’historique.
Ne pas supprimer identités/sessions et ne pas reset la base. Vérifier les erreurs
opérationnelles, reprises de connexion et readiness sans afficher les secrets.
