# Data Model — Migration Supabase

## User — public.user

| Champ | Type SQL | Contraintes | Représentation publique |
| --- | --- | --- | --- |
| id | integer | clé primaire, généré par séquence | nombre |
| firstName | character varying | NOT NULL | chaîne |
| lastName | character varying | NOT NULL | chaîne |
| isActive | boolean | NOT NULL, défaut true | booléen |

Préserver les noms de colonnes camelCase avec quoting PostgreSQL. Aucune relation ni
nouvelle entité métier. Aucun couplage à auth.users : cette fiche n'est pas un compte Auth.
Pas de nouvelle règle sur longueur, unicité des noms ou contenu. Les contraintes NOT NULL
existantes restent effectives ; les DTO ne fournissent pas de validation runtime complète.

Transitions : création → actif ; consultation → inchangé ; suppression → absence physique.
Aucune opération de mise à jour ou désactivation n'est ajoutée.

## Objets opérationnels

- Historique TypeORM : table de migrations et migration initiale des seuls objets Forest.
- forest_app : login PostgreSQL serveur, droits CRUD et séquence seulement, sans DDL,
  propriété, privilèges administrateur ou BYPASSRLS.
- Rôle de migration : propriétaire des objets Forest avec DDL, distinct du runtime.
- RLS : politique CRUD uniquement pour forest_app ; aucun accès anon/authenticated.
- Environnement : projet de test distinct de production ; URLs et secrets externes.

Les rôles sont provisionnés explicitement sans mot de passe versionné. Les objets Supabase
existants, notamment auth/storage, ne sont pas touchés. Une table user préexistante non
suivie bloque la migration plutôt que d'être adoptée ou effacée implicitement.

## Données locales

Zéro donnée à reprendre selon l'utilisateur ; aucune lecture de la source pour le prouver.
La trace de cette décision est spec.md / Clarifications, pas une table supplémentaire.
Les tests créent leurs propres fiches sur la destination isolée et ne nettoient que celles-ci.
