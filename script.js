const ADMIN_PASSWORD='admin123';
let posts=[],pending=[],users=[],currentUser=null,commentPostId=null,adminMode=false;
function save(){localStorage.setItem('posts',JSON.stringify(posts));localStorage.setItem('pending',JSON.stringify(pending));localStorage.setItem('users',JSON.stringify(users));if(currentUser)localStorage.setItem('user',JSON.stringify(currentUser));else localStorage.removeItem('user');}
function load(){posts=JSON.parse(localStorage.getItem('posts')||'[]');pending=JSON.parse(localStorage.getItem('pending')||'[]');users=JSON.parse(localStorage.getItem('users')||'[]');currentUser=JSON.parse(localStorage.getItem('user'));render();if(adminMode){renderAdmin();renderMod();}}
function toast(m,e){let t=document.getElementById('toast');t.innerText=m;t.style.background=e?'#c0392b':'#d97a2b';t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3000);}
function escape(s){return s?s.replace(/[&<>]/g,m=>m==='&'?'&amp;':m==='<'?'&lt;':'&gt;'):'';}
function updateUI(){let p=document.getElementById('userProfile'),w=document.getElementById('welcomeBlock'),f=document.getElementById('feedBlock'),a=document.getElementById('adminBlock');if(currentUser){if(p)p.style.display='flex';document.getElementById('userName').innerText=currentUser.name.split(' ')[0];w.style.display='none';f.style.display='block';}else{if(p)p.style.display='none';w.style.display='flex';f.style.display='none';a.style.display='none';adminMode=false;}}
function register(name,phone,pass){if(users.find(u=>u.phone===phone)){toast('Такой номер уже есть',1);return 0;}users.push({id:Date.now(),name,phone,password:pass});currentUser={id:Date.now(),name,phone};save();updateUI();render();toast(`Добро пожаловать, ${name}!`);return 1;}
function login(phone,pass){let u=users.find(u=>u.phone===phone&&u.password===pass);if(!u){toast('Неверно',1);return 0;}currentUser={id:u.id,name:u.name,phone:u.phone};save();updateUI();render();toast(`Привет, ${u.name}!`);return 1;}
function logout(){currentUser=null;save();updateUI();render();toast('Вы вышли');}
function render(){let c=document.getElementById('postsFeed');if(!c)return;if(posts.length===0){c.innerHTML='<div class="post-card" style="padding:20px;text-align:center">Нет новостей</div>';return;}let html='';posts.sort((a,b)=>new Date(b.date)-new Date(a.date)).forEach(p=>{html+=`
<div class="post-card">
<div class="post-header"><div class="post-avatar">👤</div><div><b>${escape(p.authorName)}</b><br><small>${new Date(p.date).toLocaleString()}</small></div></div>
<div class="post-title"><b>${escape(p.title)}</b></div>
<div class="post-content">${escape(p.content).replace(/\n/g,'<br>')}</div>
${p.imageUrl?`<div class="post-image"><img src="${escape(p.imageUrl)}"></div>`:''}
<div class="post-stats">
<button class="like-btn ${p.likes?.includes(currentUser?.id)?'liked':''}" data-id="${p.id}">❤️ ${p.likes?.length||0}</button>
<button class="comment-btn" data-id="${p.id}">💬 ${p.comments?.length||0}</button>
</div>
${adminMode?`<div style="padding:10px"><button class="edit-post" data-id="${p.id}">✏️</button> <button class="delete-post" data-id="${p.id}">🗑️</button></div>`:''}
</div>`;});
c.innerHTML=html;
document.querySelectorAll('.like-btn').forEach(b=>b.onclick=()=>{if(!currentUser){document.getElementById('loginModal').style.display='block';return;}toggleLike(+b.dataset.id);});
document.querySelectorAll('.comment-btn').forEach(b=>b.onclick=()=>{if(!currentUser){document.getElementById('loginModal').style.display='block';return;}openComments(+b.dataset.id);});
if(adminMode){document.querySelectorAll('.edit-post').forEach(b=>b.onclick=()=>openPostEditor(+b.dataset.id));
document.querySelectorAll('.delete-post').forEach(b=>b.onclick=()=>{if(confirm('Удалить?')){posts=posts.filter(x=>x.id!=b.dataset.id);save();render();renderAdmin();toast('Удалено');}});}}
function toggleLike(id){let p=posts.find(x=>x.id==id);if(!p)return;if(!p.likes)p.likes=[];let idx=p.likes.indexOf(currentUser.id);idx==-1?p.likes.push(currentUser.id):p.likes.splice(idx,1);save();render();}
function addComment(id,txt){if(!currentUser)return 0;let p=posts.find(x=>x.id==id);if(!p)return 0;if(!p.comments)p.comments=[];p.comments.push({id:Date.now(),author:currentUser.name,text:txt,date:new Date().toISOString()});save();render();return 1;}
function openComments(id){commentPostId=id;let p=posts.find(x=>x.id==id);let cdiv=document.getElementById('commentsList');if(!p)return;cdiv.innerHTML=(p.comments||[]).map(c=>`<div class="comment-item"><b>${escape(c.author)}</b> ${new Date(c.date).toLocaleString()}<br>${escape(c.text)}</div>`).join('');document.getElementById('commentsModal').style.display='block';}
function proposePost(title,content,img){pending.push({id:Date.now(),title,content,imageUrl:img,authorId:currentUser.id,authorName:currentUser.name,date:new Date().toISOString()});save();toast('Пост отправлен на модерацию');}
function approvePost(id){let pp=pending.find(x=>x.id==id);if(pp){posts.push({...pp,likes:[],comments:[]});pending=pending.filter(x=>x.id!=id);save();render();renderAdmin();renderMod();toast('Одобрено');}}
function rejectPost(id){pending=pending.filter(x=>x.id!=id);save();renderMod();toast('Отклонено');}
function renderAdmin(){let c=document.getElementById('adminPostsList');if(!c)return;if(posts.length===0){c.innerHTML='<p>Нет постов</p>';return;}c.innerHTML=posts.map(p=>`<div class="admin-post-item"><div><b>${escape(p.title)}</b><br>${escape(p.authorName)}<br>${new Date(p.date).toLocaleDateString()}</div><div><button class="edit-post-admin" data-id="${p.id}">Ред</button> <button class="delete-post-admin" data-id="${p.id}">Удл</button></div></div>`).join('');
document.querySelectorAll('.edit-post-admin').forEach(b=>b.onclick=()=>openPostEditor(+b.dataset.id));
document.querySelectorAll('.delete-post-admin').forEach(b=>b.onclick=()=>{if(confirm('Удалить?')){posts=posts.filter(x=>x.id!=b.dataset.id);save();render();renderAdmin();toast('Удалено');}});}
function renderMod(){let c=document.getElementById('moderationList');if(!c)return;if(pending.length===0){c.innerHTML='<p>Нет на модерации</p>';return;}c.innerHTML=pending.map(p=>`<div class="moderation-item"><div><b>${escape(p.title)}</b><br>${escape(p.authorName)}<br>${new Date(p.date).toLocaleString()}</div><div><button class="approve" data-id="${p.id}">✅</button> <button class="reject" data-id="${p.id}">❌</button></div></div>`).join('');
document.querySelectorAll('.approve').forEach(b=>b.onclick=()=>approvePost(+b.dataset.id));
document.querySelectorAll('.reject').forEach(b=>b.onclick=()=>rejectPost(+b.dataset.id));}
function openPostEditor(id=null){let m=document.getElementById('postModal');document.getElementById('postForm').reset();document.getElementById('editPostId').value='';document.getElementById('modalTitle').innerText=id?'Редактировать':'Создать пост';if(id){let p=posts.find(x=>x.id==id);if(p){document.getElementById('postTitle').value=p.title;document.getElementById('postContent').value=p.content;document.getElementById('postImageUrl').value=p.imageUrl||'';document.getElementById('editPostId').value=id;}}m.style.display='block';}
document.getElementById('postForm')?.addEventListener('submit',(e)=>{e.preventDefault();let t=document.getElementById('postTitle').value.trim(),c=document.getElementById('postContent').value.trim(),u=document.getElementById('postImageUrl').value.trim(),eid=document.getElementById('editPostId').value;if(!t||!c){toast('Заполните всё',1);return;}if(eid){let idx=posts.findIndex(x=>x.id==eid);if(idx!==-1)posts[idx]={...posts[idx],title:t,content:c,imageUrl:u,date:new Date().toISOString()};}else{posts.push({id:Date.now(),title:t,content:c,imageUrl:u,date:new Date().toISOString(),authorId:currentUser?.id||0,authorName:currentUser?.name||'Админ',likes:[],comments:[]});}save();render();if(adminMode)renderAdmin();closeModal(document.getElementById('postModal'));toast(eid?'Обновлён':'Создан');});
document.getElementById('proposeForm')?.addEventListener('submit',(e)=>{e.preventDefault();if(!currentUser){document.getElementById('loginModal').style.display='block';return;}let t=document.getElementById('proposeTitle').value.trim(),c=document.getElementById('proposeContent').value.trim(),u=document.getElementById('proposeImageUrl').value.trim();if(!t||!c){toast('Заполните заголовок и текст',1);return;}proposePost(t,c,u);closeModal(document.getElementById('proposeModal'));document.getElementById('proposeForm').reset();});
document.getElementById('submitCommentBtn')?.addEventListener('click',()=>{let txt=document.getElementById('newCommentText').value;if(addComment(commentPostId,txt)){document.getElementById('newCommentText').value='';openComments(commentPostId);}});
function closeModal(m){if(m)m.style.display='none';}
function showLogin(){document.getElementById('loginModal').style.display='block';}
function showRegister(){document.getElementById('registerModal').style.display='block';}
document.getElementById('welcomeLoginBtn')?.addEventListener('click',showLogin);
document.getElementById('welcomeRegisterBtn')?.addEventListener('click',showRegister);
document.getElementById('switchToLogin')?.addEventListener('click',(e)=>{e.preventDefault();closeModal(document.getElementById('registerModal'));showLogin();});
document.getElementById('switchToRegister')?.addEventListener('click',(e)=>{e.preventDefault();closeModal(document.getElementById('loginModal'));showRegister();});
document.getElementById('registerForm')?.addEventListener('submit',(e)=>{e.preventDefault();let n=document.getElementById('regName').value.trim(),p=document.getElementById('regPhone').value.trim(),pw=document.getElementById('regPassword').value.trim();if(register(n,p,pw))closeModal(document.getElementById('registerModal'));});
document.getElementById('loginForm')?.addEventListener('submit',(e)=>{e.preventDefault();let p=document.getElementById('loginPhone').value.trim(),pw=document.getElementById('loginPassword').value.trim();if(login(p,pw))closeModal(document.getElementById('loginModal'));});
document.getElementById('logoutBtn')?.addEventListener('click',logout);
document.getElementById('openProposeBtn')?.addEventListener('click',()=>{if(!currentUser)showLogin();else document.getElementById('proposeModal').style.display='block';});
document.getElementById('addPostBtn')?.addEventListener('click',()=>openPostEditor());
document.getElementById('adminPanelBtn')?.addEventListener('click',()=>{let p=prompt('Пароль админа:');if(p===ADMIN_PASSWORD){adminMode=true;document.getElementById('adminBlock').style.display='block';renderAdmin();renderMod();render();toast('Админ режим');}else toast('Неверный пароль',1);});
document.querySelectorAll('.close, .close-comments, .close-login, .close-register, .close-propose').forEach(b=>{b.onclick=()=>{closeModal(document.getElementById('postModal'));closeModal(document.getElementById('commentsModal'));closeModal(document.getElementById('loginModal'));closeModal(document.getElementById('registerModal'));closeModal(document.getElementById('proposeModal'));};});
window.onclick=(e)=>{if(e.target.classList.contains('modal'))e.target.style.display='none';};
let burger=document.getElementById('burgerMenu'),mobileNav=document.getElementById('mobileNav');
if(burger&&mobileNav){burger.addEventListener('click',()=>{burger.classList.toggle('active');mobileNav.classList.toggle('active');});document.querySelectorAll('.mobile-nav a, .theme-btn-mobile').forEach(link=>{link.addEventListener('click',()=>{burger.classList.remove('active');mobileNav.classList.remove('active');});});}
document.getElementById('mobileFeedLink')?.addEventListener('click',(e)=>{e.preventDefault();mobileNav.classList.remove('active');document.getElementById('adminBlock').style.display='none';render();});
document.getElementById('mobileAdminLink')?.addEventListener('click',(e)=>{e.preventDefault();mobileNav.classList.remove('active');let p=prompt('Пароль админа:');if(p===ADMIN_PASSWORD){adminMode=true;document.getElementById('adminBlock').style.display='block';renderAdmin();renderMod();render();toast('Админ режим');}else toast('Неверный пароль',1);});
document.getElementById('mobileProposeLink')?.addEventListener('click',(e)=>{e.preventDefault();mobileNav.classList.remove('active');if(!currentUser)showLogin();else document.getElementById('proposeModal').style.display='block';});
document.getElementById('mobileLogoutLink')?.addEventListener('click',(e)=>{e.preventDefault();mobileNav.classList.remove('active');logout();});
document.getElementById('themeToggle')?.addEventListener('click',()=>{document.body.classList.toggle('dark-theme');localStorage.setItem('theme',document.body.classList.contains('dark-theme')?'dark':'light');});
document.getElementById('themeToggleMobile')?.addEventListener('click',()=>{document.body.classList.toggle('dark-theme');localStorage.setItem('theme',document.body.classList.contains('dark-theme')?'dark':'light');mobileNav.classList.remove('active');});
if(localStorage.getItem('theme')==='dark')document.body.classList.add('dark-theme');
document.getElementById('adminTrigger')?.addEventListener('click',()=>document.getElementById('adminModal').style.display='block');
load();
