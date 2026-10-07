# HTTP contract — Users

Contrats conservés, pas de nouvelle authentification ou validation dans ce ticket. Base API existante ; le chemin racine conserve Hello World!.

| Opération | Entrée | Résultat observable |
| --- | --- | --- |
| POST /users | JSON firstName et lastName | 201, User avec id entier et isActive=true |
| GET /users | aucune | 200, tableau User, ordre non garanti |
| GET /users/:id | entier | 200 User si présent, corps vide/nul si absent |
| DELETE /users/:id | identifiant existant ou absent | 200, corps vide ; zéro ligne supprimée ne produit pas d’erreur |

User contient uniquement id, firstName, lastName et isActive. La lecture doit rester identique après redémarrage.

Cas négatifs constatés : GET avec id non numérique retourne 400 ; POST sans lastName retourne 500 avec message Internal server error. DELETE n’a pas ParseIntPipe aujourd’hui : le repository TypeORM 1.1.1 a été exécuté sur la cible isolée : une entrée non numérique produit SQLSTATE 22P02, donc une réponse Nest 500 générique. Cette réponse est maintenue et testée. Les erreurs Prisma/pg restent internes ; aucune URL, SQL, paramètre ou valeur secrète n’est renvoyé ou journalisé.

Compatibilité validée via Supertest contre une vraie base isolée, incluant suppression répétée et absence. La migration ne résout pas les défauts de contrat existants.
