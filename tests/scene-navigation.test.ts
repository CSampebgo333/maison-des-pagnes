import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { overviewView,wrappedIndex,approachReady } from '../src/lib/scene-navigation.ts';
test('La vue d’ensemble cadre les douze compartiments du téléphone au grand écran',()=>{
 const centers=[];
 for(let col=0;col<6;col++)centers.push(new THREE.Vector3((col-2.5)*1.64,2.55,-5.85));
 for(let i=0;i<3;i++){centers.push(new THREE.Vector3(-5.1,2.55,-3.45+i*3.1));centers.push(new THREE.Vector3(5.1,2.55,-3.45+i*3.1));}
 for(const aspect of [.45,.53,.65,.84,.85,1,1.29,1.3,1.6,2.2]){
  const view=overviewView(aspect),camera=new THREE.PerspectiveCamera(view.fov,aspect,.08,60);camera.position.set(view.x,view.y,view.z);camera.rotation.set(-.015,0,0,'YXZ');camera.updateMatrixWorld();
  for(const center of centers){const projected=center.clone().project(camera);assert.ok(Math.abs(projected.x)<1&&Math.abs(projected.y)<1&&projected.z<1,`Centre hors cadre : aspect ${aspect}, ${projected.toArray()}`);}
 }
});
test('Les commandes précédent et suivant parcourent le salon sans index invalide',()=>{assert.equal(wrappedIndex(-1,1,12),0);assert.equal(wrappedIndex(-1,-1,12),11);assert.equal(wrappedIndex(11,1,12),0);assert.equal(wrappedIndex(0,-1,12),11);assert.equal(wrappedIndex(0,1,1),0);assert.equal(wrappedIndex(0,1,0),-1);});
test('La fiche attend l’approche et dispose d’une limite pour éviter de bloquer un appareil lent',()=>{assert.equal(approachReady(.2,0,0),false);assert.equal(approachReady(.7,.02,.01),true);assert.equal(approachReady(.7,4,.01),false);assert.equal(approachReady(.7,.02,.5),false);assert.equal(approachReady(1.5,4,.5),true);});
