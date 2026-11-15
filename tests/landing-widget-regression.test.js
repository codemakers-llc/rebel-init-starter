import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../frontend/app.css',import.meta.url),'utf8');const app=readFileSync(new URL('../frontend/app.js',import.meta.url),'utf8');
test('Landing breaks out of the admin shell before a profile is selected',()=>{assert.match(css,/#app\.rebel-landing-mode \.oa-admin-main/);assert.match(css,/grid-template-columns:none!important/);assert.ok(app.includes('reloadMenu().then(()=>{showLanding()'))});
test('App does not redefine shared REBEL hero component background',()=>{assert.doesNotMatch(css,/^\.rebel-hero\{/m)});
