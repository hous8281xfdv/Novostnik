// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===
let currentUser = null;
let currentCommentPostId = null;
let isAdminMode = false;

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

// === ЗАГРУЗКА ДАННЫХ С СЕРВЕРА ===
async function loadPosts() {
    const res = await fetch('/api/posts');
    const posts = await res.json();
    renderPosts(posts);
}

async function loadAdminPosts() {
    const res = await fetch('/api/posts');
    const posts = await res.json();
    renderAdminPosts(posts);
}

async function loadModeration() {
    const res = await fetch('/api/pending-posts');
    const pending = await res.json();
    renderModeration(pending);
    document.getElementById('moderationCount').innerText = pending.length;
}

// === ОТРИСОВКА ЛЕНТЫ ===
function renderPosts(posts) {
    const container = document.getElementById('postsFeed');
    if (!container) return;
    if (!posts || posts.length === 0) {
        container.innerHTML = '<div class="post-card" style="padding:20px; text-align:center;">Нет новостей. Админ ещё не добавил ни одного поста ✨</div>';
        return;
    }
    const sorted = [...posts].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    container.innerHTML = sorted.map(post => `
        <div class="post-card">
            <div class="post-header">
                <div class="post-avatar"><i class="fas fa-user"></i></div>
                <div class="post-author-info"><h3>${escapeHtml(post.author_name)}</h3><div class="post-date">${new Date(post.created_at).toLocaleString('ru-RU')}</div></div>
            </div>
            <div class="post-title"><strong>${escapeHtml(post.title)}</strong></div>
            <div class="post-content">${escapeHtml(post.content).replace(/\n/g, '<br>')}</div>
            ${post.image_url ? `<div class="post-image"><img src="${escapeHtml(post.image_url)}" alt="post"></div>` : ''}
            <div class="post-stats">
                <button class="like-btn" data-id="${post.id}"><i class="fas fa-heart"></i> <span class="like-count">${post.like_count || 0}</span></button>
                <button class="comment-btn" data-id="${post.id}"><i class="fas fa-comment"></i> ${post.comment_count || 0}</button>
            </div>
            ${isAdminMode ? `<div class="admin-buttons"><button class="edit-post" data-id="${post.id}">✏️ Редактировать</button><button class="delete-post" data-id="${post.id}">🗑️ Удалить</button></div>` : ''}
        </div>
    `).join('');

    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!currentUser) { showLoginModal(); return; }
            const res = await fetch('/api/toggle-like', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId: parseInt(btn.dataset.id), userId: currentUser.id })
            });
            if (res.ok) loadPosts();
        });
    });
    document.querySelectorAll('.comment-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!currentUser) { showLoginModal(); return; }
            openCommentsModal(parseInt(btn.dataset.id));
        });
    });
    if (isAdminMode) {
        document.querySelectorAll('.edit-post').forEach(btn => btn.addEventListener('click', () => openPostEditor(parseInt(btn.dataset.id))));
        document.querySelectorAll('.delete-post').forEach(btn => btn.addEventListener('click', async () => {
            if (confirm('Удалить пост?')) {
                await fetch('/api/delete-post', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ postId: parseInt(btn.dataset.id) })
                });
                loadPosts();
                loadAdminPosts();
                showToast('Пост удалён');
            }
        }));
    }
}

// === АДМИНКА ===
function renderAdminPosts(posts) {
    const container = document.getElementById('adminPostsList');
    if (!container) return;
    if (!posts || posts.length === 0) { container.innerHTML = '<p>Нет постов</p>'; return; }
    const sorted = [...posts].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    container.innerHTML = sorted.map(post => `
        <div class="admin-post-item">
            <div><strong>${escapeHtml(post.title)}</strong><br><small>${new Date(post.created_at).toLocaleDateString()}</small><br><small>Автор: ${escapeHtml(post.author_name)}</small></div>
            <div><button class="edit-post-admin" data-id="${post.id}">Ред.</button><button class="delete-post-admin" data-id="${post.id}">Удалить</button></div>
        </div>
    `).join('');
    document.querySelectorAll('.edit-post-admin').forEach(btn => btn.addEventListener('click', () => openPostEditor(parseInt(btn.dataset.id))));
    document.querySelectorAll('.delete-post-admin').forEach(btn => btn.addEventListener('click', async () => {
        if (confirm('Удалить пост?')) {
            await fetch('/api/delete-post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId: parseInt(btn.dataset.id) })
            });
            loadPosts();
            loadAdminPosts();
            showToast('Пост удалён');
        }
    }));
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
    document.querySelectorAll('.approve').forEach(btn => btn.addEventListener('click', async () => {
        await fetch('/api/approve-post', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postId: parseInt(btn.dataset.id) })
        });
        loadModeration();
        loadPosts();
        loadAdminPosts();
        showToast('Пост одобрен');
    }));
    document.querySelectorAll('.reject').forEach(btn => btn.addEventListener('click', async () => {
        await fetch('/api/reject-post', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postId: parseInt(btn.dataset.id) })
        });
        loadModeration();
        showToast('Пост отклонён');
    }));
}

// === КОММЕНТАРИИ ===
async function openCommentsModal(postId) {
    currentCommentPostId = postId;
    const res = await fetch(`/api/comments?postId=${postId}`);
    const comments = await res.json();
    const container = document.getElementById('commentsList');
    container.innerHTML = comments.map(c => `
        <div class="comment-item">
            <div class="comment-author">${escapeHtml(c.author_name)} <span style="font-size:0.7rem; color:#818c99;">${new Date(c.created_at).toLocaleString()}</span></div>
            <div class="comment-text">${escapeHtml(c.text)}</div>
            ${isAdminMode ? `<button class="delete-comment-admin" data-id="${c.id}" style="margin-top:8px; background:#c0392b; border:none; padding:4px 12px; border-radius:20px; color:white;">Удалить</button>` : ''}
        </div>
    `).join('');
    document.getElementById('commentsModal').style.display = 'block';
    if (isAdminMode) {
        document.querySelectorAll('.delete-comment-admin').forEach(btn => btn.addEventListener('click', async () => {
            await fetch('/api/delete-comment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ commentId: parseInt(btn.dataset.id) })
            });
            openCommentsModal(postId);
            showToast('Комментарий удалён');
        }));
    }
}

document.getElementById('submitCommentBtn').addEventListener('click', async () => {
    const text = document.getElementById('newCommentText').value;
    if (!text.trim()) return;
    const res = await fetch('/api/add-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: currentCommentPostId, userId: currentUser.id, text })
    });
    if (res.ok) {
        document.getElementById('newCommentText').value = '';
        openCommentsModal(currentCommentPostId);
        loadPosts();
    } else showToast('Ошибка при отправке', true);
});

// === ПОСТЫ (создание, редактирование) ===
function openPostEditor(id = null) {
    const modal = document.getElementById('postModal');
    document.getElementById('postForm').reset();
    document.getElementById('editPostId').value = '';
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('modalTitle').innerText = id ? 'Редактировать пост' : 'Создать пост';
    if (id) {
        // здесь можно подгрузить пост для редактирования
    }
    modal.style.display = 'block';
}

document.getElementById('postForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('postTitle').value.trim();
    const content = document.getElementById('postContent').value.trim();
    let imageUrl = document.getElementById('postImageUrl').value.trim();
    const file = document.getElementById('postImageFile').files[0];
    const editId = document.getElementById('editPostId').value;
    if (!title || !content) { showToast('Заголовок и текст обязательны', true); return; }
    const save = async (url) => {
        const res = await fetch('/api/add-post', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, content, imageUrl: url, authorId: currentUser.id, authorName: currentUser.name })
        });
        if (res.ok) {
            closeModal(document.getElementById('postModal'));
            loadPosts();
            if (isAdminMode) loadAdminPosts();
            showToast('Пост создан');
        } else showToast('Ошибка', true);
    };
    if (file) { const reader = new FileReader(); reader.onload = (ev) => save(ev.target.result); reader.readAsDataURL(file); }
    else save(imageUrl);
});

document.getElementById('proposeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) { showLoginModal(); return; }
    const title = document.getElementById('proposeTitle').value.trim();
    const content = document.getElementById('proposeContent').value.trim();
    let imageUrl = document.getElementById('proposeImageUrl').value.trim();
    const file = document.getElementById('proposeImageFile').files[0];
    if (!title || !content) { showToast('Заголовок и текст обязательны', true); return; }
    const send = async (url) => {
        const res = await fetch('/api/propose-post', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, content, imageUrl: url, authorId: currentUser.id, authorName: currentUser.name })
        });
        if (res.ok) {
            closeModal(document.getElementById('proposeModal'));
            document.getElementById('proposeForm').reset();
            document.getElementById('proposeImagePreview').innerHTML = '';
            showToast('Пост отправлен на модерацию');
        } else showToast('Ошибка', true);
    };
    if (file) { const reader = new FileReader(); reader.onload = (ev) => send(ev.target.result); reader.readAsDataURL(file); }
    else send(imageUrl);
});

// === РЕГИСТРАЦИЯ И ВХОД ===
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const firstName = document.getElementById('regFirstName').value.trim();
    const lastName = document.getElementById('regLastName').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: firstName + ' ' + lastName, phone, password })
    });
    if (res.ok) {
        const user = await res.json();
        currentUser = user;
        localStorage.setItem('newsUser', JSON.stringify(currentUser));
        updateUI();
        closeModal(document.getElementById('registerModal'));
        showToast('Регистрация успешна');
    } else showToast('Ошибка регистрации', true);
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = document.getElementById('loginPhone').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
    });
    if (res.ok) {
        const user = await res.json();
        currentUser = user;
        localStorage.setItem('newsUser', JSON.stringify(currentUser));
        updateUI();
        closeModal(document.getElementById('loginModal'));
        showToast('Вход выполнен');
    } else showToast('Неверный телефон или пароль', true);
});

function logout() {
    currentUser = null;
    localStorage.removeItem('newsUser');
    updateUI();
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

// === НАВИГАЦИЯ ===
document.getElementById('welcomeLoginBtn').addEventListener('click', () => document.getElementById('loginModal').style.display = 'block');
document.getElementById('welcomeRegisterBtn').addEventListener('click', () => document.getElementById('registerModal').style.display = 'block');
document.getElementById('switchToLogin').addEventListener('click', (e) => { e.preventDefault(); closeModal(document.getElementById('registerModal')); document.getElementById('loginModal').style.display = 'block'; });
document.getElementById('switchToRegister').addEventListener('click', (e) => { e.preventDefault(); closeModal(document.getElementById('loginModal')); document.getElementById('registerModal').style.display = 'block'; });
document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('openProposeBtn').addEventListener('click', () => { if (!currentUser) document.getElementById('loginModal').style.display = 'block'; else document.getElementById('proposeModal').style.display = 'block'; });
document.getElementById('addPostBtn').addEventListener('click', () => openPostEditor());
document.getElementById('adminPanelBtn').addEventListener('click', async () => {
    const pwd = prompt('Введите пароль администратора:');
    if (pwd === 'admin123') {
        isAdminMode = true;
        document.getElementById('adminBlock').style.display = 'block';
        await loadAdminPosts();
        await loadModeration();
        await loadPosts();
        showToast('Режим администрирования');
    } else showToast('Неверный пароль', true);
});

// Бургер-меню
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
    if (pwd === 'admin123') { isAdminMode = true; document.getElementById('adminBlock').style.display = 'block'; loadAdminPosts(); loadModeration(); loadPosts(); showToast('Режим администрирования'); }
    else showToast('Неверный пароль', true);
});
document.getElementById('mobileProposeLink').addEventListener('click', (e) => {
    e.preventDefault(); mobileNav.classList.remove('active');
    if (!currentUser) document.getElementById('loginModal').style.display = 'block';
    else document.getElementById('proposeModal').style.display = 'block';
});
document.getElementById('mobileLogoutLink').addEventListener('click', (e) => {
    e.preventDefault(); mobileNav.classList.remove('active'); logout();
});

// Тёмная тема
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

// Закрытие модалок
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
