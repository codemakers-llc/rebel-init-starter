/** Local synthetic telemetry: no server traffic, timers disposed on view exit. */
export function apiTelemetry(host,{data}){
 host.replaceChildren();
 const grid=document.createElement('div');grid.className='rebel-telemetry-grid';
 const createMetric=(name)=>{const card=document.createElement('div');card.className='rebel-telemetry-metric';const label=document.createElement('span');label.textContent=name;const value=document.createElement('strong');value.textContent='—';card.append(label,value);grid.append(card);return value};
 const rps=createMetric('Requests / sec'),latency=createMetric('Latency'),success=createMetric('Success'),cpu=createMetric('CPU');
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 300 78');svg.setAttribute('role','img');svg.setAttribute('aria-label','Synthetic response time trend');svg.classList.add('rebel-telemetry-spark');
 const poly=document.createElementNS(svg.namespaceURI,'polyline');poly.setAttribute('fill','none');poly.setAttribute('stroke','currentColor');poly.setAttribute('stroke-width','2.5');poly.setAttribute('stroke-linejoin','round');svg.append(poly);
 const note=document.createElement('div');note.className='rebel-widget-sub';note.textContent='SIMULATED · local browser only · 2s sampling · no API polling';
 host.append(grid,svg,note);
 let samples=Array.from({length:20},(_,i)=>48+Math.round(Math.sin(i*.8)*11));let tick=0;
 const update=()=>{tick++;const noise=Math.random();const latest=Math.max(12,Math.min(160,Math.round(48+Math.sin(tick/4)*15+(noise-.5)*27)));samples=[...samples.slice(1),latest];
  rps.textContent=String(Math.max(0,Math.round(18+Math.sin(tick/5)*6+noise*9)));
  latency.textContent=latest+' ms';success.textContent=(99.2+(Math.sin(tick/6)+1)*.35).toFixed(2)+'%';cpu.textContent=Math.round(32+Math.sin(tick/7)*10+noise*8)+'%';
  poly.setAttribute('points',samples.map((v,i)=>`${i*300/(samples.length-1)},${72-(v/160)*65}`).join(' '));
 };
 update();const interval=setInterval(update,2000);
 return ()=>clearInterval(interval);
}
