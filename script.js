const ADMIN_PASSWORD = 'admin123';
let posts = [];
let pendingPosts = [];
let users = [];
let currentUser = null;
let currentCommentPostId = null;
let isAdminMode = false;

function loadData() {
    posts = JSON.parse(localStorage.getItem('newsPosts') || '[]');
    pendingPosts = JSON.parse(localStorage.getItem('newsPending') || '[]');
    users = JSON.parse(localStorage.getItem('newsUsers') || '[]');
    currentUser = JSON.parse(localStorage.getItem('newsCurrentUser'));
    updateUI();
    renderPosts();
    if (isAdminMode) { renderAdminPosts(); renderModeration(); }
}
function saveAll() {
    localStorage.setItem('newsPosts', JSON.stringify(posts));
    localStorage.setItem('newsPending', JSON.stringify(pendingPosts));
    localStorage.setItem('newsUsers', JSON.stringify(users));
    if (currentUser) localStorage.setItem('newsCurrentUser', JSON.stringify(currentUser));
    else localStorage.removeItem('newsCurrentUser');
}
function showToast(msg, isErr = false) {
    const toast = document.getElementById('toast');
    toast.innerText = msg;
    toast.style.background = isErr ? '#c0392b' : '#d97a2b';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}
function escapeHtml(str) { return str ? str.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;') : ''; }
function updateUI() {
    const profile = document.getElementById('userProfile');
    const createCard = document.getElementById('createPostCard');
    const welcome = document.getElementById('welcomeBlock');
    const feed = document.getElementById('feedBlock');
    if (currentUser) {
        if (profile) profile.style.display = 'flex';
        document.getElementById('userName').innerText = currentUser.name.split(' ')[0];
        if (createCard) createCard.style.display = 'flex';
        welcome.style.display = 'none';
        feed.style.display = 'block';
    } else {
        if (profile) profile.style.display = 'none';
        if (createCard) createCard.style.display = 'none';
        welcome.style.display = 'flex';
        feed.style.display = 'none';
        document.getElementById('adminBlock').style.display = 'none';
        isAdminMode = false;
    }
}
function register(name, phone, password) {
    if (users.find(u => u.phone === phone)) { showToast('Такой номер уже зарегистрирован', true); return false; }
    users.push({ id: Date.now(), name, phone, password });
    currentUser = { id: Date.now(), name, phone };
    saveAll();
    updateUI();
    renderPosts();
    showToast(`Добро пожаловать, ${name}!`);
    return true;
}
function login(phone, password) {
    const user = users.find(u => u.phone === phone && u.password === password);
    if (!user) { showToast('Неверный телефон или пароль', true); return false; }
    currentUser = { id: user.id, name: user.name, phone: user.phone };
    saveAll();
    updateUI();
    renderPosts();
    showToast(`С возвращением, ${user.name}!`);
    return true;
}
function logout() { currentUser = null; saveAll(); updateUI(); renderPosts(); showToast('Вы вышли'); }
function renderPosts() {
    const container = document.getElementById('postsFeed');
    if (!container) return;
    if (posts.length === 0) { container.innerHTML = '<div class="post-card" style="padding:20px; text-align:center;">Нет новостей</div>'; return; }
    const sorted = [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
    container.innerHTML = sorted.map(post => `
        <div class="post-card">
            <div class="post-header">
                <div class="post-avatar">👤</div>
                <div><b>${escapeHtml(post.authorName)}</b><br><small>${new Date(post.date).toLocaleString()}</small></div>
            </div>
            <div class="post-title"><b>${escapeHtml(post.title)}</b></div>
            <div class="post-content">${escapeHtml(post.content).replace(/\n/g, '<br>')}</div>
            ${post.imageUrl ? `<div class="post-image"><img src="${escapeHtml(post.imageUrl)}"></div>` : ''}
            <div class="post-stats">
                <button class="like-btn ${post.likes?.includes(currentUser?.id) ? 'liked' : ''}" data-id="${post.id}">❤️ ${post.likes?.length || 0}</button>
                <button class="comment-btn" data-id="${post.id}">💬 ${post.comments?.length || 0}</button>
            </div>
            ${isAdminMode ? `<div class="admin-buttons"><button class="edit-post" data-id="${post.id}">✏️</button><button class="delete-post" data-id="${post.id}">🗑️</button></div>` : ''}
        </div>
    `).join('');
    document.querySelectorAll('.like-btn').forEach(btn => btn.onclick = () => { if (!currentUser) showLoginModal(); else toggleLike(+btn.dataset.id); });
    document.querySelectorAll('.comment-btn').forEach(btn => btn.onclick = () => { if (!currentUser) showLoginModal(); else openCommentsModal(+btn.dataset.id); });
    if (isAdminMode) {
        document.querySelectorAll('.edit-post').forEach(btn => btn.onclick = () => openPostEditor(+btn.dataset.id));
        document.querySelectorAll('.delete-post').forEach(btn => btn.onclick = () => { if (confirm('Удалить?')) { posts = posts.filter(p => p.id != btn.dataset.id); saveAll(); renderPosts(); renderAdminPosts(); showToast('Пост удалён'); } });
    }
}
function toggleLike(postId) {
    const post = posts.find(p => p.id == postId);
    if (!post) return;
    if (!post.likes) post.likes = [];
    const idx = post.likes.indexOf(currentUser.id);
    idx === -1 ? post.likes.push(currentUser.id) : post.likes.splice(idx, 1);
    saveAll();
    renderPosts();
}
function addComment(postId, text) {
    if (!currentUser) return false;
    const post = posts.find(p => p.id == postId);
    if (!post) return false;
    if (!post.comments) post.comments = [];
    post.comments.push({ id: Date.now(), author: currentUser.name, text, date: new Date().toISOString() });
    saveAll();
    renderPosts();
    return true;
}
function openCommentsModal(postId) {
    currentCommentPostId = postId;
    const post = posts.find(p => p.id == postId);
    const container = document.getElementById('commentsList');
    if (!post) return;
    container.innerHTML = (post.comments || []).map(c => `<div class="comment-item"><b>${escapeHtml(c.author)}</b> ${new Date(c.date).toLocaleString()}<br>${escapeHtml(c.text)}</div>`).join('');
    document.getElementById('commentsModal').style.display = 'block';
}
function proposePost(title, content, imageUrl) {
    pendingPosts.push({ id: Date.now(), title, content, imageUrl, authorId: currentUser.id, authorName: currentUser.name, date: new Date().toISOString() });
    saveAll();
    showToast('Пост отправлен на модерацию');
}
function approvePost(postId) {
    const post = pendingPosts.find(p => p.id == postId);
    if (post) {
        posts.push({ ...post, likes: [], comments: [] });
        pendingPosts = pendingPosts.filter(p => p.id != postId);
        saveAll();
        renderPosts(); renderAdminPosts(); renderModeration();
        showToast('Пост одобрен');
    }
}
function rejectPost(postId) {
    pendingPosts = pendingPosts.filter(p => p.id != postId);
    saveAll();
    renderModeration();
    showToast('Пост отклонён');
}
function renderAdminPosts() {
    const container = document.getElementById('adminPostsList');
    if (!container) return;
    if (posts.length === 0) { container.innerHTML = '<p>Нет постов</p>'; return; }
    container.innerHTML = posts.map(post => `
        <div class="admin-post-item">
            <div><b>${escapeHtml(post.title)}</b><br><small>${new Date(post.date).toLocaleDateString()}</small><br>${escapeHtml(post.authorName)}</div>
            <div><button class="edit-post-admin" data-id="${post.id}">Ред.</button><button class="delete-post-admin" data-id="${post.id}">Удалить</button></div>
        </div>
    `).join('');
    document.querySelectorAll('.edit-post-admin').forEach(btn => btn.onclick = () => openPostEditor(+btn.dataset.id));
    document.querySelectorAll('.delete-post-admin').forEach(btn => btn.onclick = () => { if (confirm('Удалить?')) { posts = posts.filter(p => p.id != btn.dataset.id); saveAll(); renderPosts(); renderAdminPosts(); showToast('Пост удалён'); } });
}
function renderModeration() {
    const container = document.getElementById('moderationList');
    if (!container) return;
    if (pendingPosts.length === 0) { container.innerHTML = '<p>Нет постов на модерации</p>'; return; }
    container.innerHTML = pendingPosts.map(post => `
        <div class="moderation-item">
            <div><b>${escapeHtml(post.title)}</b><br><small>${escapeHtml(post.authorName)}</small><br>${new Date(post.date).toLocaleString()}</div>
            <div><button class="approve" data-id="${post.id}">✅</button><button class="reject" data-id="${post.id}">❌</button></div>
        </div>
    `).join('');
    document.querySelectorAll('.approve').forEach(btn => btn.onclick = () => approvePost(+btn.dataset.id));
    document.querySelectorAll('.reject').forEach(btn => btn.onclick = () => rejectPost(+btn.dataset.id));
    document.getElementById('moderationCount').innerText = pendingPosts.length;
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
            if (post.imageUrl) document.getElementById('imagePreview').innerHTML = `<img src="${post.imageUrl}" style="max-width:100%">`;
            document.getElementById('editPostId').value = id;
        }
    }
    modal.style.display = 'block';
}
document.getElementById('postForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('postTitle').value.trim();
    const content = document.getElementById('postContent').value.trim();
    let imageUrl = document.getElementById('postImageUrl').value.trim();
    const file = document.getElementById('postImageFile').files[0];
    const editId = document.getElementById('editPostId').value;
    const save = (url) => {
        if (editId) {
            const idx = posts.findIndex(p => p.id == editId);
            if (idx !== -1) posts[idx] = { ...posts[idx], title, content, imageUrl: url, date: new Date().toISOString() };
        } else {
            posts.push({ id: Date.now(), title, content, imageUrl: url, date: new Date().toISOString(), authorId: currentUser?.id || 0, authorName: currentUser?.name || 'Админ', likes: [], comments: [] });
        }
        saveAll(); renderPosts(); if (isAdminMode) renderAdminPosts();
        closeModal(document.getElementById('postModal'));
        showToast(editId ? 'Пост обновлён' : 'Пост создан');
    };
    if (file) { const reader = new FileReader(); reader.onload = ev => save(ev.target.result); reader.readAsDataURL(file); }
    else save(imageUrl);
});
document.getElementById('proposeForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!currentUser) { showLoginModal(); return; }
    const title = document.getElementById('proposeTitle').value.trim();
    const content = document.getElementById('proposeContent').value.trim();
    let imageUrl = document.getElementById('proposeImageUrl').value.trim();
    const file = document.getElementById('proposeImageFile').files[0];
    const send = (url) => { proposePost(title, content, url); closeModal(document.getElementById('proposeModal')); document.getElementById('proposeForm').reset(); };
    if (file) { const reader = new FileReader(); reader.onload = ev => send(ev.target.result); reader.readAsDataURL(file); }
    else send(imageUrl);
});
document.getElementById('submitCommentBtn')?.addEventListener('click', () => {
    const text = document.getElementById('newCommentText').value;
    if (addComment(currentCommentPostId, text)) {
        document.getElementById('newCommentText').value = '';
        openCommentsModal(currentCommentPostId);
    }
});
function showLoginModal() { document.getElementById('loginModal').style.display = 'block'; }
function showRegisterModal() { document.getElementById('registerModal').style.display = 'block'; }
document.getElementById('welcomeLoginBtn')?.addEventListener('click', showLoginModal);
document.getElementById('welcomeRegisterBtn')?.addEventListener('click', showRegisterModal);
document.getElementById('switchToLogin')?.addEventListener('click', (e) => { e.preventDefault(); closeModal(document.getElementById('registerModal')); showLoginModal(); });
document.getElementById('switchToRegister')?.addEventListener('click', (e) => { e.preventDefault(); closeModal(document.getElementById('loginModal')); showRegisterModal(); });
document.getElementById('registerForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    if (register(name, phone, password)) closeModal(document.getElementById('registerModal'));
});
document.getElementById('loginForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const phone = document.getElementById('loginPhone').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    if (login(phone, password)) closeModal(document.getElementById('loginModal'));
});
document.getElementById('logoutBtn')?.addEventListener('click', logout);
document.getElementById('openProposeBtn')?.addEventListener('click', () => { if (!currentUser) showLoginModal(); else document.getElementById('proposeModal').style.display = 'block'; });
document.getElementById('addPostBtn')?.addEventListener('click', () => openPostEditor());
document.getElementById('adminPanelBtn')?.addEventListener('click', () => {
    const pwd = prompt('Пароль админа:');
    if (pwd === ADMIN_PASSWORD) {
        isAdminMode = true;
        document.getElementById('adminBlock').style.display = 'block';
        renderAdminPosts(); renderModeration(); renderPosts();
        showToast('Режим администрирования');
    } else showToast('Неверный пароль', true);
});
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
document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(tab.dataset.tab).classList.add('active');
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
document.getElementById('mobileFeedLink')?.addEventListener('click', (e) => {
    e.preventDefault(); mobileNav.classList.remove('active'); document.getElementById('adminBlock').style.display = 'none'; renderPosts();
});
document.getElementById('mobileAdminLink')?.addEventListener('click', (e) => {
    e.preventDefault(); mobileNav.classList.remove('active');
    const pwd = prompt('Пароль админа:');
    if (pwd === ADMIN_PASSWORD) {
        isAdminMode = true;
        document.getElementById('adminBlock').style.display = 'block';
        renderAdminPosts(); renderModeration(); renderPosts();
        showToast('Режим администрирования');
    } else showToast('Неверный пароль', true);
});
document.getElementById('mobileProposeLink')?.addEventListener('click', (e) => {
    e.preventDefault(); mobileNav.classList.remove('active');
    if (!currentUser) showLoginModal(); else document.getElementById('proposeModal').style.display = 'block';
});
document.getElementById('mobileLogoutLink')?.addEventListener('click', (e) => {
    e.preventDefault(); mobileNav.classList.remove('active'); logout();
});
document.getElementById('themeToggle')?.addEventListener('click', () => { document.body.classList.toggle('dark-theme'); localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light'); });
document.getElementById('themeToggleMobile')?.addEventListener('click', () => { document.body.classList.toggle('dark-theme'); localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light'); mobileNav.classList.remove('active'); });
if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-theme');
document.getElementById('adminTrigger')?.addEventListener('click', () => document.getElementById('adminModal').style.display = 'block');
loadData();
