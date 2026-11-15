import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createServer} from '../scripts/server.js';
const runtime=new URL('../scripts/data/runtime.json',import.meta.url);
test('Request state machine: draft, submit, no edit during review, reject, edit, resubmit, approve',async()=>{
 const original=await readFile(runtime,'utf8');const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 const req=async(path,method='GET',body)=>{const res=await fetch(base+path,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:res.status,data:await res.json()}};
 try{
  const payload={title:'Laptop repair',description:'Laptop is not charging',category:'Hardware',priority:'High'};
  const created=await req('/api/requests','POST',payload);assert.equal(created.status,201);
  const id=created.data.id;assert.equal(created.data.status,'Draft');
  assert.equal((await req('/api/requests/'+id+'/review','POST',{decision:'approve',score:5})).status,409);
  assert.equal((await req('/api/requests/'+id+'/submit','POST')).status,200);
  assert.equal((await req('/api/requests/'+id,'PUT',payload)).status,409);
  assert.equal((await req('/api/requests/'+id+'/review','POST',{decision:'reject',score:3,feedback:'Missing cost'})).status,200);
  assert.equal((await req('/api/requests/'+id,'PUT',{...payload,description:'Updated scope and estimated cost',estimatedCost:350})).status,200);
  assert.equal((await req('/api/requests/'+id)).data.estimatedCost,350);
  assert.equal((await req('/api/requests/'+id+'/submit','POST')).status,200);
  assert.equal((await req('/api/requests/'+id+'/review','POST',{decision:'approve',score:5})).status,200);
  assert.equal((await req('/api/requests/'+id+'/review','POST',{decision:'reject',score:3,feedback:'Again'})).status,409);
  assert.equal((await req('/api/requests/'+id)).data.status,'Approved');
 }finally{await writeFile(runtime,original);await new Promise(resolve=>server.close(resolve));}
});
test('Mobile preview uses forced cards independently of desktop media queries',async()=>{
 const css=await readFile(new URL('../frontend/app.css',import.meta.url),'utf8');
 assert.match(css,/\.rebel-force-mobile-cards \.admin-table thead\{display:none!important\}/);
 assert.match(css,/\.rebel-force-mobile-cards \.admin-table td::before/);
 const js=await readFile(new URL('../node_modules/@code-makers/rebel/dist/view-designer.js',import.meta.url),'utf8');
 assert.match(js,/rebel-force-mobile-cards/);
 assert.match(js,/Adjust & Validate JSON/);
});
