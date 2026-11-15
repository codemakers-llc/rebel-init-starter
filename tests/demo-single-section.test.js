import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('INIT NEW starts with Demo, Designer and Audit groups while preserving all views',async()=>{
 const data=JSON.parse(await readFile(new URL('../scripts/data/runtime.seed.json',import.meta.url),'utf8'));
 assert.deepEqual(data.catalogs.modules.map(m=>m.name),['Demo','Designer','Audit']);
 assert(data.menuItems.length>=9);
 assert(data.menuItems.every(item=>[1,2,3].includes(item.moduleId)));
 const byRoute=new Map(data.menuItems.map(x=>[x.route,x.moduleId]));
 for(const route of ['/view-designer','/menu-designer','/theme-studio'])assert.equal(byRoute.get(route),2);
 assert.equal(byRoute.get('/audit-trail'),3);
 for(const route of ['/dashboard','/requests','/request-review','/catalogs/modules'])assert.equal(byRoute.get(route),1);
 for(const route of ['/dashboard','/requests','/request-review','/view-designer','/menu-designer','/theme-studio','/audit-trail'])
  assert(data.menuItems.some(item=>item.route===route),`Missing ${route}`);
 const views=JSON.parse(await readFile(new URL('../frontend/views.json',import.meta.url),'utf8')).views;
 for(const view of views)assert(Array.isArray(view.roles)&&view.roles.length>0,view.name);
});
