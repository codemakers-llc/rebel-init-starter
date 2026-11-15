import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../frontend/app.js',import.meta.url),'utf8');
const studio=readFileSync(new URL('../node_modules/@code-makers/rebel/dist/theme-studio.js',import.meta.url),'utf8');
test('Quick theme toggle never persists or calls PUT',()=>{
 const quick=app.slice(app.indexOf("document.querySelector('#quickTheme').onclick="),app.indexOf('reloadMenu().then'));
 assert.match(quick,/persist:false/);assert.doesNotMatch(quick,/request\(/);assert.doesNotMatch(quick,/PUT/);
});
test('Theme Studio only writes on explicit Save',()=>{
 assert.match(studio,/async function save\(/);assert.match(studio,/method:'PUT'/);
 assert.match(studio,/initialTheme\|\|await request/);
});
test('Old OAACT stylesheet filenames removed',()=>{
 const html=readFileSync(new URL('../frontend/index.html',import.meta.url),'utf8');
 assert.doesNotMatch(html,/oaact-[^" ]+\.css/);
});
