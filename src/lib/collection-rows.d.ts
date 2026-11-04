export type CollectionRow = number;
type RowProduct = {number?:number;collectionRow?:number};
export const COLLECTION_ROWS: readonly {id:CollectionRow;title:string}[];
export function productCollectionRow(product:RowProduct):CollectionRow;
export function groupCollectionRows<T extends RowProduct>(products:T[]):{id:CollectionRow;title:string;products:T[]}[];
