export function recentActivity(host,{data}){
 host.replaceChildren();const events=data.telemetry.activity||[];if(!events.length){host.textContent='No workflow events yet';return}for(const event of events.slice(0,5)){const row=document.createElement('div');row.className='rebel-widget-row';const label=document.createElement('span');label.textContent=event.action+' · #'+event.id;const time=document.createElement('span');time.textContent=event.at?new Date(event.at).toLocaleDateString():'—';row.append(label,time);host.append(row)}
}
