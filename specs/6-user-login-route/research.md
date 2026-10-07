# Research and decisions

Date : 2026-10-07. Recherche en lecture seule, puis choix implémentés et vérifiés.

## Identity authority

Decision : identité locale Forest et compte initial dans sa base. Justification :
choix utilisateur B pour le moment, contrat direct email/password. Alternative :
Keycloak + Authorization Code/PKCE, explicitement retiré du périmètre. Confiance élevée
sur la cohérence du contrat ; les mots de passe et sessions sont désormais à maintenir
par Forest. SSO/MFA pourrait modifier ce verdict. Ce service ne revendique pas OAuth.

## Password hashing

Decision : node:crypto.scrypt asynchrone N=32768/r=8/p=3, salt 16 octets, dérivé 64 octets,
maxmem 64 Mio ; enveloppe versionnée et timingSafeEqual. Justification : configuration
scrypt publiée, mémoire bornée et pas de dépendance native supplémentaire.
Alternatives : Argon2id (préférence OWASP mais ajout d’une dépendance), bcrypt legacy.
Confiance élevée ; ajuster seulement après benchmark et revue sécurité.

Sources : [Node crypto 24.16](https://nodejs.org/download/release/v24.16.0/docs/api/crypto.html),
[OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).
Mesure locale : 6 paires à concurrence 2, 117/115/136/114/116/140 ms, RSS observé 109 Mio.
Pas de revendication de débit de production. Capacité : 2 actifs, 16 en attente, overflow 503.

## Sessions and rotation

Decision : access/refresh opaques de 32 octets CSPRNG, SHA-256 uniquement en base,
accès 15 min/session 7 jours absolus (choix utilisateur). Rotation des deux tokens,
consommation du refresh sous verrou de ligne et détection persistante de rejeu.
Alternative JWT : aucun consommateur distribué identifié, révocation plus complexe.
Confiance élevée sur le stockage opaque ; politique de rejeu stricte avec coût UX assumé.
Pas de grâce de concurrence ; sérialisation côté client, réponse perdue => reconnexion possible.

Sources : [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html),
[Prisma transactions](https://docs.prisma.io/docs/orm/v7/prisma-client/queries/transactions).
La révocation de rejeu est commitée avant de lever l’erreur HTTP pour éviter son rollback.

## HTTP and framework compatibility

Decision : cookie-parser, contrôles dans middleware AuthModule ; origines exactes,
credentials CORS, SameSite=Lax et en-tête X-Forest-Request obligatoire sur POST auth.
Déploiement même site choisi par l’utilisateur. Alternative multi-site écartée pour
éviter les restrictions cookies tiers. Pas de mise à niveau de NestJS implicite : les
méthodes CSRF documentées à partir de 12.1 ne sont pas utilisées sur 12.0.1.

Sources : [Nest lifecycle](https://docs.nestjs.com/fundamentals/lifecycle-events),
[Nest CSRF](https://docs.nestjs.com/security/csrf),
[Express cookies](https://expressjs.com/en/5x/api.html#res.cookie).

## Persistence and compatibility

Decision : tables auth séparées, relations vers User, migration additive Prisma,
RLS et grants limités au runtime Forest. Alternative : colonnes obligatoires sur User,
écartée car profils historiques et POST /users ne fournissent aucun justificatif.
Confiance élevée ; pas de backfill fictif d’emails. Les APIs /users restent publiques
sur décision utilisateur ; elles ne constituent pas un périmètre protégé par ce ticket.

Source : [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
Le chargement du changelog Markdown via web a été indisponible ; aucun SDK/Supabase Auth
n’est modifié, seules les primitives PostgreSQL existantes sont utilisées.

## Bootstrap and abuse controls

Decision : création au démarrage avant HTTP, transaction compte/identité, contrainte email
unique et relecture après collision ; compte existant jamais modifié. Fenêtres fixes
partagées en PostgreSQL plutôt qu’en mémoire pour cohérence entre réplicas. Coûts :
écriture DB par tentative et blocage temporaire possible d’un email ciblé. Pas de
verrouillage permanent ni confiance dans les en-têtes proxy non configurés.

Unknowns : aucun choix bloquant restant. Dimensionnement production et protection des
routes /users restent des travaux distincts, pas des garanties de cette livraison.
