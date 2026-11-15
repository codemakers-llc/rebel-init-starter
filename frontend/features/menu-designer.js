// REBEL_VIEW_CONFIG: {"type":"component","component":"menu-designer","title":"Menu Designer","endpoints":["/api/navigation","/api/views"]}
import {mountMenuDesigner} from '/rebel/menu-designer.js';
export default {title:'Menu Designer',components:[],async onMount({host,api}){await mountMenuDesigner(host,{api,notify:window.rebelDemo.notify,reloadMenu:window.rebelDemo.reloadMenu})}};
