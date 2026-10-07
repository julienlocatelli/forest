# Data model — Forest

## User

Table physique conservée : `public.user`. Modèle Prisma proposé : User, avec mapping explicite du nom de table.

| Champ | Type persistant | Contraintes | Contrat public |
| --- | --- | --- | --- |
| id | integer | clé primaire, auto-incrément | entier JSON |
| firstName | character varying | non nul, aucune longueur nouvelle | chaîne |
| lastName | character varying | non nul, aucune longueur nouvelle | chaîne |
| isActive | boolean | non nul, défaut true | booléen |

Aucune relation, email, compte Auth ou horodatage ajouté. Aucune unicité nouvelle sur les noms. Cycle : création → lecture/liste → suppression ; aucun endpoint de modification du statut actif ajouté. L’ordre de liste n’est pas garanti par le contrat existant.

Les identifiants et champs restent exposés avec leurs noms exacts. Pas de nouvelle validation HTTP : les entrées manquantes restent caractérisées par les tests historiques. Une forme User indépendante de l’ORM empêche de lier le contrôleur aux types générés.

## Migration history

`_prisma_migrations` est un objet technique de suivi de Prisma, pas une entité métier exposée. Autorité unique pour les migrations Forest ; pas de transfert d’historique TypeORM sur la base neuve. Protéger ce suivi contre PUBLIC, anon, authenticated et le runtime ; vérifier ces droits après première application.

## Ownership and permissions

forest_migration possède les objets Forest et applique les évolutions ; forest_app possède les droits CRUD de table et usage/select de séquence, sans création de schéma, superuser ou BYPASSRLS. RLS reste active et la politique `forest_app_crud` permet seulement le rôle Forest prévu. Les consommateurs publics Supabase ne reçoivent aucun grant sur table, séquence ou historique. Les autres objets fournisseur restent inchangés.

## Initialization invariants

Vérifier la cible avant la première application : objets Forest absents et aucune donnée métier à reprendre. Une destination non conforme bloque ; pas de DROP, reset ou adoption silencieuse. L’application ultérieure des mêmes migrations conserve les lignes. Transaction initiale pour table, séquence et droits ; après échec/timeout, vérifier l’historique et les objets avant réparation revue.
