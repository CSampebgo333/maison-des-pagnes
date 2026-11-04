import {test} from 'node:test';
import assert from 'node:assert/strict';
import {claimInstallNotice,noticeDue,INSTALL_NOTICE_KEY,INSTALL_KNOWN_KEY,INSTALL_INTERVAL,installationPlatform} from '../src/lib/install-prompt.ts';
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
test('Installation help distinguishes iPhone, desktop-mode iPad and Safari on Mac',()=>{
 assert.equal(installationPlatform('iPhone Safari','iPhone',5),'ios');
 assert.equal(installationPlatform('Safari','MacIntel',5),'ios');
 assert.equal(installationPlatform('Version/18 Safari','MacIntel',0),'mac-safari');
 assert.equal(installationPlatform('Chrome Safari','MacIntel',0),'other');
});
