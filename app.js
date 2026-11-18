const sb = window.ipmoSupabase;



const state = { posts: [], category: 'all', limit: 12 };

const grid = document.querySelector('#newsGrid');
const featured = document.querySelector('#featuredMount');
const searchInput = document.querySelector('#searchInput');
const emptyState = document.querySelector('#emptyState');
const categoryButtons = [...document.querySelectorAll('.category')];

function esc(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function fmtDate(v){if(!v)return ''; return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'long',year:'numeric'}).format(new Date(v));}
function image(post, cls='card-media'){return post.cover_image_url ? `<div class="${cls}" style="background-image:linear-gradient(0deg,rgba(3,35,59,.18),rgba(3,35,59,.05)),url('${esc(post.cover_image_url)}');background-size:cover;background-position:center"></div>` : '';}
function articleUrl(post){return `noticia.html?slug=${encodeURIComponent(post.slug)}`;}


function renderFeatured() {
  const primary = state.posts.find(p => p.is_featured) || state.posts[0];

  const secondaryMount = document.querySelector('#secondaryFeaturedMount');

  if (!primary) {
    if (featured) {
      featured.innerHTML = '<p class="empty-state">Ainda não há notícias em destaque.</p>';
    }
    if (secondaryMount) secondaryMount.innerHTML = '';
    return;
  }

  if (featured) {
    featured.innerHTML = `
      <article class="featured-card ${primary.cover_image_url ? '' : 'no-cover'}">
        ${image(primary, 'featured-media')}
        <div class="featured-content">
          <span class="category-label">${esc(primary.categories?.name || 'Notícias')}</span>
          <h3><a href="${articleUrl(primary)}">${esc(primary.title)}</a></h3>
          <p>${esc(primary.excerpt || '')}</p>
          <a class="read-more" href="${articleUrl(primary)}">Ler notícia</a>
        </div>
      </article>
    `;
  }

  const secondary = state.posts
    .filter(p => p.id !== primary.id)
    .slice(0, 2);

  if (secondaryMount) {
    secondaryMount.innerHTML = secondary.map(p => `
      <article class="portal-news-card">
        ${image(p)}
        <div class="card-body">
          <span class="category-label">${esc(p.categories?.name || 'Notícias')}</span>
          <h3><a href="${articleUrl(p)}">${esc(p.title)}</a></h3>
        </div>
      </article>
    `).join('');
  }
}


function renderPosts() {
  const term = (searchInput?.value || '').trim().toLowerCase();

  const items = state.posts.filter(p => {
    const text = `${p.title} ${p.excerpt || ''} ${p.categories?.name || ''}`.toLowerCase();
    const cat = p.categories?.slug || '';
    return (!term || text.includes(term)) &&
      (state.category === 'all' || cat === state.category);
  });

  const visible = items.slice(0, state.limit);

  if (grid) {
    grid.innerHTML = visible.map(p => `
      <article class="news-card">
        ${image(p)}
        <div class="card-body">
          <span class="category-label">${esc(p.categories?.name || 'Notícias')}</span>
          <h3><a href="${articleUrl(p)}">${esc(p.title)}</a></h3>
          <p>${esc(p.excerpt || '')}</p>
          <a class="read-more" href="${articleUrl(p)}">Ler notícia</a>
        </div>
      </article>
    `).join('');
  }

  if (emptyState) {
    emptyState.hidden = items.length !== 0;
  }

  const loadMore = document.querySelector('#loadMore');

  if (loadMore) {
    loadMore.hidden = items.length <= state.limit;
  }
}

async function load(){
  const {data,error}=await sb.from('posts').select('id,title,slug,excerpt,content,cover_image_url,status,is_featured,published_at,created_at,categories(name,slug)').eq('status','published').order('published_at',{ascending:false,nullsFirst:false});
  if(error){console.error(error); if(grid)grid.innerHTML='<p class="empty-state">Não foi possível carregar as notícias agora. Tente novamente em instantes.</p>'; return;}
  state.posts=data||[]; renderFeatured(); renderPosts();
}

searchInput?.addEventListener('input', () => {
  state.limit = 12;
  renderPosts();
});

categoryButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    state.category = btn.dataset.filter;
    state.limit = 12;
    renderPosts();
  });
});

const loadMoreButton = document.querySelector('#loadMore');

loadMoreButton?.addEventListener('click', () => {
  state.limit += 12;
  renderPosts();
});

load();

