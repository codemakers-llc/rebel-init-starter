export function workflowPipeline(host,{data}){
 host.replaceChildren();const {queue,throughput}=data.telemetry;
 const title=document.createElement('div');title.className='rebel-widget-big';title.textContent=throughput.approvalRate+'%';
 const text=document.createElement('div');text.className='rebel-widget-sub';text.textContent='Approval rate of evaluated requests';
 const meter=document.createElement('div');meter.className='rebel-widget-meter';const fill=document.createElement('i');fill.style.width=Math.max(0,Math.min(100,throughput.approvalRate))+'%';meter.append(fill);
 const footer=document.createElement('div');footer.className='rebel-widget-sub';footer.textContent=queue.processed+' evaluated · '+queue.pending+' waiting';host.append(title,text,meter,footer);
}
