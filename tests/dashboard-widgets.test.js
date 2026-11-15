import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from '../scripts/server.js';
test('Genesis dashboard composes independent client widgets with real API sources',async()=>{
 const dashboard=await readFile(new URL('../frontend/features/dashboard.js',import.meta.url),'utf8');
 const names=['kpis','pipeline','trend','api-telemetry','audit-chain','activity','modules'];
 for(const name of names){assert.match(dashboard,new RegExp('widget-'+name+'\\.js'));const source=await readFile(new URL('../frontend/components/widget-'+name+'.js',import.meta.url),'utf8');assert.match(source,/export /)}
 assert.doesNotMatch(dashboard,/refreshMs:8000/);assert.match(dashboard,/Promise\.all\(paths\.map/);
 const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{const origin='http://127.0.0.1:'+server.address().port;
 for(const url of ['/api/dashboard','/api/telemetry','/api/requests','/api/navigation']){const response=await fetch(origin+url);assert.equal(response.status,200,url)}
 const css=await fetch(origin+'/rebel-shell.css');assert.equal(css.status,200);assert.match(await css.text(),/rebel-hero/);
 }finally{await new Promise(resolve=>server.close(resolve))}
});
