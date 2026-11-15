import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../scripts/server.js';
import {readFile} from 'node:fs/promises';

test('Single bootstrap reads registered features, no role returns all; role filters when present',async()=>{
 const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 try{
  const response=await fetch(base+'/api/bootstrap');assert.equal(response.status,200);
  const bootstrap=await response.json();assert.equal(bootstrap.role,null);
  assert(bootstrap.views.length>5);assert(bootstrap.modules.length>0);assert(bootstrap.menuItems.length>0);
  assert(bootstrap.views.some(v=>v.route==='/catalogs/modules'));
  assert(bootstrap.views.every(view=>view.file.endsWith('.js')), 'All feature views must be .js, not .json');
  assert.equal(bootstrap.views.find(v=>v.route==='/catalogs/modules')?.definition?.type,'crud');
  assert.equal(bootstrap.views.find(v=>v.route==='/catalogs/modules')?.definition?.endpoint,'/api/catalog/modules');
  for(const view of bootstrap.views){assert.match(view.version,/^[a-f0-9]{12}$/);const source=await readFile(new URL('../frontend/'+view.file,import.meta.url),'utf8');assert(source.length>0)}
  const login=await fetch(base+'/api/proto/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({role:'technician'})});
  const {token}=await login.json();
  const filtered=await (await fetch(base+'/api/bootstrap',{headers:{'x-proto-session':token}})).json();
  assert.equal(filtered.role,'technician');assert(filtered.views.every(v=>v.roles.includes('technician')));
  assert(filtered.menuItems.every(item=>filtered.views.some(view=>view.route===item.route)));
 }finally{await new Promise(resolve=>server.close(resolve))}
});
