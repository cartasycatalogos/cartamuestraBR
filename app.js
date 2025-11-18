// === Configuración del restaurante ===
let restaurant = {};
let categories = [];
let menuData = [];

// === Firebase Setup (modular v9+) ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  increment 
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCAIS5oSe-pwcVumx4wCYm46dtIEP-udTo",
  authDomain: "cartamuest.firebaseapp.com",
  projectId: "cartamuest",
  storageBucket: "cartamuest.appspot.com", // ⚠️ corregí esto en consola
  messagingSenderId: "888169747887",
  appId: "1:888169747887:web:ee88e06461568857110b5a",
  measurementId: "G-XHEFJC2WRL"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// === Helpers ===
const $ = (sel, ctx=document) => ctx.querySelector(sel);
const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));
const formatARS = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

// Inicializa la app cargando data.json
fetch("data.json")
  .then(res => res.json())
  .then(data => {
    restaurant = data.restaurant;
    categories = data.categories;
    menuData = data.menu;

    applyPalette();
    setupBrand();
    renderPills();
    renderSections();
    observeSections();
    setupBackToTop();
  })
  .catch(err => console.error("Error cargando data.json", err));

// === Funciones ===
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
  $('#brandTitle').textContent = restaurant.name || 'Tu Restaurante';
  $('#brandSubtitle').textContent = restaurant.tagline || 'Carta personalizada';

  const logoEl = $('#logo');
  if(restaurant.logoURL){
    const img = new Image();
    img.src = restaurant.logoURL;
    img.alt = 'Logo';
    img.width = 64; img.height = 64;
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

function renderSections(){
  const main = $('#main');
  main.innerHTML = '';
  categories.forEach(c => {
    const section = document.createElement('section');
    section.className = 'menu-section';
    section.id = c.id;

    const head = document.createElement('div');
    head.className = 'section-head';
    head.innerHTML = `<h2>${c.emoji} ${c.label}</h2><span class="hint">Selección</span>`;

    const grid = document.createElement('div');
    grid.className = 'grid';

    menuData.filter(i => i.cat === c.id).forEach(item => {
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
            <span class="tag">${c.label}</span>
            <div>
              <button class="like-btn" type="button">❤️</button>
              <span class="like-count">0</span>
            </div>
          </div>
        </div>
      `;
      grid.appendChild(card);

      // === Likes Firebase ===
      const likeBtn = card.querySelector('.like-btn');
      const likeCount = card.querySelector('.like-count');

      // Para evitar depender de item.id, generamos docRef con el título como ID
      const safeId = item.title.replace(/\s+/g, "_").toLowerCase();
      const docRef = doc(db, "menu", safeId);

      getDoc(docRef).then(snapshot => {
        if(snapshot.exists()){
          likeCount.textContent = snapshot.data().likes || 0;
        } else {
          setDoc(docRef, { likes: 0 });
        }
      });

      likeBtn.addEventListener('click', async ()=>{
        await updateDoc(docRef, { likes: increment(1) });
        const snapshot = await getDoc(docRef);
        likeCount.textContent = snapshot.data().likes;
      });
    });

    section.appendChild(head);
    section.appendChild(grid);
    main.appendChild(section);
  });
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

// === Dark Mode Toggle ===
const darkModeToggle = document.createElement("button");
darkModeToggle.id = "darkModeToggle";
darkModeToggle.textContent = "🌙";
darkModeToggle.style.position = "fixed";
darkModeToggle.style.top = "16px";
darkModeToggle.style.right = "16px";
darkModeToggle.style.zIndex = "1000";
darkModeToggle.style.padding = "10px 14px";
darkModeToggle.style.border = "none";
darkModeToggle.style.borderRadius = "12px";
darkModeToggle.style.background = "var(--brand)";
darkModeToggle.style.color = "var(--brand-contrast)";
darkModeToggle.style.cursor = "pointer";
document.body.appendChild(darkModeToggle);

darkModeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  darkModeToggle.textContent = document.body.classList.contains("dark-mode") ? "☀️" : "🌙";
});
