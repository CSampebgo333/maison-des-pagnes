import {test} from 'node:test';
import assert from 'node:assert/strict';
import {claimInstallNotice,noticeDue,INSTALL_NOTICE_KEY,INSTALL_KNOWN_KEY,INSTALL_INTERVAL,captureInstallPrompt,getInstallPrompt,clearInstallPrompt,subscribeInstallPrompt,promptInstallation,type InstallPromptEvent} from '../src/lib/install-prompt.ts';
const storage=()=>{const data=new Map<string,string>();return {data,getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};};
test('Installation notice follows elapsed 24 hours, not midnight or the most recent visit',()=>{
 const s=storage(),morning=Date.parse('2026-11-04T08:00:00Z');
 assert.equal(claimInstallNotice(s,morning),true);
 assert.equal(claimInstallNotice(s,morning+13*3600000),false);
 assert.equal(s.getItem(INSTALL_NOTICE_KEY),String(morning));
 assert.equal(claimInstallNotice(s,morning+INSTALL_INTERVAL-1),false);
 assert.equal(claimInstallNotice(s,morning+25*3600000),true);
 assert.equal(claimInstallNotice(s,morning+3*INSTALL_INTERVAL+25*3600000),true);
});
test('Another page or tab uses the same timestamp, and known installed apps are not promoted',()=>{
 const s=storage();assert.equal(claimInstallNotice(s,1000),true);assert.equal(claimInstallNotice(s,1001),false);
 s.setItem(INSTALL_KNOWN_KEY,'1');assert.equal(claimInstallNotice(s,1000+3*INSTALL_INTERVAL),false);
});
test('Corrupt timestamps recover while storage failures do not cause repetitive prompts',()=>{
 assert.equal(noticeDue('broken',1000),true);assert.equal(noticeDue('-20',1000),true);
 assert.equal(claimInstallNotice({getItem(){throw Error('blocked');},setItem(){}},1000),false);
 assert.equal(claimInstallNotice({getItem(){return null;},setItem(){throw Error('quota');}},1000),false);
});
test('Only a real install capability is captured, even before the notice mounts',async()=>{
 clearInstallPrompt();const target=new EventTarget(),stop=captureInstallPrompt(target);let changes=0;
 const unsubscribe=subscribeInstallPrompt(()=>changes++);
 try{
  assert.equal(await promptInstallation(),'unavailable');
  target.dispatchEvent(new Event('beforeinstallprompt',{cancelable:true}));assert.equal(getInstallPrompt(),null);assert.equal(changes,0);
  let calls=0;const event=Object.assign(new Event('beforeinstallprompt',{cancelable:true}),{prompt:async()=>{calls++;},userChoice:Promise.resolve({outcome:'accepted' as const})}) as InstallPromptEvent;
  target.dispatchEvent(event);assert.equal(event.defaultPrevented,true);assert.equal(getInstallPrompt(),event);assert.equal(changes,1);
  const result=promptInstallation();assert.equal(calls,1,'Native prompt is invoked synchronously inside the user gesture');
  assert.equal(getInstallPrompt(),null);assert.equal(await promptInstallation(),'unavailable');assert.equal(await result,'accepted');assert.equal(calls,1);assert.equal(changes,2);
 }finally{unsubscribe();stop();clearInstallPrompt();}
});
test('A cancelled or failed native prompt is consumed, and an installed app invalidates it',async()=>{
 const target=new EventTarget(),stop=captureInstallPrompt(target);
 const emit=(prompt:()=>Promise<void>,outcome:'accepted'|'dismissed')=>target.dispatchEvent(Object.assign(new Event('beforeinstallprompt',{cancelable:true}),{prompt,userChoice:Promise.resolve({outcome})}));
 try{
  emit(async()=>{},'dismissed');assert.equal(await promptInstallation(),'dismissed');assert.equal(getInstallPrompt(),null);
  emit(async()=>{throw Error('Browser refused');},'accepted');assert.equal(await promptInstallation(),'failed');assert.equal(await promptInstallation(),'unavailable');
  emit(async()=>{},'accepted');target.dispatchEvent(new Event('appinstalled'));assert.equal(getInstallPrompt(),null);assert.equal(await promptInstallation(),'unavailable');
 }finally{stop();clearInstallPrompt();}
});
