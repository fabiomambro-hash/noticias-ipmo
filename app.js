/* Notícias IPMO: página pública. O painel editorial continua em admin.js. */
const sb = window.ipmoSupabase;
const state = { posts: [], category: 'all', limit: 12 };
const grid = document.querySelector('#newsGrid');
const featured = document.querySelector('#featuredMount');
const searchInput = document.querySelector('#searchInput');
const emptyState = document.querySelector('#emptyState');
const loadMore = document.querySelector('#loadMore');
const filterMount = document.querySelector('#categoryFilters');
const tickerLink = document.querySelector('#tickerLink');
const menuToggle = document.querySelector('.portal-menu');
const navLinks = document.querySelector('#portalNavLinks');

menuToggle?.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(open));
});
navLinks?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  navLinks.classList.remove('open');
  menuToggle?.setAttribute('aria-expanded', 'false');
}));

function esc(value = '') {
  return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function fmtDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('pt-BR', {day:'2-digit',month:'long',year:'numeric'}).format(date);
}
function articleUrl(post) { return `noticia.html?slug=${encodeURIComponent(post.slug)}`; }
function categoryName(post) { return post.categories?.name || 'Notícias IPMO'; }
function cover(post, className) {
  if (!post.cover_image_url) return `<div class="${className} portal-image-fallback" aria-hidden="true"></div>`;
  return `<img class="${className}" src="${esc(post.cover_image_url)}" alt="" loading="lazy" onerror="this.style.display='none'" />`;
}
function leadCard(post) {
  return `<article class="portal-lead">${cover(post,'portal-lead-image')}<div class="portal-lead-content"><span class="badge">${esc(categoryName(post))}</span><h3>${esc(post.title)}</h3><p>${esc(post.excerpt || '')}</p><small>${esc(fmtDate(post.published_at || post.created_at))}</small></div><a class="stretched" href="${articleUrl(post)}" aria-label="Ler notícia: ${esc(post.title)}"></a></article>`;
}
function sideCard(post) {
  return `<article class="portal-side-story">${cover(post,'portal-side-image')}<div class="portal-side-content"><span class="badge">${esc(categoryName(post))}</span><h3><a href="${articleUrl(post)}">${esc(post.title)}</a></h3><small>${esc(fmtDate(post.published_at || post.created_at))}</small></div></article>`;
}
function renderFeatured() {
  if (!featured) return;
  if (!state.posts.length) { featured.innerHTML = '<p class="empty-state">Ainda não há notícias publicadas.</p>'; return; }
  const lead = state.posts.find(post => post.is_featured) || state.posts[0];
  const secondary = state.posts.filter(post => post.id !== lead.id).slice(0, 2);
  featured.innerHTML = leadCard(lead) + (secondary.length ? `<div class="portal-side">${secondary.map(sideCard).join('')}</div>` : '');
  if (tickerLink) { tickerLink.textContent = lead.title; tickerLink.href = articleUrl(lead); }
}
function filteredPosts() {
  const term = (searchInput?.value || '').trim().toLocaleLowerCase('pt-BR');
  return state.posts.filter(post => {
    const text = `${post.title || ''} ${post.excerpt || ''} ${categoryName(post)}`.toLocaleLowerCase('pt-BR');
    return (!term || text.includes(term)) && (state.category === 'all' || post.categories?.slug === state.category);
  });
}
function renderPosts() {
  const matches = filteredPosts();
  const visible = matches.slice(0, state.limit);
  if (grid) grid.innerHTML = visible.map(post => `<article class="news-card"><a class="portal-card-image" href="${articleUrl(post)}" aria-label="Ler ${esc(post.title)}">${cover(post,'card-media')}</a><div class="card-body"><span class="badge">${esc(categoryName(post))}</span><h3><a href="${articleUrl(post)}">${esc(post.title)}</a></h3><p>${esc(post.excerpt || '')}</p><div class="meta">${esc(fmtDate(post.published_at || post.created_at))}</div><a class="text-link" href="${articleUrl(post)}">Ler matéria completa →</a></div></article>`).join('');
  if (emptyState) emptyState.hidden = matches.length > 0;
  if (loadMore) loadMore.hidden = matches.length <= state.limit;
}
function renderCategories() {
  if (!filterMount) return;
  const categories = new Map();
  state.posts.forEach(post => { if (post.categories?.slug) categories.set(post.categories.slug, post.categories.name || post.categories.slug); });
  const buttons = [['all','Todas as notícias'], ...[...categories.entries()].sort((a,b) => a[1].localeCompare(b[1],'pt-BR'))];
  filterMount.innerHTML = buttons.map(([slug,name]) => `<button type="button" class="category${slug === state.category ? ' active' : ''}" data-filter="${esc(slug)}">${esc(name)}</button>`).join('');
  filterMount.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
    state.category = button.dataset.filter;
    state.limit = 12;
    renderCategories(); renderPosts();
    document.querySelector('#ultimas')?.scrollIntoView({behavior:'smooth'});
  }));
}
async function load() {
  if (!sb) { if (grid) grid.innerHTML = '<p class="empty-state">Não foi possível iniciar a conexão com as notícias.</p>'; if (featured) featured.innerHTML = ''; return; }
  try {
    const {data,error} = await sb.from('posts')
      .select('id,title,slug,excerpt,cover_image_url,status,is_featured,published_at,created_at,categories(name,slug)')
      .eq('status','published')
      .order('published_at',{ascending:false,nullsFirst:false});
    if (error) throw error;
    state.posts = data || [];
    renderFeatured(); renderCategories(); renderPosts();
  } catch (error) {
    console.error('Erro ao carregar notícias:', error);
    if (grid) grid.innerHTML = '<p class="empty-state">Não foi possível carregar as notícias. Tente novamente mais tarde.</p>';
    if (featured) featured.innerHTML = '';
  }
}
searchInput?.addEventListener('input', () => { state.limit = 12; renderPosts(); });
loadMore?.addEventListener('click', () => { state.limit += 12; renderPosts(); });
load();
