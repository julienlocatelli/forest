# Implementation Plan: Connexion locale et compte initial

**Branch**: `feature/6-login-api-route` | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

## Summary

Authentification propriétaire dans Forest, sans OAuth/OIDC ni Keycloak : compte initial
créé au démarrage s’il est absent, connexion email/password, sessions opaques révocables,
renouvellement avec rotation et déconnexion. Aucune interface frontend. Les routes
`/users` restent publiques et leurs réponses inchangées ; leur DELETE public est un
risque connu accepté dans ce périmètre, pas une preuve de sécurité globale de l’API.

## Technical Context

- Language/runtime: TypeScript 6.0.2, Node 24.16.0, Bun 1.3.14.
- Framework: NestJS 12.0.1, Express, Prisma 7.10.0, PostgreSQL hébergé sur Supabase.
- Dependencies: cookie-parser 1.4.7 et ses types ; crypto Node pour scrypt et tokens.
- Testing: Vitest 4.1.2, Supertest 7.0.0, projet PostgreSQL explicitement isolé.
- Platform: API Node ; développement navigateur localhost, HTTPS ailleurs.
- Scope: cycle complet login/refresh/logout/me ; même site frontend/API ; pas de SSO,
  inscription publique, récupération de mot de passe ou protection de `/users`.
- Resource limits: 2 dérivations simultanées et 16 en attente par processus, overflow 503.
  Sessions et compteurs partagés en base ; aucun objectif de débit de production établi.
- Durées: accès 15 minutes, expiration absolue de session 7 jours.

## Constitution Check

Vérification avant et après conception :

1. Décisions argumentées : identité locale choisie explicitement à la place d’OIDC ;
   opaques préférés aux JWT pour une révocation immédiate sans infrastructure externe.
2. Simplicité : module auth cohérent, Prisma existant, aucun bus, microservice ou ORM ajouté.
3. Contrats : validation locale de login, projection publique de me, `/users` préservé.
4. Sécurité/intégrité : hash de mot de passe et empreintes de tokens, privilèges/RLS,
   création atomique, concurrence sérialisée, migration versionnée sans DDL au démarrage.
5. Validation : unités, HTTP et PostgreSQL réels ; fixtures isolées et nettoyage ciblé.

Exception documentaire : la checklist conserve l’item « No implementation/API details »
incomplet car le ticket impose routes, cookies et variables. Ces contraintes sont des
contrats demandés, pas du code dans la spec. Réexaminer si les contrats changent.
Le risque des routes `/users` publiques est documenté, sans modification implicite.
La constitution décrit historiquement TypeORM ; le code constaté utilise désormais Prisma.

## Project Structure

Le module `apps/api/src/auth` possède configuration, mots de passe, comptes initiaux,
sessions, limiteurs et audit. `AuthController` adapte HTTP ; `SessionGuard` est le seul
provider exporté. `AuthModule` importe `DatabaseModule`, sans dépendance cyclique avec
UsersModule. Les modèles auth ont une relation vers les profils User existants.

Artefacts : `plan.md`, `research.md`, `data-model.md`, `contracts/http.md`, `quickstart.md`.
Les fichiers `tasks.md` et les opérations Git de publication ne font pas partie de cette livraison.

## Implementation behavior

- Bootstrap : configuration obligatoire ; hash factice initialisé ; compte créé avec
  noms vides et isActive=true uniquement si l’email normalisé est absent. Une création
  imbriquée Prisma est atomique. Collision P2002 suivie d’une relecture de l’identité.
  Aucun écrasement d’un compte existant, même inactif. Erreur => serveur non prêt.
- Mot de passe : scrypt asynchrone N=32768/r=8/p=3, salt 16 octets, dérivé 64 octets,
  maxmem 64 Mio, enveloppe versionnée et timingSafeEqual. Hash factice pour identité inconnue.
- Tokens : deux valeurs CSPRNG de 32 octets base64url ; seules empreintes SHA-256 en base.
  Une session par login ; accès courant unique, refresh consommés conservés.
- Refresh : verrou FOR UPDATE sur session, relecture après verrou, consommation et rotation
  transactionnelles ; expiration absolue inchangée. Rejeu => révocation commitée puis 401.
  Aucun token envoyé avant commit. Logout prend le même verrou via UPDATE.
- Me : vérifier expiration accès/session, révocation, présence et état actif du profil.
  Suppression utilisateur => cascades sur identité, sessions et refresh tokens.
- HTTP : erreurs du parseur JSON expurgées sur /auth sans modifier /users ;
  cookies Secure/HttpOnly/SameSite=Lax ; CORS limité ; header personnalisé exigé
  sur POST ; JSON pour login. Voir le contrat pour erreurs et chemins des cookies.
- Limites : fenêtres fixes PostgreSQL, 20/IP et 5/email sur 5 min pour login,
  60/IP/min pour refresh. IP réelle de socket, pas de confiance X-Forwarded-For.
- Nettoyage : sessions expirées et fenêtres expirées au démarrage puis chaque heure.
  La validité ne dépend pas du nettoyage ; timer désactivé au shutdown.
- Audit interne : outcome, correlation, userId optionnel ; aucun secret, email ou driver brut.

## Validation and rollout

Migration additive appliquée avant l’application avec le wrapper existant. Configurer
les variables obligatoires, démarrer et vérifier login → me → refresh → logout.
Le runtime continue à utiliser le rôle forest_app sans privilège DDL.
Rollback applicatif : conserver les tables et l’historique ; aucun DROP automatique.
La modification du mot de passe `.env` ne réinitialise pas un compte ; modifier l’email
peut créer un autre compte ordinaire. Les clients doivent sérialiser les refresh entre
onglets ; une réponse de refresh perdue peut imposer une nouvelle connexion.

Validation exécutée le 2026-10-07 : prisma:validate, build et lint réussis ; 39 tests
unitaires/HTTP et 17 tests E2E réussis. Migration appliquée seulement au projet isolé
par les tests. Aucune migration déployée à la base applicative ; aucun commit/push.
Mesure locale : 6 paires scrypt concurrentes, 114–140 ms par paire, RSS 109 Mio.
Cette mesure n’établit pas un SLO de production. Guide complet : quickstart.md.

## Complexity Tracking

Aucune nouvelle couche ou infrastructure de session : PostgreSQL existant stocke
sessions et limites afin de garder l’état partagé entre processus. La conservation
historique des refresh tokens est nécessaire à la détection de rejeu après redémarrage.
