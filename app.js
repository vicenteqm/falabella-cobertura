'use strict';
const $=id=>document.getElementById(id), D=window.DATA;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=(a,b)=>b?(a/b*100).toFixed(1)+'%':'—';
const sum=(rows,code)=>rows.reduce((n,r)=>n+(r.codes[code]||0),0);
const labels={A:'Asistencia',F:'Falta',I:'Incapacidad',D:'Descanso',B:'Baja',NA:'No aplica','SIN CAPTURA':'Sin captura'};
const colors={A:'#277436',F:'#c88b65',I:'#dfbd63',D:'#9dbf6d',B:'#a3ada0',NA:'#d6dfcf','SIN CAPTURA':'#b9c5b1'};
let view=[];
function option(el,value,label){const o=document.createElement('option');o.value=value;o.textContent=label;el.append(o)}
[...new Set(D.stores.map(s=>s.state))].sort().forEach(v=>option($('state'),v,v));
[...new Set(D.daily.map(r=>r.role))].sort().forEach(v=>option($('role'),v,v));
function stores(){const old=$('store').value;$('store').innerHTML='<option value="">Todas las tiendas</option>';D.stores.filter(s=>!$('state').value||s.state===$('state').value).forEach(s=>option($('store'),s.id,s.id+' · '+s.name));if([...$('store').options].some(o=>o.value===old))$('store').value=old}
function reset(){$('from').value=D.period+'-01';$('to').value=D.period+'-'+new Date(+D.period.slice(0,4),+D.period.slice(5),0).getDate();$('state').value='';$('role').value='';$('store').value='';stores();render()}
function render(){
 const selected=D.stores.filter(s=>(!$('state').value||s.state===$('state').value)&&(!$('store').value||s.id===$('store').value));
 const ids=new Set(selected.map(s=>s.id));
 view=D.daily.filter(r=>ids.has(r.store)&&r.date>=$('from').value&&r.date<=$('to').value&&(!$('role').value||r.role===$('role').value));
 const a=sum(view,'A'),f=sum(view,'F'),i=sum(view,'I');
 const staff=D.staff.filter(r=>ids.has(r.store)&&r.status==='ACTIVO'&&D.coverageRoles.includes(r.role)).reduce((n,r)=>n+r.count,0);
 const complete=selected.length&&selected.every(s=>Number(D.targets[s.id])>0),target=selected.reduce((n,s)=>n+(Number(D.targets[s.id])||0),0);
 $('kpis').innerHTML=[['Cobertura de plazas',complete?pct(staff,target):'Sin meta',complete?staff+' personas activas / '+target+' plazas':'Capturar plantilla objetivo por tienda'],['Asistencia registrada',pct(a,a+f+i),a+' asistencias / '+(a+f+i)+' registros A + F + I'],['Faltas registradas',f,'Código F · periodo seleccionado'],['Incapacidades',i,'Días-persona con código I']].map(k=>`<div class="kpi"><p>${esc(k[0])}</p><strong>${esc(k[1])}</strong><small>${esc(k[2])}</small></div>`).join('');
 $('notice').textContent=$('from').value>$('to').value?'Revisa las fechas: el inicio es posterior al fin.':`${selected.length} tiendas · ${staff} personas activas en perfiles de cobertura · ${sum(view,'SIN CAPTURA')} registros sin captura. ${!complete?'Cobertura pendiente de metas.':''}`;
 const dates=[...new Set(view.map(r=>r.date))].sort(); const daily=dates.map(d=>sum(view.filter(r=>r.date===d),'A')); const max=Math.max(1,...daily);
 if(!dates.length)$('trend').innerHTML='<div class="empty">Sin registros para estos filtros.</div>';
 else {const x=n=>35+n*565/Math.max(1,dates.length-1), y=n=>170-n/max*140;
 $('trend').innerHTML=`<svg viewBox="0 0 630 210" role="img" aria-label="Asistencias por día"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#badb76" stop-opacity=".4"/><stop offset="1" stop-color="#badb76" stop-opacity=".02"/></linearGradient></defs>${[0,.5,1].map(n=>`<line x1="35" y1="${y(max*n)}" x2="600" y2="${y(max*n)}" stroke="#edf1e8"/><text x="15" y="${y(max*n)+4}" font-size="10" fill="#83907d">${(max*n).toFixed(1)}</text>`).join('')}<path d="M35,170 ${daily.map((v,n)=>`L${x(n)},${y(v)}`).join(' ')} L${x(daily.length-1)},170 Z" fill="url(#area)"/><polyline points="${daily.map((v,n)=>`${x(n)},${y(v)}`).join(' ')}" fill="none" stroke="#277436" stroke-width="2.5"/>${daily.map((v,n)=>`<circle cx="${x(n)}" cy="${y(v)}" r="3" fill="#277436"><title>${dates[n]}: ${v} asistencias</title></circle>`).join('')}${dates.map((d,n)=>n%Math.max(1,Math.ceil(dates.length/7))===0?`<text x="${x(n)}" y="197" text-anchor="middle" font-size="10" fill="#83907d">${d.slice(8)}/${d.slice(5,7)}</text>`:'').join('')}</svg>`;}
 const codes=[...new Set(view.flatMap(r=>Object.keys(r.codes)))].sort((a,b)=>sum(view,b)-sum(view,a)),total=codes.reduce((n,c)=>n+sum(view,c),0);
 $('distribution').innerHTML=codes.length?codes.map(c=>`<div class="distrow"><span>${esc(labels[c]||c)}</span><div class="track"><b style="width:${sum(view,c)/total*100}%;background:${colors[c]||'#8a9c7e'}"></b></div><strong>${sum(view,c)}</strong></div>`).join(''):'<div class="empty">Sin registros.</div>';
 $('storeCount').textContent=selected.length+' tiendas';
 $('rows').innerHTML=selected.map(s=>{const r=view.filter(v=>v.store===s.id),a=sum(r,'A'),f=sum(r,'F'),i=sum(r,'I'),active=D.staff.filter(v=>v.store===s.id&&v.status==='ACTIVO'&&D.coverageRoles.includes(v.role)).reduce((n,v)=>n+v.count,0),t=Number(D.targets[s.id]);return `<tr><td><strong>${esc(s.id+' · '+s.name)}</strong><small>${esc(s.city+' · '+s.state)}</small></td><td>${active}</td><td>${t>0?t:'Pendiente'}</td><td class="rate">${t>0?pct(active,t):'—'}</td><td>${a}</td><td>${f}</td><td>${i}</td><td class="rate">${pct(a,a+f+i)}</td></tr>`}).join('')||'<tr><td colspan="8">Sin tiendas para estos filtros.</td></tr>';
}
$('updated').textContent=new Date(D.updated).toLocaleString('es-MX',{dateStyle:'medium',timeStyle:'short'});
$('source').textContent=D.source;
$('quality').textContent=`${D.quality.sheets} hojas consolidadas. ${D.quality.personDays} registros únicos persona-día. ${D.quality.overlapChanges} diferencias entre hojas resueltas por prioridad de la hoja más reciente.`;
$('notes').innerHTML=[...D.notes,'Perfiles de cobertura: '+D.coverageRoles.join(', ')+'.','Este enlace muestra información agrupada por tienda y perfil.'].map(n=>`<p>${esc(n)}</p>`).join('');
['from','to','store','role'].forEach(id=>$(id).addEventListener('change',render));$('state').addEventListener('change',()=>{stores();render()});$('reset').onclick=reset;
$('export').onclick=()=>{const rows=[['Fecha','Tienda','Perfil','Codigo','Cantidad'],...view.flatMap(r=>Object.entries(r.codes).map(([c,n])=>[r.date,r.store,r.role,c,n]))];const csv='\ufeff'+rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='falabella-asistencias.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
reset();
