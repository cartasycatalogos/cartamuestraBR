// app.js (module)
// Maneja carga de data.json / data-pt.json, idioma, likes (localStorage), dark mode, render.

// --- Helpers ---
const $ = (sel, ctx=document) => ctx.querySelector(sel);
const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));
const formatARS = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

let restaurant = {};
let categories = [];
let menuData = [];

// Estado
let lang = localStorage.getItem('cm_lang') || 'es'; // 'es' o 'pt'
let likesStore = JSON.parse(localStorage.getItem('cm_likes') || '{}');
let darkMode = (localStorage.getItem('cm_dark') === '1');

// --- UI Texts ---
const TEXT = {
  es: {
    selectionHint: 'Selección',
    moreHint: 'Platos favoritos de los clientes',
    footerNote: '* Los precios y fotos son ilustrativos para la demo. Formato de moneda: ARS. | ¿Querés esta carta con tu logo, tus colores y tus platos? ¡Se personaliza en minutos!',
    contactCTA: '¿Querés un menú virtual como este?',
    contactBtn: 'Contactame',
    shareText: 'Compartí este plato',
    backToTop: '↑ Arriba'
  },
  pt: {
    selectionHint: 'Seleção',
    moreHint: 'Pratos favoritos dos clientes',
    footerNote: '* Os preços e fotos são ilustrativos para a demo. Formato de moeda: ARS. | Quer este cardápio com seu logo, suas cores e seus pratos? Personaliza-se em minutos!',
    contactCTA: 'Quer um cardápio virtual assim?',
    contactBtn: 'Contate-me',
    shareText: 'Compartilhe este prato',
    backToTop: '↑ Voltar'
  }
};

// --- Utilidades ---
function safeId(s){ return (s||'').toString().replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_\-]/g,'').toLowerCase(); }

function saveLikes(){ localStorage.setItem('cm_likes', JSON.stringify(likesStore)); }
function setLang(newLang){
  lang = newLang;
  localStorage.setItem('cm_lang', lang);
  loadAndRender();
  updateLangButton();
}
function toggleDark(){
  darkMode = !darkMode;
  localStorage.setItem('cm_dark', darkMode ? '1' : '0');
  document.body.classList.toggle('dark-mode', darkMode);
  updateDarkButton();
}

function updateLangButton(){
  const btn = $('#langToggle');
  if(!btn) return;
  btn.textContent = (lang === 'es') ? '🇧🇷 PT-BR' : '🇦🇷 ES';
}

function updateDarkButton(){
  const btn = $('#darkToggle');
  if(!btn) return;
  btn.textContent = darkMode ? '☀️' : '🌙';
}

// --- UI Injection: lang + dark buttons ---
function injectControls(){
  // Avoid duplicate
  if($('#controlsRow')) return;

  const c = document.createElement('div');
  c.id = 'controlsRow';
  c.style.position = 'fixed';
  c.style.top = '12px';
  c.style.right = '16px';
  c.style.zIndex = '1200';
  c.style.display = 'flex';
  c.style.gap = '8px';
  document.body.appendChild(c);

  const langBtn = document.createElement('button');
  langBtn.id = 'langToggle';
  langBtn.className = 'pill';
  langBtn.style.padding = '8px 10px';
  langBtn.style.borderRadius = '10px';
  langBtn.style.border = 'none';
  langBtn.style.cursor = 'pointer';
  langBtn.title = (lang === 'es') ? 'Mudar para Português' : 'Switch to Spanish';
  langBtn.addEventListener('click', ()=> setLang(lang === 'es' ? 'pt' : 'es'));
  c.appendChild(langBtn);

  const darkBtn = document.createElement('button');
  darkBtn.id = 'darkToggle';
  darkBtn.className = 'pill';
  darkBtn.style.padding = '8px 10px';
  darkBtn.style.borderRadius = '10px';
  darkBtn.style.border = 'none';
  darkBtn.style.cursor = 'pointer';
  darkBtn.addEventListener('click', toggleDark);
  c.appendChild(darkBtn);

  updateLangButton();
  updateDarkButton();
}

// --- Load data.json depending on lang ---
async function loadData(){
  const file = (lang === 'pt') ? 'data-pt.json' : 'data.json';
  const res = await fetch(file);
  if(!res.ok) throw new Error('No se pudo cargar ' + file);
  const data = await res.json();
  return data;
}

// --- Render functions ---
function applyPalette(){
  const p = restaurant.palette || {};
  if(p.brand) document.documentElement.style.setProperty('--brand', p.brand);
  if(p.accent) document.documentElement.style.setProperty('--accent', p.accent);
  if(p.bg) document.documentElement.style.setProperty('--bg', p.bg);
  if(p.surface) document.documentElement.style.setProperty('--surface', p.surface);
  if(p.text) document.documentElement.style.setProperty('--text', p.text);
  if(p.muted) document.documentElement.style.setProperty('--muted', p.muted);
}

function setupBrand(){
  $('#brandTitle').textContent = restaurant.name || (lang === 'es' ? 'Tu Restaurante' : 'Seu Restaurante');
  $('#brandSubtitle').textContent = restaurant.tagline || (lang === 'es' ? 'Carta personalizada' : 'Cardápio personalizado');

  const logoEl = $('#logo');
  if(restaurant.logoURL){
    const img = new Image();
    img.src = restaurant.logoURL;
    img.alt = 'Logo';
    img.width = 72; img.height = 72;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.borderRadius = '50%';
    logoEl.textContent = '';
    logoEl.appendChild(img);
  } else {
    logoEl.textContent = getInitials(restaurant.name);
  }
}

function getInitials(name){
  return (name||'R').split(/\s+/).slice(0,2).map(w=>w[0]?.toUpperCase()).join('');
}

function renderPills(){
  const bar = $('#pillbar');
  bar.innerHTML = '';
  categories.forEach(c => {
    const a = document.createElement('a');
    a.href = `#${c.id}`;
    a.textContent = `${c.emoji} ${c.label}`;
    a.addEventListener('click', e=>{
      e.preventDefault();
      document.getElementById(c.id)?.scrollIntoView({behavior:'smooth'});
    });
    bar.appendChild(a);
  });
}

function createCard(item, categoryLabel){
  const safe = safeId(item.title);
  const card = document.createElement('article');
  card.className = 'card';
  card.innerHTML = `
    <div class="media">
      <img loading="lazy" src="${item.img}" alt="${item.title}">
      <div class="price-badge">${formatARS.format(item.price)}</div>
    </div>
    <div class="content">
      <h3 class="title">${item.title}</h3>
      <p class="desc">${item.desc || ''}</p>
      <div class="meta">
        <span class="tag">${categoryLabel}</span>
        <div style="display:flex; gap:8px; align-items:center;">
          <button class="like-btn" aria-label="like">❤️ <span class="like-count">${likesStore[safe]||0}</span></button>
          <button class="share-btn" aria-label="share">📤</button>
        </div>
      </div>
    </div>
  `;

  const likeBtn = card.querySelector('.like-btn');
  const likeCount = card.querySelector('.like-count');
  likeBtn.addEventListener('click', ()=>{
    likesStore[safe] = (likesStore[safe] || 0) + 1;
    likeCount.textContent = likesStore[safe];
    saveLikes();
  });

  const shareBtn = card.querySelector('.share-btn');
  shareBtn.addEventListener('click', ()=>{
    const text = `${item.title} - ${formatARS.format(item.price)}\n${item.desc || ''}`;
    const url = window.location.href;
    if(navigator.share){
      navigator.share({ title: item.title, text, url }).catch(()=>{});
    } else {
      // fallback: copy to clipboard
      const tmp = document.createElement('textarea');
      tmp.value = `${text}\n${url}`;
      document.body.appendChild(tmp);
      tmp.select();
      document.execCommand('copy');
      document.body.removeChild(tmp);
      alert((lang === 'es') ? 'Texto copiado al portapapeles' : 'Texto copiado para a área de transferência');
    }
  });

  return card;
}

function renderSections(){
  const main = $('#main');
  main.innerHTML = '';

  // Optional: Popular (most liked) section
  const popular = Object.keys(likesStore)
    .map(k => ({ id:k, count: likesStore[k] }))
    .filter(x => x.count > 0)
    .sort((a,b)=>b.count-a.count)
    .slice(0,6);

  if(popular.length){
    const section = document.createElement('section');
    section.className = 'menu-section';
    section.id = 'popular';
    const head = document.createElement('div');
    head.className = 'section-head';
    head.innerHTML = `<h2>🔥 ${(lang==='es') ? 'Más pedidos' : 'Mais pedidos'}</h2><span class="hint">${TEXT[lang].moreHint}</span>`;
    const grid = document.createElement('div');
    grid.className = 'grid';
    popular.forEach(p=>{
      const item = menuData.find(m => safeId(m.title) === p.id);
      if(item) grid.appendChild(createCard(item, item.cat));
    });
    section.appendChild(head);
    section.appendChild(grid);
    main.appendChild(section);
  }

  categories.forEach(c => {
    const section = document.createElement('section');
    section.className = 'menu-section';
    section.id = c.id;

    const head = document.createElement('div');
    head.className = 'section-head';
    head.innerHTML = `<h2>${c.emoji} ${c.label}</h2><span class="hint">${TEXT[lang].selectionHint}</span>`;

    const grid = document.createElement('div');
    grid.className = 'grid';

    menuData.filter(i => i.cat === c.id).forEach(item => {
      grid.appendChild(createCard(item, c.label));
    });

    section.appendChild(head);
    section.appendChild(grid);
    main.appendChild(section);
  });

  // Update footer note
  const footerNoteEl = $('#footerNote');
  if(footerNoteEl) footerNoteEl.textContent = TEXT[lang].footerNote;
}

function observeSections(){
  const links = $$('#pillbar a');
  const map = new Map();
  links.forEach(a => { map.set(a.getAttribute('href').slice(1), a); });

  const io = new IntersectionObserver((entries)=>{
    entries.forEach(en => {
      if(en.isIntersecting){
        links.forEach(l => l.classList.remove('active'));
        const a = map.get(en.target.id); a?.classList.add('active');
        history.replaceState(null, '', `#${en.target.id}`);
      }
    })
  }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });

  categories.forEach(c => {
    const s = document.getElementById(c.id);
    if(s) io.observe(s);
  });
}

function setupBackToTop(){
  const btn = $('#backTop');
  const onScroll = () => { btn.classList.toggle('show', window.scrollY > 600); }
  window.addEventListener('scroll', onScroll);
  onScroll();
  btn.addEventListener('click', ()=> window.scrollTo({ top:0, behavior:'smooth' }));
}

// --- Main loader & render ---
async function loadAndRender(){
  try {
    const data = await loadData();
    restaurant = data.restaurant || {};
    categories = data.categories || [];
    menuData = data.menu || [];

    applyPalette();
    setupBrand();
    renderPills();
    renderSections();
    observeSections();
    setupBackToTop();
  } catch (e) {
    console.error('Error cargando datos:', e);
    $('#main').innerHTML = `<p style="color:var(--muted);padding:20px;">${(lang==='es') ? 'Error cargando datos' : 'Erro ao carregar dados'}</p>`;
  }
}

// --- Init ---
document.addEventListener('DOMContentLoaded', ()=>{
  injectControls();
  document.body.classList.toggle('dark-mode', darkMode);
  loadAndRender();
});
