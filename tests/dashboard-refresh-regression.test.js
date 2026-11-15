import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from '../scripts/server.js';
import {createApiClient} from '../node_modules/@code-makers/rebel/dist/api-client.js';

test('dashboard APIs return parsed data and no repeating HTTP timer is configured',async()=>{
 const source=await readFile(new URL('../frontend/features/dashboard.js',import.meta.url),'utf8');
 const engine=await readFile(new URL('../node_modules/@code-makers/rebel/dist/dashboard-widgets.js',import.meta.url),'utf8');
 const telemetry=await readFile(new URL('../frontend/components/widget-api-telemetry.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/response\.json\(\)|results\[i\]\.ok|refreshMs:8000/);
 assert.doesNotMatch(engine,/setInterval\(/);
 assert.match(engine,/refreshButton\.addEventListener\('click',refresh\)/);
 assert.match(engine,/slot\.cleanup\?\.\(\)/);
 assert.match(telemetry,/setInterval\(update,2000\)/);
 assert.match(telemetry,/clearInterval\(interval\)/);
 const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const api=createApiClient({fetchImpl:(url,opts)=>fetch('http://127.0.0.1:'+server.address().port+url,opts)});
  const [stats,telemetry,requests,navigation]=await Promise.all(['/api/dashboard','/api/telemetry','/api/requests','/api/navigation'].map(url=>api.request(url)));
  assert.equal(typeof stats.total,'number');assert.ok(telemetry.queue);assert.ok(Array.isArray(requests.items));assert.ok(Array.isArray(navigation.modules));
 }finally{await new Promise(resolve=>server.close(resolve))}
});
