import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../scripts/server.js';
import {readFile,writeFile,unlink} from 'node:fs/promises';
const runtime=new URL('../scripts/data/runtime.json',import.meta.url),generated=new URL('../frontend/features/proto-demo-new.js',import.meta.url);
test('PROTO: menus, categories, audit and generated form work through REST',async()=>{
 const original=await readFile(runtime,'utf8');const server=createServer();await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const base='http://127.0.0.1:'+server.address().port;
 const req=async (path,method='GET',payload)=>{const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json'},body:payload?JSON.stringify(payload):undefined});let value;try{value=await response.json()}catch{}return {status:response.status,value}};
 try{
  const front=await fetch(base+'/dashboard');assert.equal(front.status,200);const html=await front.text();assert(!html.includes('id="hero"'));assert(!html.includes('id="roleSelect"'));
  const nav=await req('/api/navigation');assert.equal(nav.status,200);assert.deepEqual(nav.value.modules.map(x=>x.name),['Demo','Designer','Audit']);assert(nav.value.menuItems.every(x=>[1,2,3].includes(x.moduleId)));assert(nav.value.menuItems.some(x=>x.label==='Menu Designer'));
  const categories=await req('/api/catalog/categories');assert.equal(categories.status,200);assert(categories.value.items.some(x=>x.name==='Network'));
  const created=await req('/api/views','POST',{name:'Prototype New',route:'/proto-demo-new',file:'features/proto-demo-new.js',icon:'package',template:'new',fields:[{key:'name',label:'Name',type:'string',required:true},{key:'amount',label:'Amount',type:'number'}]});assert.equal(created.status,201,JSON.stringify(created.value));
  const source=await req('/api/views/source?file=features%2Fproto-demo-new.js');assert.equal(source.status,200);assert.equal(source.value.definition.type,'new');
  const record=await req('/api/generated/proto-demo-new','POST',{name:'Sample widget',amount:80});assert.equal(record.status,201);
  const rows=await req('/api/generated/proto-demo-new');assert(rows.value.items.some(r=>r.name==='Sample widget'));
  const menu=await req('/api/navigation/items','POST',{label:'Prototype New',route:'/proto-demo-new',moduleId:1,icon:'package',visible:true,order:9});assert.equal(menu.status,201);
  const nav2=await req('/api/navigation');assert(nav2.value.menuItems.some(x=>x.label==='Prototype New'));
  const theme=await req('/api/proto/theme','PUT',{mode:'light',colors:{primary:'#167ca8',accent:'#5cc8f5'}});assert.equal(theme.status,200);
  const audit=await req('/api/audit');assert.equal(audit.status,200);assert(audit.value.items.some(x=>x.resource==='menu'));
 }finally{await writeFile(runtime,original);await unlink(generated).catch(()=>{});await new Promise(ok=>server.close(ok))}
});
