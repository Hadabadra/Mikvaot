/* מקוואות — מדריך מעשי (מיקום, שעות, טלפון). אין בו הלכות; לשאלות — רב הקהילה ואחראית המקווה. */
(function () {
  'use strict';
  const VERSION = '0.3.1';
  const O = window.Otzaria, hasOtz = !!(O && O.call);
  const $ = s => document.querySelector(s);
  const call = async (m, p) => { if (!hasOtz) return { success: false }; try { const r = await O.call(m, p || {}); return r && typeof r === 'object' && 'success' in r ? r : { success: true, data: r }; } catch (e) { return { success: false, error: e }; } };

  let DATA = window.MIKVAOT_DATA;
  const TYPE = { women: 'נשים', men: 'גברים', kelim: 'כלים', unknown: 'מקווה' };
  const ORDER = ['women', 'men', 'kelim', 'unknown'];
  const ACC = { partial: 'נגישות חלקית', basic: 'נגישות בסיסית', full: 'נגישות מלאה', 'full-lift': 'נגישות מלאה כולל מנוף' };
  // view: home | city | favs ; q = חיפוש חופשי
  const state = { view: 'home', city: '', type: '', acc: false, withHours: false, q: '', favs: [], recent: [], online: false, pos: null, rail: true, region: 'il' };

  // ── עזרים ──
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s || '').toLowerCase().replace(/[֑-ׇ"'׳״`’\-–—,.()]/g, ' ').replace(/קריית/g, 'קרית').replace(/יי/g, 'י').replace(/וו/g, 'ו').replace(/\s+/g, ' ').trim();
  const words = () => norm(state.q).split(' ').filter(Boolean);
  function hl(text) {
    const t = esc(text), w = words().filter(x => x.length > 1).map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return w.length ? t.replace(new RegExp('(' + w.join('|') + ')', 'gi'), '<mark>$1</mark>') : t;
  }
  let toastT;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2800); }
  async function copy(text, label) {
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (e) {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch (e2) {} ta.remove();
    }
    toast(ok ? (label || 'הועתק') + ': ' + text : 'ההעתקה נכשלה');
  }
  async function openExternal(url) {
    const r = await call('app.openUrl', { url });
    if (r.success && r.data !== false) return;
    copy(url, 'הקישור הועתק');
  }
  function dist(a, b, c, d) { const R = 6371, r = Math.PI / 180, x = (c - a) * r, y = (d - b) * r;
    const h = Math.sin(x / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(y / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); }
  const kmText = d => d < 1 ? Math.round(d * 1000) + ' מ\'' : d.toFixed(d < 10 ? 1 : 0) + ' ק"מ';

  // ── ערכת צבעים ──
  const kebab = s => s.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
  function applyTheme(t) {
    if (!t) return;
    const root = document.documentElement.style, cs = t.colorScheme || {};
    Object.keys(cs).forEach(k => root.setProperty('--color-' + kebab(k), cs[k]));
    document.documentElement.dataset.theme = t.mode === 'dark' ? 'dark' : 'light';
  }

  // ── נתונים לפי עיר ──
  let byCity = new Map(), cityNames = [];
  function index() {
    byCity = new Map();
    DATA.items.forEach(it => { if (!byCity.has(it.city)) byCity.set(it.city, []); byCity.get(it.city).push(it); });
    regionCities();
  }
  const isAbroad = c => !!(DATA.cities[c] || {}).country;
  function regionCities() {
    const ab = state.region === 'abroad';
    cityNames = [...byCity.keys()].filter(c => isAbroad(c) === ab)
      .sort((a, b) => ab ? ((DATA.cities[a].country || '').localeCompare(DATA.cities[b].country || '', 'he') || a.localeCompare(b)) : a.localeCompare(b, 'he'));
  }
  const regionItems = () => DATA.items.filter(it => isAbroad(it.city) === (state.region === 'abroad'));
  const counts = arr => ORDER.map(t => [t, arr.filter(i => i.type === t).length]).filter(x => x[1]);
  const countText = arr => counts(arr).map(([t, n]) => `${n} ${t === 'unknown' ? 'ללא סוג' : TYPE[t]}`).join(' · ');

  // ── שמירה ──
  const save = (k, v) => call('storage.set', { key: k, value: v });
  function saveView() {
    const v = { view: state.view, city: state.city, type: state.type, acc: state.acc, withHours: state.withHours, rail: state.rail, region: state.region };
    save('view', v);
    call('plugin.setRestoreState', { state: Object.assign({ q: state.q, scroll: $('#list').scrollTop }, v) });
  }

  // ── סינון ──
  const hasHours = it => !!(it.hours || it.summer || it.winter);
  function pass(it) {
    if (state.type && it.type !== state.type) return false;
    if (state.acc && !ACC[it.acc]) return false;
    if (state.withHours && !hasHours(it)) return false;
    return true;
  }
  function matchQ(it) {
    const w = words(); if (!w.length) return true;
    const hay = norm([it.city, it.hood, it.address, it.name].join(' '));
    return w.every(x => hay.includes(x));
  }

  // ── כרטיס מקווה ──
  function phoneRow(k, p) {
    if (!p) return '';
    return `<div class="row"><span class="k">${k}</span><span class="phone">${esc(p)}</span><button class="mini" data-copy="${esc(p)}" title="העתקת המספר">העתק</button></div>`;
  }
  function card(it, withCity) {
    const fav = state.favs.includes(it.id);
    const title = it.name ? (/^(מקו+ה|mikv)/i.test(it.name) ? it.name : 'מקווה ' + it.name) : (it.hood || it.address);
    const sub = [it.name && it.hood, it.address !== it.name && it.address, withCity && it.city + (isAbroad(it.city) && !it.city.includes(DATA.cities[it.city].country) ? ', ' + DATA.cities[it.city].country : '')].filter(Boolean).join(' · ');
    const hours = [it.hours, it.winter && 'חורף: ' + it.winter, it.summer && 'קיץ: ' + it.summer].filter(Boolean).join(' · ');
    const d = state.pos && it.lat ? dist(state.pos.lat, state.pos.lon, it.lat, it.lon) : null;
    const src = [it.srcName, ...(it.also || [])].filter(Boolean).join(', ');
    return `<article class="card${it.closed ? ' closed' : ''}" data-id="${esc(it.id)}">
      <div class="card-head"><div class="card-title">${hl(title)}<small>${hl(sub)}${d != null ? ' · ' + kmText(d) + ' ממך' : ''}</small></div>
        <span class="badge ${it.type}">${TYPE[it.type] || 'מקווה'}</span>${it.closed ? '<span class="badge warn">סגור לפי המקור</span>' : ''}</div>
      ${phoneRow('טלפון', it.phone)}${phoneRow('אחראי/ת', it.contact)}
      ${hours ? `<div class="row"><span class="k">שעות</span><span${it.lang === 'en' ? ' dir="ltr" lang="en"' : ''}>${esc(hours)}</span></div>` : '<div class="row"><span class="k">שעות</span><span class="lang">לא פורסמו — יש לברר בטלפון</span></div>'}
      ${ACC[it.acc] ? `<div class="row"><span class="k">נגישות</span><span>${ACC[it.acc]}</span></div>` : ''}
      <div class="card-foot">
        ${state.online ? '<button class="mini" data-act="map">פתיחה במפה</button><button class="mini" data-act="waze">Waze</button>' : ''}
        <button class="mini" data-act="copyAddr">העתקת כתובת</button>
        <button class="mini" data-act="remind">תזכורת / יומן</button>
        <button class="mini" data-act="report">דיווח על טעות</button>
        <button class="mini star" data-act="fav" aria-pressed="${fav}" title="מועדף">${fav ? '★' : '☆'}</button>
      </div>
      <div class="src">מקור: ${esc(src)} · נבדק ${esc((it.checked || '').split('-').reverse().join('.'))}${it.lang === 'en' ? ' · הפרטים במקור באנגלית' : ''}</div>
    </article>`;
  }
  function sortItems(arr) {
    if (state.pos) return arr.slice().sort((a, b) => (a.lat ? dist(state.pos.lat, state.pos.lon, a.lat, a.lon) : 1e9) - (b.lat ? dist(state.pos.lat, state.pos.lon, b.lat, b.lon) : 1e9));
    return arr.slice().sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type) || (a.hood || '').localeCompare(b.hood || '', 'he') || (a.address || '').localeCompare(b.address || '', 'he'));
  }
  function councilLine(c) {
    const co = (DATA.cities[c] || {}).council;
    return co ? `${esc(co.name)}${co.phone ? ' · <span class="phone">' + esc(co.phone) + '</span> <button class="mini" data-copy="' + esc(co.phone) + '">העתק</button>' : ''}${co.extra ? ' · ' + esc(co.extra) : ''}${co.url ? ' · ' + linkBtns(co.url) : ''}` : '';
  }

  // ── מסכים ──
  function homeView() {
    const cardC = c => { const arr = byCity.get(c); return `<button class="city-card" data-city="${esc(c)}"><strong>${esc(c)}</strong><span>${arr.length} מקוואות · ${countText(arr)}</span></button>`; };
    const recent = state.recent.filter(c => byCity.has(c)).slice(0, 6);
    const big = cityNames.slice().sort((a, b) => byCity.get(b).length - byCity.get(a).length);
    const ab = state.region === 'abroad', n = regionItems().length;
    if (ab) {
      const byC = new Map(); big.forEach(c => { const k = DATA.cities[c].country; if (!byC.has(k)) byC.set(k, []); byC.get(k).push(c); });
      const countries = [...byC.keys()].sort((a, b) => byC.get(b).reduce((s, c) => s + byCity.get(c).length, 0) - byC.get(a).reduce((s, c) => s + byCity.get(c).length, 0));
      return `<div class="hero"><div class="grow"><h2>מקוואות בחו"ל</h2><p>${n} מקוואות ב-${cityNames.length} ערים ב-${countries.length} מדינות, מתוך מאגר ארגון טהרת המשפחה (הפרטים באנגלית כמו במקור).</p></div>
        <button class="btn tonal" id="heroLoc">המיקום שלי</button></div>
        ${countries.map(k => `<div class="section-title">${esc(k)} · ${byC.get(k).reduce((s, c) => s + byCity.get(c).length, 0)}</div><div class="city-grid">${byC.get(k).map(cardC).join('')}</div>`).join('')}`;
    }
    return `<div class="hero"><div class="grow"><h2>מקוואות בארץ</h2>
      <p>${n} מקוואות ב-${cityNames.length} ערים. בחרו עיר מהרשימה, חפשו רחוב או שכונה, או לחצו "המיקום שלי".</p></div>
      <button class="btn tonal" id="heroLoc">המיקום שלי</button></div>
      ${recent.length ? `<div class="section-title">נצפו לאחרונה</div><div class="city-grid">${recent.map(cardC).join('')}</div>` : ''}
      <div class="section-title">כל הערים (לפי מספר מקוואות)</div><div class="city-grid">${big.map(cardC).join('')}</div>`;
  }
  function cityView(c) {
    const all = byCity.get(c) || [], list = sortItems(all.filter(pass));
    let html = `<div class="hero"><div class="grow"><h2>${esc(c)}</h2><p>${all.length} מקוואות · ${countText(all)}${councilLine(c) ? '<br>' + councilLine(c) : ''}</p></div>
      <button class="btn ${state.favs.includes('city:' + c) ? 'tonal' : 'text'}" data-favcity="${esc(c)}">${state.favs.includes('city:' + c) ? '★ במועדפים' : '☆ הוספה למועדפים'}</button></div>`;
    if (state.pos) html += `<div class="section-title">ממוין לפי מרחק ממך</div>` + list.map(i => card(i)).join('');
    else for (const t of ORDER) { const g = list.filter(i => i.type === t); if (g.length) html += `<div class="section-title">${t === 'unknown' ? 'מקוואות שסוגם לא צוין במקור' : 'מקוואות ' + TYPE[t]} · ${g.length}</div>` + g.map(i => card(i)).join(''); }
    if (!list.length) html += `<div class="empty">אין מקוואות שמתאימים לסינון. נקו את הסינון למעלה.</div>`;
    return html;
  }
  function searchView() {
    const cities = [...byCity.keys()].filter(c => words().every(w => norm(c + ' ' + ((DATA.cities[c] || {}).country || '')).includes(w)));
    const list = sortItems(DATA.items.filter(it => pass(it) && matchQ(it))).slice(0, 300);
    if (!cities.length && !list.length) return `<div class="empty">לא נמצא "${esc(state.q)}". אפשר לחפש עיר, שכונה, רחוב או שם מקווה.<br>מקווה חסר? "אודות" ← "דיווח על מקווה חסר".</div>`;
    return `<div class="hero"><div class="grow"><h2>תוצאות עבור "${esc(state.q.trim())}"</h2><p>${cities.length} ערים · ${list.length} מקוואות</p></div></div>
      ${cities.length ? `<div class="section-title">ערים</div><div class="city-grid">${cities.map(c => `<button class="city-card" data-city="${esc(c)}"><strong>${hl(c)}</strong><span>${byCity.get(c).length} מקוואות</span></button>`).join('')}</div>` : ''}
      ${list.length ? '<div class="section-title">מקוואות</div>' + list.map(i => card(i, true)).join('') : ''}`;
  }
  function favView() {
    const cities = state.favs.filter(f => f.startsWith('city:')).map(f => f.slice(5)).filter(c => byCity.has(c));
    const list = DATA.items.filter(it => state.favs.includes(it.id) && pass(it));
    if (!cities.length && !list.length) return `<div class="empty">אין עדיין מועדפים. לחצו ☆ בכרטיס מקווה או בדף עיר.</div>`;
    return `<div class="hero"><div class="grow"><h2>מועדפים</h2></div></div>
      ${cities.length ? `<div class="section-title">ערים</div><div class="city-grid">${cities.map(c => `<button class="city-card" data-city="${esc(c)}"><strong>${esc(c)}</strong><span>${byCity.get(c).length} מקוואות</span></button>`).join('')}</div>` : ''}
      ${list.length ? '<div class="section-title">מקוואות</div>' + sortItems(list).map(i => card(i, true)).join('') : ''}`;
  }

  function renderRail() {
    const f = norm($('#cityFilter').value);
    const item = c => `<button class="city-item" data-city="${esc(c)}" aria-current="${state.view === 'city' && state.city === c && !state.q}"><span class="name">${esc(c)}</span><span class="n">${byCity.get(c).length}</span></button>`;
    const favC = state.favs.filter(x => x.startsWith('city:')).map(x => x.slice(5)).filter(c => byCity.has(c) && (!f || norm(c).includes(f)));
    const list = cityNames.filter(c => !f || norm(c + ' ' + ((DATA.cities[c] || {}).country || '')).includes(f));
    let body = '', lastCo = null;
    for (const c of list) { const co = (DATA.cities[c] || {}).country; if (co && co !== lastCo) { body += `<div class="rail-label">${esc(co)}</div>`; lastCo = co; } body += item(c); }
    $('#cityList').innerHTML = (favC.length ? '<div class="rail-label">מועדפים</div>' + favC.map(item).join('') + '<div class="rail-sep"></div>' : '') + (body || '<div class="rail-label">לא נמצאה עיר</div>');
    document.querySelectorAll('#region .seg-b').forEach(b => b.setAttribute('aria-selected', String(b.dataset.region === state.region)));
    $('#btnHome').setAttribute('aria-current', String(state.view === 'home' && !state.q));
  }
  function render(keepScroll) {
    renderRail();
    const main = $('#list');
    const filtersOn = state.q || state.view !== 'home';
    $('.filters').hidden = !filtersOn;
    if (state.q.trim()) { main.innerHTML = searchView(); $('#crumb').textContent = 'חיפוש'; }
    else if (state.view === 'city' && byCity.has(state.city)) { main.innerHTML = cityView(state.city); $('#crumb').textContent = state.city; }
    else if (state.view === 'favs') { main.innerHTML = favView(); $('#crumb').textContent = 'מועדפים'; }
    else { state.view = 'home'; main.innerHTML = homeView(); $('#crumb').textContent = 'כל הערים'; }
    $('#printHead').textContent = 'מקוואות — ' + $('#crumb').textContent + (state.type ? ' · ' + TYPE[state.type] : '');
    document.querySelectorAll('#types .chip').forEach(b => b.setAttribute('aria-selected', String(b.dataset.type === state.type)));
    $('#accOnly').checked = state.acc; $('#hoursOnly').checked = state.withHours;
    $('#btnFav').setAttribute('aria-pressed', String(state.view === 'favs'));
    $('.shell').classList.toggle('rail-hidden', !state.rail);
    if (!keepScroll) main.scrollTop = 0;
    dayTimes();
  }

  // ── ניווט ──
  function goCity(c) {
    const r = isAbroad(c) ? 'abroad' : 'il'; if (r !== state.region) { state.region = r; regionCities(); }
    state.view = 'city'; state.city = c; state.q = ''; $('#q').value = '';
    state.recent = [c, ...state.recent.filter(x => x !== c)].slice(0, 8); save('recent', state.recent);
    $('.shell').classList.remove('rail-open');
    render(); saveView();
  }
  function goHome() { state.view = 'home'; state.city = ''; state.q = ''; $('#q').value = ''; render(); saveView(); }

  // ── זמני היום מלוח השנה של אוצריא (שקיעה/צאת הכוכבים בעיר הנבחרת) ──
  let calCities = null, lastDay = null;
  async function dayTimes() {
    const bar = $('#daybar');
    const city = state.view === 'city' ? state.city : '';
    if (city === lastDay) return; lastDay = city;
    if (!hasOtz) return;
    if (!calCities) { const r = await call('calendar.getCities'); calCities = r.success && Array.isArray(r.data) ? r.data : []; }
    let p = {};
    const nc = norm(city.split('-')[0]);
    const m = city && calCities.find(c => c.inIsrael !== false && norm(c.name) === nc) || city && calCities.find(c => c.inIsrael !== false && norm(c.name).startsWith(nc));
    const cc = DATA.cities[city];
    if (m) p = { city: m.name };
    else if (cc && cc.lat) p = { lat: cc.lat, lng: cc.lon, timezone: 'Asia/Jerusalem', inIsrael: true };
    const r = await call('calendar.getDailyTimes', p);
    if (!r.success || !r.data) { bar.hidden = true; return; }
    const d = r.data, part = [d.sunset && `שקיעה <b>${esc(d.sunset)}</b>`, d.tzet && `צאת הכוכבים <b>${esc(d.tzet)}</b>`].filter(Boolean);
    bar.innerHTML = part.length ? `היום${city ? ' ב' + esc(city) : ' (העיר שבלוח השנה)'}: ` + part.join(' · ') + ' <span>(לפי לוח השנה של אוצריא)</span>' : '';
    bar.hidden = !part.length;
  }

  // ── מיקום: גשר "אחת שאלתי" ──
  async function locate() {
    const B = window.MIKVE_BRIDGE;
    toast('מאתר מיקום…');
    let pos = null;
    try { if (B && await B.available()) { const l = await B.location(); if (l && l.latitude != null) pos = { lat: l.latitude, lon: l.longitude }; else if (l && l.lat != null) pos = { lat: l.lat, lon: l.lon ?? l.lng }; } } catch (e) {}
    if (!pos && navigator.geolocation) pos = await new Promise(res => navigator.geolocation.getCurrentPosition(p => res({ lat: p.coords.latitude, lon: p.coords.longitude }), () => res(null), { timeout: 8000 }));
    if (!pos) { toast('לא התקבל מיקום. התקינו את הגשר "אחת שאלתי" או בחרו עיר מהרשימה.'); return; }
    state.pos = pos;
    // המקווה הקרוב ביותר קובע את העיר
    let best = null, bd = 1e9;
    for (const it of DATA.items) if (it.lat) { const d = dist(pos.lat, pos.lon, it.lat, it.lon); if (d < bd) { bd = d; best = it.city; } }
    for (const [c, v] of Object.entries(DATA.cities)) if (v.lat) { const d = dist(pos.lat, pos.lon, v.lat, v.lon); if (d < bd) { bd = d; best = c; } }
    if (!best) return;
    goCity(best);
    toast(bd > 25 ? `הקרוב ביותר במאגר: ${best} (כ-${Math.round(bd)} ק"מ)` : `נפתחה ${best} — ממוין לפי מרחק ממך`);
  }

  // ── לחיצות ──
  document.addEventListener('click', async e => {
    const cityBtn = e.target.closest('[data-city]'); if (cityBtn) return goCity(cityBtn.dataset.city);
    const fc = e.target.closest('[data-favcity]');
    if (fc) { const k = 'city:' + fc.dataset.favcity; state.favs = state.favs.includes(k) ? state.favs.filter(x => x !== k) : [...state.favs, k]; save('favs', state.favs); return render(true); }
    if (e.target.id === 'heroLoc') return locate();
    const op = e.target.closest('[data-open]'); if (op) return openExternal(op.dataset.open);
    const cp = e.target.closest('[data-copy]'); if (cp) return copy(cp.dataset.copy, /^https?:/.test(cp.dataset.copy) ? 'הקישור הועתק' : 'הועתק');
    const b = e.target.closest('.card [data-act]'); if (!b) return;
    const it = DATA.items.find(x => x.id === b.closest('.card').dataset.id); if (!it) return;
    const addr = `${it.address}, ${it.city}`;
    if (b.dataset.act === 'copyAddr') copy(addr, 'הכתובת הועתקה');
    else if (b.dataset.act === 'map') openExternal(it.lat ? `https://www.google.com/maps/search/?api=1&query=${it.lat},${it.lon}` : 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('מקווה ' + addr));
    else if (b.dataset.act === 'waze') openExternal(it.lat ? `https://waze.com/ul?ll=${it.lat},${it.lon}&navigate=yes` : 'https://waze.com/ul?q=' + encodeURIComponent(addr));
    else if (b.dataset.act === 'fav') { state.favs = state.favs.includes(it.id) ? state.favs.filter(x => x !== it.id) : [...state.favs, it.id]; save('favs', state.favs); render(true); }
    else if (b.dataset.act === 'report') report(it);
    else if (b.dataset.act === 'remind') remindDialog(it);
  });
  async function report(it) {
    const head = it ? `טעות בפרטי מקווה: ${TYPE[it.type]} · ${it.city} · ${it.address} (${it.id})\nמה צריך לתקן: ` : 'מקווה חסר / עיר חסרה — פרטים (עיר, כתובת, טלפון, שעות, מקור):\n';
    const r = await call('feedback.report', { details: `[מקוואות ${VERSION}] ` + head, reportType: 'content' });
    if (!r.success) toast('הדיווח לא נשלח'); else if (r.data === 'cancelled') return; else call('ui.showSuccess', { message: 'תודה! הדיווח נשלח למפתחת התוסף' });
  }

  // ── סרגלים ──
  $('#types').addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; state.type = b.dataset.type; render(true); saveView(); });
  $('#accOnly').addEventListener('change', e => { state.acc = e.target.checked; render(true); saveView(); });
  $('#hoursOnly').addEventListener('change', e => { state.withHours = e.target.checked; render(true); saveView(); });
  let qT; $('#q').addEventListener('input', e => { clearTimeout(qT); qT = setTimeout(() => { state.q = e.target.value; render(); saveView(); }, 140); });
  $('#cityFilter').addEventListener('input', renderRail);
  $('#cityFilter').addEventListener('keydown', e => { if (e.key === 'Enter') { const f = $('#cityList .city-item'); if (f) goCity(f.dataset.city); } });
  $('#btnHome').addEventListener('click', goHome);
  $('#region').addEventListener('click', e => { const b = e.target.closest('.seg-b'); if (!b || b.dataset.region === state.region) return; state.region = b.dataset.region; regionCities(); $('#cityFilter').value = ''; goHome(); });
  $('#btnOrgs').addEventListener('click', orgs);
  $('#btnExport').addEventListener('click', exportText);
  $('#btnFav').addEventListener('click', () => { state.view = state.view === 'favs' ? 'home' : 'favs'; state.q = ''; $('#q').value = ''; render(); saveView(); });
  $('#btnRail').addEventListener('click', () => {
    if (window.matchMedia('(max-width: 46em)').matches) $('.shell').classList.toggle('rail-open');
    else { state.rail = !state.rail; render(true); saveView(); }
  });
  $('#btnLoc').addEventListener('click', locate);
  $('#btnPrint').addEventListener('click', async () => {
    if (!hasOtz) return window.print();
    const r = await call('ui.print', { jobName: $('#printHead').textContent, pageSize: 'a4', orientation: 'portrait', marginMm: 12, printBackgrounds: false });
    if (!r.success) window.print();
  });
  let sT; $('#list').addEventListener('scroll', () => { clearTimeout(sT); sT = setTimeout(saveView, 400); }, { passive: true });

  // ── אודות / מקורות / ייבוא נתונים ──
  let localData = null;
  function changelog() {
    const cl = window.MIKVAOT_CHANGELOG || [];
    dialog('יומן שינויים', '<div class="cl">' + cl.map(v => `<h4>${esc(v.v)} · ${esc(v.date)}</h4><ul>${v.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`).join('') + '</div><div class="btns"><button class="btn tonal" id="backInfo">חזרה</button></div>');
  }
  function planView() {
    const p = window.MIKVAOT_PLAN || [];
    dialog('תכנון והמשך', '<div class="cl">' + p.map(g => `<h4>${esc(g.title)}</h4><ul>${g.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`).join('') + '</div><div class="btns"><button class="btn tonal" id="backInfo">חזרה</button></div>');
  }
  function info() {
    $('#infoTitle').textContent = 'אודות';
    const srcs = (DATA.sources || []).map(s => `<li>${esc(s)}</li>`).join('');
    $('#infoBody').innerHTML = `
      <p>מדריך מעשי למקוואות נשים, גברים וכלים: כתובת, טלפון, שעות ונגישות. ${DATA.items.length} מקוואות ב-${cityNames.length} ערים, נתונים מ-${esc(DATA.version.split('-').reverse().join('.'))}.</p>
      <p><b>התוסף אינו עוסק בהלכה.</b> לכל שאלה — רב הקהילה והאחראית/האחראי במקווה. השעות משתנות; יש לאמת בטלפון לפני ההגעה.</p>
      <h3>מקורות הנתונים (באישור)</h3><ul>${srcs}</ul>
      <p class="src">מקווה שמופיע בכמה מקורות מוצג פעם אחת, והמקורות הנוספים מצוינים בכרטיס.</p>
      <h3>עדכון נתונים</h3>
      <p>אפשר לטעון קובץ נתונים מעודכן (mikvaot-data.json) מדף ההורדות של התוסף.</p>
      <div class="btns"><button class="btn tonal" id="imp">טעינת קובץ נתונים</button>${localData ? '<button class="btn tonal" id="impReset">חזרה לנתונים המובנים</button>' : ''}
      <button class="btn tonal" id="rep">דיווח על מקווה חסר</button><button class="btn tonal" id="showCl">יומן שינויים מלא</button><button class="btn tonal" id="showPlan">תכנון והמשך</button></div>
      <p>דף התוסף: ${linkBtns('https://github.com/Hadabadra/Prayer-pointA/tree/%D7%9E%D7%A7%D7%95%D7%95%D7%90%D7%95%D7%AA')}</p>
      <p class="src">מקוואות ${VERSION} · חד בדרא · מיקום אוטומטי דרך הגשר "אחת שאלתי" (אם מותקן)</p>`;
    $('#infoScrim').hidden = false;
  }
  $('#btnInfo').addEventListener('click', info);
  $('#infoClose').addEventListener('click', () => $('#infoScrim').hidden = true);
  $('#infoScrim').addEventListener('click', async e => {
    if (e.target === e.currentTarget) return e.currentTarget.hidden = true;
    const id = e.target.id;
    if (id === 'expCopy') return copy($('#expText').value, 'הרשימה הועתקה').then(() => toast('הרשימה הועתקה'));
    if (id === 'expPrint') { $('#infoScrim').hidden = true; return $('#btnPrint').click(); }
    if (id === 'rmSave') return saveReminder(e.target.dataset.id);
    if (id === 'showCl') return changelog();
    if (id === 'showPlan') return planView();
    if (id === 'rep') report(null);
    else if (id === 'backInfo') info();
    else if (id === 'imp') importData();
    else if (id === 'impReset') { await call('storage.remove', { key: 'data' }); localData = null; DATA = window.MIKVAOT_DATA; index(); render(); info(); toast('חזרה לנתונים המובנים'); }
  });
  const valid = d => d && Array.isArray(d.items) && d.cities && typeof d.version === 'string' && d.items.every(i => i.id && i.city && i.type && TYPE[i.type] && i.address);
  async function importData() {
    const r = await call('fs.pickUserFile', { title: 'בחירת קובץ נתוני מקוואות', extensions: ['json'] });
    if (!r.success || !r.data || r.data.cancelled) return;
    const t = await call('fs.readTextFile', { token: r.data.token });
    let d = null; try { d = JSON.parse(t.data); } catch (e) {}
    if (!valid(d)) return call('ui.showError', { message: 'הקובץ אינו קובץ נתוני מקוואות תקין' });
    if (d.version <= window.MIKVAOT_DATA.version) {
      const c = await call('ui.showConfirm', { title: 'נתונים ישנים', content: `הקובץ מ-${d.version} אינו חדש מהנתונים המובנים (${window.MIKVAOT_DATA.version}). לטעון בכל זאת?` });
      if (!c.success || !c.data || !c.data.confirmed) return;
    }
    DATA = d; localData = d; await save('data', d); index(); render(); info();
    call('ui.showSuccess', { message: `נטענו ${d.items.length} מקוואות (${d.version})` });
  }


  // ── חלון כללי ──
  function dialog(title, html) { $('#infoTitle').textContent = title; $('#infoBody').innerHTML = html; $('#infoScrim').hidden = false; $('#infoBody').scrollTop = 0; }
  const linkBtns = u => `<button class="mini" data-open="${esc(u)}">פתיחה בדפדפן</button><button class="mini" data-copy="${esc(u)}">העתקת קישור</button>`;

  // ── ארגונים ומועצות דתיות ──
  function orgs() {
    const list = (DATA.orgs || []).slice();
    const f = it => `<div class="org"><div class="nm">${esc(it.name)}${it.note || it.address ? `<small>${esc([it.address, it.note].filter(Boolean).join(' · '))}</small>` : ''}</div>
      ${it.phone ? `<span class="phone">${esc(it.phone)}</span><button class="mini" data-copy="${esc(it.phone)}">העתק</button>` : ''}
      ${it.email ? `<span class="phone">${esc(it.email)}</span><button class="mini" data-copy="${esc(it.email)}">העתק</button>` : ''}
      ${it.url ? linkBtns(it.url) : ''}</div>`;
    const groups = [['org', 'ארגונים ומאגרים'], ['council', 'מועצות דתיות, מחלקות דת ורבנויות']];
    dialog('ארגונים ומועצות דתיות', `<p>טלפונים ואתרים מהמקורות הרשמיים, מדפי זהב ומאתרי הגופים עצמם. לפני הגעה כדאי לאמת בטלפון.</p>
      <div class="field"><input id="orgQ" type="search" placeholder="סינון לפי עיר או שם"></div><div id="orgList">${groups.map(([k, t]) => {
        const g = list.filter(o => (o.kind || 'council') === k); return g.length ? `<h3>${t} · ${g.length}</h3>` + g.map(f).join('') : '';
      }).join('')}</div>`);
    $('#orgQ').addEventListener('input', e => { const q = norm(e.target.value); document.querySelectorAll('#orgList .org').forEach(el => el.hidden = !!q && !norm(el.textContent).includes(q)); });
  }

  // ── ייצוא לטקסט להעתקה ──
  function currentList() {
    if (state.q.trim()) return sortItems(DATA.items.filter(it => pass(it) && matchQ(it)));
    if (state.view === 'city') return sortItems((byCity.get(state.city) || []).filter(pass));
    if (state.view === 'favs') return sortItems(DATA.items.filter(it => state.favs.includes(it.id) && pass(it)));
    return sortItems(regionItems().filter(pass)).sort((a, b) => a.city.localeCompare(b.city, 'he'));
  }
  function exportText() {
    const list = currentList();
    let last = null, out = [`מקוואות — ${$('#crumb').textContent}${state.type ? ' · ' + TYPE[state.type] : ''}`, `(מתוך תוסף "מקוואות" לאוצריא · ${DATA.version.split('-').reverse().join('.')} · יש לאמת שעות בטלפון)`, ''];
    const tail = ['', '—', 'להורדת התוסף "מקוואות" לאוצריא:', '• GitHub: https://github.com/Hadabadra/Prayer-pointA/releases?q=mikvaot', '• חנות התוספים של אוצריא: כלים ← תוספים ← חנות, חיפוש "מקוואות"'];
    for (const it of list) {
      if (it.city !== last) { out.push('', '■ ' + it.city); last = it.city; }
      out.push(`• ${TYPE[it.type] || 'מקווה'}: ${[it.name, it.hood].filter(Boolean).join(' · ') || it.address} — ${it.address}`);
      if (it.phone || it.contact) out.push('  טלפון: ' + [it.phone, it.contact && 'אחראי/ת ' + it.contact].filter(Boolean).join(' · '));
      const h = [it.hours, it.winter && 'חורף ' + it.winter, it.summer && 'קיץ ' + it.summer].filter(Boolean).join(' · ');
      if (h) out.push('  שעות: ' + h);
    }
    dialog('ייצוא להעתקה', `<p>${list.length} מקוואות מהתצוגה הנוכחית. אפשר לערוך לפני ההעתקה.</p><textarea id="expText">${esc(out.concat(tail).join('\n'))}</textarea>
      <div class="btns"><button class="btn" id="expCopy">העתקת הכל</button><button class="btn tonal" id="expPrint">הדפסה</button></div>`);
  }

  // ── תזכורת והוספה ללוח השנה של אוצריא ──
  function remindDialog(it) {
    const d = new Date(Date.now() + 3600e3); d.setMinutes(0, 0, 0);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60e3).toISOString().slice(0, 16);
    dialog('תזכורת / יומן', `<p>${esc((it.name || it.address) + ', ' + it.city)}</p>
      <label class="field">כותרת<input id="rmTitle" value="${esc('מקווה — ' + it.address + ', ' + it.city)}"></label>
      <label class="field">תאריך ושעה<input id="rmWhen" type="datetime-local" value="${local}"></label>
      <label class="field">התראה לפני (דקות)<input id="rmBefore" type="number" min="0" max="1440" value="30"></label>
      <label class="toggle"><input type="checkbox" id="rmCal" checked> הוספה ללוח השנה של אוצריא</label>
      <label class="toggle"><input type="checkbox" id="rmNotify" checked> התראת מערכת</label>
      <div class="btns"><button class="btn" id="rmSave" data-id="${esc(it.id)}">שמירה</button></div>
      <p class="src">התזכורת נשמרת רק במחשב שלך. הכותרת ניתנת לשינוי.</p>`);
  }
  async function saveReminder(id) {
    const it = DATA.items.find(x => x.id === id); if (!it) return;
    const when = new Date($('#rmWhen').value), title = $('#rmTitle').value.trim() || 'מקווה';
    if (isNaN(when)) return toast('נא לבחור תאריך ושעה');
    const off = -when.getTimezoneOffset(), pad = n => String(Math.floor(Math.abs(n))).padStart(2, '0');
    const iso = $('#rmWhen').value + ':00' + (off >= 0 ? '+' : '-') + pad(off / 60) + ':' + pad(off % 60);
    const done = [];
    if ($('#rmCal').checked) {
      const r = await call('publishedData.upsert', { type: 'calendar.event', scope: 'global', key: 'mikvaot:' + id + ':' + when.getTime(),
        payload: { title, startsAt: iso, source: 'מקוואות', importance: 'normal', notes: [it.address + ', ' + it.city, it.phone && 'טל׳ ' + it.phone].filter(Boolean).join(' · ') } });
      if (r.success) done.push('נוסף ללוח השנה');
    }
    if ($('#rmNotify').checked) {
      const at = new Date(when.getTime() - (Number($('#rmBefore').value) || 0) * 60e3);
      if (at <= new Date()) toast('זמן ההתראה כבר עבר — לא נקבעה התראה');
      else {
        const r = await call('notifications.scheduleSystem', { title, body: [it.address + ', ' + it.city, it.phone].filter(Boolean).join(' · '), scheduledTime: at.toISOString() });
        if (r.success) done.push('נקבעה התראה');
      }
    }
    $('#infoScrim').hidden = true;
    call('ui.showSuccess', { message: done.length ? done.join(' · ') : 'לא נשמר דבר — בדקו הרשאות התוסף' });
  }

  // ── מקלדת ──
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('#infoScrim').hidden) return $('#infoScrim').hidden = true;
    if (e.key === '/' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); $('#q').focus(); }
  });

  // ── אתחול ──
  async function start(payload) {
    payload = payload || {};
    if (payload.theme) applyTheme(payload.theme); else { const r = await call('app.getTheme'); if (r.success) applyTheme(r.data); }
    const d = await call('storage.get', { key: 'data' });
    if (d.success && valid(d.data) && d.data.version >= DATA.version) { DATA = d.data; localData = d.data; }
    index();
    for (const k of ['favs', 'recent']) { const r = await call('storage.get', { key: k }); if (r.success && Array.isArray(r.data)) state[k] = r.data; }
    const v = await call('storage.get', { key: 'view' }); if (v.success && v.data && typeof v.data === 'object') Object.assign(state, v.data);
    const rs = payload.restore && payload.restore.state; if (rs) Object.assign(state, rs);
    let online = payload.connectivity ? payload.connectivity.isOnline : null;
    if (online == null) { const c = await call('app.getConnectivity'); online = c.success && c.data ? c.data.isOnline : !hasOtz; }
    state.online = !!online;
    $('#q').value = state.q || ''; render();
    if (rs && rs.scroll) $('#list').scrollTop = rs.scroll;
  }
  if (hasOtz) {
    O.on('plugin.boot', start);
    O.on('theme.changed', applyTheme);
    O.on('calendar.city_changed', () => { lastDay = null; dayTimes(); });
  } else start(null);
})();
