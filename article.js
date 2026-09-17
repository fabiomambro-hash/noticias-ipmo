const sb=window.ipmoSupabase;
function esc(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function fmtDate(v){return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'long',year:'numeric'}).format(new Date(v));}
(async()=>{
 const slug=new URLSearchParams(location.search).get('slug'); const mount=document.querySelector('#articleMount');
 if(!slug){mount.innerHTML='<p>Notícia não encontrada.</p>';return;}
 const {data:p,error}=await sb.from('posts').select('title,excerpt,content,cover_image_url,published_at,created_at,categories(name)').eq('slug',slug).eq('status','published').maybeSingle();
 if(error||!p){mount.innerHTML='<p>Notícia não encontrada ou indisponível.</p>';return;}
 document.title=`${p.title} | Notícias IPMO`;
 const paragraphs=esc(p.content||'').split(/\n{2,}/).map(x=>`<p>${x.replace(/\n/g,'<br>')}</p>`).join('');
 mount.innerHTML=`<span class="badge">${esc(p.categories?.name||'Notícia')}</span><h1>${esc(p.title)}</h1><p class="article-lead">${esc(p.excerpt||'')}</p><div class="meta">${fmtDate(p.published_at||p.created_at)}</div>${p.cover_image_url?`<img class="article-photo" src="${esc(p.cover_image_url)}" alt="">`:''}<div class="article-content">${paragraphs}</div><a class="btn ghost back-btn" href="index.html">← Voltar às notícias</a>`;
})();
