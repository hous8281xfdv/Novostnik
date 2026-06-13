// === НАСТРОЙКИ ===
const ADMIN_PASSWORD = 'admin123';
let posts = []; // одобренные посты
let pendingPosts = []; // посты на модерации
let users = [];
let currentUser = null;
let currentCommentPostId = null;
let isAdminMode = false;

// === ЗАГРУЗКА ===
function loadData() {
    const savedPosts = localStorage.getItem('newsPosts');
    posts = savedPosts ? JSON.parse(savedPosts) : [];
    const savedPending = localStorage.getItem('newsPendingPosts');
    pendingPosts = savedPending ? JSON.parse(savedPending) : [];
    const savedUsers = localStorage.getItem('newsUsers');
    users = savedUsers ? JSON.parse(savedUsers) : [];
    const savedUser = localStorage.getItem('currentNewsUser');
    if (savedUser) currentUser = JSON.parse(savedUser);
    updateUI();
}
function savePosts() { localStorage.setItem('newsPosts', JSON.stringify(posts)); }
function savePending() { localStorage.setItem('newsPendingPosts', JSON.stringify(pendingPosts)); }
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
        firstName, lastName,
        name: firstName + ' ' + lastName,
        phone, password
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

// === ПОСТЫ (ЛЕНТА) ===
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
                <div class="post-avatar"><i class="fas fa-user"></i></div>
                <div class="post-author-info"><h3>${escapeHtml(post.authorName)}</h3><div class="post-date">${new Date(post.date).toLocaleString('ru-RU')}</div></div>
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
            toggleLike(parseInt(btn.dataset.id));
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

// === ПРЕДЛОЖЕНИЕ ПОСТА ===
function proposePost(title, content, imageUrl, authorId, authorName) {
    const newPost = {
        id: Date.now(),
        title, content, imageUrl,
        authorId, authorName,
        date: new Date().toISOString(),
        status: 'pending'
    };
    pendingPosts.push(newPost);
    savePending();
    showToast('Пост отправлен на модерацию!');
}

// === АДМИНКА ===
function renderAdminPosts() {
    const container = document.getElementById('adminPostsList');
    if (!container) return;
    if (posts.length === 0) { container.innerHTML = '<p>Нет постов</p>'; return; }
    const sorted = [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
    container.innerHTML = sorted.map(post => `
        <div class="admin-post-item">
            <div><strong>${escapeHtml(post.title)}</strong><br><small>${new Date(post.date).toLocaleDateString()}</small><br><small>Автор: ${escapeHtml(post.authorName)}</small></div>
            <div><button class="edit-post-admin" data-id="${post.id}">Ред.</button><button class="delete-post-admin" data-id="${post.id}">Удалить</button></div>
        </div>
    `).join('');
    document.querySelectorAll('.edit-post-admin').forEach(btn => btn.addEventListener('click', () => openPostEditor(parseInt(btn.dataset.id))));
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

function renderModeration() {
    const container = document.getElementById('moderationList');
    if (!container) return;
    if (pendingPosts.length === 0) { container.innerHTML = '<p>Нет постов на модерации</p>'; return; }
    container.innerHTML = pendingPosts.map(post => `
        <div class="moderation-item">
            <div><strong>${escapeHtml(post.title)}</strong><br><small>Ав
