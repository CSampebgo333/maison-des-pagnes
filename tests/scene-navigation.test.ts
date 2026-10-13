import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { overviewView,wrappedIndex,approachReady } from '../src/lib/scene-navigation.ts';
test('Le cadrage reste dans le salon original et montre les six compartiments du fond en portrait et paysage',()=>{
 for(const aspect of [.53,.65,.84,1,1.3,1.6,2.2]){
  const view=overviewView(aspect);assert.ok(view.z<9.3);const camera=new THREE.PerspectiveCamera(view.fov,aspect,.08,60);camera.position.set(view.x,view.y,view.z);camera.rotation.set(-.015,0,0,'YXZ');camera.updateMatrixWorld();
  for(let col=0;col<6;col++){const projected=new THREE.Vector3((col-2.5)*1.64,2.55,-5.85).project(camera);assert.ok(Math.abs(projected.x)<1&&Math.abs(projected.y)<1&&projected.z<1);}
 }
});
test('Précédent et suivant parcourent les douze pagnes sans index invalide',()=>{assert.equal(wrappedIndex(-1,1,12),0);assert.equal(wrappedIndex(-1,-1,12),11);assert.equal(wrappedIndex(11,1,12),0);assert.equal(wrappedIndex(0,-1,12),11);assert.equal(wrappedIndex(0,1,1),0);assert.equal(wrappedIndex(0,1,0),-1);});
test('L’ouverture attend une approche courte avec une limite d’attente',()=>{assert.equal(approachReady(.2,0,0),false);assert.equal(approachReady(.7,.02,.01),true);assert.equal(approachReady(.7,4,.01),false);assert.equal(approachReady(.7,.02,.5),false);assert.equal(approachReady(1.5,4,.5),true);});
