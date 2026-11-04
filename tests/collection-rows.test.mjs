import {test} from 'node:test';
import assert from 'node:assert/strict';
import {groupCollectionRows,productCollectionRow} from '../src/lib/collection-rows.js';

test('Le catalogue initial est réparti entre trois rangées sans perte ni doublon',()=>{
 const products=Array.from({length:12},(_,i)=>({id:'pagne'+(i+1),number:i+1}));
 const rows=groupCollectionRows(products);
 assert.deepEqual(rows.map(row=>row.products.map(p=>p.number)),[[1,2,3,6],[4,5,7,8],[9,10,11,12]]);
 assert.equal(new Set(rows.flatMap(row=>row.products.map(p=>p.id))).size,12);
 assert.equal(productCollectionRow({number:13}),1);
});
test('Déplacer un article conserve les filtres et le tri, sans modifier les autres articles',()=>{
 const products=[{id:'a',number:1},{id:'b',number:2},{id:'c',number:4}];
 const moved=products.map(p=>p.id==='a'?{...p,collectionRow:2}:p);
 assert.deepEqual(groupCollectionRows(moved).map(row=>row.products.map(p=>p.id)),[['b'],['a','c'],[]]);
 const filtered=groupCollectionRows(moved.filter(p=>p.id!=='b').reverse());
 assert.deepEqual(filtered[1].products.map(p=>p.id),['c','a']);
 assert.equal(products[0].collectionRow,undefined);
});
test('Additional rows remain visible in the full collection and never enter the three home rows',()=>{
 const products=[{id:'a',number:1},{id:'extra',number:13,collectionRow:4},{id:'last',number:14,collectionRow:50}];
 const rows=groupCollectionRows(products);
 assert.deepEqual(rows.filter(r=>r.id<=3).flatMap(r=>r.products.map(p=>p.id)),['a']);
 assert.deepEqual(rows.flatMap(r=>r.products.map(p=>p.id)),['a','extra','last']);
 assert.equal(productCollectionRow({collectionRow:51}),1);
});
