import{initializeApp}from'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import{getAuth,onAuthStateChanged,signInWithEmailAndPassword,createUserWithEmailAndPassword,signOut}from'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import{getFirestore,doc,collection,query,where,orderBy,limit,onSnapshot,getDoc,getDocs,setDoc,deleteField,writeBatch}from'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

/* PEGA AQUÍ la config de tu proyecto de Firebase y el correo del bibliotecario. */
const firebaseConfig={apiKey:'AIzaSyADaFgt6OflrMmELMphMN6sNJsXO7AZkfU',authDomain:'biblioteca-jfr.firebaseapp.com',projectId:'biblioteca-jfr',appId:'1:738180478721:web:7ec803f11d769a3dfacd00'};
const ADMIN_EMAIL='biblioteca.restrepista@ctjfr.edu.co'; // el mismo que está en firestore.rules

const $=s=>document.querySelector(s);
if(!firebaseConfig.apiKey){$('#app').innerHTML='<section class="box"><h2>La biblioteca está casi lista</h2><p>Falta conectar este sitio con el proyecto de Firebase.</p><div class="note">Pega el <b>firebaseConfig</b> de tu app web en <b>app.js</b> y cambia también <b>ADMIN_EMAIL</b> por el correo del bibliotecario. Después publica las reglas que vienen fuera del sitio.</div></section>';throw new Error('Falta firebaseConfig')}
const app=initializeApp(firebaseConfig),db=getFirestore(app),auth=getAuth(app),CAT=doc(db,'catalog','books');
let D={books:[],state:{},res:[],loans:[],hist:[],me:null},S={me:null,v:'cat',q:'',f:'all',tab:'books',ready:0},subs=[],busy=0;

const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const iso=d=>new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);
const today=()=>iso(new Date());
const plus=n=>{const d=new Date();d.setDate(d.getDate()+n);return iso(d)};
const fmt=d=>d?new Date(d+'T00:00').toLocaleDateString('es-CO',{day:'numeric',month:'short'}):'';
const e=s=>String(s??'').replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const nz=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const nt=s=>s.replace(/\W/g,'').toLowerCase();
const em=t=>nt(t)+'@jfr.example.com';
const V=(f,n)=>f.elements[n].value.trim();
const bk=id=>D.books.find(b=>b.id==id);
const toast=m=>{const t=document.createElement('div');t.className='toast';t.textContent=m;document.body.append(t);setTimeout(()=>t.remove(),3000)};
const ERR={'auth/invalid-credential':'Tarjeta, correo o contraseña incorrectos','auth/user-not-found':'Tarjeta, correo o contraseña incorrectos','auth/wrong-password':'Tarjeta, correo o contraseña incorrectos','auth/invalid-email':'El correo del bibliotecario no es válido','auth/email-already-in-use':'Esa tarjeta ya tiene cuenta','auth/weak-password':'La contraseña debe tener mínimo 6 caracteres','auth/too-many-requests':'Hay muchos intentos. Espera un momento y vuelve a probar','auth/network-request-failed':'No hay conexión. Revisa internet e inténtalo otra vez','permission-denied':'No se pudo: el libro ya no está disponible o no tienes permiso'};
const errMsg=x=>x.code?ERR[x.code]||'Error: '+x.code:x.message;
const act=(ok,fn)=>async(...a)=>{try{await fn(...a);ok&&toast(ok)}catch(x){toast(errMsg(x))}};
const tbl=(h,rows,empty)=>`<div class="scroll"><table><tr>${h.map(x=>`<th>${x}</th>`).join('')}</tr>${rows.join('')||`<tr><td colspan="${h.length}">${empty}</td></tr>`}</table></div>`;
const who=(n,c,ti)=>`${e(n||'Sin cuenta')}${c?', curso '+e(c):''}<br><small>TI ${e(ti)}</small>`;

function st(b){const s=D.state[b.id];
 if(!s)return{c:'ok',t:'Disponible',d:'Puedes reservarlo'};
 if(s.estado=='prestado')return{c:'no',t:'Prestado',d:'Regresa el '+fmt(s.vence)};
 return{c:'wa',t:'Reservado',d:s.resUid==S.me?.uid?'Lo reservaste tú: pasa a recogerlo':'Pendiente de recoger'} }

/* ---------- datos en tiempo real ---------- */
const live=()=>{if(!S.ready)return;if(S.v=='cat')return grid();if(!/INPUT|SELECT/.test(document.activeElement?.tagName))r()};
const rows=s=>s.docs.map(d=>({id:d.id,...d.data()}));
onSnapshot(CAT,s=>{D.books=Object.entries(s.data()?.b||{}).map(([id,v])=>({id,titulo:v.t,autor:v.a,editorial:v.e||''}));live()});
onSnapshot(collection(db,'state'),s=>{D.state={};s.forEach(d=>D.state[d.id]=d.data());live()});
async function init(u){
 subs.forEach(f=>f());subs=[];D.res=[];D.loans=[];D.hist=[];D.me=null;S.me=null;
 if(u){const admin=(u.email||'').toLowerCase()==ADMIN_EMAIL.toLowerCase(),L=collection(db,'loans'),R=collection(db,'res');S.me={uid:u.uid,role:admin?'admin':'est'};
  if(admin)subs.push(onSnapshot(R,s=>{D.res=rows(s);live()}),onSnapshot(query(L,where('dev','==',null)),s=>{D.loans=rows(s);live()}),onSnapshot(query(L,where('dev','>','2000'),orderBy('dev','desc'),limit(15)),s=>{D.hist=rows(s);live()}));
  else{D.me=(await getDoc(doc(db,'users',u.uid))).data()||null;
   subs.push(onSnapshot(query(R,where('uid','==',u.uid)),s=>{D.res=rows(s);live()}),onSnapshot(query(L,where('uid','==',u.uid),where('dev','==',null)),s=>{D.loans=rows(s);live()}))}}
 S.ready=1;r()}
onAuthStateChanged(auth,u=>{if(!busy)init(u)});

/* ---------- acciones ---------- */
const go=v=>{S.v=v;r();scrollTo(0,0)};
const out=async()=>{await signOut(auth);go('cat')};
async function login(f){busy=1;try{const id=V(f,'ti'),c=await signInWithEmailAndPassword(auth,id.includes('@')?id:em(id),f.elements.pass.value);await init(c.user);go(S.me.role=='admin'?'admin':'cat')}catch(x){toast(errMsg(x))}busy=0}
async function reg(f){busy=1;try{const ti=nt(V(f,'ti')),c=await createUserWithEmailAndPassword(auth,em(ti),f.elements.pass.value);await setDoc(doc(db,'users',c.user.uid),{ti,nombre:V(f,'nombre'),curso:V(f,'curso')});await init(c.user);go('cat');toast('Cuenta creada')}catch(x){toast(errMsg(x))}busy=0}
const prof=act('Datos actualizados',async f=>{const d={nombre:V(f,'nombre'),curso:V(f,'curso')};await setDoc(doc(db,'users',S.me.uid),d,{merge:true});D.me={...D.me,...d}});
const reserve=act('Reservado. Pasa a recogerlo a la biblioteca',async id=>{
 if(!S.me){go('login');throw{message:'Ingresa para reservar'}}
 if(!D.me)throw{message:'Tu cuenta no tiene datos completos'};
 if(D.res.length>=3)throw{message:'Máximo 3 reservas a la vez'};
 const w=writeBatch(db);w.set(doc(db,'state',id),{estado:'reservado',resUid:S.me.uid});
 w.set(doc(db,'res',id),{bookId:id,uid:S.me.uid,ti:D.me.ti,nombre:D.me.nombre,curso:D.me.curso,fecha:today()});await w.commit()});
const delRes=act('Reserva cancelada',async id=>{const w=writeBatch(db);w.delete(doc(db,'state',id));w.delete(doc(db,'res',id));await w.commit()});
const addBook=act('Libro añadido',async f=>{await setDoc(CAT,{b:{[uid()]:{t:V(f,'titulo'),a:V(f,'autor'),e:V(f,'editorial')}}},{merge:true})});
const delBook=act('Libro quitado',async id=>{const w=writeBatch(db);w.update(CAT,{['b.'+id]:deleteField()});w.delete(doc(db,'state',id));w.delete(doc(db,'res',id));await w.commit()});
const mkLoan=async(b,p,vence)=>{const w=writeBatch(db);
 w.set(doc(db,'loans',uid()),{bookId:b.id,libro:b.titulo,uid:p.uid||null,ti:p.ti,nombre:p.nombre,curso:p.curso,fecha:today(),vence,dev:null});
 w.set(doc(db,'state',b.id),{estado:'prestado',vence});w.delete(doc(db,'res',b.id));await w.commit()};
const lend=act('Préstamo registrado',async f=>{const v={libro:f.elements.libro.value,ti:nt(V(f,'ti')),nombre:V(f,'nombre'),curso:V(f,'curso'),vence:f.elements.vence.value};
 const q=await getDocs(query(collection(db,'users'),where('ti','==',v.ti),limit(1)));await mkLoan(bk(v.libro),{...v,uid:q.docs[0]?.id},v.vence)});
const fromRes=act('Entregado, vence en 7 días',async id=>{const x=D.res.find(x=>x.id==id);await mkLoan(bk(x.bookId)||{id:x.bookId,titulo:'(libro quitado)'},x,plus(7))});
const ret=act('Devolución registrada',async id=>{const l=D.loans.find(x=>x.id==id),w=writeBatch(db);w.update(doc(db,'loans',id),{dev:today()});w.delete(doc(db,'state',l.bookId));await w.commit()});
async function fill(i){const ti=nt(i.value);if(ti.length<5)return;const q=await getDocs(query(collection(db,'users'),where('ti','==',ti),limit(1))),d=q.docs[0]?.data();if(d){i.form.elements.nombre.value=d.nombre;i.form.elements.curso.value=d.curso}}

/* ---------- vistas ---------- */
const heroArt=()=>`<div class="hero-art" aria-hidden="true"><svg viewBox="0 0 520 300" role="img"><path d="M46 265h428" stroke="#123c4a" stroke-width="7" stroke-linecap="round"/><path d="M77 250V93h366v157" fill="#fffdf8" stroke="#123c4a" stroke-width="7"/><path d="M78 93 260 38l183 55" fill="#d86b51" stroke="#123c4a" stroke-width="7" stroke-linejoin="round"/><path d="M114 122h72v128h-72zM222 122h76v128h-76zM337 122h72v128h-72z" fill="#dff3ee" stroke="#123c4a" stroke-width="6"/><path d="M114 157h72M222 157h76M337 157h72M114 193h72M222 193h76M337 193h72" stroke="#197c75" stroke-width="6"/><path d="M211 250v-59h98v59" fill="#f8e7be" stroke="#123c4a" stroke-width="6"/><circle cx="279" cy="220" r="5" fill="#d86b51"/><path d="M426 71c13-28 29-39 49-42-2 23-16 39-49 42ZM427 73c-16-25-29-33-45-34 3 20 16 31 45 34Z" fill="#197c75" stroke="#123c4a" stroke-width="5" stroke-linejoin="round"/><path d="M426 72v30" stroke="#123c4a" stroke-width="5" stroke-linecap="round"/></svg></div>`;
const vCat=()=>`<section class="hero"><div class="hero-layout"><div><p class="eyebrow">Un rincón para aprender</p><h1>Encuentra tu próxima historia.</h1><p class="hero-copy">Busca en el catálogo de la biblioteca, revisa si el libro está disponible y resérvalo para recogerlo en el colegio.${S.me?'':' Para reservar solo necesitas iniciar sesión.'}</p><div class="search-box"><label for="book-search">¿Qué quieres leer?</label><span class="search-icon">⌕</span><input id="book-search" aria-label="Buscar libros" placeholder="Título, autor o editorial" value="${e(S.q)}" oninput="S.q=this.value;grid()"></div><div class="filter-row"><select aria-label="Filtro" onchange="S.f=this.value;grid()"><option value="all">Todos los libros</option><option value="ok"${S.f=='ok'?' selected':''}>Solo disponibles</option></select><span id="result-meta" class="muted"></span></div></div>${heroArt()}</div><div id="stats" class="stats"><div class="stat"><strong>0</strong><span>libros en catálogo</span></div><div class="stat"><strong>0</strong><span>disponibles hoy</span></div><div class="stat"><strong>0</strong><span>en movimiento</span></div></div></section><div class="section-heading"><h2>El catálogo</h2><p>Estado actualizado en tiempo real</p></div><div id="grid" class="grid"></div><div class="welcome-strip"><article><strong>🔎 Busca sin afán</strong><p>Prueba con el título, el autor o la editorial.</p></article><article><strong>🟡 Reserva tu ejemplar</strong><p>Cuando aparezca disponible, puedes apartarlo.</p></article><article><strong>🌿 Cuídalo y devuélvelo</strong><p>Así otra persona también podrá disfrutarlo.</p></article></div>`;
function grid(){const q=nz(S.q);const L=D.books.filter(b=>nz(`${b.titulo} ${b.autor} ${b.editorial}`).includes(q)&&(S.f!='ok'||st(b).c=='ok')).sort((a,b)=>a.titulo.localeCompare(b.titulo));const available=D.books.filter(b=>st(b).c=='ok').length;const inMotion=D.books.length-available;const stats=$('#stats');if(stats)stats.innerHTML=`<div class="stat"><strong>${D.books.length}</strong><span>libros en catálogo</span></div><div class="stat"><strong>${available}</strong><span>disponibles hoy</span></div><div class="stat"><strong>${inMotion}</strong><span>en movimiento</span></div>`;const meta=$('#result-meta');if(meta)meta.textContent=`${L.length} resultado${L.length==1?'':'s'}`;const target=$('#grid');if(!target)return;target.innerHTML=L.map(b=>{const s=st(b),kind=s.c=='ok'?'available':s.c=='wa'?'reserved':'loaned';return `<article class="card book-card ${s.c=='wa'?'reserve':s.c=='no'?'loan':''}"><span class="status ${kind}">${s.t}</span><h3>${e(b.titulo)}</h3><span>${e(b.autor)}</span><small class="publisher">${e(b.editorial)||'Editorial no registrada'}</small><div class="book-footer"><small class="muted">${e(s.d)}</small>${s.c=='ok'&&S.me?.role!='admin'?`<button class="sm" onclick="reserve('${b.id}')">Reservar</button>`:''}</div></article>`}).join('')||`<p class="empty">${D.books.length?'No encontramos ese libro. Prueba con otra palabra o pregúntale al bibliotecario.':'Todavía no hay libros en el catálogo.'}</p>`}
const vLogin=()=>`<form class="box" onsubmit="login(this);return false"><h2>Entrar a la biblioteca</h2><p>El estudiantado entra con su TI. El bibliotecario entra con el correo de la cuenta admin.</p><label>Correo del bibliotecario o TI del estudiante<input name="ti" autocomplete="username" required></label><label>Contraseña<input name="pass" type="password" autocomplete="current-password" minlength="6" required></label><p style="margin-top:14px"><button style="width:100%">Entrar</button></p><p class="note">¿Es tu primera vez? <a href="#" onclick="go('reg');return false">Crea tu cuenta de estudiante</a></p></form>`;
const vReg=()=>`<form class="box" onsubmit="reg(this);return false"><h2>Crear cuenta de estudiante</h2><p>Completa estos datos para poder reservar libros desde cualquier dispositivo.</p><label>Tarjeta de identidad<input name="ti" inputmode="numeric" autocomplete="username" required></label><label>Nombre completo<input name="nombre" autocomplete="name" required></label><label>Curso (por ejemplo, 902)<input name="curso" required></label><label>Contraseña (mínimo 6 caracteres)<input name="pass" type="password" autocomplete="new-password" minlength="6" required></label><p style="margin-top:14px"><button style="width:100%">Crear mi cuenta</button></p><p class="note">Tu nombre y tu TI solo los verás tú y el bibliotecario.</p></form>`;
function vMe(){const u=D.me||{};
 return `<form class="box" onsubmit="prof(this);return false"><h2>Mis datos</h2><label>Tarjeta de identidad<input value="${e(u.ti)}" disabled></label><label>Nombre<input name="nombre" value="${e(u.nombre)}" required></label><label>Curso<input name="curso" value="${e(u.curso)}" required></label><p class="note">¿Cambiaste de curso? Actualiza tus datos aquí para que el bibliotecario te ubique bien.</p><p style="margin-top:12px"><button>Guardar cambios</button></p></form>
<h2 style="margin:22px 0 8px">Mis reservas</h2><div class="grid">${D.res.map(x=>`<div class="card wa"><h3>${e(bk(x.bookId)?.titulo)}</h3><small>Reservado el ${fmt(x.fecha)}. Pasa a recogerlo.</small><button class="g sm" onclick="delRes('${x.id}')">Cancelar reserva</button></div>`).join('')||'<p>No tienes reservas.</p>'}</div>
<h2 style="margin:22px 0 8px">Mis préstamos</h2><div class="grid">${D.loans.map(l=>`<div class="card no"><h3>${e(l.libro)}</h3><small>Prestado el ${fmt(l.fecha)}</small><span class="tag ${l.vence<today()?'t-no':'t-wa'}">Entrega: ${fmt(l.vence)}</span></div>`).join('')||'<p>No tienes libros prestados.</p>'}</div>`}

const aBooks=()=>`<form class="card" onsubmit="addBook(this);return false"><h3>Añadir libro</h3><div class="row"><input name="titulo" placeholder="Título *" required><input name="autor" placeholder="Autor *" required><input name="editorial" placeholder="Editorial (opcional)"><button>Añadir al catálogo</button></div></form><br>`+
 tbl(['Título','Autor','Editorial','Estado',''],D.books.map(b=>{const s=st(b);return `<tr><td>${e(b.titulo)}</td><td>${e(b.autor)}</td><td>${e(b.editorial)}</td><td><span class="tag t-${s.c}">${s.t}</span></td><td><button class="r sm" onclick="confirm('¿Quitar este libro del catálogo?')&&delBook('${b.id}')">Quitar</button></td></tr>`}),'Catálogo vacío. Añade el primer libro.');
const aRes=()=>tbl(['Libro','Estudiante','Reservó',''],D.res.map(x=>`<tr><td>${e(bk(x.bookId)?.titulo)}</td><td>${who(x.nombre,x.curso,x.ti)}</td><td>${fmt(x.fecha)}</td><td><button class="sm" onclick="fromRes('${x.id}')">Entregar por 7 días</button> <button class="g sm" onclick="delRes('${x.id}')">Cancelar</button></td></tr>`),'No hay reservas pendientes.');
function aLoans(){const t=today();
 return `<form class="card" onsubmit="lend(this);return false"><h3>Registrar préstamo</h3><div class="row"><select name="libro" required><option value="">Libro</option>${D.books.filter(b=>D.state[b.id]?.estado!='prestado').map(b=>`<option value="${b.id}">${e(b.titulo)}, ${e(b.autor)}</option>`).join('')}</select><input name="ti" placeholder="Tarjeta de identidad" required oninput="fill(this)"><input name="nombre" placeholder="Nombre" required><input name="curso" placeholder="Curso" required><input name="vence" type="date" value="${plus(7)}" required><button>Prestar</button></div></form>
<h3 style="margin:16px 0 6px">Sin devolver</h3>`+
 tbl(['Libro','Quién','Prestado','Vence',''],D.loans.map(l=>`<tr><td>${e(l.libro)}</td><td>${who(l.nombre,l.curso,l.ti)}</td><td>${fmt(l.fecha)}</td><td>${l.vence<t?`<span class="tag t-no">Vencido el ${fmt(l.vence)}</span>`:fmt(l.vence)}</td><td><button class="sm" onclick="ret('${l.id}')">Ya lo devolvió</button></td></tr>`),'Todos los libros están en la biblioteca.')+
 `<h3 style="margin:16px 0 6px">Devueltos recientemente</h3>`+
 tbl(['Libro','Quién','Prestado','Devuelto'],D.hist.map(l=>`<tr><td>${e(l.libro)}</td><td>${who(l.nombre,l.curso,l.ti)}</td><td>${fmt(l.fecha)}</td><td>${fmt(l.dev)}</td></tr>`),'Aún no hay devoluciones.')}
function vAdmin(){const n=k=>`<button class="${S.tab==k?'on':'g'}" onclick="S.tab='${k}';r()">`;
 return `<h2 style="margin-bottom:10px">Panel del bibliotecario</h2><div class="tabs">${n('books')}Libros</button>${n('res')}Reservas (${D.res.length})</button>${n('loans')}Préstamos (${D.loans.length})</button></div>`+({books:aBooks,res:aRes,loans:aLoans}[S.tab])()}

function r(){const m=S.me,A=m?.role=='admin';
 if(S.v=='admin'&&!A||S.v=='me'&&(!m||A))S.v='login';
 $('#nav').innerHTML=`<button class="${S.v=='cat'?'':'g'}" onclick="go('cat')">Catálogo</button>`+(m?`<button class="${S.v=='admin'||S.v=='me'?'':'g'}" onclick="go('${A?'admin':'me'}')">${A?'Panel admin':'Mi cuenta'}</button><button class="g" onclick="out()">Salir</button>`:`<button class="g" onclick="go('login')">Ingresar</button><button class="g" onclick="go('reg')">Registrarme</button>`);
 $('#app').innerHTML=({cat:vCat,login:vLogin,reg:vReg,me:vMe,admin:vAdmin}[S.v]||vCat)();
 if(S.v=='cat')grid()}

Object.assign(window,{S,r,go,out,login,reg,prof,reserve,delRes,addBook,delBook,lend,fromRes,ret,fill,grid});
document.addEventListener('submit',()=>document.activeElement?.blur());
