import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const dataFile=new URL('../scripts/data/runtime.json',import.meta.url);
const repairScript=new URL('../scripts/restore-request-menu.js',import.meta.url);
test('Request menu recovery preserves records and reinstates missing entry',async()=>{
 const original=await readFile(dataFile,'utf8');
 try{
  const data=JSON.parse(original);const before=JSON.stringify(data.requests);
  data.menuItems=data.menuItems.filter(x=>x.route!=='/requests');
  await writeFile(dataFile,JSON.stringify(data));
  execFileSync(process.execPath,[fileURLToPath(repairScript)]);
  const fixed=JSON.parse(await readFile(dataFile,'utf8'));
  assert.equal(fixed.menuItems.filter(x=>x.route==='/requests'&&x.visible).length,1);
  assert.equal(JSON.stringify(fixed.requests),before);
 }finally{await writeFile(dataFile,original)}
});
test('Request details use dedicated responsive cards, not plaintext',async()=>{
 const source=await readFile(new URL('../node_modules/@code-makers/rebel/dist/request-workflow.js',import.meta.url),'utf8');
 const css=await readFile(new URL('../frontend/app.css',import.meta.url),'utf8');
 assert.match(source,/rebel-request-detail-grid/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/@media\(max-width:680px\)/);
});
