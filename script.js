// === НАСТРОЙКИ ===
const ADMIN_PASSWORD = 'admin123';
let posts = [];
let pendingPosts = [];
let users = [];
let currentUser = null;
let currentCommentPostId = null;
let isAdminMode = false;

// === ЗАГРУЗКА ДАННЫХ ===
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
function savePending() { localStorage.setItem('newsPendingPosts', JSON.stringify(pendingPosts)); updateModerationCount(); }
function saveUsers() { localStorage.setItem('newsUsers', JSON.stringify(users)); }
function saveCurrentUser() {
    if (currentUser) localStorage.setItem('currentNewsUser', JSON.stringify(currentUser));
    else localStorage.removeItem('currentNewsUser');
}
function updateModerationCount() {
    const countSpan = document.getElementById('moderationCount');
    if (countSpan) countSpan.innerText = pendingPosts.length;
}

// === UI ===
function updateUI() {
    const profile = document.getElementById('userProfile');
    const createCard = document.getElementById('createPostCard');
    const welcomeBlock = document.getElementById('welcomeBlock');
    const feedBlock = document.getElementById('feedBlock');
    if (currentUser) {
        if (profile) profile.style.display = 'flex';
        document.getElementById('userName').innerText = currentUser.name.split(' ')[0];
        if (createCard) createCard.style.display = 'flex';
        if (welcomeBlock) welcomeBlock.style.display = 'none';
        if (feedBlock) feedBlock.style.display = 'block';
    } else {
        if (profile) profile.style.display = 'none';
        if (createCard) createCard.style.display = 'none';
        if (welcomeBlock) welcomeBlock.style.display = 'flex';
        if (feedBlock) feedBlock.style.display = 'none';
        const adminBlock = document.getElementById('adminBlock');
        if (adminBlock) adminBlock.style.display = 'none';
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
    const lastComment = post.comments[post.comments.length - 1];
    if (lastComment && lastComment.author === currentUser.name && lastComment.text === text.trim()) {
        showToast('Вы уже отправили такой комментарий', true);
        return false;
    }
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
    pendingPosts.push({
        id: Date.now(),
        title, content, imageUrl,
        authorId, authorName,
        date: new Date().toISOString()
    });
    savePending();
    showToast('Пост отправлен на модерацию!');
}
function approvePost(postId) {
    const index = pendingPosts.findIndex(p => p.id == postId);
    if (index !== -1) {
        const post = pendingPosts[index];
        posts.push({
            id: post.id,
            title: post.title,
            content: post.content,
            imageUrl: post.imageUrl,
            authorId: post.authorId,
            authorName: post.authorName,
            date: post.date,
            likes: [],
            comments: []
        });
        pendingPosts.splice(index, 1);
        savePosts();
        savePending();
        renderPosts();
        renderAdminPosts();
        renderModeration();
        showToast('Пост одобрен и опубликован');
    }
}
function rejectPost(postId) {
    pendingPosts = pendingPosts.filter(p => p.id != postId);
    savePending();
    renderModeration();
    showToast('Пост отклонён');
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
            <div><strong>${escapeHtml(post.title)}</strong><br><small>Автор: ${escapeHtml(post.authorName)}</small><br><small>${new Date(post.date).toLocaleString()}</small></div>
            <div><button class="approve" data-id="${post.id}">✅ Одобрить</button><button class="reject" data-id="${post.id}">❌ Отклонить</button></div>
        </div>
    `).join('');
    document.querySelectorAll('.approve').forEach(btn => btn.addEventListener('click', () => approvePost(parseInt(btn.dataset.id))));
    document.querySelectorAll('.reject').forEach(btn => btn.addEventListener('click', () => rejectPost(parseInt(btn.dataset.id))));
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

// === ОБРАБОТЧИКИ ФОРМ ===
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
            posts.push({ id: Date.now(), title, content, imageUrl: url, date: new Date().toISOString(), authorId: currentUser?.id || 0, authorName: currentUser?.name || 'Админ', likes: [], comments: [] });
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
document.getElementById('proposeForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!currentUser) { showLoginModal(); return; }
    const title = document.getElementById('proposeTitle').value.trim();
    const content = document.getElementById('proposeContent').value.trim();
    let imageUrl = document.getElementById('proposeImageUrl').value.trim();
    const file = document.getElementById('proposeImageFile').files[0];
    if (!title || !content) { showToast('Заголовок и текст обязательны', true); return; }
    const send = (url) => {
        proposePost(title, content, url, currentUser.id, currentUser.name);
        closeModal(document.getElementById('proposeModal'));
        document.getElementById('proposeForm').reset();
        document.getElementById('proposeImagePreview').innerHTML = '';
    };
    if (file) { const reader = new FileReader(); reader.onload = (ev) => send(ev.target.result); reader.readAsDataURL(file); }
    else send(imageUrl);
});
document.getElementById('submitCommentBtn')?.addEventListener('click', () => {
    const text = document.getElementById('newCommentText').value;
    if (addComment(currentCommentPostId, text)) {
        document.getElementById('newCommentText').value = '';
        openCommentsModal(currentCommentPostId);
    }
});
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
        document.querySelectorAll('.delete-comment-admin').forEach(btn => btn.addEventListener('click', () => deleteComment(parseInt(btn.dataset.post), parseInt(btn.dataset.comment))));
    }
}

// === НАВИГАЦИЯ ===
function showLoginModal() { document.getElementById('loginModal').style.display = 'block'; }
function showRegisterModal() { document.getElementById('registerModal').style.display = 'block'; }
document.getElementById('welcomeLoginBtn')?.addEventListener('click', showLoginModal);
document.getElementById('welcomeRegisterBtn')?.addEventListener('click', showRegisterModal);
document.getElementById('switchToLogin')?.addEventListener('click', (e) => { e.preventDefault(); closeModal(document.getElementById('registerModal')); showLoginModal(); });
document.getElementById('switchToRegister')?.addEventListener('click', (e) => { e.preventDefault(); closeModal(document.getElementById('loginModal')); showRegisterModal(); });
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
document.getElementById('openProposeBtn')?.addEventListener('click', () => {
    if (!currentUser) { showLoginModal(); return; }
    document.getElementById('proposeModal').style.display = 'block';
});
document.getElementById('adminPanelBtn')?.addEventListener('click', () => {
    const pwd = prompt('Введите пароль администратора:');
    if (pwd === ADMIN_PASSWORD) {
        isAdminMode = true;
        document.getElementById('adminBlock').style.display = 'block';
        renderAdminPosts();
        renderModeration();
        renderPosts();
        showToast('Режим администрирования');
    } else showToast('Неверный пароль', true);
});
document.getElementById('addPostBtn')?.addEventListener('click', () => openPostEditor());
document.getElementById('logoutBtn')?.addEventListener('click', logout);
document.getElementById('mobileFeedLink')?.addEventListener('click', (e) => {
    e.preventDefault(); document.getElementById('mobileNav')?.classList.remove('active');
    document.getElementById('adminBlock').style.display = 'none';
    renderPosts();
});
document.getElementById('mobileAdminLink')?.addEventListener('click', (e) => {
    e.preventDefault(); document.getElementById('mobileNav')?.classList.remove('active');
    const pwd = prompt('Введите пароль администратора:');
    if (pwd === ADMIN_PASSWORD) {
        isAdminMode = true;
        document.getElementById('adminBlock').style.display = 'block';
        renderAdminPosts(); renderModeration(); renderPosts();
        showToast('Режим администрирования');
    } else showToast('Неверный пароль', true);
});
document.getElementById('mobileProposeLink')?.addEventListener('click', (e) => {
    e.preventDefault(); document.getElementById('mobileNav')?.classList.remove('active');
    if (!currentUser) showLoginModal();
    else document.getElementById('proposeModal').style.display = 'block';
});
document.getElementById('mobileLogoutLink')?.addEventListener('click', (e) => {
    e.preventDefault(); document.getElementById('mobileNav')?.classList.remove('active');
    logout();
});
document.getElementById('themeToggle')?.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    localStorage.setItem('newsTheme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
});
document.getElementById('themeToggleMobile')?.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    localStorage.setItem('newsTheme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
    document.getElementById('mobileNav')?.classList.remove('active');
});
document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(tab.dataset.tab).classList.add('active');
        if (tab.dataset.tab === 'moderationTab') renderModeration();
    });
});
const burger = document.getElementById('burgerMenu');
const mobileNav = document.getElementById('mobileNav');
if (burger && mobileNav) {
    burger.addEventListener('click', () => { burger.classList.toggle('active'); mobileNav.classList.toggle('active'); });
    document.querySelectorAll('.mobile-nav a, .theme-btn-mobile').forEach(link => {
        link.addEventListener('click', () => { burger.classList.remove('active'); mobileNav.classList.remove('active'); });
    });
}
function closeModal(modal) { if (modal) modal.style.display = 'none'; }
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
function showToast(msg, isErr = false) {
    const toast = document.getElementById('toast');
    toast.innerText = msg;
    toast.style.background = isErr ? '#c0392b' : '#2d4a2d';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}
function escapeHtml(str) { if (!str) return ''; return str.replace(/[&<>]/g, (m) => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;'); }
if (localStorage.getItem('newsTheme') === 'dark') document.body.classList.add('dark-theme');
loadData();
renderPosts();
