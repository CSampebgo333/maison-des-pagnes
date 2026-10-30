# Photos et fiches des pagnes

Le catalogue initial contient douze modèles (`pagne1` à `pagne12`), avec cinq vues par modèle, soit soixante photos. Les fichiers et métadonnées du dépôt servent de catalogue initial ; les modifications enregistrées dans la gestion prennent ensuite priorité dans D1.

## Noms des fichiers

| Exemple | Signification |
| --- | --- |
| `pagne1-1.webp` | Pagne 1, vue d’ensemble |
| `pagne1-2.webp` | Pagne 1, pagne plié |
| `pagne1-3.webp` | Pagne 1, tissu drapé |
| `pagne1-4.webp` | Pagne 1, détail du motif |
| `pagne1-5.webp` | Pagne 1, autre vue |
| `pagne12-1.png` | Pagne 12, première vue |

Les légendes sont définies dans `scripts/catalogue-core.mjs` et peuvent être adaptées. Les vues au-delà de 5 sont acceptées avec la légende « Vue N ». Au moins une photo est nécessaire pour afficher un pagne.

Mettre les images dans `public/pagnes/`. Après un ajout ou remplacement, exécuter `pnpm catalogue`, puis `python scripts/optimize-images.py` (Pillow requis) et `pnpm build` pour régénérer le catalogue et les variantes versionnées. Les aperçus facultatifs doivent conserver le même nom et la même extension dans `public/pagnes/apercus/`. Lorsqu’un aperçu manque, l’original est utilisé. Si une photo est remplacée manuellement, remplacer ou retirer son ancien aperçu également.

## Fiche produit

Exemple de fiche source dans `config/pagnes.json` (adapter la clé au modèle concerné) :

```json
"pagne3": {
  "name": "Nom du pagne",
  "description": "Description fidèle au modèle et aux photos.",
  "colors": ["Vert", "Blanc"],
  "pattern": "Motif du pagne",
  "accent": "#5a7967",
  "price": null,
  "unit": "",
  "composition": "",
  "dimensions": ""
}
```

`price: null` affiche « Prix sur demande ». Avant d’ajouter un prix, définir la devise dans `config/boutique.json`. Renseigner la véritable unité de vente dans `unit` : par pièce, par lot, au mètre, selon les articles. La quantité dans la sélection représente des unités de vente et ne constitue pas une réservation.

La composition et les dimensions apparaissent seulement lorsqu’elles sont renseignées. Les couleurs et les motifs permettent la recherche. Les nouveaux noms, descriptions et caractéristiques doivent correspondre au produit réel.

Le catalogue compilé dans `src/catalogue.json` est généré : modifier les fiches dans `config/pagnes.json`, pas directement dans le fichier compilé.
