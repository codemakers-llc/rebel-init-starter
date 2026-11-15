import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from '../scripts/server.js';

test('Demo profile is immutable and bootstrap does not try reassigning it', async()=>{
 const source=await readFile(new URL('../frontend/app.js',import.meta.url),'utf8');
 assert.match(source,/const demoProfiles=\[/);
 assert.doesNotMatch(source,/^\s*demoProfiles\s*=/m);
});
test('favicon.ico is a valid icon with image/x-icon MIME',async()=>{
 const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const response=await fetch(`http://127.0.0.1:${server.address().port}/favicon.ico`);
  assert.equal(response.status,200);
  assert.match(response.headers.get('content-type'),/image\/x-icon/);
  const icon=new Uint8Array(await response.arrayBuffer());
  assert.equal(icon[0],0);assert.equal(icon[1],0);assert.equal(icon[2],1);assert.equal(icon[3],0);
 }finally{await new Promise(resolve=>server.close(resolve))}
});
