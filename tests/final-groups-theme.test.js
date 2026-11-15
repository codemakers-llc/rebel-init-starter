import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from '../scripts/server.js';
test('Minimal Light is first-visit default while saved Dark remains supported',async()=>{
 const html=await readFile(new URL('../frontend/index.html',import.meta.url),'utf8');
 assert.match(html,/==='dark'\?'dark':'light'/);
 const seed=JSON.parse(await readFile(new URL('../scripts/data/runtime.seed.json',import.meta.url),'utf8'));
 assert.equal(seed.theme.palette,'Minimal');assert.equal(seed.theme.mode,'light');
});
test('bootstrap organizes existing views into Demo, Designer and Audit without changing roles',async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try {
  const base='http://127.0.0.1:'+server.address().port;
  const res=await fetch(base+'/api/bootstrap');assert.equal(res.status,200);
  const d=await res.json();assert.deepEqual(d.modules.map(x=>x.name),['Demo','Designer','Audit']);
  const groupById=Object.fromEntries(d.modules.map(x=>[x.id,x.name]));
  const menuByRoute=Object.fromEntries(d.menuItems.map(x=>[x.route,groupById[x.moduleId]]));
  assert.equal(menuByRoute['/dashboard'],'Demo');assert.equal(menuByRoute['/catalogs/modules'],'Demo');
  for(const route of ['/view-designer','/menu-designer','/theme-studio'])assert.equal(menuByRoute[route],'Designer');
  assert.equal(menuByRoute['/audit-trail'],'Audit');
  assert(d.views.every(x=>x.roles.includes('demo')));
 } finally {await new Promise(r=>server.close(r));}
});
