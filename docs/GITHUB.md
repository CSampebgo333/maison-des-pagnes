# Préparer et pousser sur GitHub

Le projet est versionné dans `CSampebgo333/maison-des-pagnes`, actuellement public, sur la branche `main`. Le backend est prévu pour Cloudflare Workers, D1 et R2. Les instructions de création ci-dessous concernent uniquement une nouvelle copie du projet ; ne pas réinitialiser le dépôt existant.

## Avec l’assistant

Ajouter l’intégration GitHub et autoriser l’accès au dépôt concerné. Donner ensuite à l’assistant le lien du dépôt. L’accès doit permettre les écritures, et pas seulement la lecture.

La création d’un dépôt par l’assistant dépend des opérations et autorisations réellement disponibles après la connexion. Si la création n’est pas exposée, créer le dépôt privé soi-même et transmettre son lien. Ne pas initialiser ce dépôt avec un README si le projet local doit être poussé comme premier commit.

Ne pas transmettre de mot de passe ou de jeton dans le chat. La connexion se fait via le flux de connexion proposé pour GitHub.

## Depuis son ordinateur

Décompresser le projet, installer les dépendances et exécuter les contrôles décrits dans le README. Puis :

```sh
git init -b main
git add .
git commit -m "Crée la boutique immersive de pagnes"
```

Avec GitHub CLI, après `gh auth login` :

```sh
gh repo create maison-des-pagnes --private --source=. --remote=origin --push
```

Pour un dépôt vide déjà créé, remplacer l’adresse par celle du dépôt réel :

```sh
git remote add origin https://github.com/VOTRE-COMPTE/VOTRE-DEPOT.git
git push -u origin main
```

Si le dépôt contient déjà des commits, le cloner et intégrer les fichiers dans une branche ; ne pas forcer le push.

## La suite

Le push sauvegarde et versionne le code. Le déploiement met l’application en ligne : c’est une étape distincte, qui reste à faire après validation du rendu. Le dépôt contient désormais la configuration pour Workers Builds : voir la section Déploiement automatique du guide Cloudflare. L’automatisation devient active uniquement après connexion du Worker existant au dépôt dans le tableau de bord Cloudflare.

Sources officielles :

- https://cli.github.com/manual/gh_repo_create
- https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github
