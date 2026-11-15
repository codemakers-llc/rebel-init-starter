import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../scripts/server.js';

test('View Designer reads full CodeView-compatible configuration from current JS features',async()=>{
 const server=createServer();await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const base=`http://127.0.0.1:${server.address().port}`;
 try{
  for(const [file,count,endpoint] of [['modules.js',4,'/api/catalog/modules'],['evaluation-criteria.js',3,'/api/catalog/criteria'],['request-categories.js',3,'/api/catalog/categories']]){
   const response=await fetch(`${base}/api/views/source?file=${encodeURIComponent('features/'+file)}`);
   assert.equal(response.status,200);
   const result=await response.json();
   assert.equal(result.editable,true);
   assert.equal(result.definition.fields.length,count);
   assert.equal(result.definition.endpoint,endpoint);
  }
 }finally{await new Promise(ok=>server.close(ok))}
});

test('Bootstrap includes views with ampersands and Designer returns project component definitions',async()=>{
 const server=createServer();await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const base=`http://127.0.0.1:${server.address().port}`;
 try{
  const bootstrap=await (await fetch(base+'/api/bootstrap')).json();
  assert.equal(bootstrap.views.length,10);
  assert(bootstrap.views.some(v=>v.name==='Request List & Creation'));
  for(const file of ['dashboard.js','request-list.js','request-review.js','audit-trail.js','builder.js','menu-designer.js','theme-studio.js']){
   const response=await fetch(base+'/api/views/source?file='+encodeURIComponent('features/'+file));
   assert.equal(response.status,200,file);
   const data=await response.json();
   assert.equal(data.editable,false);
   assert.equal(data.definition.type,'component');
   assert(data.definition.component);
  }
 }finally{await new Promise(ok=>server.close(ok))}
});
