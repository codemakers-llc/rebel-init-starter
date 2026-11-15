export function requestKpis(host,{data}){
 const {stats}=data;host.replaceChildren();const big=document.createElement('div');big.className='rebel-widget-big';big.textContent=stats.total;
 const sub=document.createElement('div');sub.className='rebel-widget-sub';sub.textContent='Requests stored in Genesis runtime.json';
 const pills=document.createElement('div');pills.className='rebel-widget-pills';for(const [label,value] of [['Approved',stats.approved],['Pending',stats.pending],['Changes',stats.changes]]){const p=document.createElement('span');p.className='rebel-widget-pill';p.textContent=label+' · '+value;pills.append(p)}host.append(big,sub,pills);
}
