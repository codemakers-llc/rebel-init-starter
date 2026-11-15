// REBEL_VIEW_CONFIG: {"type":"component","component":"widget-dashboard","title":"REBEL Demo Operations","endpoints":["/api/dashboard","/api/telemetry","/api/requests","/api/navigation"]}
import {createWidgetDashboardView} from '/rebel/dashboard-widgets.js';
import {requestKpis} from '/components/widget-kpis.js';
import {workflowPipeline} from '/components/widget-pipeline.js';
import {submissionTrend} from '/components/widget-trend.js';
import {auditChain} from '/components/widget-audit-chain.js';
import {apiTelemetry} from '/components/widget-api-telemetry.js';
import {recentActivity} from '/components/widget-activity.js';
import {moduleInventory} from '/components/widget-modules.js';
// The engine composes widgets; The INIT starter defines each widget and its business data.
export default createWidgetDashboardView({
 title:'Operations Overview',description:'Saved demo data · manual refresh · simulated local telemetry',
 widgets:[
  {id:'requests',title:'Request Portfolio',size:'small',render:requestKpis},
  {id:'pipeline',title:'Processing Pipeline',size:'small',render:workflowPipeline},
  {id:'network',title:'API Telemetry',size:'small',render:apiTelemetry},
  {id:'trend',title:'Submission Trend',size:'wide',render:submissionTrend},
  {id:'modules',title:'Configured Modules',size:'small',render:moduleInventory},
  {id:'chain',title:'Event Hash Chain · Demo',size:'wide',render:auditChain},
  {id:'activity',title:'Recent Workflow Activity',size:'small',render:recentActivity},
 ],
 async loadData(api){
  const start=performance.now();
  const paths=['/api/dashboard','/api/telemetry','/api/requests','/api/navigation'];
  // REBEL api.request resolves JSON already (not a Fetch Response object).
  const [stats,telemetry,requests,navigation]=await Promise.all(paths.map(async url=>{
   try{return await api.request(url)}catch(error){throw Error(url+': '+error.message)}
  }));
  if(!stats||!telemetry||!requests||!navigation)throw Error('Dashboard API returned incomplete data');
  return {stats,telemetry,requests,navigation,roundTripMs:Math.round(performance.now()-start)};
 }
});
