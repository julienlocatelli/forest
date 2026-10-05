# Contrat utilisateur conservé

Base : serveur NestJS existant, sans préfixe ajouté et sans nouveau guard.

| Opération | Entrée | Réponse conservée |
| --- | --- | --- |
| POST /users | JSON firstName et lastName | 201, fiche avec id numérique et isActive=true |
| GET /users | aucune | 200, tableau de fiches ; ordre non garanti |
| GET /users/:id | identifiant accepté par ParseIntPipe | 200, fiche si présente |
| DELETE /users/:id | identifiant transmis au repository existant | 200, sans contenu utilisateur |

Le service retourne null pour un identifiant inconnu : caractériser le corps HTTP réel
avec NestJS installé, sans convertir implicitement cette réponse en 404.
Un identifiant non numérique sur GET est rejeté par ParseIntPipe (400).
DELETE n'a pas ce pipe : ne pas lui attribuer artificiellement les règles de GET.
Les champs manquants en création relèvent actuellement des contraintes de stockage,
sans ValidationPipe ; caractériser les erreurs publiques puis les préserver.

Pour chaque parcours, les tests comparent statut et contenu avant/après adaptation.
Si les métadonnées de l'entité empêchent le démarrage actuel, enregistrer cet écart et
corriger uniquement le mapping integer nécessaire, sans inventer de baseline exécutée.
Créer deux fiches, redémarrer, supprimer une seule ; vérifier la seconde inchangée.

Les erreurs d'infrastructure ne doivent jamais exposer URL, mot de passe, clé ou certificat
privé. Un diagnostic interne doit utiliser une catégorie et des champs non sensibles,
sans logger l'objet erreur brut du driver ni les paramètres de requête.
