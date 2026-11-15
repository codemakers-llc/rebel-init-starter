export function moduleInventory(host,{data}){
 host.replaceChildren();const modules=data.navigation.modules||[];const big=document.createElement('div');big.className='rebel-widget-big';big.textContent=modules.length;const subtitle=document.createElement('div');subtitle.className='rebel-widget-sub';subtitle.textContent='Configured navigation modules';host.append(big,subtitle);for(const mod of modules.slice(0,4)){const row=document.createElement('div');row.className='rebel-widget-row';row.textContent=mod.name;host.append(row)}
}
