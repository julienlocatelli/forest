# Correction du démarrage — TASK 13

[Ticket Notion #13](https://app.notion.com/p/3f274e4626fd810a9a5ccb216a2763ad)

La base de développement a été initialisée avec Prisma et les tables
d’authentification. La procédure ponctuelle de reprise a été exécutée puis retirée
à la demande de l’utilisateur : aucun module legacy ni commande baseline ne reste.
Les migrations Prisma existantes définissent le schéma et ses protections RLS
pour une nouvelle base. Aucun changement automatique du schéma au démarrage HTTP.

Le lancement racine est `bun dev`. Les erreurs de configuration, de connexion ou
de tables manquantes fournissent un diagnostic sans secrets. Les serveurs lancés
pour vérification doivent être arrêtés avant de rendre la main.

Knip vérifie les références ; les dépendances Supabase inutilisées de l’API ont été
retirées. Prisma reste requis par le client généré. Les fichiers des skills ne sont
pas du code applicatif inutilisé à supprimer.
