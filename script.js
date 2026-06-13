// === НАСТРОЙКИ ===
const ADMIN_PASSWORD = 'admin123';
let posts = [];
let currentUser = null;

// Google Client ID (замени на свой, временно используем демо)
// Для реальной работы нужно создать проект в Google Cloud Console и получить Client ID
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

// Инициализация Google Login
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
        google.accounts.id.prompt();
    }
}

function handleGoogleCredentialResponse(response) {
    const payload = parseJwt(response.credential);
    currentUser = {
        name: payload.name,
        email: payload.email,
        avatar: payload.picture,
        sub: payload.sub
    };
    localStorage.setItem('blogUser', JSON.stringify(currentUser));
    updateUIForLoggedInUser();
    showToast(`Добро пожаловать, ${currentUser.name}!`);
}

function parseJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    return JSON.parse(jsonPayload);
}

function updateUIForLoggedInUser() {
    const userProfile = document.getElementById('userProfile');
    const googleLoginDiv = document.getElementById('google-login');
    if (currentUser) {
        userProfile.style.display = 'flex';
        googleLoginDiv.style.display = 'none';
        document.getElementById('userAvatar').src = currentUser.avatar;
        document.getElementById('userName').innerText = currentUser.name;
    } else {
        userProfile.style.display = 'none';
        googleLoginDiv.style.display = 'block';
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('blogUser');
    updateUIForLoggedInUser();
    showToast('Вы вышли из аккаунта');
}

// Загрузка данных
function loadData() {
    const savedPosts = localStorage.getItem('blogPosts');
    if (savedPosts) posts = JSON.parse(savedPosts);
    else posts = [];
    const savedUser = localStorage.getItem('blogUser');
    if (savedUser) currentUser = JSON.parse(savedUser);
    updateUIForLoggedInUser();
}

function savePosts() {
    localStorage.setItem('blogPosts', JSON.stringify(posts));
}

// Добавление/удаление лайка
function toggleLike(postId) {
    const post = posts.find(p => p.id == postId);
    if (!post) return;
    if (!currentUser) {
        showToast('Войдите через Google, чтобы ставить лайки!', true);
        return;
    }
    const userLikeIndex = post.likes.indexOf(currentUser.sub);
    if (userLikeIndex === -1) post.likes.push(currentUser.sub);
    else post.likes.splice(userLikeIndex, 1);
    savePosts();
    renderPosts();
}

// Добавление комментария
function addComment(postId, text) {
    if (!currentUser) {
        showToast('Войдите через Google, чтобы комментировать!', true);
        return false;
    }
    if (!text.trim()) return false;
    const post = posts.find(p => p.id == postId);
    if (!post) return false;
    post.comments.push({
        id: Date.now(),
        author: currentUser.name,
        authorEmail: currentUser.email,
        text: text.trim(),
        date: new Date().toISOString()
    });
    savePosts();
    renderPosts();
    return true;
}

// Удаление комментария (только для админа)
function deleteComment(postId, commentId, isAdmin) {
    if (!isAdmin) return;
    const post = posts.find(p => p.id == postId);
    if (post) {
        post.comments = post.comments.filter(c => c.id != commentId);
        savePosts();
        renderPosts();
        showToast('Комментарий удалён');
    }
}

// Рендер постов
function renderPosts() {
    const feed = document.getElementById('postsFeed');
    if (!feed) return;
    if (posts.length === 0) {
        feed.innerHTML = '<p style="text-align:center; padding:40px;">Нет постов. Добавьте первый пост через админ-панель ✨</p>';
        return;
    }
    const sorted = [...posts].sort((a,b) => new Date(b.date) - new Date(a.date));
    feed.innerHTML = sorted.map(post => `
        <div class="post-card" data-post-id="${post.id}">
            <div class="post-header">
                <h2 class="post-title">${escapeHtml(post.title)}</h2>
                <span class="post-date">${new Date(post.date).toLocaleString('ru-RU')}</span>
            </div>
            ${post.imageUrl ? `<div class="post-image"><img src="${escapeHtml(post.imageUrl)}" alt="post image"></div>` : ''}
            <div class="post-content">${escapeHtml(post.content).replace(/\n/g, '<br>')}</div>
            <div class="post-actions">
                <button class="like-btn ${post.likes.includes(currentUser?.sub) ? 'liked' : ''}" data-id="${post.id}">
                    <i class="fas fa-heart"></i> ${post.likes.length}
                </button>
                <button class="comment-btn" data-id="${post.id}">
                    <i class="fas fa-comment"></i> ${post.comments.length} комментариев
                </button>
            </div>
        </div>
    `).join('');
    
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', (e) => { e.stopPropagation(); toggleLike(btn.dataset.id); });
    });
    document.querySelectorAll('.comment-btn').forEach(btn => {
        btn.addEventListener('click', (e) => { e.stopPropagation(); openCommentsModal(btn.dataset.id); });
    });
}

// Админка: управление постами
let currentEditPostId = null;

function renderAdminPosts() {
    const container = document.getElementById('adminPostsList');
    if (!container) return;
    if (posts.length === 0) { container.innerHTML = '<p>Нет постов. Создайте первый!</p>'; return; }
    container.innerHTML = posts.map(post => `
        <div class="post-card" style="margin-bottom:15px;">
            <div class="post-header"><strong>${escapeHtml(post.title)}</strong><span>${new Date(post.date).toLocaleDateString()}</span></div>
            <div class="admin-post-buttons">
                <button class="edit-post" data-id="${post.id}">✏️ Редактировать</button>
                <button class="delete-post" data-id="${post.id}">🗑️ Удалить</button>
            </div>
        </div>
    `).join('');
    document.querySelectorAll('.edit-post').forEach(btn => btn.addEventListener('click', () => openPostEditor(btn.dataset.id)));
    document.querySelectorAll('.delete-post').forEach(btn => btn.addEventListener('click', () => { if(confirm('Удалить пост?')) { posts = posts.filter(p => p.id != btn.dataset.id); savePosts(); renderPosts(); renderAdminPosts(); renderAllComments(); showToast('Пост удалён'); } }));
}

function openPostEditor(postId = null) {
    currentEditPostId = postId;
    const modal = document.getElementById('postEditorModal');
    const title = document.getElementById('editorTitle');
    const form = document.getElementById('postForm');
    form.reset();
    document.getElementById('editPostId').value = '';
    document.getElementById('imagePreview').innerHTML = '';
    if (postId) {
        title.innerText = 'Редактировать пост';
        const post = posts.find(p => p.id == postId);
        if (post) {
            document.getElementById('postTitle').value = post.title;
            document.getElementById('postContent').value = post.content;
            document.getElementById('postImageUrl').value = post.imageUrl || '';
            if (post.imageUrl) document.getElementById('imagePreview').innerHTML = `<img src="${post.imageUrl}" alt="preview">`;
            document.getElementById('editPostId').value = postId;
        }
    } else {
        title.innerText = 'Создать пост';
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
    
    if (fileInput.files.length > 0) {
        const reader = new FileReader();
        reader.onload = function(ev) {
            imageUrl = ev.target.result;
            savePost(title, content, imageUrl, editId);
        };
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        savePost(title, content, imageUrl, editId);
    }
});

function savePost(title, content, imageUrl, editId) {
    if (!title || !content) { showToast('Заполните заголовок и текст', true); return; }
    if (editId) {
        const index = posts.findIndex(p => p.id == editId);
        if (index !== -1) {
            posts[index] = { ...posts[index], title, content, imageUrl, date: new Date().toISOString() };
        }
    } else {
        posts.push({
            id: Date.now(),
            title,
            content,
            imageUrl,
            date: new Date().toISOString(),
            likes: [],
            comments: []
        });
    }
    savePosts();
    renderPosts();
    renderAdminPosts();
    renderAllComments();
    closeModal(document.getElementById('postEditorModal'));
    showToast(editId ? 'Пост обновлён' : 'Пост создан');
}

// Комментарии модалка
let currentCommentPostId = null;

function openCommentsModal(postId) {
    currentCommentPostId = postId;
    const post = posts.find(p => p.id == postId);
    if (!post) return;
    const container = document.getElementById('commentsList');
    container.innerHTML = post.comments.map(c => `
        <div class="comment-item">
            <div class="comment-author">${escapeHtml(c.author)} <span class="comment-date">${new Date(c.date).toLocaleString()}</span></div>
            <div class="comment-text">${escapeHtml(c.text)}</div>
        </div>
    `).join('');
    document.getElementById('commentsModal').style.display = 'block';
}

document.getElementById('submitCommentBtn').addEventListener('click', () => {
    const text = document.getElementById('newCommentText').value;
    if (addComment(currentCommentPostId, text)) {
        document.getElementById('newCommentText').value = '';
        openCommentsModal(currentCommentPostId);
    }
});

// Админка: все комментарии
function renderAllComments() {
    const container = document.getElementById('allCommentsList');
    if (!container) return;
    let allComments = [];
    posts.forEach(post => {
        post.comments.forEach(c => {
            allComments.push({ ...c, postTitle: post.title, postId: post.id });
        });
    });
    if (allComments.length === 0) { container.innerHTML = '<p>Нет комментариев</p>'; return; }
    container.innerHTML = allComments.map(c => `
        <div class="comment-item">
            <strong>${escapeHtml(c.author)}</strong> к посту «${escapeHtml(c.postTitle)}»<br>
            ${escapeHtml(c.text)}<br>
            <small>${new Date(c.date).toLocaleString()}</small><br>
            <button class="delete-comment-admin" data-post="${c.postId}" data-comment="${c.id}" style="margin-top:8px; background:#c0392b; color:white; border:none; padding:4px 12px; border-radius:20px;">Удалить</button>
        </div>
    `).join('');
    document.querySelectorAll('.delete-comment-admin').forEach(btn => {
        btn.addEventListener('click', () => {
            if (confirm('Удалить комментарий?')) deleteComment(btn.dataset.post, btn.dataset.comment, true);
        });
    });
}

// Модалки и прочее
function openModal(modal) { if (modal) modal.style.display = 'block'; }
function closeModal(modal) { if (modal) modal.style.display = 'none'; }
function showToast(msg, isErr = false) {
    const toast = document.getElementById('toast');
    toast.innerText = msg;
    toast.style.background = isErr ? '#c0392b' : '#2d4a2d';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}
function escapeHtml(str) { return str ? str.replace(/[&<>]/g, (m) => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;') : ''; }

// Инициализация
document.getElementById('addPostBtn').addEventListener('click', () => openPostEditor());
document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('themeToggleMobile').addEventListener('click', () => { document.body.classList.toggle('dark-theme'); localStorage.setItem('blogTheme', document.body.classList.contains('dark-theme') ? 'dark' : 'light'); });
if (localStorage.getItem('blogTheme') === 'dark') document.body.classList.add('dark-theme');

// Админка
document.getElementById('adminTrigger').addEventListener('click', () => openModal(document.getElementById('adminModal')));
document.getElementById('mobileAdminLink').addEventListener('click', (e) => { e.preventDefault(); openModal(document.getElementById('adminModal')); document.getElementById('mobileNav').classList.remove('active'); });
document.getElementById('adminLoginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    if (document.getElementById('adminPassword').value === ADMIN_PASSWORD) {
        document.getElementById('adminLoginForm').style.display = 'none';
        document.getElementById('adminContent').style.display = 'block';
        renderAdminPosts();
        renderAllComments();
        showToast('Добро пожаловать в админ панель');
    } else showToast('Неверный пароль', true);
});
document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(tab.dataset.tab).classList.add('active');
    });
});

// Закрытие модалок
document.querySelectorAll('.close, .close-admin, .close-editor, .close-comments').forEach(btn => {
    btn.onclick = () => {
        closeModal(document.getElementById('adminModal'));
        closeModal(document.getElementById('postEditorModal'));
        closeModal(document.getElementById('commentsModal'));
    };
});
window.onclick = (e) => {
    if (e.target.classList.contains('modal')) e.target.style.display = 'none';
};

// Бургер
const burger = document.getElementById('burgerMenu');
const mobileNav = document.getElementById('mobileNav');
if (burger && mobileNav) {
    burger.addEventListener('click', () => { burger.classList.toggle('active'); mobileNav.classList.toggle('active'); });
    document.querySelectorAll('.mobile-link').forEach(link => { link.addEventListener('click', () => { burger.classList.remove('active'); mobileNav.classList.remove('active'); }); });
}

loadData();
renderPosts();
initGoogleLogin();
