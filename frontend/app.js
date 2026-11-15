import {initModalManager} from '/rebel/modal-manager.js';
import {createAuthStore,filterViewsByRole,createHeroLanding,createUserMenu} from '/rebel/app-shell.js';
// PROTO delay: visualization only; not production throttling. Actual requests remain independent.
window.REBEL_PROTO_DELAY_MS=Number(window.REBEL_PROTO_DELAY_MS??0);
const overlay=document.querySelector('#rebelRequestLoader');
const HOLD_UNTIL_LAST_REQUEST=true;
let pendingRequests=0,visibleSince=0,hideHandle=null;
function showLoader(){pendingRequests++;clearTimeout(hideHandle);if(!overlay)return;
 if(overlay.hidden){overlay.hidden=false;visibleSince=Date.now();} overlay.setAttribute('aria-busy','true');}
function hideLoader(){pendingRequests=Math.max(0,pendingRequests-1);if((HOLD_UNTIL_LAST_REQUEST&&pendingRequests)||!overlay)return;
 clearTimeout(hideHandle);hideHandle=setTimeout(()=>{if(pendingRequests===0){overlay.hidden=true;overlay.setAttribute('aria-busy','false');}},Math.max(0,350-(Date.now()-visibleSince)));}
document.addEventListener('rebel:request-start',showLoader);
document.addEventListener('rebel:request-end',hideLoader);
import {createRebelApp,createConfigStore,initTheme,setTheme,applyPalette,setThemeIntensity,getThemeIntensity} from '/rebel/index.js';
import {createToast} from '/rebel/toast.js';
import {createGeneratedCrudView,createGeneratedTableView,createGeneratedFormView} from '/rebel/generated-crud.js';
const configStore=createConfigStore();
const authStore=createAuthStore();
// INIT NEW intentionally exposes a single Demo entry point.
// View roles remain editable metadata for future adapters, never a login boundary.
const demoProfiles=[{role:'demo',name:'Demo',icon:'▦',description:'Explore dashboards, catalogs, workflows, administration and designers',route:'/dashboard'}];
function profilesFromViews(){return demoProfiles;}

const routes={};let app=null,views=[];
const loadedViews=new Map();
const request=async(url,options={})=>{
 const start=Date.now();document.dispatchEvent(new CustomEvent('rebel:request-start'));
 try{return await fetch(url,{...options,cache:'no-store'})}
 finally{const wait=Math.max(0,Number(window.REBEL_PROTO_DELAY_MS||0)-(Date.now()-start));if(wait)await new Promise(resolve=>setTimeout(resolve,wait));document.dispatchEvent(new CustomEvent('rebel:request-end'))}
};
const icons={'layout-dashboard':'▦','clipboard-list':'▤','blocks':'▣','package':'▧','users':'♙','settings':'⚙','palette':'◐','workflow':'◇','shield-check':'♜','database':'▥','panels-top-left':'▦','list-checks':'☷','file-text':'▤','list-tree':'☷','activity':'⌁','folder':'▱'};
const cleanPath=()=>location.pathname;
function activeNav(path){for(const a of document.querySelectorAll('#menu a')){const match=a.getAttribute('href')===path;a.classList.toggle('is-active',match);if(match)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')}}
function buildMenu(targetRoute){
 const data=configStore.current;
 if(!data)throw Error('REBEL_CONFIG_NOT_LOADED');
 views=authStore.current?.role==='demo'?configStore.getViews():authStore.current?filterViewsByRole(configStore.getViews(),authStore.current.role):configStore.getViews();
 // Keep a single router instance. Registered routes are updated in place.
 for(const key of Object.keys(routes))if(!views.some(view=>view.route===key))delete routes[key];
 for(const v of views){
  const path=v.route,version=v.version||'1';
  routes[path]=()=>{
   // Declarative CRUD/Form/Table views are generated from ConfigStore: zero per-view JS requests.
   if(v.definition){const factory={crud:createGeneratedCrudView,table:createGeneratedTableView,new:createGeneratedFormView}[v.definition.type];if(factory)return Promise.resolve({default:factory(v.definition)});}
   const key=v.file+'#'+version;
   if(!loadedViews.has(key))loadedViews.set(key,import('/'+v.file+'?v='+encodeURIComponent(version)).catch(error=>{loadedViews.delete(key);throw error}));
   return loadedViews.get(key);
  };
 }
 if(!app)app=createRebelApp({host:document.querySelector('#app'),outlet:document.querySelector('#screen'),routes,fetchImpl:request,onError:e=>{console.error(e);notify('Could not load view: '+e.message,true)}});
 const menu=document.querySelector('#menu'),tree=document.createDocumentFragment();
 const modules=[...data.modules].filter(m=>m.active!==false).sort((a,b)=>(a.order||0)-(b.order||0));
 for(const module of modules){
  const entries=data.menuItems.filter(i=>i.moduleId===module.id&&i.visible!==false&&views.some(view=>view.route===i.route)).sort((a,b)=>(a.order||0)-(b.order||0));if(!entries.length)continue;
  const group=document.createElement('div');group.className='rebel-nav-group';const title=document.createElement('div');title.className='rebel-nav-group-title';title.textContent=module.name;group.append(title);
  for(const item of entries){const a=document.createElement('a');a.href=item.route;a.dataset.rebelLink='';const icon=document.createElement('span');icon.className='nav-icon';icon.textContent=icons[item.icon]||'◇';icon.setAttribute('aria-hidden','true');const label=document.createElement('span');label.className='rebel-nav-label';label.textContent=item.label;a.title=item.label;a.append(icon,label);group.append(a)}tree.append(group);
 }
 menu.replaceChildren(tree);
 const path=targetRoute&&routes[targetRoute]?targetRoute:routes[cleanPath()]?cleanPath():(routes['/dashboard']?'/dashboard':Object.keys(routes)[0]);
 if(!authStore.current)return;
 if(app&&!document.querySelector('#screen').querySelector('.rebel-view-stage'))return app.navigate(path,{replace:true});
 if(targetRoute&&cleanPath()!==targetRoute&&routes[targetRoute])return app.navigate(targetRoute);
 activeNav(cleanPath());
}
async function reloadMenu(targetRoute){
 // Explicit refresh only after a designer saves a changed configuration.
 const response=await request('/api/bootstrap');if(!response.ok)throw Error('Bootstrap HTTP '+response.status);
 configStore.load(await response.json());
 return buildMenu(targetRoute);
}
const toastUI=createToast();function notify(message,error=false){toastUI.show(message,error?'danger':'success',2600)}
function setDemoProfile(profile){
 authStore.set(profile);
 document.querySelector('#app').classList.remove('rebel-landing-mode');
 document.querySelector('#demoRoleLabel').textContent=profile.role.toUpperCase()+' · visual demo';
 const user=document.querySelector('#rebelUserMount');user.replaceChildren(createUserMenu({
  user:{name:profile.name,role:profile.role.toUpperCase()},
  onLogout:showLanding,
  onHome:showLanding,
  onTheme:()=>document.querySelector('#quickTheme').click()
 }));
 buildMenu(profile.route);
}
function showLanding(){
 app?.suspend();
 authStore.clear();
 const root=document.querySelector('#app');root.classList.add('rebel-landing-mode');root.classList.remove('mobile-open');
 document.querySelector('#sidebarShade').hidden=true;
 document.querySelector('#demoRoleLabel').textContent='DEMO';
 document.querySelector('#rebelUserMount').replaceChildren();
 const screen=document.querySelector('#screen');screen.replaceChildren(createHeroLanding({
  title:'Build with REBEL',
  subtitle:'Explore dashboards, catalogs, forms, workflows, administration and the complete Designer from a single Demo workspace.',
  profiles:demoProfiles,onSelect:setDemoProfile
 }));
 document.querySelector('[data-rebel-title]').textContent='REBEL · INIT NEW';
 if(location.pathname!=='/')history.replaceState({},'','/');
}
// Navigation to a protected demo view requires a selected profile.
// Browser history itself is not a security boundary; server authorization is separate.
window.addEventListener('popstate',()=>{if(!authStore.current){showLanding();}});
window.rebelDemo={get views(){return views},get configStore(){return configStore},notify,reloadMenu,navigate:(route)=>app?.navigate(route),request};
document.querySelector('#app').addEventListener('rebel:navigated',e=>{activeNav(e.detail.path);document.querySelector('#app').classList.remove('mobile-open');document.querySelector('#sidebarShade').hidden=true});
document.querySelector('#sidebarShade').addEventListener('click',()=>{document.querySelector('#app').classList.remove('mobile-open');document.querySelector('#sidebarShade').hidden=true;document.querySelector('#sidebarToggle').setAttribute('aria-expanded','false');});
document.querySelector('#sidebarToggle').onclick=()=>{
 if(window.matchMedia('(max-width:680px)').matches){const opened=document.querySelector('#app').classList.toggle('mobile-open');document.querySelector('#sidebarShade').hidden=!opened;document.querySelector('#sidebarToggle').setAttribute('aria-expanded',String(opened));return;}
 const collapsed=document.querySelector('#app').classList.toggle('is-collapsed');document.querySelector('#sidebarToggle').setAttribute('aria-expanded',String(!collapsed));document.querySelector('#sidebarToggle').setAttribute('aria-label',collapsed?'Expand sidebar':'Collapse sidebar');};
initModalManager();
initTheme();
document.querySelector('#quickTheme').onclick=()=>{
 // Local preview only: an explicit Apply & Save in Theme Studio persists the choice.
 setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark',{persist:false});
};
reloadMenu().then(()=>{showLanding();const theme=configStore.getTheme();setThemeIntensity(theme?.intensity||'subtle',{persist:false});if(theme?.colors)applyPalette(theme.colors,{persist:false});if(theme?.mode)setTheme(theme.mode,{persist:false})}).catch(e=>{const stage=document.querySelector('#screen');stage.textContent='Unable to load REBEL configuration: '+e.message;notify(e.message,true)});
