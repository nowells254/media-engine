/* Requests tab: collect details from many clients with one link.
   Loaded at the end of dashboard.html, so the functions below extend or replace the ones in the page. */
TITLES.requests = 'Requests';

if (window.ME_DICT) {
  Object.assign(window.ME_DICT, {
    'Requests': '资料收集',
    'Collect details from your clients': '向客户收集资料',
    'Send one link to as many clients as you like. Each client fills in their own details on their phone, and you can then create all the documents in one go.': '把同一个链接发给任意多的客户。每位客户在手机上填写自己的资料,然后您可以一次性制作所有文档。',
    'New request': '新建收集', 'Title': '标题',
    'e.g. October training certificates': '例如:十月培训证书',
    'Message to clients (optional)': '给客户的留言(可选)',
    'e.g. Please type your name exactly as it should appear.': '例如:请按证书上要显示的样子填写您的姓名。',
    'Details to ask clients for': '需要客户填写的资料',
    'Maximum number of replies': '最多接收份数', 'Closing date (optional)': '截止日期(可选)',
    'Create link': '生成链接',
    'The other details (company, logo, signatures, colours) come from your current design in Studio and are the same for everyone.': '其他资料(公司、标志、签名、颜色)来自您在设计室中的当前设计,所有人相同。',
    'Anyone who has the link can see the shared details on your design.': '任何拿到链接的人都能看到您设计中的共用资料。',
    'Open Studio and design your document first, then come back here.': '请先在设计室设计好您的文档,然后回到这里。',
    'Please give your request a title.': '请为收集命名。',
    'Choose at least one detail to ask for.': '请至少选择一项需要客户填写的资料。',
    'You can have up to 20 open requests. Close one first.': '最多可同时进行 20 个收集,请先关闭一个。',
    'Request not found.': '未找到该收集。',
    'My requests': '我的收集', 'No requests yet.': '还没有收集。',
    'Collecting': '收集中', 'Closed': '已关闭', 'Full': '已满',
    'View replies': '查看回复', 'Copy link': '复制链接', 'Link copied!': '链接已复制!',
    'Share on WhatsApp': '通过 WhatsApp 分享', 'Stop collecting': '停止收集', 'Collect again': '重新开始收集',
    'Delete this request and all of its replies?': '删除此收集及其所有回复?',
    'Replies': '回复', 'Contact': '联系方式', 'Received': '收到时间', 'New': '新', 'Done': '已制作',
    'Load all replies into Studio': '将全部回复载入设计室', 'Back to requests': '返回列表',
    'No replies yet. Share the link with your clients.': '还没有回复,请把链接发给您的客户。',
    'There are no new replies to load.': '没有可载入的新回复。',
    'Please fill in your details here:': '请在这里填写您的资料:'
  });
  window.ME_PATTERNS.push(
    [/^(\d+) repl(?:y|ies), (\d+) new$/, '$1 份回复,其中 $2 份新的'],
    [/^Load (\d+) new repl(?:y|ies) into Studio$/, '将 $1 份新回复载入设计室'],
    [/^Loaded (\d+) repl(?:y|ies)\. Check the details, then go to the last step to generate them\.$/, '已载入 $1 份回复。请检查资料,然后到最后一步生成。'],
    [/^Only the first (\d+) were loaded, because one order can have up to (\d+) images\.$/, '只载入了前 $1 份,因为一个订单最多 $2 张图片。']
  );
  if (window.ME_REAPPLY) window.ME_REAPPLY();
}

const RQ_ASKABLE = {
  certificate: ['recipient', 'course', 'duration', 'body', 'date', 'location'],
  business_card: ['name', 'title', 'phone', 'email', 'address', 'tagline'],
  id_card: ['name', 'title', 'idno', 'valid', 'phone', 'email', 'address', 'photo'],
  poster: ['headline', 'subtitle', 'details', 'date', 'location'],
  banner: ['headline', 'subtitle', 'offer']
};
const RQ_DEFAULT = {
  certificate: ['recipient'], business_card: ['name', 'title', 'phone', 'email'],
  id_card: ['name', 'title', 'idno', 'photo'], poster: ['headline'], banner: ['headline']
};
let rqOpen = null;

function rqLink(token) { return location.origin + '/collect.html?r=' + token; }

function rqRenderForm() {
  const box = $('rqForm');
  if (!design) {
    box.innerHTML = '<p class="hint">Open Studio and design your document first, then come back here.</p><button class="sm" onclick="go(\'studio\')">Open Studio</button>';
    return;
  }
  const p = DS.PRODUCTS[design.product];
  const ok = RQ_ASKABLE[design.product], def = RQ_DEFAULT[design.product];
  box.innerHTML =
    '<h3 class="sec">New request</h3>' +
    '<p class="hint"><span>' + p.label + '</span> &middot; <span>' + p.size + '</span></p>' +
    '<label class="lbl">Title</label><input type="text" id="rqTitle" maxlength="100" placeholder="e.g. October training certificates">' +
    '<label class="lbl">Message to clients (optional)</label><input type="text" id="rqNote" maxlength="300" placeholder="e.g. Please type your name exactly as it should appear.">' +
    '<label class="lbl">Details to ask clients for</label>' +
    p.fields.filter(f => ok.includes(f.key)).map(f =>
      '<label class="radio"><input type="checkbox" class="rqAsk" value="' + f.key + '"' + (def.includes(f.key) ? ' checked' : '') + '>' + f.label + '</label>').join('') +
    '<div class="two"><div><label class="lbl">Maximum number of replies</label><input type="text" id="rqMax" value="200"></div>' +
    '<div><label class="lbl">Closing date (optional)</label><input type="date" id="rqClose"></div></div>' +
    '<p class="hint">The other details (company, logo, signatures, colours) come from your current design in Studio and are the same for everyone.</p>' +
    '<p class="hint">Anyone who has the link can see the shared details on your design.</p>' +
    '<button onclick="rqCreate()">Create link</button><p id="rqStatus" class="hint"></p>';
}

async function rqCreate() {
  const st = $('rqStatus');
  const title = $('rqTitle').value.trim();
  const ask = Array.prototype.map.call(document.querySelectorAll('.rqAsk:checked'), x => x.value);
  if (!title) { st.innerText = 'Please give your request a title.'; return; }
  if (!ask.length) { st.innerText = 'Choose at least one detail to ask for.'; return; }
  st.innerText = 'Working...';
  const r = await api('/collect', 'POST', {
    title, note: $('rqNote').value, ask, maxEntries: $('rqMax').value, closesAt: $('rqClose').value,
    design: { product: design.product, style: design.style, lang: design.lang, colors: design.colors },
    shared: E()
  });
  if (!r.success) { st.innerText = 'Error: ' + r.error; return; }
  st.innerText = '';
  loadRequests();
}

function rqStatus(r) {
  if (r.status !== 'open') return 'Closed';
  if (r.closesAt && new Date(r.closesAt) < new Date()) return 'Closed';
  if (r.count >= r.maxEntries) return 'Full';
  return 'Collecting';
}

async function loadRequests() {
  rqRenderForm();
  $('rqRepliesCard').style.display = 'none';
  const box = $('rqList');
  box.innerHTML = '<p class="hint">Loading...</p>';
  const r = await api('/collect');
  if (!r.success) { box.innerHTML = '<p class="hint">' + esc(r.error || '') + '</p>'; return; }
  if (!r.requests.length) { box.innerHTML = '<p class="hint">No requests yet.</p>'; return; }
  box.innerHTML = r.requests.map(q => {
    const link = rqLink(q.token);
    const wa = 'https://wa.me/?text=' + encodeURIComponent(T('Please fill in your details here:') + ' ' + link);
    const open = rqStatus(q) === 'Collecting';
    return '<div class="saved-item" style="display:block;">' +
      '<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;"><div><b translate="no">' + esc(q.title) + '</b> <span class="hint"><span>' + DS.PRODUCTS[q.product].label + '</span></span></div>' +
      '<div class="hint"><span>' + rqStatus(q) + '</span></div></div>' +
      '<div class="hint" style="margin-top:4px;">' + q.count + (q.count === 1 ? ' reply, ' : ' replies, ') + q.fresh + ' new</div>' +
      '<div class="hint" translate="no" style="word-break:break-all;margin:4px 0;">' + esc(link) + '</div>' +
      '<div class="ebar2">' +
      '<button class="light" onclick="rqCopy(\'' + q.token + '\', this)">Copy link</button>' +
      '<a href="' + wa + '" target="_blank" rel="noopener"><button class="light">Share on WhatsApp</button></a>' +
      '<button onclick="rqView(' + q.id + ')">View replies</button>' +
      '<button class="light" onclick="rqSetStatus(' + q.id + ',\'' + (open ? 'closed' : 'open') + '\')">' + (open ? 'Stop collecting' : 'Collect again') + '</button>' +
      '<button class="light" onclick="rqDelete(' + q.id + ')">Delete</button></div></div>';
  }).join('');
}

function rqCopy(token, btn) {
  const link = rqLink(token);
  const done = () => { const old = btn.innerText; btn.innerText = T('Link copied!'); setTimeout(() => { btn.innerText = old; }, 1500); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link).then(done, () => prompt(link, link));
  else prompt(link, link);
}
async function rqSetStatus(id, status) { await api('/collect/' + id + '/status', 'POST', { status }); loadRequests(); }
async function rqDelete(id) {
  if (!confirm(T('Delete this request and all of its replies?'))) return;
  await api('/collect/' + id, 'DELETE');
  loadRequests();
}

async function rqView(id) {
  const r = await api('/collect/' + id);
  if (!r.success) { alert(T(r.error || 'Request not found.')); return; }
  rqOpen = r;
  rqRenderReplies();
}

function rqRenderReplies() {
  const q = rqOpen, card = $('rqRepliesCard');
  const main = LABEL_KEY[q.request.product];
  const fresh = q.submissions.filter(s => !s.done).length;
  let h = '<h2><span>Replies</span>: <span translate="no">' + esc(q.request.title) + '</span></h2>';
  if (!q.submissions.length) {
    h += '<p class="hint">No replies yet. Share the link with your clients.</p>';
  } else {
    h += '<div class="ebar2" style="margin-bottom:10px;">' +
      (fresh ? '<button onclick="rqLoad(true)">Load ' + fresh + (fresh === 1 ? ' new reply' : ' new replies') + ' into Studio</button>' : '') +
      '<button class="light" onclick="rqLoad(false)">Load all replies into Studio</button></div>' +
      '<div class="table-wrap"><table class="tbl"><tr><th>#</th><th>Name</th><th>Details</th><th>Contact</th><th>Received</th><th>Status</th><th></th></tr>' +
      q.submissions.map((s, i) => {
        const others = Object.keys(s.fields).filter(k => k !== main && k !== 'photo' && s.fields[k]).map(k => s.fields[k]).join(' | ');
        return '<tr><td>' + (i + 1) + '</td><td translate="no">' + (s.fields.photo ? '<img src="' + esc(s.fields.photo) + '" style="height:34px;border-radius:4px;vertical-align:middle;margin-right:6px;">' : '') + esc(s.fields[main] || '') +
          '</td><td translate="no">' + esc(others) + '</td><td translate="no">' + esc(s.contact || '') + '</td><td translate="no">' + new Date(s.created_at).toLocaleString(loc()) + '</td><td>' + (s.done ? 'Done' : 'New') +
          '</td><td><button class="sm light" onclick="rqDelSub(' + s.id + ')">Remove</button></td></tr>';
      }).join('') + '</table></div>';
  }
  h += '<button class="light sm" onclick="loadRequests()">Back to requests</button>';
  card.innerHTML = h;
  card.style.display = 'block';
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function rqDelSub(sid) {
  await api('/collect/' + rqOpen.request.id + '/submissions/' + sid, 'DELETE');
  rqView(rqOpen.request.id);
}

// Put the replies into the Studio as one person per reply, ready to check and generate
function rqLoad(onlyNew) {
  const q = rqOpen;
  if (!q) return;
  let subs = q.submissions.filter(s => !onlyNew || !s.done);
  if (!subs.length) { alert(T('There are no new replies to load.')); return; }
  const cut = subs.length > MAX_ORDER;
  subs = subs.slice(0, MAX_ORDER);
  const d0 = q.request.design;
  design = { product: d0.product, style: d0.style, lang: d0.lang, colors: d0.colors };
  entries = subs.map(s => Object.assign({}, d0.shared, s.fields, { _sid: s.id }));
  cur = 0; csvMsg = ''; userMode = null; step = 3;
  go('studio');
  showPaid(cut
    ? 'Only the first ' + MAX_ORDER + ' were loaded, because one order can have up to ' + MAX_ORDER + ' images.'
    : 'Loaded ' + subs.length + (subs.length === 1 ? ' reply' : ' replies') + '. Check the details, then go to the last step to generate them.');
}

/* ---- navigation: adds the Requests tab ---- */
function go(name) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-item[data-tab]').forEach(a => a.classList.toggle('active', a.dataset.tab === name));
  $(name + 'Tab').classList.add('active');
  $('pageTitle').innerText = TITLES[name];
  $('side').classList.remove('open');
  history.replaceState(null, '', '#' + name);
  const loaders = { overview: loadOverview, studio: renderStudio, requests: loadRequests, history: loadHistory, plans: onPlans, profile: renderProfile, brand: renderBrand, settings: renderSettings, admin: loadAdmin };
  loaders[name]();
  window.scrollTo(0, 0);
}

/* ---- ordering: remembers which replies each image came from ---- */
async function submitOrder() {
  const btn = $('orderBtn'), st = $('orderStatus');
  btn.disabled = true; st.innerText = 'Working...';
  const payload = {
    design: Object.assign({}, design, { fields: entries[0] }),
    rows: entries.length > 1 ? entries : null,
    mode: payMode, currency: currentCurrency(),
    submissionIds: entries.map(e => e._sid).filter(Boolean)
  };
  const r = await api('/orders', 'POST', payload);
  btn.disabled = false;
  if (!r.success) { st.innerText = 'Error: ' + r.error; return; }
  if (r.manual) { st.innerText = ''; openPay(r.manual); return; }
  if (r.authorization_url) { st.innerText = 'Opening the secure payment page...'; window.location.href = r.authorization_url; return; }
  st.innerText = '';
  trackOrder(r.orderId);
}