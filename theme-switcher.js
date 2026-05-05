// ============================================================
// AdaptIQ Theme Switcher
// ============================================================
(function(){
  'use strict';

  const THEMES = [
    { id:'adaptiq-dark',    name:'AdaptIQ Dark',    primary:'#7c3aed', dark:true  },
    { id:'cyberpunk-blue',  name:'Cyberpunk Blue',  primary:'#2563eb', dark:true  },
    { id:'midnight-violet', name:'Midnight Violet',  primary:'#9333ea', dark:true  },
    { id:'ocean-breeze',    name:'Ocean Breeze',    primary:'#0284c7', dark:false },
    { id:'royal-purple',    name:'Royal Purple',    primary:'#9333ea', dark:false },
    { id:'sunset-warm',     name:'Sunset Warm',     primary:'#ea580c', dark:false },
  ];

  const STORAGE_KEY = 'adaptiq-theme';

  function getActive(){
    return localStorage.getItem(STORAGE_KEY) || 'adaptiq-dark';
  }

  function setTheme(id){
    document.documentElement.setAttribute('data-theme', id);
    localStorage.setItem(STORAGE_KEY, id);
    render();
  }

  // Build DOM
  let panel, isOpen = false;

  function createWidget(){
    // Toggle button
    const btn = document.createElement('button');
    btn.id = 'theme-switcher-btn';
    btn.setAttribute('aria-label','Change theme');
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="22" height="22"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`;
    document.body.appendChild(btn);

    // Panel
    panel = document.createElement('div');
    panel.id = 'theme-switcher-panel';
    panel.innerHTML = `<div class="ts-header"><span class="ts-title">🎨 Choose Theme</span><button class="ts-close" aria-label="Close">×</button></div><div class="ts-grid" id="ts-grid"></div>`;
    document.body.appendChild(panel);

    btn.addEventListener('click', ()=>{ isOpen=!isOpen; panel.classList.toggle('ts-open',isOpen); });
    panel.querySelector('.ts-close').addEventListener('click', ()=>{ isOpen=false; panel.classList.remove('ts-open'); });
    document.addEventListener('keydown', e=>{ if(e.key==='Escape'&&isOpen){ isOpen=false; panel.classList.remove('ts-open'); }});

    render();
  }

  function render(){
    const grid = document.getElementById('ts-grid');
    if(!grid) return;
    const active = getActive();
    grid.innerHTML = THEMES.map(t=>{
      const sel = t.id===active;
      return `<button class="ts-card${sel?' ts-active':''}" data-theme-id="${t.id}">
        <span class="ts-dot" style="background:${t.primary}"></span>
        <span class="ts-label">${t.name}</span>
        <span class="ts-type">${t.dark?'Dark':'Light'}</span>
        ${sel?'<span class="ts-check">✓</span>':''}
      </button>`;
    }).join('');
    grid.querySelectorAll('.ts-card').forEach(card=>{
      card.addEventListener('click', ()=> setTheme(card.dataset.themeId));
    });
  }

  // Apply saved theme immediately
  function applyStored(){
    const saved = getActive();
    document.documentElement.setAttribute('data-theme', saved);
  }

  applyStored();
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', createWidget);
  } else {
    createWidget();
  }
})();
