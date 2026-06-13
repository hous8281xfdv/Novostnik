// === НАСТРОЙКИ ===
const ADMIN_PASSWORD = 'admin123';
let posts = [];
let users = [];
let currentUser = null;
let currentCommentPostId = null;
let isAdminMode = false;

// === ЗАГРУЗКА ===
function loadData() {
    const savedPosts = localStorage.getItem('newsPosts');
    posts = savedPosts ? JSON.parse(savedPosts) : [];
    const savedUsers = localStorage.getItem('newsUsers');
    users = savedUsers ? JSON.parse(savedUsers) : [];
    const savedUser = localStorage.getItem('currentNewsUser');
    if (savedUser) currentUser = JSON.parse(savedUser);
    updateUI();
}
function savePosts() { localStorage.setItem('newsPosts', JSON.stringify(posts)); }
function saveUsers() { localStorage.setItem('newsUsers', JSON.stringify(users)); }
function saveCurrentUser() {
    if (currentUser) localStorage.setItem('currentNewsUser', JSON.stringify(currentUser));
    else localStorage.removeItem('currentNewsUser');
}

// === UI ===
function updateUI() {
    const profile = document.getElementById('userProfile');
    const createCard = document.getElementById('createPostCard');
    const welcomeBlock = document.getElementById('welcomeBlock');
    const feedBlock = document.getElementById('feedBlock');
    
    if (currentUser) {
        profile.style.display = 'flex';
        document.getElementById('userName').innerText = currentUser.name.split(' ')[0];
        if (createCard) createCard.style.display = 'flex';
        if (welcomeBlock) welcomeBlock.style.display = 'none';
        if (feedBlock) feedBlock.style.display = 'block';
    } else {
        profile.style.display = 'none';
        if (createCard) createCard.style.display = 'none';
        if (welcomeBlock) welcomeBlock.style.display = 'flex';
        if (feedBlock) feedBlock.style.display = 'none';
        if (document.getElementById('adminBlock')) document.getElementById('adminBlock').style.display = 'none';
        isAdminMode = false;
    }
}

// === РЕГИСТРАЦИЯ / ВХОД ===
function register(firstName, lastName, phone, password) {
    if (users.find(u => u.phone === phone)) {
        showToast('Этот номер уже зарегистрирован', true);
        return false;
    }
    const newUser = {
        id: Date.now(),
        firstName: firstName,
        lastName: lastName,
        name: firstName + ' ' + lastName,
        phone: phone,
        password: password
    };
    users.push(newUser);
    saveUsers();
    currentUser = { phone: newUser.phone, name: newUser.name, id: newUser.id };
    saveCurrentUser();
    updateUI();
    renderPosts();
    showToast(`Добро пожаловать, ${newUser.name}!`);
    return true;
}

function login(phone, password) {
    const user = users.find(u => u.phone === phone);
    if (!user || user.password !== password) {
        showToast('Неверный номер или пароль', true);
        return false;
    }
    currentUser = { phone: user.phone, name: user.name, id: user.id };
    saveCurrentUser();
    updateUI();
    renderPosts();
    showToast(`С возвращением, ${user.name}!`);
    return true;
}

function logout() {
    currentUser = null;
    saveCurrentUser();
    updateUI();
    renderPosts();
    showToast('Вы вышли');
}

// === ПОСТЫ ===
function renderPosts() {
    const container = document.getElementById('postsFeed');
    if (!container) return;
    if (posts.length === 0) {
        container.innerHTML = '<div class="post-card" style="padding:20px; text-align:center;">Нет новостей. Админ ещё не добавил ни одного поста ✨</div>';
        return;
    }
    const sorted = [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
    container.innerHTML = sorted.map(post => `
        <div class="post-card">
            <div class="post-header">
                <div class="post-avatar"><i class="fas fa-user-edit"></i></div>
                <div class="post-author-info"><h3>Редакция Новостника</h3><div class="post-date">${new Date(post.date).toLocaleString('ru-RU')}</div></div>
            </div>
            <div class="post-title"><strong>${escapeHtml(post.title)}</strong></div>
            <div class="post-content">${escapeHtml(post.content).replace(/\n/g, '<br>')}</div>
            ${post.imageUrl ? `<div class="post-image"><img src="${escapeHtml(post.imageUrl)}" alt="post"></div>` : ''}
            <div class="post-stats">
                <button class="like-btn ${post.likes && post.likes.includes(currentUser?.id) ? 'liked' : ''}" data-id="${post.id}"><i class="fas fa-heart"></i> <span class="like-count">${post.likes ? post.likes.length : 0}</span></button>
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
    const idx = post.likes.indexOf(currentUser.id);
    if (idx === -1) post.likes.push(currentUser.id);
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
    post.comments.push({
        id: Date.now(),
        author: currentUser.name,
        text: text.trim(),
        date: new Date().toISOString()
    });
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
            <div><button class="edit-post-admin" data-id="${post.id}">Ред.</button><button class="delete-post-admin" data-id="${post.id}">Удалить</button></div>
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

// === ФОРМА ПОСТА ===
document.getElementById('postForm')?.addEventListener('submit', (e) => {
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

document.getElementById('submitCommentBtn')?.addEventListener('click', () => {
    const text = document.getElementById('newCommentText').value;
    if (addComment(currentCommentPostId, text)) {
        document.getElementById('newCommentText').value = '';
        openCommentsModal(currentCommentPostId);
    }
});

// === НАВИГАЦИЯ ===
document.getElementById('welcomeLoginBtn')?.addEventListener('click', () => showLoginModal());
document.getElementById('welcomeRegisterBtn')?.addEventListener('click', () => showRegisterModal());
document.getElementById('switchToLogin')?.addEventListener('click', (e) => {
    e.preventDefault();
    closeModal(document.getElementById('registerModal'));
    showLoginModal();
});
document.getElementById('switchToRegister')?.addEventListener('click', (e) => {
    e.preventDefault();
    closeModal(document.getElementById('loginModal'));
    showRegisterModal();
});

function showLoginModal() { document.getElementById('loginModal').style.display = 'block'; }
function showRegisterModal() { document.getElementById('registerModal').style.display = 'block'; }

document.getElementById('loginForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const phone = document.getElementById('loginPhone').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    if (login(phone, password)) closeModal(document.getElementById('loginModal'));
});
document.getElementById('registerForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const firstName = document.getElementById('regFirstName').value.trim();
    const lastName = document.getElementById('regLastName').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    if (!firstName || !lastName || !phone || !password) { showToast('Заполните все поля', true); return; }
    if (register(firstName, lastName, phone, password)) closeModal(document.getElementById('registerModal'));
});

document.getElementById('adminPanelBtn')?.addEventListener('click', () => {
    const pwd = prompt('Введите пароль администратора:');
    if (pwd === ADMIN_PASSWORD) {
        isAdminMode = true;
        document.getElementById('adminBlock').style.display = 'block';
        renderAdminPosts();
        renderPosts();
        showToast('Режим администрирования');
    } else showToast('Неверный пароль', true);
});
document.getElementById('mobileAdminLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('mobileNav')?.classList.remove('active');
    const pwd = prompt('Введите пароль администратора:');
    if (pwd === ADMIN_PASSWORD) {
        isAdminMode = true;
        document.getElementById('adminBlock').style.display = 'block';
        renderAdminPosts();
        renderPosts();
        showToast('Режим администрирования');
    } else showToast('Неверный пароль', true);
});
document.getElementById('mobileFeedLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('mobileNav')?.classList.remove('active');
    document.getElementById('adminBlock').style.display = 'none';
    renderPosts();
});
document.getElementById('mobileLogoutLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('mobileNav')?.classList.remove('active');
    logout();
});
document.getElementById('openEditorBtn')?.addEventListener('click', () => openPostEditor());
document.getElementById('addPostBtn')?.addEventListener('click', () => openPostEditor());
document.getElementById('logoutBtn')?.addEventListener('click', logout);

// Тёмная тема
document.getElementById('themeToggle')?.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    localStorage.setItem('newsTheme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
});
document.getElementById('themeToggleMobile')?.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    localStorage.setItem('newsTheme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
    document.getElementById('mobileNav')?.classList.remove('active');
});
if (localStorage.getItem('newsTheme') === 'dark') document.body.classList.add('dark-theme');

// Бургер
const burger = document.getElementById('burgerMenu');
const mobileNav = document.getElementById('mobileNav');
if (burger && mobileNav) {
    burger.addEventListener('click', () => { burger.classList.toggle('active'); mobileNav.classList.toggle('active'); });
    document.querySelectorAll('.mobile-nav a, .theme-btn-mobile').forEach(link => {
        link.addEventListener('click', () => { burger.classList.remove('active'); mobileNav.classList.remove('active'); });
    });
}

function closeModal(modal) { if (modal) modal.style.display = 'none'; }
document.querySelectorAll('.close, .close-comments, .close-login, .close-register').forEach(btn => {
    btn.onclick = () => {
        closeModal(document.getElementById('postModal'));
        closeModal(document.getElementById('commentsModal'));
        closeModal(document.getElementById('loginModal'));
        closeModal(document.getElementById('registerModal'));
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

function escapeHtml(str) { if (!str) return ''; return str.replace(/[&<>]/g, (m) => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;'); }

loadData();
renderPosts();
