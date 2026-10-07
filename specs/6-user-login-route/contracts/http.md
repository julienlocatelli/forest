# HTTP contract — Forest local authentication

## Common rules

Même site frontend/API. Exact Origin dans AUTH_ALLOWED_ORIGINS si présent ; origine
interdite => 403 avant effets. POST auth exige X-Forest-Request: 1 même sans Origin.
OPTIONS : 204, CORS uniquement pour origine autorisée. Credentials autorisés, aucune
origine wildcard. Pas de confiance implicite X-Forwarded-For. Cache-Control: no-store
sur les réponses traitées par auth. HTTPS hors localhost.

Cookies forest_access (Path=/) et forest_refresh (Path=/auth) : HttpOnly, Secure,
SameSite=Lax, aucune Domain, Expires respectant les durées de tokens. Aucun token
exposé dans un corps JSON ou journal. Client fetch avec credentials: include.

## POST /auth/login

Content-Type application/json, corps avec seulement email et password (strings).
Email normalisé trim/lowercase ASCII valide ≤254 caractères. Password 1–128 caractères,
jamais trim. Validation manquante, types invalides ou champs supplémentaires => 400.

Succès 200 : `{authenticated: true}` et deux cookies. Accès 15 minutes ; session 7 jours.
Email inconnu / mauvais mot de passe / compte inactif => même 401 générique, aucun token
émis et aucune suppression d’une session préexistante. L’existence seule ne suffit pas.

## POST /auth/refresh

Pas de corps métier requis. Authentifie le cookie refresh, pas l’access token expiré.
Succès 200 : `{authenticated: true}`, nouveaux cookies access/refresh ; ancien accès
invalide immédiatement, expiration absolue inchangée. Token absent/malformé/inconnu,
expiré/révoqué ou compte inactif => 401. Refresh consommé => révocation de sa session
et 401. Un refus 401 efface les cookies périmés. Concurrence de deux refresh identiques :
un 200, un 401, session finale révoquée ; le client sérialise les appels entre onglets.
Une réponse perdue peut exiger un nouveau login.

## POST /auth/logout

Révoque les sessions correspondant aux cookies access/refresh fournis et efface les
cookies avec les mêmes chemins/attributs. 204 sans corps. Cookies absents/invalides :
204 et cookies effacés. Indisponibilité DB => 503, pas de succès de révocation inventé.

## GET /auth/me

Access cookie requis. Vérifie expiration, révocation, utilisateur présent et actif.
200 : uniquement id, firstName, lastName, isActive. Aucun email/hash/session secret.
Sans session utilisable => 401. Aucun refresh automatique sur cette route.

## Errors and rate limits

Corps erreur `{statusCode, message}`. Messages :
- 400 : Invalid login input.
- 401 : Authentication failed.
- 403 : Origin forbidden. / Request forbidden.
- 429 : Too many authentication attempts. + Retry-After en secondes.
- 503 : Authentication unavailable.

Login : 20/IP et 5/email/5min ; refresh 60/IP/min ; fenêtres fixes partagées,
comptées avant cryptographie. Queue scrypt : 2 actifs/16 attente, overflow 503.
Pas de détails driver, motif d’authentification ou secret dans les erreurs publiques.
Les erreurs du parseur JSON sont également filtrées sur /auth : aucun extrait du
corps ne figure dans la réponse. Cache-Control: no-store et aucun token émis.
Les erreurs /users continuent à suivre le contrat Nest préexistant.

## Unchanged routes and exclusions

POST/GET/DELETE /users restent publics, avec les projections/erreurs historiques.
La suppression utilisateur invalide ses sessions par cascade. Aucune inscription,
interface frontend, OAuth/OIDC ou Keycloak. Protéger /users exige un ticket séparé.
