import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createServer} from '../scripts/server.js';
const runtime=new URL('../scripts/data/runtime.json',import.meta.url);

test('One-step submit, reject with required observations, re-review rejected, approved final',async()=>{
 const before=await readFile(runtime,'utf8');const server=createServer();
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const request=async(url,method='GET',payload)=>{const res=await fetch(base+url,{method,headers:{'Content-Type':'application/json'},body:payload===undefined?undefined:JSON.stringify(payload)});return {status:res.status,data:await res.json()}};
 try{
  const payload={title:'Single Submit',description:'Create and submit in a single API call',priority:'High',category:'Network',submit:true};
  let r=await request('/api/requests','POST',payload);
  assert.equal(r.status,201);const id=r.data.id;assert.equal(r.data.status,'Pending Review');
  assert.deepEqual(r.data.history.map(h=>h.action),['Created','Submitted']);
  r=await request('/api/requests/'+id+'/review','POST',{decision:'reject',feedback:'  '});assert.equal(r.status,400);
  r=await request('/api/requests/'+id+'/review','POST',{decision:'reject',feedback:'Improve network documentation'});assert.equal(r.status,200);assert.equal(r.data.status,'Changes Requested');
  r=await request('/api/requests/'+id+'/review','POST',{decision:'approve',feedback:''});assert.equal(r.status,200);assert.equal(r.data.status,'Approved');
  r=await request('/api/requests/'+id+'/review','POST',{decision:'reject',feedback:'No'});assert.equal(r.status,409);
  r=await request('/api/requests','POST',{title:'Draft sample',description:'Legacy draft remains supported'});assert.equal(r.data.status,'Draft');
  const draftId=r.data.id;
  r=await request('/api/requests/'+draftId,'PUT',{...payload,title:'Updated and submitted'});assert.equal(r.status,200);assert.equal(r.data.status,'Pending Review');assert.equal(r.data.title,'Updated and submitted');
 }finally{await writeFile(runtime,before);await new Promise(resolve=>server.close(resolve))}
});
