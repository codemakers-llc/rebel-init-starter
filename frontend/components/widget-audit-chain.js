// Educational hash-linked digest over request history; NOT a distributed blockchain, secure audit log, or proof of immutability.
const hex=buffer=>Array.from(new Uint8Array(buffer),b=>b.toString(16).padStart(2,'0')).join('');
export async function auditChain(host,{data}){
 host.replaceChildren();const events=(data.requests.items||[]).flatMap(r=>(r.history||[]).map(entry=>({id:r.id,action:entry.action,at:entry.at,by:entry.by}))).sort((a,b)=>String(a.at).localeCompare(String(b.at))).slice(-8);
 if(!globalThis.crypto?.subtle){host.textContent='Web Crypto unavailable in this browser context';return}
 let previous='GENESIS';const list=[];for(const event of events){const source=JSON.stringify({previous,event});const digest=hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source)));list.push({event,short:digest.slice(0,18)});previous=digest}
 const summary=document.createElement('div');summary.className='rebel-widget-sub';summary.textContent='SHA-256 links for '+events.length+' saved workflow events · computed in-browser from demo records. Not a blockchain or security control.';host.append(summary);
 for(const item of list.slice(-4).reverse()){const row=document.createElement('div');row.className='rebel-widget-row';const label=document.createElement('span');label.textContent=item.event.action+' · #'+item.event.id;const hash=document.createElement('code');hash.className='rebel-hash';hash.textContent=item.short+'…';row.append(label,hash);host.append(row)}
}
