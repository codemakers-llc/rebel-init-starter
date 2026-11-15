// REBEL_VIEW_CONFIG: {"type":"component","component":"view-designer","title":"View Designer"}
import {mountViewDesigner} from '/rebel/view-designer.js';
export default {title:'View Designer',components:[],async onMount({host,api}){await mountViewDesigner(host,{api,notify:window.rebelDemo.notify,reloadMenu:()=>window.rebelDemo.reloadMenu()})}};
