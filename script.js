// === НАСТРОЙКИ ===
const ADMIN_PASSWORD = 'admin123';
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

let posts = [];
let currentUser = null;
let currentCommentPostId = null;
let isAdminMode = false;

// === GOOGLE LOGIN ===
function initGoogleLogin() {
    if (typeof google !== 'undefined') {
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleCredentialResponse,
        });
        google.accounts.id.renderButton(document.getElementById('google-login-modal'), { theme: 'outline', size: 'large' });
    }
}

function handleGoogleCredentialResponse(response) {
    const payload = JSON.parse(atob(response.credential.split('.')[1]));
    currentUser = {
        name: payload.name,
        email: payload.email,
        avatar: payload.picture,
        sub: payload.sub
    };
    localStorage.setItem('blogUser', JSON.stringify(currentUser));
    updateUI();
    closeModal(document.getElementById('loginModal'));
    showToast(`Добро пожаловать, ${currentUser.name}!`);
}

function showLoginModal() {
    document.getElementById('loginModal').style.display = 'block';
}

function logout() {
    currentUser = null;
    localStorage.removeItem('blogUser');
    updateUI();
    renderPosts();
    showToast('Вы вышли из аккаунта');
}

function updateUI() {
    const profile = document.getElementById('userProfile');
    const createCard = document.getElementById('createPostCard');
    if (currentUser) {
        profile.style.display = 'flex';
        document.getElementById('userAvatar').src = currentUser.avatar;
        document.getElementById('userName').innerText = currentUser.name;
        document.getElementById('adminAvatar').src = currentUser.avatar;
        if (createCard) createCard.style.display = 'flex';
    } else {
        profile.style.display = 'none';
        if (createCard) createCard.style.display = 'none';
    }
}

// === РАБОТА С ПОСТАМИ ===
function loadData() {
    const saved = localStorage.getItem('blogPostsV3');
    posts = saved ? JSON.parse(saved) : [];
    const savedUser = localStorage.getItem('blogUser');
    if (savedUser) currentUser = JSON.parse(savedUser);
    updateUI();
}

function savePosts() {
    localStorage.setItem('blogPostsV3', JSON.stringify(posts));
}

function renderPosts() {
    const container = document.getElementById('postsFeed');
    if (!container) return;
    if (posts.length === 0) {
        container.innerHTML = '<div class="post-card" style="padding:20px; text-align:center;">Нет постов. Создайте первый ✨</div>';
        return;
    }
    const sorted = [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
    container.innerHTML = sorted.map(post => `
        <div class="post-card">
            <div class="post-header">
                <div class="post-avatar"><i class="fas fa-user-edit"></i></div>
                <div class="post-author-info"><h3>Админ канала</h3><div class="post-date">${new Date(post.date).toLocaleString('ru-RU')}</div></div>
            </div>
            <div class="post-title"><strong>${escapeHtml(post.title)}</strong></div>
            <div class="post-content">${escapeHtml(post.content).replace(/\n/g, '<br>')}</div>
            ${post.imageUrl ? `<div class="post-image"><img src="${escapeHtml(post.imageUrl)}" alt="post"></div>` : ''}
            <div class="post-stats">
                <button class="like-btn ${post.likes && post.likes.includes(currentUser?.sub) ? 'liked' : ''}" data-id="${post.id}"><i class="fas fa-heart"></i> ${post.likes ? post.likes.length : 0}</button>
                <button class="comment-btn" data-id="${post.id}"><i class="fas fa-comment"></i> ${post.comments ? post.comments.length : 0}</button>
            </div>
            ${isAdminMode ? `<div class="admin-buttons"><button class="edit-post" data-id="${post.id}">✏️ Редактировать</button><button class="delete-post" data-id="${post.id}">🗑️ Удалить</button></div>` : ''}
        </div>
    `).join('');

    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!currentUser) { showLoginModal(); return; }
            toggleLike(btn.dataset.id);
        });
    });
    document.querySelectorAll('.comment-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!currentUser) { showLoginModal(); return; }
            openCommentsModal(btn.dataset.id);
        });
    });
    if (isAdminMode) {
        document.querySelectorAll('.edit-post').forEach(btn => btn.addEventListener('click', () => openPostEditor(btn.dataset.id)));
        document.querySelectorAll('.delete-post').forEach(btn => btn.addEventListener('click', () => {
            if (confirm('Удалить пост?')) {
                posts = posts.filter(p => p.id != btn.dataset.id);
                savePosts();
                renderPosts();
                renderAdminPosts();
                showToast('Пост удалён');
            }
        }));
    }
}

function toggleLike(postId) {
    const post = posts.find(p => p.id == postId);
    if (!post) return;
    if (!post.likes) post.likes = [];
    const idx = post.likes.indexOf(currentUser.sub);
    if (idx === -1) post.likes.push(currentUser.sub);
    else post.likes.splice(idx, 1);
    savePosts();
    renderPosts();
}

function addComment(postId, text) {
    if (!currentUser) { showLoginModal(); return false; }
    if (!text.trim()) return false;
    const post = posts.find(p => p.id == postId);
    if (!post) return false;
    if (!post.comments) post.comments = [];
    post.comments.push({ id: Date.now(), author: currentUser.name, text: text.trim(), date: new Date().toISOString() });
    savePosts();
    renderPosts();
    return true;
}

function deleteComment(postId, commentId) {
    const post = posts.find(p => p.id == postId);
    if (post && post.comments) {
        post.comments = post.comments.filter(c => c.id != commentId);
        savePosts();
        renderPosts();
        showToast('Комментарий удалён');
    }
}

// === АДМИНКА ===
function renderAdminPosts() {
    const container = document.getElementById('adminPostsList');
    if (!container) return;
    if (posts.length === 0) { container.innerHTML = '<p>Нет постов</p>'; return; }
    const sorted = [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
    container.innerHTML = sorted.map(post => `
        <div class="admin-post-item">
            <div><strong>${escapeHtml(post.title)}</strong><br><small>${new Date(post.date).toLocaleDateString()}</small></div>
            <div><button class="edit-post-admin" data-id="${post.id}" style="background:#ff7e33; border:none; padding:6px 12px; border-radius:20px; color:white; margin-right:8px;">Ред.</button><button class="delete-post-admin" data-id="${post.id}" style="background:#c0392b; border:none; padding:6px 12px; border-radius:20px; color:white;">Удалить</button></div>
        </div>
    `).join('');
    document.querySelectorAll('.edit-post-admin').forEach(btn => btn.addEventListener('click', () => openPostEditor(btn.dataset.id)));
    document.querySelectorAll('.delete-post-admin').forEach(btn => btn.addEventListener('click', () => {
        if (confirm('Удалить пост?')) {
            posts = posts.filter(p => p.id != btn.dataset.id);
            savePosts();
            renderPosts();
            renderAdminPosts();
            showToast('Пост удалён');
        }
    }));
}

function openPostEditor(id = null) {
    if (!currentUser) { showLoginModal(); return; }
    const modal = document.getElementById('postModal');
    document.getElementById('postForm').reset();
    document.getElementById('editPostId').value = '';
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('modalTitle').innerText = id ? 'Редактировать пост' : 'Создать пост';
    if (id) {
        const post = posts.find(p => p.id == id);
        if (post) {
            document.getElementById('postTitle').value = post.title;
            document.getElementById('postContent').value = post.content;
            document.getElementById('postImageUrl').value = post.imageUrl || '';
            if (post.imageUrl) document.getElementById('imagePreview').innerHTML = `<img src="${post.imageUrl}" alt="preview">`;
            document.getElementById('editPostId').value = id;
        }
    }
    modal.style.display = 'block';
}

document.getElementById('postForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('postTitle').value.trim();
    const content = document.getElementById('postContent').value.trim();
    let imageUrl = document.getElementById('postImageUrl').value.trim();
    const file = document.getElementById('postImageFile').files[0];
    const editId = document.getElementById('editPostId').value;
    if (!title || !content) { showToast('Заголовок и текст обязательны', true); return; }
    const save = (url) => {
        if (editId) {
            const idx = posts.findIndex(p => p.id == editId);
            if (idx !== -1) posts[idx] = { ...posts[idx], title, content, imageUrl: url, date: new Date().toISOString() };
        } else {
            posts.push({ id: Date.now(), title, content, imageUrl: url, date: new Date().toISOString(), likes: [], comments: [] });
        }
        savePosts();
        renderPosts();
        if (isAdminMode) renderAdminPosts();
        closeModal(document.getElementById('postModal'));
        showToast(editId ? 'Пост обновлён' : 'Пост создан');
    };
    if (file) { const reader = new FileReader(); reader.onload = (ev) => save(ev.target.result); reader.readAsDataURL(file); }
    else save(imageUrl);
});

// === КОММЕНТАРИИ ===
function openCommentsModal(postId) {
    currentCommentPostId = postId;
    const post = posts.find(p => p.id == postId);
    const container = document.getElementById('commentsList');
    if (!post) return;
    container.innerHTML = (post.comments || []).map(c => `
        <div class="comment-item">
            <div class="comment-author">${escapeHtml(c.author)} <span style="font-size:0.7rem; color:#818c99;">${new Date(c.date).toLocaleString()}</span></div>
            <div class="comment-text">${escapeHtml(c.text)}</div>
            ${isAdminMode ? `<button class="delete-comment-admin" data-post="${postId}" data-comment="${c.id}" style="margin-top:8px; background:#c0392b; border:none; padding:4px 12px; border-radius:20px; color:white;">Удалить</button>` : ''}
        </div>
    `).join('');
    document.getElementById('commentsModal').style.display = 'block';
    if (isAdminMode) {
        document.querySelectorAll('.delete-comment-admin').forEach(btn => btn.addEventListener('click', () => deleteComment(btn.dataset.post, btn.dataset.comment)));
    }
}

document.getElementById('submitCommentBtn').addEventListener('click', () => {
    const text = document.getElementById('newCommentText').value;
    if (addComment(currentCommentPostId, text)) {
        document.getElementById('newCommentText').value = '';
        openCommentsModal(currentCommentPostId);
    }
});

// === НАВИГАЦИЯ ===
document.getElementById('adminPanelBtn').addEventListener('click', () => {
    const pwd = prompt('Введите пароль администратора:');
    if (pwd === ADMIN_PASSWORD) {
        isAdminMode = true;
        document.getElementById('adminBlock').style.display = 'block';
        renderAdminPosts();
        renderPosts();
        showToast('Режим администрирования включён');
    } else showToast('Неверный пароль', true);
});

document.getElementById('mobileAdminLink').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('mobileNav').classList.remove('active');
    const pwd = prompt('Введите пароль администратора:');
    if (pwd === ADMIN_PASSWORD) {
        isAdminMode = true;
        document.getElementById('adminBlock').style.display = 'block';
        renderAdminPosts();
        renderPosts();
        showToast('Режим администрирования включён');
    } else showToast('Неверный пароль', true);
});

document.getElementById('mobileFeedLink').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('mobileNav').classList.remove('active');
    document.getElementById('adminBlock').style.display = 'none';
    renderPosts();
});

document.getElementById('mobileLoginLink').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('mobileNav').classList.remove('active');
    showLoginModal();
});

document.getElementById('openEditorBtn').addEventListener('click', () => {
    if (!currentUser) { showLoginModal(); return; }
    openPostEditor();
});
document.getElementById('addPostBtn').addEventListener('click', () => {
    if (!currentUser) { showLoginModal(); return; }
    openPostEditor();
});
document.getElementById('logoutBtn').addEventListener('click', logout);

// Тёмная тема
document.getElementById('themeToggle').addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    localStorage.setItem('blogTheme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
});
document.getElementById('themeToggleMobile').addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    localStorage.setItem('blogTheme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
    document.getElementById('mobileNav').classList.remove('active');
});
if (localStorage.getItem('blogTheme') === 'dark') document.body.classList.add('dark-theme');

// Бургер
const burger = document.getElementById('burgerMenu');
const mobileNav = document.getElementById('mobileNav');
if (burger && mobileNav) {
    burger.addEventListener('click', () => { burger.classList.toggle('active'); mobileNav.classList.toggle('active'); });
    document.querySelectorAll('.mobile-nav a, .theme-btn-mobile').forEach(link => {
        link.addEventListener('click', () => { burger.classList.remove('active'); mobileNav.classList.remove('active'); });
    });
}

// Закрытие модалок
function closeModal(modal) { if (modal) modal.style.display = 'none'; }
document.querySelectorAll('.close, .close-comments, .close-login').forEach(btn => {
    btn.onclick = () => {
        closeModal(document.getElementById('postModal'));
        closeModal(document.getElementById('commentsModal'));
        closeModal(document.getElementById('loginModal'));
    };
});
window.onclick = (e) => {
    if (e.target.classList.contains('modal')) e.target.style.display = 'none';
};

function showToast(msg, isErr = false) {
    const toast = document.getElementById('toast');
    toast.innerText = msg;
    toast.style.background = isErr ? '#c0392b' : '#2d4a2d';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function escapeHtml(str) { return str ? str.replace(/[&<>]/g, (m) => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;') : ''; }

loadData();
renderPosts();
initGoogleLogin();
