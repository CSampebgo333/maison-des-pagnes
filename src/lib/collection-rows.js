export const COLLECTION_ROWS = [
  { id: 1, title: 'Nos coups de cœur' },
  { id: 2, title: 'Jeux de rayures' },
  { id: 3, title: 'Nuances à découvrir' },
];

// Legacy catalogues have no row. Keep their initial arrangement stable until
// the owner explicitly chooses a different row; new articles start in row 1.
export function productCollectionRow(product) {
  if ([1, 2, 3].includes(product.collectionRow)) return product.collectionRow;
  if ([4, 5, 7, 8].includes(product.number)) return 2;
  if ([9, 10, 11, 12].includes(product.number)) return 3;
  return 1;
}

export function groupCollectionRows(products) {
  return COLLECTION_ROWS.map(row => ({
    ...row, products: products.filter(product => productCollectionRow(product) === row.id),
  }));
}
