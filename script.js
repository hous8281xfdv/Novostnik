// === НАСТРОЙКИ ===
const ADMIN_PASSWORD = 'admin123';
let posts = [];
let currentUser = null;
let currentCommentPostId = null;
let isAdminMode = false;

// Google Client ID (замени на свой или оставь — кнопка будет, но логин не сработает до замены)
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

// Инициализация Google
function initGoogleLogin() {
    if (typeof google !== 'undefined') {
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleCredentialResponse,
        });
        google.accounts.id.renderButton(
            document.getElementById('google-login'),
            { theme: 'outline', size: 'medium' }
        );
    }
}
function handleGoogleCredentialResponse(response) {
    const payload = parseJwt(response.credential);
    currentUser = { name: payload.name, email: payload.email, avatar: payload.picture, sub: payload.sub };
    localStorage.setItem('blogUser', JSON.stringify(currentUser));
    updateUIForUser();
    showToast(`Добро пожаловать, ${currentUser.name}!`);
}
function parseJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    return JSON.parse(jsonPayload);
}
function updateUIForUser() {
    const userProfile = document.getElementById('userProfile');
    const googleLogin = document.getElementById('google-login');
    if (currentUser) {
        userProfile.style.display = 'flex';
        googleLogin.style.display = 'none';
        document.getElementById('userAvatar').src = currentUser.avatar;
        document.getElementById('userName').innerText = currentUser.name;
        document.getElementById('adminAvatar').src = currentUser.avatar;
    } else {
        userProfile.style.display = 'none';
        googleLogin.style.display = 'block';
    }
}
function logout() {
    currentUser = null;
    localStorage.removeItem('blogUser');
    updateUIForUser();
    renderPosts();
    showToast('Вы вышли');
}
// Загрузка данных
function loadData() {
    const saved = localStorage.getItem('blogPostsV2');
    posts = saved ? JSON.parse(saved) : [];
    const savedUser = localStorage.getItem('blogUser');
    if (savedUser) currentUser = JSON.parse(savedUser);
    updateUIForUser();
}
function savePosts() { localStorage.setItem('blogPostsV2', JSON.stringify(posts)); }
// Лайк
function toggleLike(postId) {
    const post = posts.find(p => p.id == postId);
    if (!post) return;
    if (!currentUser) { showToast('Войдите через Google', true); return; }
    const idx = post.likes.indexOf(currentUser.sub);
    if (idx === -1) post.likes.push(currentUser.sub);
    else post.likes.splice(idx, 1);
    savePosts();
    renderPosts();
}
// Комментарии
function addComment(postId, text) {
    if (!currentUser) { showToast('Войдите через Google', true); return false; }
    if (!text.trim()) return false;
    const post = posts.find(p => p.id == postId);
    if (!post) return false;
    post.comments.push({ id: Date.now(), author: currentUser.name, text: text.trim(), date: new Date().toISOString() });
    savePosts();
    renderPosts();
    return true;
}
function deleteComment(postId, commentId) {
    const post = posts.find(p => p.id == postId);
    if (post) { post.comments = post.comments.filter(c => c.id != commentId); savePosts(); renderPosts(); showToast('Комментарий удалён'); }
}
// Рендер ленты
function renderPosts() {
    const container = document.getElementById('postsFeed');
    if (!container) return;
    if (posts.length === 0) { container.innerHTML = '<div class="post-card" style="padding:20px; text-align:center;">Нет постов. Создайте первый ✨</div>'; return; }
    const sorted = [...posts].sort((a,b) => new Date(b.date) - new Date(a.date));
    container.innerHTML = sorted.map(post => `
        <div class="post-card">
            <div class="post-header">
                <div class="post-avatar"><i class="fas fa-user-edit"></i></div>
                <div class="post-author-info"><h3>Админ канала</h3><div class="post-date">${new Date(post.date).toLocaleString('ru-RU')}</div></div>
            </div>
            <div class="post-title" style="padding:0 16px;"><strong>${escapeHtml(post.title)}</strong></div>
            <div class="post-content">${escapeHtml(post.content).replace(/\n/g, '<br>')}</div>
            ${post.imageUrl ? `<div class="post-image"><img src="${escapeHtml(post.imageUrl)}" alt="post"></div>` : ''}
            <div class="post-stats">
                <button class="like-btn ${post.likes.includes(currentUser?.sub) ? 'liked' : ''}" data-id="${post.id}"><i class="fas fa-heart"></i> ${post.likes.length}</button>
                <button class="comment-btn" data-id="${post.id}"><i class="fas fa-comment"></i> ${post.comments.length}</button>
            </div>
            ${isAdminMode ? `<div class="admin-buttons"><button class="edit-post" data-id="${post.id}">✏️ Редактировать</button><button class="delete-post" data-id="${post.id}">🗑️ Удалить</button></div>` : ''}
        </div>
    `).join('');
    document.querySelectorAll('.like-btn').forEach(btn => btn.addEventListener('click', () => toggleLike(btn.dataset.id)));
    document.querySelectorAll('.comment-btn').forEach(btn => btn.addEventListener('click', () => openCommentsModal(btn.dataset.id)));
    if (isAdminMode) {
        document.querySelectorAll('.edit-post').forEach(btn => btn.addEventListener('click', () => openPostEditor(btn.dataset.id)));
        document.querySelectorAll('.delete-post').forEach(btn => btn.addEventListener('click', () => { if(confirm('Удалить пост?')) { posts = posts.filter(p => p.id != btn.dataset.id); savePosts(); renderPosts(); renderAdminPosts(); showToast('Пост удалён'); } }));
    }
}
// Админ-панель с постами
function renderAdminPosts() {
    const container = document.getElementById('adminPostsList');
    if (!container) return;
    if (posts.length === 0) { container.innerHTML = '<p>Нет постов</p>'; return; }
    const sorted = [...posts].sort((a,b) => new Date(b.date) - new Date(a.date));
    container.innerHTML = sorted.map(post => `
        <div class="admin-post-item">
            <div><strong>${escapeHtml(post.title)}</strong><br><small>${new Date(post.date).toLocaleDateString()}</small></div>
            <div><button class="edit-post-admin" data-id="${post.id}" style="background:#ff7e33; border:none; padding:6px 12px; border-radius:20px; color:white; margin-right:8px;">Редакт.</button><button class="delete-post-admin" data-id="${post.id}" style="background:#c0392b; border:none; padding:6px 12px; border-radius:20px; color:white;">Удалить</button></div>
        </div>
    `).join('');
    document.querySelectorAll('.edit-post-admin').forEach(btn => btn.addEventListener('click', () => openPostEditor(btn.dataset.id)));
    document.querySelectorAll('.delete-post-admin').forEach(btn => btn.addEventListener('click', () => { if(confirm('Удалить?')) { posts = posts.filter(p => p.id != btn.dataset.id); savePosts(); renderPosts(); renderAdminPosts(); showToast('Пост удалён'); } }));
}
// Редактор поста
let currentEditId = null;
function openPostEditor(id = null) {
    currentEditId = id;
    const modal = document.getElementById('postModal');
    const form = document.getElementById('postForm');
    form.reset();
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
    const fileInput = document.getElementById('postImageFile');
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
    if (fileInput.files.length > 0) {
        const reader = new FileReader();
        reader.onload = (ev) => save(ev.target.result);
        reader.readAsDataURL(fileInput.files[0]);
    } else save(imageUrl);
});
// Комментарии модалка
function openCommentsModal(postId) {
    currentCommentPostId = postId;
    const post = posts.find(p => p.id == postId);
    const container = document.getElementById('commentsList');
    if (!post) return;
    container.innerHTML = post.comments.map(c => `
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
// Навигация
document.getElementById('menuFeed').addEventListener('click', () => {
    isAdminMode = false;
    document.getElementById('feedBlock').style.display = 'block';
    document.getElementById('adminBlock').style.display = 'none';
    document.getElementById('createPostCard').style.display = currentUser ? 'flex' : 'none';
    document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
    document.getElementById('menuFeed').classList.add('active');
    renderPosts();
});
document.getElementById('menuAdmin').addEventListener('click', () => {
    const pwd = prompt('Введите пароль администратора:');
    if (pwd === ADMIN_PASSWORD) {
        isAdminMode = true;
        document.getElementById('feedBlock').style.display = 'block';
        document.getElementById('adminBlock').style.display = 'block';
        document.getElementById('createPostCard').style.display = 'flex';
        document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
        document.getElementById('menuAdmin').classList.add('active');
        renderPosts();
        renderAdminPosts();
        showToast('Режим администрирования');
    } else showToast('Неверный пароль', true);
});
document.getElementById('openEditorBtn').addEventListener('click', () => openPostEditor());
document.getElementById('addPostBtn').addEventListener('click', () => openPostEditor());
document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('themeToggle').addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    localStorage.setItem('blogTheme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
});
if (localStorage.getItem('blogTheme') === 'dark') document.body.classList.add('dark-theme');
// Модалки
function closeModal(modal) { if (modal) modal.style.display = 'none'; }
document.querySelectorAll('.close, .close-comments').forEach(btn => {
    btn.onclick = () => { closeModal(document.getElementById('postModal')); closeModal(document.getElementById('commentsModal')); };
});
window.onclick = (e) => { if (e.target.classList.contains('modal')) e.target.style.display = 'none'; };
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
