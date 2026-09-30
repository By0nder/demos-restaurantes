(() => {
  'use strict';
  // CSV de Google Sheets: admite comas, saltos de línea y comillas dentro de celdas.
  function parseCSV(input) {
    const rows = []; let row = [], cell = '', quoted = false;
    const text = input.replace(/^\uFEFF/, '');
    for (let i=0; i<text.length; i++) {
      const c=text[i];
      if(c==='"') { if(quoted && text[i+1]==='"') {cell+='"';i++;} else quoted=!quoted; }
      else if(c===',' && !quoted) {row.push(cell);cell='';}
      else if((c==='\n'||c==='\r') && !quoted) {row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell='';if(c==='\r'&&text[i+1]==='\n')i++;}
      else cell+=c;
    }
    if(quoted)throw new Error('CSV incompleto');
    row.push(cell);if(row.some(x=>x.trim()))rows.push(row);
    const headers=(rows.shift()||[]).map(x=>x.trim());
    if(new Set(headers).size!==headers.length)throw new Error('Columnas repetidas');
    return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,(r[i]||'').trim()])));
  }
  function safeImage(url) {
    if(/^assets\/[a-zA-Z0-9_./-]+$/.test(url||'')&&!url.includes('..'))return url;
    try{const u=new URL(url);if(u.protocol==='https:')return u.href;}catch{}
    return null;
  }
  function cleanServices(rows) {
    const categories=['Mantenimiento','Reparación','Diagnóstico'];
    return rows.filter(r=>r.nombre && r.activo?.toLowerCase()!=='no' && r.activo!=='false').slice(0,100).map((r,i)=>({
      id:r.id||String(i), nombre:r.nombre.slice(0,120), categoria:categories.includes(r.categoria)?r.categoria:'Mantenimiento',
      sintoma:(r.sintoma||'').slice(0,250), descripcion:(r.descripcion||'').slice(0,500),
      incluye:Array.isArray(r.incluye)?r.incluye:String(r.incluye||'').split('|').map(s=>s.trim()).filter(Boolean), precio:(r.precio||'').slice(0,80)
    }));
  }
  if(typeof module!=='undefined')module.exports={parseCSV,safeImage,cleanServices};
  if(typeof document==='undefined')return;

  const menuButton=document.querySelector('.menu-toggle');
  const nav=document.querySelector('#navegacion');
  function closeMenu(){nav.classList.remove('open');menuButton.setAttribute('aria-expanded','false');menuButton.setAttribute('aria-label','Abrir menú');}
  menuButton.addEventListener('click',()=>{const open=nav.classList.toggle('open');menuButton.setAttribute('aria-expanded',String(open));menuButton.setAttribute('aria-label',open?'Cerrar menú':'Abrir menú');});
  nav.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('open')){closeMenu();menuButton.focus();}});
  document.addEventListener('click',e=>{if(!e.target.closest('.header'))closeMenu();});

  const grid=document.querySelector('#service-grid');
  const filters=[...document.querySelectorAll('[data-filter]')];
  function filter(category){let count=0;grid.querySelectorAll('.service-card').forEach(card=>{card.hidden=category!=='Todos'&&card.dataset.category!==category;if(!card.hidden)count++;});filters.forEach(b=>{const active=b.dataset.filter===category;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});document.querySelector('#service-status').textContent=`${count} servicios disponibles`;
  }
  filters.forEach(button=>button.addEventListener('click',()=>filter(button.dataset.filter)));
  let phone=new URL(document.querySelector('[data-wa]').href).pathname.slice(1);
  const wa=message=>'https://wa.me/'+phone+'?text='+encodeURIComponent(message);
  document.querySelector('#quote-form').addEventListener('submit',e=>{
    e.preventDefault();const form=e.currentTarget;if(!form.reportValidity())return;
    const values=new FormData(form), vehicle=String(values.get('vehiculo')).trim(),detail=String(values.get('detalle')).trim();
    if(!vehicle||!detail){const input=form.elements[!vehicle?'vehiculo':'detalle'];input.setCustomValidity('Complete este dato para preparar su consulta.');input.reportValidity();input.addEventListener('input',()=>input.setCustomValidity(''),{once:true});return;}
    const message=['Hola, vi su página web y quisiera cotizar un servicio:', '', 'Vehículo: '+vehicle, values.get('anio')?'Año: '+values.get('anio'):'', 'Servicio: '+values.get('servicio'),'Detalle: '+detail].filter(Boolean).join('\n');
    window.open(wa(message),'_blank','noopener,noreferrer');
  });
  const node=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text)el.textContent=text;return el;};
  function icon(id){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');const use=document.createElementNS('http://www.w3.org/2000/svg','use');use.setAttribute('href','#'+id);svg.append(use);return svg;}
  function renderServices(services){
    const frag=document.createDocumentFragment();
    services.forEach((s,i)=>{const card=node('article','service-card');card.dataset.category=s.categoria;const top=node('div','card-top');top.append(node('span','card-no',String(i+1).padStart(2,'0')),node('span','tag',s.categoria));const list=node('ul');s.incluye.forEach(item=>{const li=node('li');li.append(icon('check'),document.createTextNode(item));list.append(li);});const bottom=node('div','card-bottom');const a=node('a');a.href=wa('Hola, vi su página web y quisiera cotizar: '+s.nombre+'.');a.dataset.service=s.nombre;a.target='_blank';a.rel='noopener';a.setAttribute('aria-label','Consultar por '+s.nombre+' en WhatsApp');a.append(icon('arrow'));bottom.append(node('span','',s.precio||'Cotización según vehículo'),a);card.append(top,node('h3','',s.nombre),node('p','symptom',s.sintoma),node('p','service-description',s.descripcion),list,bottom);frag.append(card);});
    grid.replaceChildren(frag);const select=document.querySelector('#quote-service');const previous=select.value;select.replaceChildren(new Option('Necesito orientación','Necesito orientación'),...services.map(s=>new Option(s.nombre,s.nombre)));if(services.some(s=>s.nombre===previous))select.value=previous;filter('Todos');
  }
  async function csv(url){const u=new URL(url);if(u.protocol!=='https:'||u.hostname!=='docs.google.com'||!u.pathname.startsWith('/spreadsheets/'))throw new Error('Fuente no válida');const response=await fetch(url,{signal:AbortSignal.timeout(7000),cache:'no-cache'});if(!response.ok)throw new Error('Hoja no disponible');const text=await response.text();if(text.trim().startsWith('<'))throw new Error('La hoja debe publicarse como CSV');return parseCSV(text);}
  async function loadUpdates(){
    // El HTML contiene una copia completa para funcionar aunque la hoja falle.
    const response=await fetch('contenido.json');if(!response.ok)return;const data=await response.json();
    if(data.sheets?.ajustes){try{
      const rows=await csv(data.sheets.ajustes);const config=Object.fromEntries(rows.filter(r=>r.clave).map(r=>[r.clave,r.valor]));
      for(const key of ['heroTitulo','heroTexto','direccion'])if(config[key])document.querySelectorAll(`[data-content="${key}"]`).forEach(el=>el.textContent=config[key]);
      if(config.horario!==undefined){const el=document.querySelector('#horario');el.textContent=config.horario;el.hidden=!config.horario;}
      for(const key of ['heroFoto','tallerFoto'])if(config[key]&&safeImage(config[key]))document.querySelectorAll(`[data-content="${key}"]`).forEach(el=>el.src=safeImage(config[key]));
      const updatedPhone=(config.whatsapp||'').replace(/\D/g,'');if(/^\d{8,15}$/.test(updatedPhone)){phone=updatedPhone;document.querySelectorAll('[data-wa],[data-service]').forEach(a=>{const url=new URL(a.href);url.pathname='/'+phone;a.href=url.href;});}
      if(config.direccion)document.querySelectorAll('[data-map]').forEach(a=>a.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(data.nombre+' '+config.direccion+' '+data.ciudad));
    }catch(e){console.info('Se conserva el contenido local de la web.');}}
    if(data.sheets?.servicios){try{const items=cleanServices(await csv(data.sheets.servicios));if(items.length)renderServices(items);}catch(e){console.info('Se conserva el catálogo local.');}}
  }
  loadUpdates().catch(()=>{});
})();
