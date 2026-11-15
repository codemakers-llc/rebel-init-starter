import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from '../scripts/server.js';

test('Only Demo card is exposed, with every initial view accessible',async()=>{
 const app=await readFile(new URL('../frontend/app.js',import.meta.url),'utf8');
 assert.match(app,/const demoProfiles=\[\{role:'demo'/);
 assert.doesNotMatch(app,/(?<!const )demoProfiles\s*=/g);
 assert.doesNotMatch(app,/profilesFromViews\(available\)/);
 assert.match(app,/authStore\.current\?\.role==='demo'\?configStore\.getViews\(\)/);
 const views=JSON.parse(await readFile(new URL('../frontend/views.json',import.meta.url),'utf8')).views;
 assert(views.length>=9);
 for(const view of views)assert.deepEqual(view.roles,['demo']);
 const seed=JSON.parse(await readFile(new URL('../scripts/data/runtime.seed.json',import.meta.url),'utf8'));
 assert.deepEqual(seed.roles.map(x=>x.name),['demo']);
 assert.deepEqual(seed.users.map(x=>x.role),['demo']);
 assert.deepEqual(seed.catalogs.modules.map(x=>x.name),['Demo','Designer','Audit']);
});

test('Demo has a valid dashboard and retains all Designer and workflow routes',async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;
 try{
  const login=await fetch(base+'/api/proto/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({role:'demo'})});assert.equal(login.status,200);
  const {token}=await login.json();
  const headers={'x-proto-session':token};
  const boot=await fetch(base+'/api/bootstrap',{headers});assert.equal(boot.status,200);const data=await boot.json();
  for(const path of ['/dashboard','/requests','/request-review','/view-designer','/menu-designer','/theme-studio','/audit-trail'])assert(data.views.some(x=>x.route===path),path);
  for(const path of ['/api/dashboard','/api/telemetry','/api/requests','/api/navigation']){const response=await fetch(base+path,{headers});assert.equal(response.status,200,path);}
  for(const asset of ['/rebel/dashboard-widgets.js','/rebel/index.js','/rebel-shell.css','/styles.css']){const response=await fetch(base+asset);assert.equal(response.status,200,asset);assert.match(response.headers.get('content-type'),/javascript|css/,asset);}
 }finally{await new Promise(r=>server.close(r));}
});
