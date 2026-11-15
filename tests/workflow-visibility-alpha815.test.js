import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createServer} from '../scripts/server.js';
const dataFile=new URL('../scripts/data/runtime.json',import.meta.url);

test('bootstrap always exposes creation and review without modifying persisted requests',async()=>{
 const original=await readFile(dataFile,'utf8');
 const server=createServer();
 try {
  const data=JSON.parse(original);
  const requestsBefore=JSON.stringify(data.requests);
  data.menuItems=(data.menuItems||[]).filter(x=>x.route!=='/requests');
  await writeFile(dataFile,JSON.stringify(data));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const response=await fetch(`http://127.0.0.1:${server.address().port}/api/bootstrap`);
  assert.equal(response.status,200);
  const bootstrap=await response.json();
  assert.ok(bootstrap.views.some(v=>v.route==='/requests'));
  assert.ok(bootstrap.menuItems.some(v=>v.route==='/requests'&&v.visible));
  assert.ok(bootstrap.menuItems.some(v=>v.route==='/request-review'&&v.visible));
  const persisted=JSON.parse(await readFile(dataFile,'utf8'));
  assert.equal(JSON.stringify(persisted.requests),requestsBefore);
 }finally{
  await new Promise(resolve=>server.close(resolve));
  await writeFile(dataFile,original);
 }
});

test('request details and evaluation use reusable card layout with mobile fallback',async()=>{
 const engine=await readFile(new URL('../node_modules/@code-makers/rebel/dist/request-workflow.js',import.meta.url),'utf8');
 const css=await readFile(new URL('../node_modules/@code-makers/rebel/dist/codeview.css',import.meta.url),'utf8');
 assert.match(engine,/rebel-request-detail-grid/);
 assert.match(engine,/rebel-review-summary/);
 assert.match(css,/dialog\.proto-dialog\.rebel-request-details/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/@media\(max-width:680px\)/);
});
