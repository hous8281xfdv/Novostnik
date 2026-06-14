import { supabase } from './supabase.js';

// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===
let currentUser = null;
let currentCommentPostId = null;
let isAdminMode = false;
const ADMIN_PASSWORD = 'admin123';

// === ВСПОМОГАТЕЛЬНЫЕ ===
function showToast(msg, isErr = false) {
    const toast = document.getElementById('toast');
    toast.innerText = msg;
    toast.style.background = isErr ? '#c0392b' : '#2d4a2d';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, (m) => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
}

function closeModal(modal) {
    if (modal) modal.style.display = 'none';
}

// === АВТОРИЗАЦИЯ ===
async function register(name, phone, password) {
    const { data, error } = await supabase
        .from('users')
        .insert([{ name, phone, password }])
        .select();
    
    if (error) {
        if (error.code === '23505') showToast('Такой номер уже зарегистрирован', true);
        else showToast('Ошибка регистрации', true);
        return false;
    }
    
    currentUser = data[0];
    localStorage.setItem('newsUser', JSON.stringify(currentUser));
    updateUI();
    loadPosts();
    showToast(`Добро пожаловать, ${currentUser.name}!`);
    return true;
}

async function login(phone, password) {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('phone', phone)
        .eq('password', password)
        .single();
    
    if (error || !data) {
        showToast('Неверный телефон или пароль', true);
        return false;
    }
    
    currentUser = data;
    localStorage.setItem('newsUser', JSON.stringify(currentUser));
    updateUI();
    loadPosts();
    showToast(`С возвращением, ${currentUser.name}!`);
    return true;
}

function logout() {
    currentUser = null;
    localStorage.removeItem('newsUser');
    updateUI();
    loadPosts();
    showToast('Вы вышли');
}

function updateUI() {
    const profile = document.getElementById('userProfile');
    const createCard = document.getElementById('createPostCard');
    const welcomeBlock = document.getElementById('welcomeBlock');
    const feedBlock = document.getElementById('feedBlock');
    
    if (currentUser) {
        profile.style.display = 'flex';
        document.getElementById('userName').innerText = currentUser.name.split(' ')[0];
        createCard.style.display = 'flex';
        welcomeBlock.style.display = 'none';
        feedBlock.style.display = 'block';
    } else {
        profile.style.display = 'none';
        createCard.style.display = 'none';
        welcomeBlock.style.display = 'flex';
        feedBlock.style.display = 'none';
        document.getElementById('adminBlock').style.display = 'none';
        isAdminMode = false;
    }
}

// === ПОСТЫ ===
async function loadPosts() {
    const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) {
        showToast('Ошибка загрузки постов', true);
        return;
    }
    
    renderPosts(data || []);
}

function renderPosts(posts) {
    const container = document.getElementById('postsFeed');
    if (!container) return;
    if (!posts || posts.length === 0) {
        container.innerHTML = '<div class="post-card" style="padding:20px; text-align:center;">Нет новостей. Админ ещё не добавил ни одного поста ✨</div>';
        return;
    }
    
    container.innerHTML = posts.map(post => `
        <div class="post-card">
            <div class="post-header">
                <div class="post-avatar"><i class="fas fa-user"></i></div>
                <div class="post-author-info"><h3>${escapeHtml(post.author_name)}</h3><div class="post-date">${new Date(post.created_at).toLocaleString('ru-RU')}</div></div>
            </div>
            <div class="post-title"><strong>${escapeHtml(post.title)}</strong></div>
            <div class="post-content">${escapeHtml(post.content).replace(/\n/g, '<br>')}</div>
            ${post.image_url ? `<div class="post-image"><img src="${escapeHtml(post.image_url)}" alt="post"></div>` : ''}
            <div class="post-stats">
                <button class="like-btn" data-id="${post.id}"><i class="fas fa-heart"></i> <span class="like-count">0</span></button>
                <button class="comment-btn" data-id="${post.id}"><i class="fas fa-comment"></i> <span class="comment-count">0</span></button>
            </div>
            ${isAdminMode ? `<div class="admin-buttons"><button class="edit-post" data-id="${post.id}">✏️ Редактировать</button><button class="delete-post" data-id="${post.id}">🗑️ Удалить</button></div>` : ''}
        </div>
    `).join('');
    
    // Загружаем лайки и комментарии для каждого поста
    for (let post of posts) {
        loadLikes(post.id);
        loadCommentsCount(post.id);
    }
    
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', () => toggleLike(parseInt(btn.dataset.id)));
    });
    document.querySelectorAll('.comment-btn').forEach(btn => {
        btn.addEventListener('click', () => openCommentsModal(parseInt(btn.dataset.id)));
    });
    if (isAdminMode) {
        document.querySelectorAll('.edit-post').forEach(btn => btn.addEventListener('click', () => openPostEditor(parseInt(btn.dataset.id))));
        document.querySelectorAll('.delete-post').forEach(btn => btn.addEventListener('click', async () => {
            if (confirm('Удалить пост?')) {
                await supabase.from('posts').delete().eq('id', btn.dataset.id);
                await supabase.from('comments').delete().eq('post_id', btn.dataset.id);
                await supabase.from('likes').delete().eq('post_id', btn.dataset.id);
                loadPosts();
                showToast('Пост удалён');
            }
        }));
    }
}

async function loadLikes(postId) {
    const { data, error } = await supabase
        .from('likes')
        .select('user_id')
        .eq('post_id', postId);
    
    if (error) return;
    const likeBtn = document.querySelector(`.like-btn[data-id="${postId}"]`);
    if (likeBtn) {
        const count = data.length;
        const isLiked = currentUser && data.some(l => l.user_id === currentUser.id);
        likeBtn.querySelector('.like-count').innerText = count;
        if (isLiked) likeBtn.classList.add('liked');
        else likeBtn.classList.remove('liked');
    }
}

async function loadCommentsCount(postId) {
    const { count, error } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);
    
    if (!error) {
        const commentBtn = document.querySelector(`.comment-btn[data-id="${postId}"]`);
        if (commentBtn) commentBtn.querySelector('.comment-count').innerText = count || 0;
    }
}

async function toggleLike(postId) {
    if (!currentUser) { showLoginModal(); return; }
    
    const { data: existing } = await supabase
        .from('likes')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', currentUser.id)
        .single();
    
    if (existing) {
        await supabase.from('likes').delete().eq('id', existing.id);
    } else {
        await supabase.from('likes').insert([{ post_id: postId, user_id: currentUser.id }]);
    }
    
    loadLikes(postId);
}

// === КОММЕНТАРИИ ===
async function openCommentsModal(postId) {
    currentCommentPostId = postId;
    
    const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
    
    if (error) return;
    
    const container = document.getElementById('commentsList');
    container.innerHTML = (data || []).map(c => `
        <div class="comment-item">
            <div class="comment-author">${escapeHtml(c.author_name)} <span style="font-size:0.7rem; color:#818c99;">${new Date(c.created_at).toLocaleString()}</span></div>
            <div class="comment-text">${escapeHtml(c.text)}</div>
            ${isAdminMode ? `<button class="delete-comment-admin" data-id="${c.id}" style="margin-top:8px; background:#c0392b; border:none; padding:4px 12px; border-radius:20px; color:white;">Удалить</button>` : ''}
        </div>
    `).join('');
    
    document.getElementById('commentsModal').style.display = 'block';
    
    if (isAdminMode) {
        document.querySelectorAll('.delete-comment-admin').forEach(btn => {
            btn.addEventListener('click', async () => {
                await supabase.from('comments').delete().eq('id', btn.dataset.id);
                openCommentsModal(postId);
                loadCommentsCount(postId);
                showToast('Комментарий удалён');
            });
        });
    }
}

document.getElementById('submitCommentBtn').addEventListener('click', async () => {
    if (!currentUser) { showLoginModal(); return; }
    const text = document.getElementById('newCommentText').value.trim();
    if (!text) return;
    
    const { error } = await supabase
        .from('comments')
        .insert([{
            post_id: currentCommentPostId,
            user_id: currentUser.id,
            author_name: currentUser.name,
            text: text
        }]);
    
    if (!error) {
        document.getElementById('newCommentText').value = '';
        openCommentsModal(currentCommentPostId);
        loadCommentsCount(currentCommentPostId);
    } else {
        showToast('Ошибка при отправке', true);
    }
});

// === ПРЕДЛОЖЕНИЕ ПОСТА ===
document.getElementById('proposeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) { showLoginModal(); return; }
    
    const title = document.getElementById('proposeTitle').value.trim();
    const content = document.getElementById('proposeContent').value.trim();
    let imageUrl = document.getElementById('proposeImageUrl').value.trim();
    const file = document.getElementById('proposeImageFile').files[0];
    
    if (!title || !content) { showToast('Заголовок и текст обязательны', true); return; }
    
    const send = async (url) => {
        const { error } = await supabase
            .from('pending_posts')
            .insert([{
                title, content,
                image_url: url,
                author_id: currentUser.id,
                author_name: currentUser.name
            }]);
        
        if (!error) {
            closeModal(document.getElementById('proposeModal'));
            document.getElementById('proposeForm').reset();
            document.getElementById('proposeImagePreview').innerHTML = '';
            showToast('Пост отправлен на модерацию');
        } else {
            showToast('Ошибка отправки', true);
        }
    };
    
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => send(ev.target.result);
        reader.readAsDataURL(file);
    } else {
        send(imageUrl);
    }
});

// === АДМИНКА: МОДЕРАЦИЯ ===
async function loadModeration() {
    const { data, error } = await supabase
        .from('pending_posts')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) return;
    renderModeration(data);
    document.getElementById('moderationCount').innerText = data.length;
}

function renderModeration(pending) {
    const container = document.getElementById('moderationList');
    if (!container) return;
    if (!pending || pending.length === 0) { container.innerHTML = '<p>Нет постов на модерации</p>'; return; }
    
    container.innerHTML = pending.map(post => `
        <div class="moderation-item">
            <div><strong>${escapeHtml(post.title)}</strong><br><small>Автор: ${escapeHtml(post.author_name)}</small><br><small>${new Date(post.created_at).toLocaleString()}</small></div>
            <div><button class="approve" data-id="${post.id}">✅ Одобрить</button><button class="reject" data-id="${post.id}">❌ Отклонить</button></div>
        </div>
    `).join('');
    
    document.querySelectorAll('.approve').forEach(btn => {
        btn.addEventListener('click', async () => {
            const post = pending.find(p => p.id == btn.dataset.id);
            if (post) {
                await supabase.from('posts').insert([{
                    title: post.title,
                    content: post.content,
                    image_url: post.image_url,
                    author_id: post.author_id,
                    author_name: post.author_name
                }]);
                await supabase.from('pending_posts').delete().eq('id', post.id);
                loadModeration();
                loadPosts();
                showToast('Пост одобрен');
            }
        });
    });
    
    document.querySelectorAll('.reject').forEach(btn => {
        btn.addEventListener('click', async () => {
            await supabase.from('pending_posts').delete().eq('id', btn.dataset.id);
            loadModeration();
            showToast('Пост отклонён');
        });
    });
}

// === АДМИНКА: УПРАВЛЕНИЕ ПОСТАМИ ===
async function loadAdminPosts() {
    const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (!error) renderAdminPosts(data);
}

function renderAdminPosts(posts) {
    const container = document.getElementById('adminPostsList');
    if (!container) return;
    if (!posts || posts.length === 0) { container.innerHTML = '<p>Нет постов</p>'; return; }
    
    container.innerHTML = posts.map(post => `
        <div class="admin-post-item">
            <div><strong>${escapeHtml(post.title)}</strong><br><small>${new Date(post.created_at).toLocaleDateString()}</small><br><small>Автор: ${escapeHtml(post.author_name)}</small></div>
            <div><button class="edit-post-admin" data-id="${post.id}">Ред.</button><button class="delete-post-admin" data-id="${post.id}">Удалить</button></div>
        </div>
    `).join('');
    
    document.querySelectorAll('.edit-post-admin').forEach(btn => btn.addEventListener('click', () => openPostEditor(parseInt(btn.dataset.id))));
    document.querySelectorAll('.delete-post-admin').forEach(btn => btn.addEventListener('click', async () => {
        if (confirm('Удалить пост?')) {
            await supabase.from('posts').delete().eq('id', btn.dataset.id);
            await supabase.from('comments').delete().eq('post_id', btn.dataset.id);
            await supabase.from('likes').delete().eq('post_id', btn.dataset.id);
            loadAdminPosts();
            loadPosts();
            showToast('Пост удалён');
        }
    }));
}

function openPostEditor(id = null) {
    showToast('Редактирование пока в разработке');
}

// === ФОРМА НОВОГО ПОСТА (АДМИН) ===
document.getElementById('postForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('postTitle').value.trim();
    const content = document.getElementById('postContent').value.trim();
    let imageUrl = document.getElementById('postImageUrl').value.trim();
    const file = document.getElementById('postImageFile').files[0];
    
    if (!title || !content) { showToast('Заголовок и текст обязательны', true); return; }
    
    const save = async (url) => {
        const { error } = await supabase
            .from('posts')
            .insert([{
                title, content, image_url: url,
                author_id: currentUser?.id || 0,
                author_name: currentUser?.name || 'Админ'
            }]);
        
        if (!error) {
            closeModal(document.getElementById('postModal'));
            document.getElementById('postForm').reset();
            document.getElementById('imagePreview').innerHTML = '';
            loadPosts();
            if (isAdminMode) loadAdminPosts();
            showToast('Пост создан');
        } else {
            showToast('Ошибка создания', true);
        }
    };
    
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => save(ev.target.result);
        reader.readAsDataURL(file);
    } else {
        save(imageUrl);
    }
});

// === НАВИГАЦИЯ ===
function showLoginModal() { document.getElementById('loginModal').style.display = 'block'; }
function showRegisterModal() { document.getElementById('registerModal').style.display = 'block'; }

document.getElementById('welcomeLoginBtn').addEventListener('click', showLoginModal);
document.getElementById('welcomeRegisterBtn').addEventListener('click', showRegisterModal);
document.getElementById('switchToLogin').addEventListener('click', (e) => { e.preventDefault(); closeModal(document.getElementById('registerModal')); showLoginModal(); });
document.getElementById('switchToRegister').addEventListener('click', (e) => { e.preventDefault(); closeModal(document.getElementById('loginModal')); showRegisterModal(); });

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    if (!name || !phone || !password) { showToast('Заполните все поля', true); return; }
    if (await register(name, phone, password)) closeModal(document.getElementById('registerModal'));
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = document.getElementById('loginPhone').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    if (!phone || !password) { showToast('Введите телефон и пароль', true); return; }
    if (await login(phone, password)) closeModal(document.getElementById('loginModal'));
});

document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('openProposeBtn').addEventListener('click', () => { if (!currentUser) showLoginModal(); else document.getElementById('proposeModal').style.display = 'block'; });
document.getElementById('addPostBtn').addEventListener('click', () => openPostEditor());
document.getElementById('adminPanelBtn').addEventListener('click', async () => {
    const pwd = prompt('Введите пароль администратора:');
    if (pwd === ADMIN_PASSWORD) {
        isAdminMode = true;
        document.getElementById('adminBlock').style.display = 'block';
        await loadAdminPosts();
        await loadModeration();
        await loadPosts();
        showToast('Режим администрирования');
    } else showToast('Неверный пароль', true);
});

// === БУРГЕР ===
const burger = document.getElementById('burgerMenu');
const mobileNav = document.getElementById('mobileNav');
if (burger && mobileNav) {
    burger.addEventListener('click', () => { burger.classList.toggle('active'); mobileNav.classList.toggle('active'); });
    document.querySelectorAll('.mobile-nav a, .theme-btn-mobile').forEach(link => {
        link.addEventListener('click', () => { burger.classList.remove('active'); mobileNav.classList.remove('active'); });
    });
}

document.getElementById('mobileFeedLink').addEventListener('click', (e) => {
    e.preventDefault(); mobileNav.classList.remove('active'); document.getElementById('adminBlock').style.display = 'none'; loadPosts();
});

document.getElementById('mobileAdminLink').addEventListener('click', (e) => {
    e.preventDefault(); mobileNav.classList.remove('active');
    const pwd = prompt('Введите пароль администратора:');
    if (pwd === ADMIN_PASSWORD) {
        isAdminMode = true;
        document.getElementById('adminBlock').style.display = 'block';
        loadAdminPosts(); loadModeration(); loadPosts();
        showToast('Режим администрирования');
    } else showToast('Неверный пароль', true);
});

document.getElementById('mobileProposeLink').addEventListener('click', (e) => {
    e.preventDefault(); mobileNav.classList.remove('active');
    if (!currentUser) showLoginModal();
    else document.getElementById('proposeModal').style.display = 'block';
});

document.getElementById('mobileLogoutLink').addEventListener('click', (e) => {
    e.preventDefault(); mobileNav.classList.remove('active'); logout();
});

// === ТЁМНАЯ ТЕМА ===
document.getElementById('themeToggle').addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    localStorage.setItem('newsTheme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
});
document.getElementById('themeToggleMobile').addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    localStorage.setItem('newsTheme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
    mobileNav.classList.remove('active');
});
if (localStorage.getItem('newsTheme') === 'dark') document.body.classList.add('dark-theme');

// === МОДАЛКИ ===
document.querySelectorAll('.close, .close-comments, .close-login, .close-register, .close-propose').forEach(btn => {
    btn.onclick = () => {
        closeModal(document.getElementById('postModal'));
        closeModal(document.getElementById('commentsModal'));
        closeModal(document.getElementById('loginModal'));
        closeModal(document.getElementById('registerModal'));
        closeModal(document.getElementById('proposeModal'));
    };
});
window.onclick = (e) => { if (e.target.classList.contains('modal')) e.target.style.display = 'none'; };

// ИНИЦИАЛИЗАЦИЯ
const savedUser = localStorage.getItem('newsUser');
if (savedUser) currentUser = JSON.parse(savedUser);
updateUI();
loadPosts();
