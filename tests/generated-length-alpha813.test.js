import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {createServer} from '../scripts/server.js';
const runtime=new URL('../scripts/data/runtime.json',import.meta.url);
const feature=new URL('../frontend/features/length-test-alpha813.js',import.meta.url);
test('Generated CodeView length is persisted and enforced on POST/PUT',async()=>{
 const original=await readFile(runtime,'utf8');const server=createServer();await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const base='http://127.0.0.1:'+server.address().port;
 const call=async(path,method='GET',body)=>{const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:response.status,data:await response.json()}};
 try{
  const view={name:'Length Test',route:'/length-test-alpha813',file:'features/length-test-alpha813.js',icon:'package',template:'crud',fields:[{key:'name',label:'Name',type:'string',length:5,required:true}],endpoint:'/api/generated/length-test-alpha813'};
  assert.equal((await call('/api/views','POST',view)).status,201);
  assert.equal((await call('/api/generated/length-test-alpha813','POST',{name:'Too long name'})).status,400);
  const made=await call('/api/generated/length-test-alpha813','POST',{name:'Alice'});assert.equal(made.status,201);
  assert.equal((await call('/api/generated/length-test-alpha813/'+made.data.id,'PUT',{name:'Longer name'})).status,400);
  assert.equal((await call('/api/generated/length-test-alpha813/'+made.data.id)).data.name,'Alice');
 }finally{await writeFile(runtime,original);await unlink(feature).catch(()=>{});await new Promise(ok=>server.close(ok))}
});
