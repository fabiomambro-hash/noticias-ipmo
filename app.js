const sb = window.ipmoSupabase;
const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');
if (menuToggle) menuToggle.addEventListener('click',()=>{const open=nav.classList.toggle('open');menuToggle.setAttribute('aria-expanded',String(open));});

const state = { posts: [], category: 'all' };
const grid = document.querySelector('#newsGrid');
const featured = document.querySelector('#featuredMount');
const searchInput = document.querySelector('#searchInput');
const emptyState = document.querySelector('#emptyState');
const categoryButtons = [...document.querySelectorAll('.category')];

function esc(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function fmtDate(v){if(!v)return ''; return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'long',year:'numeric'}).format(new Date(v));}
function image(post, cls='card-media'){return post.cover_image_url ? `<div class="${cls}" style="background-image:linear-gradient(0deg,rgba(3,35,59,.25),rgba(3,35,59,.1)),url('${esc(post.cover_image_url)}');background-size:cover;background-position:center"></div>` : `<div class="${cls}"><span>${esc(post.categories?.name||'Notícias IPMO')}</span></div>`;}
function articleUrl(post){return `noticia.html?slug=${encodeURIComponent(post.slug)}`;}

function renderFeatured(){
  const p = state.posts.find(x=>x.is_featured) || state.posts[0];
  if(!featured){return;} if(!p){featured.innerHTML='<div class="empty-state">Ainda não há notícia em destaque.</div>';return;}
  featured.innerHTML=`<article class="featured-card">${image(p,'featured-media')}<div class="featured-content"><span class="badge">${esc(p.categories?.name||'Institucional')}</span><h3>${esc(p.title)}</h3><p>${esc(p.excerpt||'')}</p><div class="meta">${fmtDate(p.published_at||p.created_at)}</div><a class="text-link" href="${articleUrl(p)}">Ler matéria completa →</a></div></article>`;
}
function renderPosts(){
  const term=(searchInput?.value||'').trim().toLowerCase();
  const items=state.posts.filter(p=>{
    const text=`${p.title} ${p.excerpt||''} ${p.categories?.name||''}`.toLowerCase();
    const cat=p.categories?.slug||'';
    return (!term||text.includes(term)) && (state.category==='all'||cat===state.category);
  }).filter((_,i)=>i<12);
  if(grid) grid.innerHTML=items.map(p=>`<article class="news-card">${image(p)}<div class="card-body"><span class="badge">${esc(p.categories?.name||'Notícia')}</span><h3>${esc(p.title)}</h3><p>${esc(p.excerpt||'')}</p><div class="meta">${fmtDate(p.published_at||p.created_at)}</div><a class="text-link" href="${articleUrl(p)}">Ler mais →</a></div></article>`).join('');
  if(emptyState) emptyState.hidden=items.length!==0;
}
async function load(){
  const {data,error}=await sb.from('posts').select('id,title,slug,excerpt,content,cover_image_url,status,is_featured,published_at,created_at,categories(name,slug)').eq('status','published').order('published_at',{ascending:false,nullsFirst:false});
  if(error){console.error(error); if(grid)grid.innerHTML='<p class="empty-state">Não foi possível carregar as notícias agora. Tente novamente em instantes.</p>'; return;}
  state.posts=data||[]; renderFeatured(); renderPosts();
}
searchInput?.addEventListener('input',renderPosts);
categoryButtons.forEach(btn=>btn.addEventListener('click',()=>{state.category=btn.dataset.filter;categoryButtons.forEach(b=>b.classList.toggle('active',b===btn));document.querySelector('#ultimas')?.scrollIntoView({behavior:'smooth'});renderPosts();}));
load();
