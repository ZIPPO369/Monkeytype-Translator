// Waiter: čeká na kompletní načtení stránky a prvního psaní, pak spustí extension.js
(function(){
  let injected=false;

  function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
  function nextFrame(){ return new Promise(r=>requestAnimationFrame(r)); }
  async function waitForPageLoad(){ if(document.readyState==='complete') return; await new Promise(r=>window.addEventListener('load', r, { once:true })); }
  async function waitForElementById(id, timeout=30000){ const start=Date.now(); while(Date.now()-start<timeout){ const el=document.getElementById(id); if(el) return el; await sleep(150); } return null; }
  async function waitForStableWidth(el, { timeout=3000, interval=120, stableTicks=3 }={}){
    const start=Date.now(); let last=-1; let stable=0;
    while(Date.now()-start<timeout){ const w=Math.round(el.getBoundingClientRect().width||0); if(w>0 && Math.abs(w-last)<=1){ stable++; if(stable>=stableTicks) return w; } else { stable=0; } last=w; await sleep(interval); }
    return Math.round(el.getBoundingClientRect().width||0);
  }

  async function ensureDomStable(){
    await waitForPageLoad();
    // Počkej na #words a jeho stabilní šířku, pokud existuje
    const words=await waitForElementById('words', 30000);
    if(words){ await waitForStableWidth(words, { timeout: 3000, interval: 120, stableTicks: 3 }); }
    // Drobné zklidnění: dva snímky po loadu
    await nextFrame();
    await nextFrame();
  }

  async function injectExtension(){
    if(injected) return; injected=true;
    await ensureDomStable();
    chrome.runtime.sendMessage({ type: 'inject-extension' });
  }

  function attachTriggers(){
    const handler = ()=> injectExtension();
    window.addEventListener('keydown', handler, { once:true, capture:true });
    window.addEventListener('keypress', handler, { once:true, capture:true });
    document.addEventListener('input', handler, { once:true, capture:true });
  }

  // Připoj spouštěče hned; injekce sama počká na load a stabilizaci
  attachTriggers();
})();