(async function(){
const SOURCE_LANG='en';
const TARGET_LANG='cs';
const GOOGLE_ENDPOINT=(q)=>`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${SOURCE_LANG}&tl=${TARGET_LANG}&dt=t&q=${encodeURIComponent(q)}`;
const LIBRE_ENDPOINT='https://libretranslate.de/translate';
const DEBOUNCE_MS=250;
const INITIAL_UI_DELAY_MS=3000;
const BOOTSTRAP_MAX_WAIT_MS=30000;
const STORAGE_KEY='typing_translator_dict_v6';
const MIN_CONTAINER_WIDTH_FOR_ANCHOR=240;

function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
function nextFrame(){return new Promise(r=>requestAnimationFrame(r));}
async function waitForPageLoad(){if(document.readyState==='complete')return;await new Promise(r=>window.addEventListener('load',r,{once:true}));}
async function waitForElementById(id,timeout=BOOTSTRAP_MAX_WAIT_MS){const start=Date.now();while(Date.now()-start<timeout){const el=document.getElementById(id);if(el)return el;await sleep(200);}return null;}
async function waitForStableWidth(el,{timeout=2000,interval=120,stableTicks=3}={}){
  const start=Date.now();
  let lastW=-1; let stable=0;
  while(Date.now()-start<timeout){
    const w=Math.round((el.getBoundingClientRect().width)||0);
    if(Math.abs(w-lastW)<=1 && w>0){
      stable++;
      if(stable>=stableTicks)return w;
    }else{
      stable=0;
    }
    lastW=w;
    await sleep(interval);
  }
  return Math.round((el.getBoundingClientRect().width)||0);
}

function debounce(fn,ms){let t;return(...args)=>{clearTimeout(t);t=setTimeout(()=>fn(...args),ms);};}
function extractWordText(wordEl){if(!wordEl)return'';const letters=Array.from(wordEl.querySelectorAll('letter'));if(letters.length)return letters.map(l=>(l.textContent||'').trim()).join('').trim();return(wordEl.textContent||'').trim();}
async function translateGoogle(text){if(!text)return'';try{const resp=await fetch(GOOGLE_ENDPOINT(text));if(!resp.ok)throw new Error('HTTP '+resp.status);const j=await resp.json();if(Array.isArray(j)&&j[0]&&j[0][0])return(j[0][0][0]||'').toString();return'';}catch(e){console.warn('Google translate failed',e);return'';}}
async function translateLibre(text){if(!text)return'';try{const resp=await fetch(LIBRE_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({q:text,source:SOURCE_LANG,target:TARGET_LANG,format:"text"})});if(!resp.ok)throw new Error('HTTP '+resp.status);const j=await resp.json();return j.translatedText||'';}catch(e){console.warn('Libre translate failed',e);return'';}}
async function translateWithFallback(text){let g=await translateGoogle(text);if(g)return{text:g,engine:'google'};const l=await translateLibre(text);return{text:(l||''),engine:l?'libre':'none'};}
function loadDict(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{"all":{},"saved":{}}');}catch(e){return{all:{},saved:{}};}}
function saveDict(d){localStorage.setItem(STORAGE_KEY,JSON.stringify(d));}
function recordOccurrence(word,translation){const d=loadDict();const w=word.toLowerCase();if(!d.all[w])d.all[w]={count:0,last:null,lastTrans:null};d.all[w].count++;d.all[w].last=new Date().toISOString();if(translation)d.all[w].lastTrans=translation;saveDict(d);}
function toggleSaveWord(word,translation){const d=loadDict();const w=word.toLowerCase();if(d.saved[w]){delete d.saved[w];}else{d.saved[w]={count:d.all[w]?.count||1,trans:translation||'',added:new Date().toISOString()};}saveDict(d);return!!d.saved[w];}
function exportDictSimple(format='txt'){const d=loadDict();let content='';if(format==='txt'){Object.entries(d.saved).forEach(([word,data])=>{content+=`${word} - ${data.trans||''}\n`;});}else if(format==='csv'){content='Word,Translation\n';Object.entries(d.saved).forEach(([word,data])=>{content+=`"${word}","${data.trans||''}"\n`;});}const blob=new Blob([content],{type:format==='txt'?'text/plain':'text/csv'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`typing_dictionary_simple.${format}`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(url);a.remove();},1500);}
function exportDictFull(){const d=loadDict();const blob=new Blob([JSON.stringify(d,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='typing_dictionary_full.json';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(url);a.remove();},1500);}

if(document.getElementById('typing-translate-root')){
console.log('Tool již běží na stránce — zavři ho nejdřív přes typingTranslateTool.stop() nebo reloadni stránku.');
return;
}

const style=document.createElement('style');
style.id='typing-translate-style';
style.textContent=`#typing-translate-root{position:relative;z-index:1000000;font-family:'Segoe UI',system-ui,-apple-system,sans-serif}#typing-translate-bar{all: initial;display:flex;align-items:center;gap:16px;padding:20px 24px;border-radius:16px;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);color:#fff;box-shadow:0 12px 40px rgba(0,0,0,0.8);max-width:calc(100vw - 40px);box-sizing:border-box;margin-bottom:15px;border:1px solid rgba(255,255,255,0.15);min-height:80px;min-width:320px;position:fixed;left:50%;transform:translateX(-50%);top:20px;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);backdrop-filter:blur(10px);cursor:default}#typing-translate-bar.detached{position:fixed;z-index:1000002;cursor:move;box-shadow:0 20px 60px rgba(0,0,0,0.9);flex-direction:column;align-items:stretch;gap:12px}#typing-translate-bar.detached .text-content{display:flex;align-items:center;gap:20px;flex:1;justify-content:center}#typing-translate-bar.detached .buttons-row{display:flex;gap:10px;justify-content:center}#typing-translate-bar .orig{font-weight:800;opacity:0.95;font-size:28px;color:#fff;text-shadow:0 2px 4px rgba(0,0,0,0.3)}#typing-translate-bar .trans{opacity:0.95;font-size:26px;margin-left:8px;color:#64b5f6;font-weight:600;text-shadow:0 2px 4px rgba(0,0,0,0.3)}#typing-translate-bar .meta{margin-left:auto;display:flex;gap:12px;align-items:center;opacity:0.9;font-size:14px}#typing-translate-bar.detached .meta{margin-left:0;justify-content:center}#typing-translate-bar button{background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);color:white;padding:10px 16px;border-radius:12px;cursor:pointer;font-weight:600;transition:all 0.2s ease;backdrop-filter:blur(10px)}#typing-translate-bar button:hover{background:rgba(255,255,255,0.18);transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,0.3)}#typing-translate-bar .small{font-size:13px;opacity:0.9;padding:8px 12px}#typing-translate-badge{display:inline-block;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:8px 14px;border-radius:10px;font-size:13px;font-weight:700;box-shadow:0 4px 12px rgba(102,126,234,0.4)}#typing-translate-dict{all: initial;position:fixed;width:520px;height:550px;background:linear-gradient(135deg,#0f1720 0%,#1e293b 100%);color:#e2e8f0;border-radius:16px;padding:0;box-shadow:0 20px 60px rgba(0,0,0,0.9);z-index:1000001;font-size:14px;display:none;border:1px solid rgba(255,255,255,0.1);overflow:hidden;min-width:450px;min-height:350px;backdrop-filter:blur(10px);cursor:default}#typing-translate-dict .dict-header{padding:20px;background:rgba(0,0,0,0.3);border-radius:16px 16px 0 0;cursor:move;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(255,255,255,0.1);user-select:none;flex-shrink:0}#typing-translate-dict .dict-header h3{margin:0;font-size:18px;font-weight:700;background:linear-gradient(135deg,#64b5f6 0%,#ba68c8 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent}#typing-translate-dict .dict-content{padding:20px;height:calc(100% - 80px);display:flex;flex-direction:column;overflow:hidden}#typing-translate-dict .controls{display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;align-items:center;flex-shrink:0}#typing-translate-dict select{padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.15);background:rgba(15,23,42,0.8);color:#fff;min-width:140px;backdrop-filter:blur(10px)}#typing-translate-dict button{background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);color:white;padding:10px 14px;border-radius:10px;cursor:pointer;font-weight:600;transition:all 0.2s ease}#typing-translate-dict button:hover{background:rgba(255,255,255,0.15);transform:translateY(-1px)}#typing-translate-dict .small-btn{padding:8px 12px;font-size:12px}#typing-translate-dict table{width:100%;border-collapse:collapse}#typing-translate-dict th,#typing-translate-dict td{text-align:left;padding:12px 8px;border-bottom:1px solid rgba(255,255,255,0.08)}#typing-translate-dict th{font-weight:700;color:#64b5f6;font-size:13px;background:rgba(255,255,255,0.05);position:sticky;top:0}#typing-translate-dict .row-ops{display:flex;gap:6px;justify-content:flex-end}#typing-translate-dict .row-ops button{margin-left:0;padding:6px 10px;font-size:11px;background:rgba(255,255,255,0.08);min-width:auto}.word-saved{color:#4ADE80 !important;font-weight:700}.word-high-use{color:#FBBF24 !important;font-weight:700}.dict-list-container{flex:1;overflow-y:auto;overflow-x:auto;border-radius:8px;background:rgba(0,0,0,0.2);padding:8px;min-height:0}.resize-handle{position:absolute;background:transparent;z-index:10}.resize-handle.right{top:0;right:0;width:8px;height:100%;cursor:ew-resize}.resize-handle.bottom{bottom:0;left:0;width:100%;height:8px;cursor:ns-resize}.resize-handle.bottom-right{bottom:0;right:0;width:16px;height:16px;cursor:nwse-resize}.resize-handle.left{top:0;left:0;width:8px;height:100%;cursor:ew-resize}.resize-handle.top{top:0;left:0;width:100%;height:8px;cursor:ns-resize}.resize-handle.top-right{top:0;right:0;width:16px;height:16px;cursor:nesw-resize}.resize-handle.bottom-left{bottom:0;left:0;width:16px;height:16px;cursor:nesw-resize}.resize-handle.top-left{top:0;left:0;width:16px;height:16px;cursor:nwse-resize}.close-btn{background:rgba(239,68,68,0.2) !important;border:1px solid rgba(239,68,68,0.3) !important;width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:8px;font-size:18px}.close-btn:hover{background:rgba(239,68,68,0.3) !important}.detach-btn{font-size:16px;padding:8px 10px !important;min-width:40px}.lock-icon{font-size:14px}.export-dropdown{position:relative;display:inline-block}.export-dropdown-content{display:none;position:absolute;background:#1e293b;min-width:180px;box-shadow:0 8px 16px rgba(0,0,0,0.3);z-index:1000003;border-radius:8px;border:1px solid rgba(255,255,255,0.1);top:100%;right:0;margin-top:5px}.export-dropdown-content.show{display:block}.export-dropdown-content button{width:100%;text-align:left;border:none;border-radius:0;background:none;padding:10px 14px}.export-dropdown-content button:hover{background:rgba(255,255,255,0.1)}.export-dropdown-content button:first-child{border-radius:8px 8px 0 0}.export-dropdown-content button:last-child{border-radius:0 0 8px 8px}.attach-btn{background:rgba(34,197,94,0.2) !important;border:1px solid rgba(34,197,94,0.3) !important}.attach-btn:hover{background:rgba(34,197,94,0.3) !important}`;
// CSS vložíme až při bootstrapu po načtení stránky

const root=document.createElement('div');
root.id='typing-translate-root';
root.style.display='none';
const bar=document.createElement('div');
bar.id='typing-translate-bar';
bar.innerHTML=`<div class="text-content"><div class="orig" title="původní">…</div><div class="trans" title="překlad">…</div></div><div class="meta"><div id="typing-translate-badge">čekám</div><button id="typing-save-btn" class="small">Uložit</button><button id="typing-open-dict" class="small">Slovník</button><button id="typing-detach-btn" class="small detach-btn" title="Odpojit panel">📌</button></div>`;
root.appendChild(bar);

const dict=document.createElement('div');
dict.id='typing-translate-dict';
dict.innerHTML=`<div class="dict-header"><h3>📚 Slovník <span style="opacity:.7;font-size:14px">(saved / all)</span></h3><button id="typing-dict-close" class="close-btn">×</button></div><div class="dict-content"><div class="controls"><select id="typing-dict-filter-type"><option value="all">Všechna slova</option><option value="saved">Uložená slova</option><option value="high-use">Často používaná (50+)</option><option value="recent">Naposledy použité</option></select><select id="typing-dict-sort"><option value="count-desc">Od nejpoužívanějších</option><option value="count-asc">Od nejméně používaných</option><option value="alpha-asc">A-Z</option><option value="alpha-desc">Z-A</option><option value="recent-desc">Od nejnovějších</option></select><div class="export-dropdown"><button class="small-btn" id="export-main-btn">Export</button><div class="export-dropdown-content" id="export-dropdown-content"><button id="export-simple-txt">TXT (slova)</button><button id="export-simple-csv">CSV (Excel)</button><button id="export-full-json">JSON (kompletní)</button></div></div></div><div id="typing-dict-stats" style="font-size:13px;opacity:.85;margin-bottom:12px;font-weight:600;"></div><div class="dict-list-container"><div id="typing-dict-list"></div></div></div><div class="resize-handle top"></div><div class="resize-handle right"></div><div class="resize-handle bottom"></div><div class="resize-handle left"></div><div class="resize-handle top-left"></div><div class="resize-handle top-right"></div><div class="resize-handle bottom-left"></div><div class="resize-handle bottom-right"></div>`;
root.appendChild(dict);

// Přidání do DOM přesunuto na pozdější fázi po zpoždění a stabilizaci

const origEl=bar.querySelector('.orig');
const transEl=bar.querySelector('.trans');
const badge=bar.querySelector('#typing-translate-badge');
const btnSave=bar.querySelector('#typing-save-btn');
const btnDetach=bar.querySelector('#typing-detach-btn');
const btnOpen=bar.querySelector('#typing-open-dict');
const dictPanel=root.querySelector('#typing-translate-dict');
const dictFilterType=root.querySelector('#typing-dict-filter-type');
const dictSort=root.querySelector('#typing-dict-sort');
const dictList=root.querySelector('#typing-dict-list');
const dictStats=root.querySelector('#typing-dict-stats');
const dictClose=root.querySelector('#typing-dict-close');
const exportMainBtn=root.querySelector('#export-main-btn');
const exportDropdownContent=root.querySelector('#export-dropdown-content');
const exportSimpleTxt=root.querySelector('#export-simple-txt');
const exportSimpleCsv=root.querySelector('#export-simple-csv');
const exportFullJson=root.querySelector('#export-full-json');

let lastWord='';
let lastTranslation='';
let inFlight=null;
let isBarDetached=false;
let isBarLocked=true;
let container=null;
let mo=null;
let debouncedHandle=null;
let bootstrapped=false;

function positionBarDefault(){
  bar.style.position='fixed';
  bar.style.top='20px';
  bar.style.left='50%';
  bar.style.transform='translateX(-50%)';
  bar.style.maxWidth=`${window.innerWidth-40}px`;
  // Nastavíme rozumnou počáteční šířku, aby pozadí nebylo „smrštěné“
  const defaultWidth=Math.min(window.innerWidth-40, 720);
  bar.style.width=defaultWidth+"px";
}

function positionBarByContainer(){
  try{
    if(isBarDetached){return;}
    const rect=container.getBoundingClientRect();
    const cWidth=Math.max(0, rect.width||0);
    // Pokud je kontejner ještě úzký/nenačtený, ponecháme centrování
    if(cWidth<MIN_CONTAINER_WIDTH_FOR_ANCHOR){
      positionBarDefault();
      return;
    }
    bar.style.position='fixed';
    const desiredTop=Math.max(10, rect.top + window.scrollY - 10);
    const desiredLeft=Math.min(Math.max(10, rect.left + window.scrollX), window.innerWidth - 20);
    bar.style.top=`${desiredTop}px`;
    bar.style.left=`${desiredLeft}px`;
    bar.style.transform='none';
    const targetWidth=Math.max(320, Math.min(cWidth, window.innerWidth-40));
    bar.style.maxWidth=`${Math.min(cWidth, window.innerWidth-40)}px`;
    bar.style.width=targetWidth+"px";
  }catch(e){
    console.warn('positionBarByContainer: fallback', e);
    positionBarDefault();
  }
}

function makeDraggableWithBounds(element,handle){
let isDragging=false;
let startX,startY,initialLeft,initialTop;
function startDrag(e){
if(isBarLocked)return;
if(e.target.closest('button'))return;
isDragging=true;
const rect=element.getBoundingClientRect();
startX=e.clientX;
startY=e.clientY;
initialLeft=rect.left;
initialTop=rect.top;
element.style.transition='none';
document.addEventListener('mousemove',onDrag);
document.addEventListener('mouseup',stopDrag);
e.preventDefault();
}
function onDrag(e){
if(!isDragging)return;
let newLeft=initialLeft+(e.clientX-startX);
let newTop=initialTop+(e.clientY-startY);
const maxLeft=window.innerWidth-element.offsetWidth;
const maxTop=window.innerHeight-element.offsetHeight;
if(newLeft<0)newLeft=0;
if(newLeft>maxLeft)newLeft=maxLeft;
if(newTop<0)newTop=0;
if(newTop>maxTop)newTop=maxTop;
element.style.left=newLeft+'px';
element.style.top=newTop+'px';
element.style.transform='none';
}
function stopDrag(){
isDragging=false;
element.style.transition='all 0.3s cubic-bezier(0.4,0,0.2,1)';
document.removeEventListener('mousemove',onDrag);
document.removeEventListener('mouseup',stopDrag);
}
handle.addEventListener('mousedown',startDrag);
}

function makeResizable(element){
const handles=element.querySelectorAll('.resize-handle');
handles.forEach(handle=>{
handle.addEventListener('mousedown',function(e){
e.preventDefault();
e.stopPropagation();
const startX=e.clientX;
const startY=e.clientY;
const startWidth=parseInt(document.defaultView.getComputedStyle(element).width,10);
const startHeight=parseInt(document.defaultView.getComputedStyle(element).height,10);
const startLeft=parseInt(document.defaultView.getComputedStyle(element).left,10);
const startTop=parseInt(document.defaultView.getComputedStyle(element).top,10);
let resizeRight=handle.classList.contains('right')||handle.classList.contains('bottom-right')||handle.classList.contains('top-right');
let resizeLeft=handle.classList.contains('left')||handle.classList.contains('bottom-left')||handle.classList.contains('top-left');
let resizeBottom=handle.classList.contains('bottom')||handle.classList.contains('bottom-right')||handle.classList.contains('bottom-left');
let resizeTop=handle.classList.contains('top')||handle.classList.contains('top-right')||handle.classList.contains('top-left');
function onResize(e){
let newWidth=startWidth;
let newHeight=startHeight;
let newLeft=startLeft;
let newTop=startTop;
if(resizeRight){
newWidth=startWidth+(e.clientX-startX);
}
if(resizeLeft){
newWidth=startWidth-(e.clientX-startX);
newLeft=startLeft+(e.clientX-startX);
}
if(resizeBottom){
newHeight=startHeight+(e.clientY-startY);
}
if(resizeTop){
newHeight=startHeight-(e.clientY-startY);
newTop=startTop+(e.clientY-startY);
}
newWidth=Math.max(450,newWidth);
newHeight=Math.max(350,newHeight);
if(resizeLeft&&newLeft<0){
newWidth=startWidth+startLeft;
newLeft=0;
}
if(resizeTop&&newTop<0){
newHeight=startHeight+startTop;
newTop=0;
}
element.style.width=newWidth+'px';
element.style.height=newHeight+'px';
if(resizeLeft)element.style.left=newLeft+'px';
if(resizeTop)element.style.top=newTop+'px';
}
function stopResize(){
document.removeEventListener('mousemove',onResize);
document.removeEventListener('mouseup',stopResize);
}
document.addEventListener('mousemove',onResize);
document.addEventListener('mouseup',stopResize);
});
});
}

function makeDictDraggable(element,handle){
let isDragging=false;
let startX,startY,initialLeft,initialTop;
function startDrag(e){
if(e.target.closest('button')||e.target.closest('select')||e.target.closest('.resize-handle'))return;
isDragging=true;
const rect=element.getBoundingClientRect();
startX=e.clientX;
startY=e.clientY;
initialLeft=rect.left;
initialTop=rect.top;
element.style.transition='none';
document.addEventListener('mousemove',onDrag);
document.addEventListener('mouseup',stopDrag);
e.preventDefault();
}
function onDrag(e){
if(!isDragging)return;
let newLeft=initialLeft+(e.clientX-startX);
let newTop=initialTop+(e.clientY-startY);
const maxLeft=window.innerWidth-element.offsetWidth;
const maxTop=window.innerHeight-element.offsetHeight;
if(newLeft<0)newLeft=0;
if(newLeft>maxLeft)newLeft=maxLeft;
if(newTop<0)newTop=0;
if(newTop>maxTop)newTop=maxTop;
element.style.left=newLeft+'px';
element.style.top=newTop+'px';
}
function stopDrag(){
isDragging=false;
element.style.transition='all 0.3s cubic-bezier(0.4,0,0.2,1)';
document.removeEventListener('mousemove',onDrag);
document.removeEventListener('mouseup',stopDrag);
}
handle.addEventListener('mousedown',startDrag);
}

// Interaktivita (drag/resize) přesunuta do bootstrapu po zobrazení UI

let exportDropdownTimeout=null;
function showExportDropdown(){
clearTimeout(exportDropdownTimeout);
exportDropdownContent.classList.add('show');
}
function hideExportDropdown(){
exportDropdownTimeout=setTimeout(()=>{
exportDropdownContent.classList.remove('show');
},200);
}
exportMainBtn.addEventListener('click',(e)=>{
e.stopPropagation();
const isVisible=exportDropdownContent.classList.contains('show');
if(isVisible){
hideExportDropdown();
}else{
showExportDropdown();
}
});
exportMainBtn.addEventListener('mouseenter',showExportDropdown);
exportMainBtn.addEventListener('mouseleave',hideExportDropdown);
exportDropdownContent.addEventListener('mouseenter',()=>{
clearTimeout(exportDropdownTimeout);
});
exportDropdownContent.addEventListener('mouseleave',hideExportDropdown);

function setupObservers(){
  debouncedHandle=debounce(handleActiveChange,DEBOUNCE_MS);
  mo=new MutationObserver((mutations)=>{
    let relevantChange=false;
    for(const m of mutations){
      if(m.type==='attributes'&&m.attributeName==='class'){relevantChange=true;break;}
      if(m.addedNodes&&m.addedNodes.length){relevantChange=true;break;}
      if(m.removedNodes&&m.removedNodes.length){relevantChange=true;break;}
      if(m.type==='characterData'){relevantChange=true;break;}
    }
    if(relevantChange)debouncedHandle();
  });
  if(container){
    mo.observe(container,{subtree:true,attributes:true,childList:true,characterData:true});
  }
  window.addEventListener('keyup',debouncedHandle,{passive:true});
  window.addEventListener('click',debouncedHandle,{passive:true});
  try{
    const ro=new ResizeObserver(()=>{ if(!isBarDetached) positionBarByContainer(); });
    if(container) ro.observe(container);
  }catch{}
  window.addEventListener('resize',()=>{ if(!isBarDetached) positionBarByContainer(); },{passive:true});
  debouncedHandle();
}

async function bootstrapOnFirstKey(){
  if(bootstrapped) return;
  bootstrapped=true;
  // Počkej na plné načtení stránky (včetně externích skriptů/stylů)
  await waitForPageLoad();
  // Přidej CSS až teď, aby se nic nezobrazilo dřív
  if(!document.getElementById('typing-translate-style')){
    document.head.appendChild(style);
  }
  // Přidej panel až při prvním stisku klávesy
  document.body.appendChild(root);
  root.style.visibility='hidden';
  root.style.display='';
  await nextFrame();
  await nextFrame();
  positionBarDefault();
  root.style.visibility='visible';
  // Aktivuj drag & resize až po přidání do DOM
  makeDraggableWithBounds(bar,bar);
  try{ if(typeof makeDictDraggable==='function'){ makeDictDraggable(dictPanel,dictPanel.querySelector('.dict-header')); } }catch{}
  makeResizable(dictPanel);
  // Najdi kontejner slov, jakmile je dostupný, a ukotvi
  container=await waitForElementById('words',BOOTSTRAP_MAX_WAIT_MS);
  if(container){
    await waitForStableWidth(container,{timeout:3000,interval:120,stableTicks:3});
    positionBarByContainer();
    setupObservers();
  }else{
    badge.textContent='chyba: #words nenalezen';
    console.error('#words element nenalezen');
  }
}

// Injektováno až po load & psaní přes waiter.js, takže bootstrap spusť hned
bootstrapOnFirstKey();

async function handleActiveChange(){
if(!container) return;
const active=container.querySelector('.word.active')||container.querySelector('.word[data-wordindex].active')||container.querySelector('.word[data-wordindex].current');
const text=extractWordText(active);
if(!text){
if(!isBarDetached){
root.style.display='none';
}
return;
}
if(!isBarDetached){
root.style.display='';
}
if(text===lastWord&&lastTranslation){
origEl.textContent=text;
transEl.textContent=lastTranslation;
badge.textContent='přeloženo';
return;
}
lastWord=text;
origEl.textContent=text;
transEl.textContent='…';
badge.textContent='překládám…';
const callId=Symbol();
inFlight=callId;
const res=await translateWithFallback(text);
if(inFlight!==callId)return;
lastTranslation=(res&&res.text)?res.text:'—';
transEl.textContent=lastTranslation;
badge.textContent=res.engine==='google'?'Google':(res.engine==='libre'?'Libre':'chyba');
recordOccurrence(text,lastTranslation);
refreshDictList();
}

// Observers a přepočty se spustí až po bootstrapu

btnSave.addEventListener('click',()=>{
const w=(origEl.textContent||'').trim();
if(!w)return;
const trans=(transEl.textContent||'').trim();
const saved=toggleSaveWord(w,trans);
badge.textContent=saved?'uloženo':'odstr. z uložených';
refreshDictList();
setTimeout(()=>{
if(isBarDetached){
badge.textContent=isBarLocked?'🔒':'🔓';
}else{
badge.textContent='přeloženo';
}
},900);
});

btnDetach.addEventListener('click',()=>{
isBarDetached=!isBarDetached;
if(isBarDetached){
bar.classList.add('detached');
btnDetach.innerHTML='📍';
btnDetach.title='Připojit panel zpět';
btnDetach.classList.add('attach-btn');
isBarLocked=false;
badge.textContent='🔓';
bar.style.cursor='move';
const buttonsRow=document.createElement('div');
buttonsRow.className='buttons-row';
buttonsRow.innerHTML=`<button id="typing-save-btn-detached" class="small">Uložit</button><button id="typing-lock-btn" class="small lock-icon" title="Zamknout panel">🔒</button><button id="typing-open-dict-detached" class="small">Slovník</button><button id="typing-attach-btn" class="small attach-btn" title="Připojit panel zpět">📍</button>`;
bar.appendChild(buttonsRow);
document.getElementById('typing-save-btn-detached').addEventListener('click',()=>btnSave.click());
document.getElementById('typing-open-dict-detached').addEventListener('click',()=>btnOpen.click());
document.getElementById('typing-attach-btn').addEventListener('click',()=>{
isBarDetached=false;
bar.classList.remove('detached');
btnDetach.innerHTML='📌';
btnDetach.title='Odpočit panel';
btnDetach.classList.remove('attach-btn');
badge.textContent='připojeno';
bar.style.cursor='default';
isBarLocked=true;
const buttonsRow=bar.querySelector('.buttons-row');
if(buttonsRow){
buttonsRow.remove();
}
bar.querySelector('.meta').style.display='flex';
positionBarByContainer();
debouncedHandle();
});
const lockBtn=document.getElementById('typing-lock-btn');
lockBtn.addEventListener('click',(e)=>{
e.stopPropagation();
isBarLocked=!isBarLocked;
lockBtn.innerHTML=isBarLocked?'🔒':'🔓';
lockBtn.title=isBarLocked?'Odemknout panel':'Zamknout panel';
badge.textContent=isBarLocked?'🔒':'🔓';
bar.style.cursor=isBarLocked?'default':'move';
});
bar.querySelector('.meta').style.display='none';
const currentRect=bar.getBoundingClientRect();
bar.style.left=(window.innerWidth-currentRect.width)/2+'px';
bar.style.top='50px';
bar.style.transform='none';
}else{
bar.classList.remove('detached');
btnDetach.innerHTML='📌';
btnDetach.title='Odpočit panel';
btnDetach.classList.remove('attach-btn');
badge.textContent='připojeno';
bar.style.cursor='default';
isBarLocked=true;
const buttonsRow=bar.querySelector('.buttons-row');
if(buttonsRow){
buttonsRow.remove();
}
bar.querySelector('.meta').style.display='flex';
positionBarByContainer();
debouncedHandle();
}
});

btnOpen.addEventListener('click',()=>{
const isVisible=dictPanel.style.display==='block';
dictPanel.style.display=isVisible?'none':'block';
if(!isVisible){
dictPanel.style.left=(window.innerWidth-520)/2+'px';
dictPanel.style.top='100px';
refreshDictList();
}
});

exportSimpleTxt.addEventListener('click',()=>{
exportDictSimple('txt');
hideExportDropdown();
});
exportSimpleCsv.addEventListener('click',()=>{
exportDictSimple('csv');
hideExportDropdown();
});
exportFullJson.addEventListener('click',()=>{
exportDictFull();
hideExportDropdown();
});

dictClose.addEventListener('mousedown',(e)=>{
e.stopPropagation();
});
dictClose.addEventListener('click',(e)=>{
e.stopPropagation();
dictPanel.style.display='none';
});

dictFilterType.addEventListener('mousedown',(e)=>{
e.stopPropagation();
});
dictSort.addEventListener('mousedown',(e)=>{
e.stopPropagation();
});
dictFilterType.addEventListener('change',refreshDictList);
dictSort.addEventListener('change',refreshDictList);

function refreshDictList(){
const d=loadDict();
const totalAll=Object.keys(d.all||{}).length;
const totalSaved=Object.keys(d.saved||{}).length;
const highUseCount=Object.values(d.all).filter(item=>item.count>=50).length;
dictStats.textContent=`All: ${totalAll} slov • Saved: ${totalSaved} slov • 50+: ${highUseCount}`;
const filterType=dictFilterType.value;
const sortType=dictSort.value;
let rows=[];
if(filterType==='saved'){
Object.entries(d.saved).forEach(([word,data])=>{
rows.push({word,saved:true,count:data.count||0,trans:data.trans||'',lastUsed:d.all[word]?.last||data.added});
});
}else if(filterType==='high-use'){
Object.entries(d.all).forEach(([word,data])=>{
if(data.count>=50){
rows.push({word,saved:!!d.saved[word],count:data.count||0,trans:data.lastTrans||'',lastUsed:data.last});
}
});
}else if(filterType==='recent'){
Object.entries(d.all).forEach(([word,data])=>{
rows.push({word,saved:!!d.saved[word],count:data.count||0,trans:data.lastTrans||'',lastUsed:data.last});
});
}else{
Object.entries(d.all).forEach(([word,data])=>{
rows.push({word,saved:!!d.saved[word],count:data.count||0,trans:data.lastTrans||'',lastUsed:data.last});
});
}
rows.sort((a,b)=>{
switch(sortType){
case'count-desc':return(b.count||0)-(a.count||0);
case'count-asc':return(a.count||0)-(b.count||0);
case'alpha-asc':return a.word.localeCompare(b.word);
case'alpha-desc':return b.word.localeCompare(a.word);
case'recent-desc':return(b.lastUsed||'').localeCompare(a.lastUsed||'');
default:return(b.count||0)-(a.count||0);
}
});
dictList.innerHTML='';
if(rows.length===0){
dictList.innerHTML=`<div style="opacity:0.7;text-align:center;padding:40px 20px;font-style:italic;color:#94a3b8">Žádná slova k zobrazení</div>`;
return;
}
const table=document.createElement('table');
const thead=document.createElement('thead');
thead.innerHTML=`<tr><th style="width:25%">Slovo</th><th style="width:45%">Překlad</th><th style="width:10%;text-align:center">Počet</th><th style="width:20%;text-align:center">Akce</th></tr>`;
table.appendChild(thead);
const tbody=document.createElement('tbody');
rows.forEach(r=>{
const tr=document.createElement('tr');
tr.style.borderBottom='1px solid rgba(255,255,255,0.05)';
const tdWord=document.createElement('td');
tdWord.innerHTML=`<strong class="${r.saved?'word-saved':(r.count>=50?'word-high-use':'')}">${r.word}${r.saved?' 💾':''}${r.count>=50?' 🔥':''}</strong>`;
const tdTrans=document.createElement('td');
tdTrans.textContent=r.trans||'—';
if(r.saved)tdTrans.className='word-saved';
const tdCount=document.createElement('td');
tdCount.textContent=r.count||0;
tdCount.style.textAlign='center';
if(r.count>=50)tdCount.className='word-high-use';
const tdOps=document.createElement('td');
tdOps.className='row-ops';
tdOps.style.textAlign='center';
const btnSaveRow=document.createElement('button');
btnSaveRow.textContent=r.saved?'🗑️':'💾';
btnSaveRow.title=r.saved?'Odebrat z uložených':'Uložit';
btnSaveRow.onclick=(e)=>{
e.stopPropagation();
toggleSaveWord(r.word,r.trans);
refreshDictList();
};
tdOps.appendChild(btnSaveRow);
tr.appendChild(tdWord);
tr.appendChild(tdTrans);
tr.appendChild(tdCount);
tr.appendChild(tdOps);
tbody.appendChild(tr);
});
table.appendChild(tbody);
dictList.appendChild(table);
}

root.stop=function(){
try{
mo.disconnect();
window.removeEventListener('keyup',debouncedHandle);
window.removeEventListener('click',debouncedHandle);
root.remove();
style.remove();
console.log('✅ Typing translator zastaven a odstraněn z DOM.');
}catch(e){
console.warn('Chyba při zastavování:',e);
}
};

window.typingTranslateTool={
root,
stop:root.stop,
exportSimple:exportDictSimple,
exportFull:exportDictFull,
refreshDict:refreshDictList,
openDict:()=>{
dictPanel.style.display='block';
refreshDictList();
},
closeDict:()=>{
dictPanel.style.display='none';
}
};

console.log('🚀 Typing translator aktivní!');
console.log('📚 Ovládání: window.typingTranslateTool.stop() - pro zastavení');
console.log('📍 Klikni na ikonu připínáčku pro odpojení panelu');
})();