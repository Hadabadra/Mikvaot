/* מקוואות — מדריך מעשי (מיקום, שעות, טלפון). אין בו הלכות; לשאלות — רב הקהילה ואחראית המקווה. */
(function () {
  'use strict';
  const VERSION = '0.2.0';
  const O = window.Otzaria, hasOtz = !!(O && O.call);
  const $ = s => document.querySelector(s);
  const call = async (m, p) => { if (!hasOtz) return { success: false }; try { const r = await O.call(m, p || {}); return r && typeof r === 'object' && 'success' in r ? r : { success: true, data: r }; } catch (e) { return { success: false, error: e }; } };

  let DATA = window.MIKVAOT_DATA;
  const TYPE = { women: 'נשים', men: 'גברים', kelim: 'כלים', unknown: 'מקווה' };
  const ORDER = ['women', 'men', 'kelim', 'unknown'];
  const ACC = { partial: 'נגישות חלקית', basic: 'נגישות בסיסית', full: 'נגישות מלאה', 'full-lift': 'נגישות מלאה כולל מנוף' };
  // view: home | city | favs ; q = חיפוש חופשי
  const state = { view: 'home', city: '', type: '', acc: false, withHours: false, q: '', favs: [], recent: [], online: false, pos: null, rail: true };

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
    cityNames = [...byCity.keys()].sort((a, b) => a.localeCompare(b, 'he'));
  }
  const counts = arr => ORDER.map(t => [t, arr.filter(i => i.type === t).length]).filter(x => x[1]);
  const countText = arr => counts(arr).map(([t, n]) => `${n} ${t === 'unknown' ? 'ללא סוג' : TYPE[t]}`).join(' · ');

  // ── שמירה ──
  const save = (k, v) => call('storage.set', { key: k, value: v });
  function saveView() {
    const v = { view: state.view, city: state.city, type: state.type, acc: state.acc, withHours: state.withHours, rail: state.rail };
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
    const sub = [it.name && it.hood, it.address !== it.name && it.address, withCity && it.city].filter(Boolean).join(' · ');
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
    return co ? `${esc(co.name)}${co.phone ? ' · <span class="phone">' + esc(co.phone) + '</span>' : ''}${co.extra ? ' · ' + esc(co.extra) : ''}` : '';
  }

  // ── מסכים ──
  function homeView() {
    const cardC = c => { const arr = byCity.get(c); return `<button class="city-card" data-city="${esc(c)}"><strong>${esc(c)}</strong><span>${arr.length} מקוואות · ${countText(arr)}</span></button>`; };
    const recent = state.recent.filter(c => byCity.has(c)).slice(0, 6);
    const big = cityNames.slice().sort((a, b) => byCity.get(b).length - byCity.get(a).length);
    return `<div class="hero"><div class="grow"><h2>מקוואות בארץ</h2>
      <p>${DATA.items.length} מקוואות ב-${cityNames.length} ערים. בחרו עיר מהרשימה, חפשו רחוב או שכונה, או לחצו "המיקום שלי".</p></div>
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
    const cities = cityNames.filter(c => words().every(w => norm(c).includes(w)));
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
    const list = cityNames.filter(c => !f || norm(c).includes(f));
    $('#cityList').innerHTML = (favC.length ? '<div class="rail-label">מועדפים</div>' + favC.map(item).join('') + '<div class="rail-sep"></div>' : '') + (list.map(item).join('') || '<div class="rail-label">לא נמצאה עיר</div>');
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
    const cp = e.target.closest('[data-copy]'); if (cp) return copy(cp.dataset.copy, 'המספר הועתק');
    const b = e.target.closest('.card [data-act]'); if (!b) return;
    const it = DATA.items.find(x => x.id === b.closest('.card').dataset.id); if (!it) return;
    const addr = `${it.address}, ${it.city}`;
    if (b.dataset.act === 'copyAddr') copy(addr, 'הכתובת הועתקה');
    else if (b.dataset.act === 'map') openExternal(it.lat ? `https://www.google.com/maps/search/?api=1&query=${it.lat},${it.lon}` : 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('מקווה ' + addr));
    else if (b.dataset.act === 'waze') openExternal(it.lat ? `https://waze.com/ul?ll=${it.lat},${it.lon}&navigate=yes` : 'https://waze.com/ul?q=' + encodeURIComponent(addr));
    else if (b.dataset.act === 'fav') { state.favs = state.favs.includes(it.id) ? state.favs.filter(x => x !== it.id) : [...state.favs, it.id]; save('favs', state.favs); render(true); }
    else if (b.dataset.act === 'report') report(it);
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
  function info() {
    const srcs = (DATA.sources || []).map(s => `<li>${esc(s)}</li>`).join('');
    $('#infoBody').innerHTML = `
      <p>מדריך מעשי למקוואות נשים, גברים וכלים: כתובת, טלפון, שעות ונגישות. ${DATA.items.length} מקוואות ב-${cityNames.length} ערים, נתונים מ-${esc(DATA.version.split('-').reverse().join('.'))}.</p>
      <p><b>התוסף אינו עוסק בהלכה.</b> לכל שאלה — רב הקהילה והאחראית/האחראי במקווה. השעות משתנות; יש לאמת בטלפון לפני ההגעה.</p>
      <h3>מקורות הנתונים (באישור)</h3><ul>${srcs}</ul>
      <p class="src">מקווה שמופיע בכמה מקורות מוצג פעם אחת, והמקורות הנוספים מצוינים בכרטיס.</p>
      <h3>עדכון נתונים</h3>
      <p>אפשר לטעון קובץ נתונים מעודכן (mikvaot-data.json) מדף ההורדות של התוסף.</p>
      <div class="btns"><button class="btn tonal" id="imp">טעינת קובץ נתונים</button>${localData ? '<button class="btn tonal" id="impReset">חזרה לנתונים המובנים</button>' : ''}
      <button class="btn tonal" id="rep">דיווח על מקווה חסר</button><button class="btn tonal" id="home">דף הבית של התוסף</button></div>
      <p class="src">מקוואות ${VERSION} · חד בדרא · מיקום אוטומטי דרך הגשר "אחת שאלתי" (אם מותקן)</p>`;
    $('#infoScrim').hidden = false;
  }
  $('#btnInfo').addEventListener('click', info);
  $('#infoClose').addEventListener('click', () => $('#infoScrim').hidden = true);
  $('#infoScrim').addEventListener('click', async e => {
    if (e.target === e.currentTarget) return e.currentTarget.hidden = true;
    const id = e.target.id;
    if (id === 'rep') report(null);
    else if (id === 'home') openExternal('https://github.com/Hadabadra/Prayer-pointA/tree/%D7%9E%D7%A7%D7%95%D7%95%D7%90%D7%95%D7%AA');
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
