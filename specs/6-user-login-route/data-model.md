# Data model — Local authentication

La migration ajoute quatre tables sans changer les colonnes ou réponses de User.

## AuthIdentity → auth_identity

- userId : INTEGER, PK et FK unique vers user.id, ON DELETE CASCADE.
- email : VARCHAR(254), obligatoire, unique ; normalisé trim/lowercase, ASCII,
  local part ≤64, labels de domaine valides ; pas de règles propres Gmail/autres fournisseurs.
- passwordHash : TEXT, enveloppe `scrypt$1$32768$8$3$saltHex$derivedHex`.
- createdAt : TIMESTAMPTZ(3), défaut CURRENT_TIMESTAMP.

Un User peut avoir zéro ou une identité. Profil sans identité => login impossible.
Compte initial : noms vides, actif, sans privilège administratif. Les mots de passe sont
préservés littéralement ; provisioning 12–128 caractères Unicode, login 1–128.

## AuthSession → auth_session

- id : UUID, PK, généré par Node.
- userId : INTEGER, FK user.id CASCADE, indexé.
- accessHash : CHAR(64), unique ; empreinte SHA-256 du token d’accès courant.
- accessExpiresAt : TIMESTAMPTZ(3), min(now+15min, expiresAt).
- expiresAt : TIMESTAMPTZ(3), now+7jours au login ; immuable au refresh, indexé.
- revokedAt : TIMESTAMPTZ(3), nullable ; toute valeur => session invalide.

Transitions : login => active ; refresh valide => nouvel accès ; logout/rejeu => révoquée ;
expiration => inutilisable ; suppression profil ou nettoyage expiration => supprimée.
Plusieurs sessions indépendantes par compte ; pas de limite de sessions ajoutée.

## AuthRefreshToken → auth_refresh_token

- hash : CHAR(64), PK, empreinte SHA-256.
- sessionId : UUID, FK session.id CASCADE, indexé.
- createdAt : TIMESTAMPTZ(3), défaut CURRENT_TIMESTAMP.
- consumedAt : TIMESTAMPTZ(3), nullable.

Token actif consommé une fois sous verrou de la session. Les tokens consommés restent
jusqu’à la suppression de la session pour détecter le rejeu après redémarrage.
Rejeu : session révoquée dans la transaction, erreur 401 levée seulement après commit.

## AuthAttempt → auth_attempt

- category : VARCHAR(32), login_ip / login_email / refresh_ip.
- key : CHAR(64), SHA-256 de l’IP ou de l’email normalisé ; aucune clé brute.
- windowStart : TIMESTAMPTZ(3), début de fenêtre fixe.
- expiresAt : TIMESTAMPTZ(3), fin de fenêtre, indexé.
- count : INTEGER >0, saturé à limite+1.
- PK composée category/key/windowStart.

INSERT ON CONFLICT DO UPDATE incrémente atomiquement. Limites : login 20/IP,
5/email/5min ; refresh 60/IP/min. L’IP est chargée même pour input malformé, l’email
après validation. Aucun reset au succès. Les limites de fenêtre ne promettent pas
une fenêtre glissante ; la frontière autorise les rafales habituelles des fenêtres fixes.

## Authorization, migration and cleanup

RLS activée sur les quatre tables ; revoke PUBLIC/anon/authenticated ; CRUD accordé
à forest_app avec policy dédiée. Aucun DDL runtime, aucun nouveau droit auth/storage.
La migration Prisma est transactionnelle et additive. Ancienne application compatible
avec les tables ajoutées. Rollback applicatif sans suppression de données.
Nettoyer sessions/fenêtres expirées au bootstrap et toutes les heures ; ne jamais
faire dépendre la validité des tokens du passage du nettoyage.
