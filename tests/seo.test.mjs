import {test} from 'node:test';
import assert from 'node:assert/strict';
import {seoFiles} from '../scripts/prepare-seo.mjs';
test('L’aperçu privé ne prétend pas être indexable et ne génère pas un faux domaine',()=>{const seo=seoFiles();assert.equal(seo.indexable,false);assert.match(seo.robots,/Disallow: \/\n/);assert.doesNotMatch(seo.head,/canonical/);assert.doesNotMatch(seo.sitemap,/<loc>/);});
test('Le domaine public configure canonique, aperçu social et sitemap en excluant commandes et gestion',()=>{const seo=seoFiles('https://boutique.example/');assert.equal(seo.indexable,true);assert.match(seo.head,/rel="canonical" href="https:\/\/boutique.example\/"/);assert.match(seo.robots,/Disallow: \/order-pdfs\//);assert.match(seo.robots,/gestion=/);assert.match(seo.sitemap,/<loc>https:\/\/boutique.example\/<\/loc>/);});
test('La configuration refuse une adresse non HTTPS, des secrets ou des paramètres',()=>{for(const url of ['http://boutique.example','https://user:secret@boutique.example/','https://boutique.example/?gestion=1','https://boutique.example/path'])assert.throws(()=>seoFiles(url));});
