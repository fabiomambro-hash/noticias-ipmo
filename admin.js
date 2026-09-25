const sb = window.ipmoSupabase;

const login = document.querySelector('#loginPanel');
const editor = document.querySelector('#editorPanel');
const statusEl = document.querySelector('#adminStatus');
const form = document.querySelector('#postForm');
const list = document.querySelector('#postsList');

const imageInput = document.querySelector('#image');
const imagePreviewBox = document.querySelector('#imagePreviewBox');
const imagePreview = document.querySelector('#imagePreview');
const removeImageBtn = document.querySelector('#removeImageBtn');
const currentImage = document.querySelector('#currentImage');

let editingId = null;
let categories = [];
let previewObjectUrl = null;


/* =========================================================
   MENSAGENS
========================================================= */

function msg(text, ok = true) {
  statusEl.textContent = text;
  statusEl.className = ok
    ? 'admin-status ok'
    : 'admin-status err';
}


/* =========================================================
   SLUG
========================================================= */

function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}


/* =========================================================
   IMAGEM
========================================================= */

function clearObjectPreview() {
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = null;
  }
}


function showImagePreview(src) {
  if (!src) {
    imagePreviewBox.hidden = true;
    imagePreview.removeAttribute('src');
    return;
  }

  imagePreview.src = src;
  imagePreviewBox.hidden = false;
}


function clearImagePreview(clearSavedImage = true) {
  clearObjectPreview();

  imageInput.value = '';
  imagePreview.removeAttribute('src');
  imagePreviewBox.hidden = true;

  if (clearSavedImage) {
    currentImage.value = '';
  }
}


imageInput.addEventListener('change', () => {
  const file = imageInput.files?.[0];

  clearObjectPreview();

  if (!file) {
    const existingImage = currentImage.value;

    if (existingImage) {
      showImagePreview(existingImage);
    } else {
      showImagePreview('');
    }

    return;
  }

  previewObjectUrl = URL.createObjectURL(file);
  showImagePreview(previewObjectUrl);
});


removeImageBtn.addEventListener('click', () => {
  clearImagePreview(true);
});


/* =========================================================
   CONTROLE DO FORMULÁRIO
========================================================= */

function resetForm() {
  editingId = null;

  form.reset();

  currentImage.value = '';

  clearObjectPreview();

  imagePreview.removeAttribute('src');
  imagePreviewBox.hidden = true;

  document.querySelector('#formTitle').textContent =
    'Nova notícia';

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}


/* =========================================================
   ACESSO / AUTENTICAÇÃO
========================================================= */

async function checkAccess() {

  const {
    data: { session }
  } = await sb.auth.getSession();

  if (!session) {
    login.hidden = false;
    editor.hidden = true;
    return;
  }

  const { data: profile, error } = await sb
    .from('profiles')
    .select('role,full_name')
    .eq('id', session.user.id)
    .maybeSingle();

  if (error) {
    msg(error.message, false);
    return;
  }

  if (
    !profile ||
    !['admin', 'editor'].includes(profile.role)
  ) {

    await sb.auth.signOut();

    login.hidden = false;
    editor.hidden = true;

    msg(
      'Sua conta ainda não possui permissão editorial.',
      false
    );

    return;
  }

  login.hidden = true;
  editor.hidden = false;

  document.querySelector('#whoami').textContent =
    profile.full_name || session.user.email;

  await loadCategories();
  await loadPosts();
}


/* =========================================================
   PRIMEIRO ACESSO
========================================================= */

document
  .querySelector('#showSignupBtn')
  .addEventListener('click', () => {

    const signupForm =
      document.querySelector('#signupForm');

    signupForm.hidden = !signupForm.hidden;
  });


document
  .querySelector('#signupForm')
  .addEventListener('submit', async (e) => {

    e.preventDefault();

    const fd = new FormData(e.currentTarget);

    if (
      fd.get('password') !==
      fd.get('password2')
    ) {
      return msg(
        'As senhas não coincidem.',
        false
      );
    }

    const { data, error } =
      await sb.auth.signUp({

        email: String(fd.get('email'))
          .trim()
          .toLowerCase(),

        password: fd.get('password'),

        options: {

          data: {
            full_name: fd.get('full_name')
          },

          emailRedirectTo:
            `${window.location.origin}/admin.html`
        }
      });

    if (error) {
      return msg(error.message, false);
    }

    if (data.session) {

      msg(
        'Acesso criado. Entrando no Painel Editorial…'
      );

      return checkAccess();
    }

    msg(
      'Cadastro criado. Verifique seu e-mail para confirmar o acesso e depois entre no painel.'
    );

    e.currentTarget.reset();
  });


/* =========================================================
   LOGIN
========================================================= */

document
  .querySelector('#loginForm')
  .addEventListener('submit', async (e) => {

    e.preventDefault();

    const fd = new FormData(e.currentTarget);

    const { error } =
      await sb.auth.signInWithPassword({

        email: String(fd.get('email'))
          .trim()
          .toLowerCase(),

        password: fd.get('password')
      });

    if (error) {
      return msg(error.message, false);
    }

    msg('Login realizado.');

    await checkAccess();
  });


/* =========================================================
   LOGOUT
========================================================= */

document
  .querySelector('#logoutBtn')
  .addEventListener('click', async () => {

    await sb.auth.signOut();

    location.reload();
  });


/* =========================================================
   CATEGORIAS
========================================================= */

async function loadCategories() {

  const { data, error } = await sb
    .from('categories')
    .select('id,name,slug')
    .order('name');

  if (error) {
    return msg(error.message, false);
  }

  categories = data || [];

  document.querySelector('#category').innerHTML =
    categories
      .map(
        category =>
          `<option value="${category.id}">
            ${category.name}
          </option>`
      )
      .join('');
}


/* =========================================================
   LISTAGEM DAS NOTÍCIAS
========================================================= */

async function loadPosts() {

  list.innerHTML =
    '<p class="posts-loading">Carregando notícias...</p>';

  const { data, error } = await sb
    .from('posts')
    .select(`
      id,
      title,
      status,
      is_featured,
      published_at,
      created_at,
      categories(name)
    `)
    .order('created_at', {
      ascending: false
    });

  if (error) {
    return msg(error.message, false);
  }

  if (!data || !data.length) {

    list.innerHTML =
      '<p class="posts-empty">Nenhuma notícia cadastrada.</p>';

    return;
  }

  list.innerHTML = data
    .map(post => {

      const category =
        post.categories?.name || 'Sem categoria';

      let statusLabel = 'Rascunho';

      if (post.status === 'published') {
        statusLabel = 'Publicada';
      }

      if (post.status === 'archived') {
        statusLabel = 'Arquivada';
      }

      return `
        <article class="post-row">

          <div class="post-row-content">

            <div class="post-row-meta">
              <span>${category}</span>
              <span>${statusLabel}</span>
              ${
                post.is_featured
                  ? '<span>Destaque</span>'
                  : ''
              }
            </div>

            <strong class="post-row-title">
              ${escapeHTML(post.title)}
            </strong>

          </div>

          <div class="post-row-actions">

            <button
              type="button"
              class="btn ghost"
              data-edit="${post.id}">
              Editar
            </button>

            <button
              type="button"
              class="btn ghost danger"
              data-delete="${post.id}">
              Excluir
            </button>

          </div>

        </article>
      `;
    })
    .join('');

  list
    .querySelectorAll('[data-edit]')
    .forEach(button => {

      button.onclick =
        () => editPost(button.dataset.edit);
    });

  list
    .querySelectorAll('[data-delete]')
    .forEach(button => {

      button.onclick =
        () => deletePost(button.dataset.delete);
    });
}


/* =========================================================
   SEGURANÇA PARA TEXTOS EXIBIDOS NO HTML
========================================================= */

function escapeHTML(value = '') {

  const div = document.createElement('div');

  div.textContent = value;

  return div.innerHTML;
}


/* =========================================================
   EDITAR NOTÍCIA
========================================================= */

async function editPost(id) {

  const { data: post, error } = await sb
    .from('posts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return msg(error.message, false);
  }

  editingId = id;

  document.querySelector('#title').value =
    post.title || '';

  document.querySelector('#slug').value =
    post.slug || '';

  document.querySelector('#excerpt').value =
    post.excerpt || '';

  document.querySelector('#content').value =
    post.content || '';

  document.querySelector('#category').value =
    post.category_id || '';

  document.querySelector('#status').value =
    post.status || 'draft';

  document.querySelector('#featured').checked =
    Boolean(post.is_featured);

  currentImage.value =
    post.cover_image_url || '';

  clearObjectPreview();

  imageInput.value = '';

  if (post.cover_image_url) {
    showImagePreview(post.cover_image_url);
  } else {
    showImagePreview('');
  }

  document.querySelector('#formTitle').textContent =
    'Editar notícia';

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}


/* =========================================================
   EXCLUIR NOTÍCIA
========================================================= */

async function deletePost(id) {

  if (
    !confirm(
      'Tem certeza de que deseja excluir esta notícia?'
    )
  ) {
    return;
  }

  const { error } = await sb
    .from('posts')
    .delete()
    .eq('id', id);

  if (error) {
    return msg(error.message, false);
  }

  if (editingId === id) {
    resetForm();
  }

  msg('Notícia excluída.');

  await loadPosts();
}


/* =========================================================
   SLUG AUTOMÁTICO
========================================================= */

document
  .querySelector('#title')
  .addEventListener('input', (e) => {

    if (!editingId) {

      document.querySelector('#slug').value =
        slugify(e.target.value);
    }
  });


/* =========================================================
   LIMPAR FORMULÁRIO
========================================================= */

document
  .querySelector('#resetBtn')
  .addEventListener('click', resetForm);


/* =========================================================
   SALVAR / ATUALIZAR NOTÍCIA
========================================================= */

form.addEventListener('submit', async (e) => {

  e.preventDefault();

  const submitButton =
    form.querySelector('button[type="submit"]');

  const originalButtonText =
    submitButton.textContent;

  submitButton.disabled = true;
  submitButton.textContent = 'Salvando...';

  try {

    const fd = new FormData(form);

    let imageUrl =
      currentImage.value || null;

    const file = fd.get('image');


    /* UPLOAD DA IMAGEM */

    if (file && file.size) {

      const safeFileName =
        slugify(
          file.name.replace(/\.[^/.]+$/, '')
        );

      const extension =
        file.name.split('.').pop().toLowerCase();

      const path =
        `${Date.now()}-${safeFileName}.${extension}`;

      const { error: uploadError } =
        await sb.storage
          .from('news-images')
          .upload(path, file, {
            upsert: false
          });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicData } =
        sb.storage
          .from('news-images')
          .getPublicUrl(path);

      imageUrl =
        publicData.publicUrl;
    }


    /* USUÁRIO */

    const {
      data: { user }
    } = await sb.auth.getUser();

    if (!user) {
      throw new Error(
        'Sua sessão expirou. Entre novamente no painel.'
      );
    }


    /* DADOS DA PUBLICAÇÃO */

    const postStatus =
      fd.get('status');

    const payload = {

      title:
        String(fd.get('title')).trim(),

      slug:
        String(fd.get('slug')).trim(),

      excerpt:
        String(fd.get('excerpt') || '').trim(),

      content:
        String(fd.get('content')).trim(),

      category_id:
        fd.get('category') || null,

      cover_image_url:
        imageUrl,

      status:
        postStatus,

      is_featured:
        fd.get('featured') === 'on',

      author_id:
        user.id,

      published_at:
        postStatus === 'published'
          ? new Date().toISOString()
          : null
    };


    /* INSERT OU UPDATE */

    let error;

    if (editingId) {

      const result = await sb
        .from('posts')
        .update(payload)
        .eq('id', editingId);

      error = result.error;

    } else {

      const result = await sb
        .from('posts')
        .insert(payload);

      error = result.error;
    }

    if (error) {
      throw error;
    }


    /* FINALIZAÇÃO */

    msg(
      editingId
        ? 'Notícia atualizada com sucesso.'
        : 'Notícia salva com sucesso.'
    );

    resetForm();

    await loadPosts();

  } catch (error) {

    console.error(error);

    msg(
      error.message ||
      'Não foi possível salvar a notícia.',
      false
    );

  } finally {

    submitButton.disabled = false;
    submitButton.textContent =
      originalButtonText;
  }
});


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

checkAccess();
