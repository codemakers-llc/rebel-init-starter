import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../scripts/server.js';
test('Engine modules are served as JavaScript after npm ci',async()=>{
 const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{const origin=`http://127.0.0.1:${server.address().port}`;
 for(const asset of ['/app.js','/rebel/index.js','/rebel/toast.js','/rebel/modal-manager.js','/rebel/generated-crud.js','/rebel/app-shell.js']){
  const res=await fetch(origin+asset);assert.equal(res.status,200,asset);assert.match(res.headers.get('content-type')||'',/javascript/,asset);const body=await res.text();assert.ok(body.length>100,asset);assert.doesNotMatch(body,/^\{\"error\"/);
 }
 for(const asset of ['/styles.css','/rebel-shell.css']){const res=await fetch(origin+asset);assert.equal(res.status,200,asset);assert.match(res.headers.get('content-type')||'',/text\/css/,asset);assert.ok((await res.text()).length>100,asset);}
 const missing=await fetch(origin+'/rebel/nonexistent.js');assert.equal(missing.status,404);
 const source=await fetch(origin+'/node_modules/@code-makers/rebel/dist/index.js');assert.equal(source.status,404);
 }finally{await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()));}
});
