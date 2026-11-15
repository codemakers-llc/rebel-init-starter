import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../frontend/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../frontend/app.css',import.meta.url),'utf8');
test('Topbar owns desktop and mobile hamburger, technical footer absent',()=>{assert.match(html,/rebel-topbar-toggle/);assert.doesNotMatch(html,/class="proto-note"/);assert.match(css,/\.rebel-topbar-toggle/);});

test('One existing sidebar toggle is used on desktop and mobile; no removed mobile selector remains',()=>{
 const app=readFileSync(new URL('../frontend/app.js',import.meta.url),'utf8');
 assert.match(html,/id="sidebarToggle"/);
 assert.match(app,/querySelector\('#sidebarToggle'\)/);
 assert.doesNotMatch(app,/mobileNavToggle/);
});


test('Continuous pages no longer reserve a footer or clip views',()=>{
 assert.match(css,/alpha\.8\.11: one consistent continuous document flow/);
 assert.match(css,/\.oa-admin-page \.oa-admin-content\{[^}]*overflow:visible!important/s);
 assert.match(css,/\.oa-admin-page #screen,\.oa-admin-page #screen>\.rebel-view-stage\{[^}]*overflow:visible!important/s);
 assert.doesNotMatch(html,/<footer\b/i);
});
