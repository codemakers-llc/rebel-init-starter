import http from 'node:http';
import crypto from 'node:crypto';
import {readFile,writeFile,rename,mkdir,stat} from 'node:fs/promises';
import {readFileSync,existsSync,copyFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const HOME=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ROOT=path.join(HOME,'frontend');
// Resolve the actual installed engine rather than assuming a particular node_modules layout.
// Node supports hoisted packages and installations through npm workspaces.
const ENGINE_DIST=path.dirname(fileURLToPath(import.meta.resolve('@code-makers/rebel')));
const FEATURES=path.join(ROOT,'features');
try {for(const line of readFileSync(path.join(HOME,'.env'),'utf8').split(/\r?\n/)){const match=line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(match&&process.env[match[1]]===undefined)process.env[match[1]]=match[2].trim();}} catch {}
const DATA=path.join(HOME,'scripts/data/runtime.json');
// Create writable demo data on first run; never overwrite existing records.
if (!existsSync(DATA)) copyFileSync(path.join(HOME,'scripts/data/runtime.seed.json'),DATA);
const VIEWS=path.join(ROOT,'views.json');
const MODE=(process.env.MODE||'proto').toLowerCase();
if (!['proto','dev','prod'].includes(MODE)) throw new Error('MODE must be proto, dev, or prod');
if (MODE !== 'proto') throw new Error('REBEL INIT NEW supports only MODE=proto; dev/prod are reserved for future integrations');
const PORT=Number(process.env.PORT||3100);
const roles=['admin','technician','evaluator','demo'];
const permissions={admin:['requests.read','requests.review','requests.delete','views.write'],technician:['requests.read','requests.create','requests.editOwn'],evaluator:['requests.read','requests.review'],demo:['requests.read']};
const sessions=new Map();let writeQueue=Promise.resolve();
const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
async function jsonBody(req){let text='';for await(const c of req){text+=c;if(text.length>150000)fail(413,'Payload too large');}try{return JSON.parse(text||'{}')}catch{fail(400,'Invalid JSON');}}
const readData=async()=>JSON.parse(await readFile(DATA,'utf8'));
// Genesis demo invariant: the workflow must always expose both the submission
// and review screens. Do not rewrite runtime.json or touch user business data.
function withRequestDemoNavigation(data){
 const items=[...(data.menuItems||[])];
 const requestModule=(data.catalogs?.modules||[]).find(m=>m.name==='Requests'||m.name==='Demo');
 if(!requestModule)return items;
 for(const item of [
  {route:'/requests',label:'Request List & Creation',icon:'file-text',order:3},
  {route:'/request-review',label:'Request Review',icon:'list-checks',order:4}
 ]){
  const found=items.find(x=>x.route===item.route);
  if(found){found.visible=true;found.moduleId=requestModule.id;found.label=item.label;}
  else items.push({id:Math.max(0,...items.map(x=>Number(x.id)||0))+1,...item,moduleId:requestModule.id,visible:true});
 }
 return items;
}

function audit(data,action,resource,detail=''){data.audit??=[];data.audit.push({id:(data.audit.at(-1)?.id||0)+1,at:new Date().toISOString(),action,resource,detail});if(data.audit.length>500)data.audit.splice(0,data.audit.length-500)}
function atomic(file,value){return writeFile(file+'.tmp',JSON.stringify(value,null,2)+'\n').then(()=>rename(file+'.tmp',file));}
function serial(action){const job=writeQueue.then(action);writeQueue=job.catch(()=>{});return job;}
const extraFields=input=>({requesterEmail:String(input.requesterEmail||'').slice(0,150),dueDate:/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate||'')?input.dueDate:'',estimatedCost:Number.isFinite(Number(input.estimatedCost))?Math.max(0,Math.min(10000000,Number(input.estimatedCost))):0,urgent:input.urgent===true||input.urgent==='on'});
const safePath=v=>typeof v==='string'&&/^features\/[a-z][a-z0-9_/-]*\.js$/.test(v)&&!v.includes('//')&&!v.includes('..');
function validView(v){return v&&typeof v.name==='string'&&v.name.length<=80&&/^[A-Za-z][A-Za-z0-9 _&-]*$/.test(v.name)&&typeof v.route==='string'&&/^\/[a-z0-9/_-]+$/.test(v.route)&&safePath(v.file)&&/^[a-z][a-z0-9-]*$/.test(v.icon)&&(!v.roles||(Array.isArray(v.roles)&&v.roles.length>0&&v.roles.every(r=>typeof r==='string'&&/^[a-z][a-z0-9_-]{0,30}$/.test(r))));}
// A declarative feature may be imported into the Designer safely only when it
// contains a single static JSON configuration and no business logic.
function importedDeclarative(source){
 // Only accept a single JSON-literal factory call. Never execute user source.
 // Both the historical CodeView import and the REBEL package import are supported.
 const match=source.match(/^\s*import\s*\{\s*createGenerated(Crud|Table|Form)View\s*\}\s*from\s*['"]\/(?:rebel|node_modules\/@(?:codemakers|code-makers)\/rebel\/dist)\/generated-crud\.js['"];?\s*export\s+default\s+createGenerated(?:Crud|Table|Form)View\s*\(\s*(\{[\s\S]*\})\s*\);?\s*$/);
 if(!match)return null;
 try{const config=JSON.parse(match[2]);if(!Array.isArray(config.fields)||!/^\/api\/[a-z0-9/_-]+$/.test(config.endpoint||''))return null;return {type:config.type||({Crud:'crud',Table:'table',Form:'new'}[match[1]]),fields:config.fields,endpoint:config.endpoint,title:config.title}}catch{return null}
}

function validDeclarativeView(v){
 if(!['crud','table','new'].includes(v.template))return v.template==='custom';
 if(!Array.isArray(v.fields)||v.fields.length<1||v.fields.length>24)return false;
 if(v.endpoint!==undefined&&!/^\/api\/[a-z0-9/_-]+$/.test(v.endpoint))return false;
 const types=new Set(['string','text','textarea','email','url','tel','number','integer','date','time','datetime-local','select','checkbox','boolean','json']);
 const keys=new Set();
 for(const field of v.fields){
  if(!field||!(/^[A-Za-z][A-Za-z0-9_]*$/).test(field.key||'')||keys.has(field.key)||typeof field.label!=='string'||!field.label.trim()||!types.has(field.type))return false;
  if(field.required!==undefined&&typeof field.required!=='boolean')return false;if(['string','text','textarea','email','url','tel','json'].includes(field.type)){const length=field.length??field.maxLength;if(length!==undefined&&(!Number.isInteger(length)||length<1||length>2000))return false;}
  if(field.type==='select'&&(!Array.isArray(field.options)||!field.options.length))return false;
  keys.add(field.key);
 }
 return true;
}
function definition(view){
 const fields=Array.isArray(view.fields)?view.fields.filter(f=>typeof f.key==='string'&&/^[A-Za-z][\w]*$/.test(f.key)).map(f=>({key:f.key,label:String(f.label||f.key).slice(0,80),type:['string','text','email','number','integer','date','time','datetime-local','select','checkbox','url','tel'].includes(f.type)?f.type:'string',options:Array.isArray(f.options)?f.options.slice(0,30):undefined,required:!!f.required,length:Number.isInteger(f.length??f.maxLength)?Math.min(2000,Math.max(1,f.length??f.maxLength)):(['string','email','url','tel'].includes(f.type)?100:['text','textarea','json'].includes(f.type)?500:undefined)})):[];
 const kind=['crud','table','custom','new'].includes(view.template)?view.template:'custom';
 const routeKey=view.route.slice(1).replaceAll('/','-');const config={title:view.name,type:kind,fields,endpoint:view.preserveEndpoint&&/^\/api\/[a-z0-9/_-]+$/.test(view.endpoint||'')?view.endpoint:((kind==='crud'||kind==='new')?'/api/generated/'+routeKey:(view.endpoint||'/api/requests'))};
 const functionName=kind==='crud'?'createGeneratedCrudView':kind==='table'?'createGeneratedTableView':kind==='new'?'createGeneratedFormView':'createGeneratedBlankView';
 return '// Generated by CODEMAKERS REBEL View Builder.\n// REBEL_GENERATED_CONFIG: '+JSON.stringify(config)+'\nimport {'+functionName+'} from \'/rebel/generated-crud.js\';\nexport default '+functionName+'('+JSON.stringify(config,null,2)+');\n';
}

async function route(req,res,url){
 const p=url.pathname;
 if(p==='/api/proto/login'&&req.method==='POST'){
  const input=await jsonBody(req);if(!roles.includes(input.role))fail(400,'Unknown demo role');
  const token=crypto.randomUUID();sessions.set(token,input.role);return send(res,200,{token,role:input.role,permissions:permissions[input.role]});
 }
 const selectedRole=sessions.get(req.headers['x-proto-session'])||'demo';
 const role=selectedRole==='demo'?'admin':selectedRole; // Demo gets the existing internal test capabilities, not a real security principal.
 if(p==='/api/session'&&req.method==='GET')return send(res,200,{role,permissions:permissions[role]});
 if(p==='/api/bootstrap'&&req.method==='GET'){
  // PROTO has no real authentication: absence of an explicit role returns all views.
  // In an authenticated adapter, derive this role only from a validated server session.
  const explicitRole=sessions.get(req.headers['x-proto-session']);
  const catalog=await readCatalog();const data=await readData();
  const permitted=catalog.views.filter(v=>!explicitRole||explicitRole==='demo'||v.roles?.includes(explicitRole));
  const views=await Promise.all(permitted.map(async v=>{
   const source=await readFile(path.join(ROOT,v.file),'utf8');
   const marker=source.match(/REBEL_GENERATED_CONFIG:\s*(\{[^\n]+\})/);
   let definition=null;
   if(marker){try{definition=JSON.parse(marker[1])}catch{}}
   if(!definition){
    // Safely read only plain-JSON declarative feature factories, never evaluate JS.
    const plain=source.match(/export default createGenerated(Crud|Table|Form)View\s*\(\s*(\{[\s\S]*?\})\s*\);\s*$/);
    if(plain){try{const config=JSON.parse(plain[2]);if(Array.isArray(config.fields)&&typeof config.endpoint==='string')definition={...config,type:{Crud:'crud',Table:'table',Form:'new'}[plain[1]]}}catch{}}
   }
   // Handwritten JS views stay as lazy-loaded modules; never execute source on the server.
   return {...v,version:crypto.createHash('sha256').update(source).digest('hex').slice(0,12),...(definition?{definition}:{})};
  }));
  const allowedRoutes=new Set(views.map(v=>v.route));
  return send(res,200,{version:1,role:explicitRole||null,views,
   modules:data.catalogs?.modules||[],menuItems:withRequestDemoNavigation(data).filter(i=>allowedRoutes.has(i.route)),
   theme:data.theme||{mode:'dark',colors:{primary:'#167ca8',accent:'#5cc8f5'}}});
 }
 if(p==='/api/views'&&req.method==='GET')return send(res,200,await readCatalog());

 const catalogApi=p.match(/^\/api\/catalog\/(modules|categories|criteria)(?:\/(\d+))?$/);
 if(catalogApi){const key=catalogApi[1],id=catalogApi[2]?Number(catalogApi[2]):null;
  if(req.method==='GET'){const data=await readData();const items=data.catalogs?.[key]||[];return send(res,200,id?(items.find(x=>x.id===id)||{}):{items})}
  if(!['POST','PUT','DELETE'].includes(req.method))fail(405,'Unsupported method');const payload=req.method==='DELETE'?{}:await jsonBody(req);
  return serial(async()=>{const data=await readData();data.catalogs??={};data.catalogs[key]??=[];const rows=data.catalogs[key];let result;
   if(req.method==='POST'){if(id)fail(400,'POST without an ID');if(!String(payload.name||'').trim())fail(400,'Name required');result={...payload,id:Math.max(0,...rows.map(v=>v.id||0))+1,name:String(payload.name).trim()};rows.push(result);}
   else {const index=rows.findIndex(v=>v.id===id);if(index<0)fail(404,'Record not found');if(req.method==='DELETE'){if(key==='modules'&&(data.menuItems||[]).some(x=>x.moduleId===id))fail(409,'Module contains menu items');result=rows.splice(index,1)[0];}else {if(!String(payload.name||'').trim())fail(400,'Name required');result={...rows[index],...payload,id,name:String(payload.name).trim()};rows[index]=result;}}
   audit(data,req.method,key,String(result.id));await atomic(DATA,data);return send(res,req.method==='POST'?201:200,result);
  });
 }
 if(p==='/api/navigation'&&req.method==='GET'){const data=await readData();return send(res,200,{modules:data.catalogs?.modules||[],menuItems:withRequestDemoNavigation(data)});}
 const menuApi=p.match(/^\/api\/navigation\/items(?:\/(\d+))?$/);
 if(menuApi){const id=menuApi[1]?Number(menuApi[1]):null;
  if(!['POST','PUT','DELETE'].includes(req.method))fail(405,'Unsupported method');const payload=req.method==='DELETE'?{}:await jsonBody(req);
  return serial(async()=>{const data=await readData();data.menuItems??=[];let result;
   if(req.method!=='DELETE'){
    const module=(data.catalogs?.modules||[]).find(m=>m.id===Number(payload.moduleId));if(!module)fail(400,'Unknown module');
    const catalog=await readCatalog();if(!catalog.views.some(v=>v.route===payload.route))fail(400,'Unregistered view');
    if(!String(payload.label||'').trim()||!/^[a-z][a-z0-9-]*$/.test(payload.icon||''))fail(400,'Invalid label or icon');
   }
   if(req.method==='POST'){if(id)fail(400,'POST without ID');result={...payload,id:Math.max(0,...data.menuItems.map(x=>x.id||0))+1,moduleId:Number(payload.moduleId)};data.menuItems.push(result);}
   else {const index=data.menuItems.findIndex(x=>x.id===id);if(index<0)fail(404,'Menu item not found');if(req.method==='DELETE')result=data.menuItems.splice(index,1)[0];else{result={...data.menuItems[index],...payload,id,moduleId:Number(payload.moduleId)};data.menuItems[index]=result;}}
   audit(data,req.method,'menu',String(result.id));await atomic(DATA,data);return send(res,req.method==='POST'?201:200,result);
  });
 }
 if(p==='/api/audit'&&req.method==='GET'){const data=await readData();return send(res,200,{items:[...(data.audit||[])].reverse()})}
 if(p==='/api/proto/theme'&&req.method==='GET'){const data=await readData();return send(res,200,data.theme||{mode:'dark',colors:{primary:'#167ca8',accent:'#5cc8f5'}});}
 if(p==='/api/proto/theme'&&req.method==='PUT'){if(role!=='admin')fail(403,'Admin only');const input=await jsonBody(req);if(!['dark','light'].includes(input.mode)||!input.colors||!/^#[0-9a-f]{6}$/i.test(input.colors.primary)||!/^#[0-9a-f]{6}$/i.test(input.colors.accent))fail(400,'Invalid theme');return serial(async()=>{const data=await readData();const previous=data.theme||{};
 const version=Number(previous.version||0)+1;
 if(input.intensity!==undefined&&!['subtle','expressive'].includes(input.intensity))fail(400,'Invalid theme intensity');
 const entry={version,at:new Date().toISOString(),mode:input.mode,palette:input.palette||'Custom',intensity:input.intensity||'subtle',colors:input.colors};
 data.theme={...input,intensity:input.intensity||'subtle',version,history:[...(previous.history||[]),entry].slice(-100)};
 audit(data,'UPDATE','theme',`v${version}`);await atomic(DATA,data);return send(res,200,data.theme)});}
 if(p==='/api/proto/meta'&&req.method==='GET')return send(res,200,{mode:'PROTO',storage:'runtime.json',role,permissions:permissions[role],engine:'@code-makers/rebel'});
 const proto=p.match(/^\/api\/proto\/(users|roles|workflows|settings|catalogs)(?:\/(\d+))?$/);
 if(proto){
  const key=proto[1],id=proto[2]?Number(proto[2]):null;
  if(req.method==='GET'){const data=await readData();const value=data[key]??(key==='settings'?{}:[]);return send(res,200,id?(Array.isArray(value)?value.find(x=>x.id===id):null)??{}:{items:Array.isArray(value)?value:value,mode:'proto'});}
  if(role!=='admin'&&!(role==='technician'&&key==='catalogs'))fail(403,'Only Admin can modify PROTO configuration');
  if(!['POST','PUT','DELETE'].includes(req.method))fail(405,'Unsupported operation');
  const payload=req.method==='DELETE'?null:await jsonBody(req);
  return serial(async()=>{
   const data=await readData();let result;
   if(key==='settings'){
    if(req.method!=='PUT'||id)fail(405,'Use PUT /api/proto/settings');
    if(!payload||typeof payload!=='object'||Array.isArray(payload))fail(400,'Invalid settings');
    const allowed=['siteTitle','description','pageSize','demoNotice'];
    data.settings=Object.fromEntries(allowed.filter(x=>Object.hasOwn(payload,x)).map(x=>[x,typeof payload[x]==='number'?Math.min(100,Math.max(1,payload[x])):String(payload[x]).slice(0,300)]));result=data.settings;
   } else {
    if(!Array.isArray(data[key]))data[key]=[];
    const list=data[key];
    if(req.method==='POST'){
     if(id)fail(405,'POST without ID');
     if(!payload||typeof payload.name!=='string'||!payload.name.trim()||payload.name.length>100)fail(400,'Name required (maximum 100 characters)');
     result={...payload,id:Math.max(0,...list.map(x=>Number(x.id)||0))+1,name:payload.name.trim()};list.push(result);
    } else {
     if(!id)fail(400,'ID required');const pos=list.findIndex(x=>Number(x.id)===id);if(pos<0)fail(404,'Item not found');
     if(req.method==='DELETE'){result=list.splice(pos,1)[0];}
     else {if(!payload||typeof payload.name!=='string'||!payload.name.trim()||payload.name.length>100)fail(400,'Name required');result={...list[pos],...payload,id,name:payload.name.trim()};list[pos]=result;}
    }
   }
   await atomic(DATA,data);return send(res,req.method==='POST'?201:200,result);
  });
 }

 if(p==='/api/dashboard'&&req.method==='GET'){
  const data=await readData();const rows=role==='technician'?data.requests.filter(x=>x.assignedTo==='technician'):data.requests;
  return send(res,200,{total:rows.length,draft:rows.filter(x=>x.status==='Draft').length,pending:rows.filter(x=>x.status==='Pending Review').length,changes:rows.filter(x=>x.status==='Changes Requested').length,approved:rows.filter(x=>x.status==='Approved').length});
 }
 if(p==='/api/telemetry'&&req.method==='GET'){
  const data=await readData();const rows=role==='technician'?data.requests.filter(x=>x.assignedTo==='technician'):data.requests;
  const events=rows.flatMap(row=>(row.history||[]).map(h=>({id:row.id,title:row.title,action:h.action,by:h.by,at:h.at}))).sort((a,b)=>new Date(b.at)-new Date(a.at));
  const pending=rows.filter(x=>x.status==='Pending Review').length;
  const evaluated=rows.filter(x=>x.status==='Approved'||x.status==='Changes Requested').length;
  const completed=rows.filter(x=>x.status==='Approved').length;
  const meanScore=rows.filter(x=>Number.isFinite(Number(x.score))&&x.score!==null).map(x=>Number(x.score));
  const categories=Object.entries(rows.reduce((map,row)=>(map[row.category||'General']=(map[row.category||'General']||0)+1,map),{})).map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count);
  const byDay=new Map();for(const item of events.filter(x=>x.action==='Submitted')){const d=String(item.at).slice(0,10);byDay.set(d,(byDay.get(d)||0)+1)}
  const trends=[...byDay].sort((a,b)=>a[0].localeCompare(b[0])).slice(-8).map(([date,count])=>({date,count}));
  return send(res,200,{queue:{pending,processed:evaluated,total:rows.length},throughput:{evaluated,approvalRate:evaluated?Math.round(completed/evaluated*100):0},scores:{average:meanScore.length?Number((meanScore.reduce((a,b)=>a+b,0)/meanScore.length).toFixed(1)):null},categories,trends,activity:events.slice(0,7),updatedAt:new Date().toISOString(),source:'runtime.json'});
 }
 if(p==='/api/views/source'&&req.method==='GET'){
  if(role!=='admin'||!['proto','dev'].includes(MODE)||!(process.env.PROTO_DESIGNER_REMOTE==='true'||['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)))fail(403,'Builder unavailable');
  const file=url.searchParams.get('file');if(!safePath(file))fail(400,'Invalid file');const catalog=await readCatalog();const view=catalog.views.find(x=>x.file===file);if(!view)fail(404,'Unregistered view');
  const source=await readFile(path.join(ROOT,file),'utf8');const match=source.match(/^\/\/ Generated by CODEMAKERS REBEL View Builder\.\n\/\/ REBEL_GENERATED_CONFIG: (\{[^\n]*\})/);
  if(!match){const imported=importedDeclarative(source);if(imported)return send(res,200,{view,editable:true,definition:imported,imported:true});const meta=source.match(/^\/\/ REBEL_VIEW_CONFIG: (\{[^\n]+\})/);if(meta){try{return send(res,200,{view,editable:false,definition:JSON.parse(meta[1]),sourceType:'component',source})}catch{}}return send(res,200,{view,editable:false,sourceType:'handwritten',source,reason:'JavaScript source is read-only to prevent overwriting business logic.'});}
  return send(res,200,{view,editable:true,definition:JSON.parse(match[1])});
 }
 if(p==='/api/views/source'&&req.method==='PUT'){
  if(role!=='admin'||!['proto','dev'].includes(MODE)||!(process.env.PROTO_DESIGNER_REMOTE==='true'||['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)))fail(403,'Builder unavailable');
  const update=await jsonBody(req);if(!safePath(update.file))fail(400,'Invalid file');
  return serial(async()=>{const catalog=await readCatalog();const old=catalog.views.find(v=>v.file===update.file);if(!old)fail(404,'Unregistered view');
   const source=await readFile(path.join(ROOT,old.file),'utf8');const imported=importedDeclarative(source);if(!source.startsWith('// Generated by CODEMAKERS REBEL View Builder.')&&!imported)fail(409,'Hand-written view cannot be overwritten');
   const v={...old,...update,file:old.file};if(!validView(v)||!validDeclarativeView({...v,template:update.template||old.generatedType}))fail(400,'Invalid view definition');if(catalog.views.some(x=>x.file!==v.file&&x.route===v.route))fail(409,'Route already used');
   const previous=source;await writeFile(path.join(ROOT,old.file),definition({...v,template:update.template||old.generatedType||'custom',fields:update.fields||[],endpoint:update.endpoint||imported?.endpoint,preserveEndpoint:true}));
   try{Object.assign(old,{name:v.name,route:v.route,icon:v.icon,roles:v.roles,generatedType:update.template||old.generatedType});await serialCatalogWrite(catalog)}catch(error){await writeFile(path.join(ROOT,old.file),previous);throw error;}
   return send(res,200,{view:old});});
 }
 if(p==='/api/views'&&req.method==='POST'){
  if(role!=='admin'||!['proto','dev'].includes(MODE)||!(process.env.PROTO_DESIGNER_REMOTE==='true'||['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)))fail(403,'Builder is only available to local Admin');
  const v=await jsonBody(req);if(!validView(v))fail(400,'Invalid view metadata');
  if(!['crud','table','custom','new'].includes(v.template)||!validDeclarativeView(v))fail(400,'Invalid CodeView definition');
  if(v.template==='table'&&!/^\/api\/[a-z0-9/_-]+$/.test(v.endpoint||''))fail(400,'Invalid table endpoint');
  return serial(async()=>{
   const catalog=await readCatalog();if(catalog.views.some(x=>x.route===v.route||x.file===v.file))fail(409,'View route or file already exists');
   const target=path.resolve(ROOT,v.file);if(!target.startsWith(FEATURES+path.sep))fail(403,'Invalid file path');
   try{await stat(target);fail(409,'File already exists')}catch(e){if(e.status)throw e;if(e.code!=='ENOENT')throw e;}
   await mkdir(path.dirname(target),{recursive:true});await writeFile(target,definition(v),{flag:'wx'});
   try{catalog.views.push({name:v.name,route:v.route,file:v.file,icon:v.icon,roles:v.roles||['demo'],generatedType:v.template});await serialCatalogWrite(catalog)}catch(e){const {unlink}=await import('node:fs/promises');await unlink(target).catch(()=>{});throw e;}
   return send(res,201,{ok:true,view:catalog.views.at(-1)});
  });
 }
 const generated=p.match(/^\/api\/generated\/([a-z][a-z0-9_-]*)(?:\/(\d+))?$/);
 if(generated){
  const key=generated[1],id=generated[2]?Number(generated[2]):null;
  const catalog=await readCatalog();const view=catalog.views.find(v=>v.route.slice(1).replaceAll('/','-')===key && ['crud','new'].includes(v.generatedType));if(!view)fail(404,'Unknown generated collection');if(!view.roles.includes(role)&&!(selectedRole==='demo'&&view.roles.includes('demo')))fail(403,'View not available to this profile');
  if(req.method==='GET'){const data=await readData();const items=data.generated?.[key]||[];return send(res,200,id?(items.find(x=>x.id===id)||{}):{items});}
  if(!view.roles.includes(role)&&!(selectedRole==='demo'&&view.roles.includes('demo')))fail(403,'View not available to this profile');
  if(!['POST','PUT','DELETE'].includes(req.method))fail(405,'Unsupported method');const payload=req.method==='DELETE'?{}:await jsonBody(req);
  if(req.method!=='DELETE'){
   // Generated CodeView text fields are validated server-side, not only by maxlength in the browser.
   const source=await readFile(path.join(ROOT,view.file),'utf8');
   const match=source.match(/REBEL_GENERATED_CONFIG:\s*(\{[^\n]+\})/);
   let config=null;
   if(match){try{config=JSON.parse(match[1])}catch{}}
   if(!config)config=importedDeclarative(source);
   for(const field of config?.fields||[]){
    if(!['string','text','textarea','email','url','tel','json'].includes(field.type))continue;
    const max=field.length??field.maxLength??(['text','textarea','json'].includes(field.type)?500:['string','email','url','tel'].includes(field.type)?100:undefined);
    if(max!==undefined && payload[field.key]!=null && String(payload[field.key]).length>max)fail(400,`${field.label||field.key} exceeds length ${max}`);
   }
  }
  return serial(async()=>{const data=await readData();data.generated??={};data.generated[key]??=[];const list=data.generated[key];let item;
   if(req.method==='POST'){if(id)fail(400,'ID must be omitted');item={...payload,id:Math.max(0,...list.map(x=>Number(x.id)||0))+1};list.push(item)}
   else {if(!id)fail(400,'ID required');const idx=list.findIndex(x=>x.id===id);if(idx<0)fail(404,'Record not found');if(req.method==='DELETE')item=list.splice(idx,1)[0];else {item={...list[idx],...payload,id};list[idx]=item}}
   audit(data,req.method,'generated/'+key,String(item.id));await atomic(DATA,data);return send(res,req.method==='POST'?201:200,item)});
 }
 const m=p.match(/^\/api\/requests(?:\/(\d+))?(?:\/(submit|review))?$/);
 if(m){let id=m[1]?Number(m[1]):null;const action=m[2];
  if(req.method==='GET'){
   const data=await readData();let rows=data.requests;if(role==='technician')rows=rows.filter(x=>x.assignedTo==='technician');
   if(id){const item=rows.find(x=>x.id===id);if(!item)fail(404,'Request not found');return send(res,200,item);}
   return send(res,200,{items:rows});
  }
  if(req.method==='POST'&&!id){if(!['technician','admin'].includes(role))fail(403,'Only demo operators can create requests');const input=await jsonBody(req);
   return serial(async()=>{const data=await readData();const title=String(input.title||'').trim();const description=String(input.description||'').trim();if(!title||title.length>120||!description||description.length>2000)fail(400,'Title and description are required');
    const row={id:Math.max(1000,...data.requests.map(x=>x.id))+1,title,description,priority:['Low','Normal','High'].includes(input.priority)?input.priority:'Normal',category:String(input.category||'General').slice(0,50),...extraFields(input),status:input.submit===true?'Pending Review':'Draft',score:null,feedback:'',assignedTo:'technician',history:[{action:'Created',by:role,at:new Date().toISOString()},...(input.submit===true?[{action:'Submitted',by:role,at:new Date().toISOString()}]:[])]};data.requests.push(row);audit(data,'CREATE','request',String(row.id));await atomic(DATA,data);return send(res,201,row);});
  }
  if(req.method==='PUT'&&id&&!action){if(!['technician','admin'].includes(role))fail(403,'Only demo operators can edit');const input=await jsonBody(req);
   return serial(async()=>{const data=await readData();const row=data.requests.find(x=>x.id===id);if(!row)fail(404,'Not found');if(!['Draft','Changes Requested'].includes(row.status))fail(409,'Request cannot be edited in this status');const title=String(input.title||'').trim(),description=String(input.description||'').trim();if(!title||title.length>120||!description||description.length>2000)fail(400,'Invalid title or description');row.title=title;row.description=description;row.priority=['Low','Normal','High'].includes(input.priority)?input.priority:'Normal';row.category=String(input.category||row.category||'General').slice(0,50);Object.assign(row,extraFields(input));row.history.push({action:'Edited',by:role,at:new Date().toISOString()});if(input.submit===true){row.status='Pending Review';row.history.push({action:'Submitted',by:role,at:new Date().toISOString()});}audit(data,'UPDATE','request',String(row.id));await atomic(DATA,data);return send(res,200,row);});
  }
  if(req.method==='DELETE'&&id&&!action){if(role!=='technician'&&role!=='admin')fail(403,'Access denied');return serial(async()=>{const data=await readData();const index=data.requests.findIndex(x=>x.id===id);if(index<0)fail(404,'Not found');if(data.requests[index].status!=='Draft')fail(409,'Only drafts may be deleted');const [row]=data.requests.splice(index,1);await atomic(DATA,data);return send(res,200,row);});}
  if(req.method==='POST'&&id&&action==='submit'){if(!['technician','admin'].includes(role))fail(403,'Only demo operators can submit');return serial(async()=>{const data=await readData();const row=data.requests.find(x=>x.id===id);if(!row)fail(404,'Not found');if(!['Draft','Changes Requested'].includes(row.status))fail(409,'Cannot submit from this status');row.status='Pending Review';row.history.push({action:'Submitted',by:role,at:new Date().toISOString()});audit(data,'SUBMIT','request',String(row.id));await atomic(DATA,data);return send(res,200,row);});}
  if(req.method==='POST'&&id&&action==='review'){if(!['admin','evaluator'].includes(role))fail(403,'Only Admin or Evaluator can review');const input=await jsonBody(req);if(!['approve','reject'].includes(input.decision))fail(400,'Invalid decision');if(input.score!=null&&(!Number.isInteger(Number(input.score))||Number(input.score)<1||Number(input.score)>5))fail(400,'Score must be 1–5');if(input.decision==='reject'&&!String(input.feedback||'').trim())fail(400,'Feedback required for rejection');return serial(async()=>{const data=await readData();const row=data.requests.find(x=>x.id===id);if(!row)fail(404,'Not found');if(!['Pending Review','Changes Requested'].includes(row.status))fail(409,'Only pending or rejected requests may be reviewed');row.status=input.decision==='approve'?'Approved':'Changes Requested';if(input.score!=null)row.score=Number(input.score);row.feedback=String(input.feedback||'').slice(0,1000);if(input.criteria&&typeof input.criteria==='object'){const criteria=Object.fromEntries(['quality','impact','feasibility'].map(k=>[k,Number(input.criteria[k])]));if(Object.values(criteria).some(x=>!Number.isInteger(x)||x<1||x>5))fail(400,'Invalid criteria');row.criteria=criteria;}row.history.push({action:input.decision==='approve'?'Approved':'Changes Requested',by:role,score:row.score,feedback:row.feedback,at:new Date().toISOString()});audit(data,'REVIEW','request',String(row.id));await atomic(DATA,data);return send(res,200,row);});}
  fail(405,'Unsupported operation');
 }
 fail(404,'API endpoint not found');
}
async function serialCatalogWrite(catalog){const data=await readData();data.views=catalog.views;audit(data,'SAVE','views');await atomic(DATA,data);}
async function readCatalog(){const data=await readData();const source=Array.isArray(data.views)?data.views:JSON.parse(await readFile(VIEWS,'utf8')).views;return {views:source.filter(validView)};}
export function createServer(){return http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');const p=decodeURIComponent(url.pathname);
 if(p.startsWith('/api/'))return await route(req,res,url);
 
 if(p.startsWith('/node_modules/')||p.endsWith('.map')||p.startsWith('/scripts/')||(/\.[a-zA-Z0-9]+$/.test(p)&&!['/app.js','/app.css','/rebel-base.css','/rebel-admin.css','/rebel-admin-refinement.css','/rebel-shell.css','/styles.css','/views.json','/favicon.ico'].includes(p)&&!p.startsWith('/features/')&&!p.startsWith('/components/')&&!p.startsWith('/rebel/')))fail(404,'Asset not found');
 const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.ico':'image/x-icon'};
 const paths=[['/rebel/',ENGINE_DIST],['/features/',FEATURES],['/components/',path.join(ROOT,'components')],['/app.js',path.join(ROOT,'app.js')],['/app.css',path.join(ROOT,'app.css')],['/rebel-base.css',path.join(ROOT,'rebel-base.css')],['/rebel-admin.css',path.join(ROOT,'rebel-admin.css')],['/rebel-admin-refinement.css',path.join(ROOT,'rebel-admin-refinement.css')],['/rebel-shell.css',path.join(ENGINE_DIST,'rebel-shell.css')],['/styles.css',path.join(ENGINE_DIST,'codeview.css')],['/views.json',VIEWS],['/favicon.ico',path.join(ROOT,'favicon.ico')]];
 let file=path.join(ROOT,'index.html');
 for(const [prefix,base] of paths){if(p===prefix||p.startsWith(prefix)){file=prefix.endsWith('/')?path.resolve(base,p.slice(prefix.length)):base;const realBase=prefix.endsWith('/')?base:path.dirname(base);const rel=path.relative(realBase,file);if(rel.startsWith('..')||path.isAbsolute(rel))fail(403,'Invalid path');break;}}
 let content;try{content=await readFile(file)}catch{return send(res,404,{error:'File not found'});}
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(content);
 }catch(e){send(res,e.status||500,{error:e.status?e.message:'Internal server error'});}});}
if(process.argv[1]===fileURLToPath(import.meta.url))createServer().listen(PORT,()=>console.log(`CODEMAKERS REBEL · INIT NEW\nLocal: http://localhost:${PORT}\nListening (HTTP server bound)`));
