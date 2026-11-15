import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createServer} from '../scripts/server.js';
const runtime=new URL('../scripts/data/runtime.json',import.meta.url);
test('End-to-end: edit persists all fields, submit and approve/reject validation',async()=>{
 const original=await readFile(runtime,'utf8');const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 const req=async(path,method='GET',body)=>{const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,body:await r.json()}};
 try{
  let r=await req('/api/requests','POST',{title:'Original Request',description:'Before editing',priority:'Normal',category:'Network',requesterEmail:'original@example.test',dueDate:'2026-12-15',estimatedCost:200,urgent:false});
  assert.equal(r.status,201);const id=r.body.id;
  r=await req('/api/requests/'+id,'PUT',{title:'Updated Request',description:'After editing',priority:'High',category:'Hardware',requesterEmail:'new@example.test',dueDate:'2026-12-20',estimatedCost:350,urgent:true});assert.equal(r.status,200);
  r=await req('/api/requests/'+id);assert.equal(r.body.title,'Updated Request');assert.equal(r.body.requesterEmail,'new@example.test');assert.equal(r.body.dueDate,'2026-12-20');assert.equal(r.body.urgent,true);assert.equal(r.body.estimatedCost,350);
  assert.equal((await req('/api/requests/'+id+'/submit','POST')).status,200);
  assert.equal((await req('/api/requests/'+id+'/review','POST',{decision:'reject',score:3,feedback:''})).status,400);
  assert.equal((await req('/api/requests/'+id)).body.status,'Pending Review');
  assert.equal((await req('/api/requests/'+id+'/review','POST',{decision:'reject',score:3,feedback:'Please revise the scope',criteria:{quality:3,impact:3,feasibility:3}})).status,200);
  assert.equal((await req('/api/requests/'+id)).body.status,'Changes Requested');
  assert.equal((await req('/api/requests/'+id+'/submit','POST')).status,200);
  assert.equal((await req('/api/requests/'+id+'/review','POST',{decision:'approve',score:5,feedback:'',criteria:{quality:5,impact:5,feasibility:5}})).status,200);
  assert.equal((await req('/api/requests/'+id)).body.status,'Approved');
 }finally{await writeFile(runtime,original);await new Promise(resolve=>server.close(resolve));}
});
