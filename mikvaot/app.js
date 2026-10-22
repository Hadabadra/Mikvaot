/* מקוואות — מדריך מעשי (מיקום, שעות, טלפון). אין בו הלכות; לשאלות — רב הקהילה ואחראית המקווה. */
(function () {
  'use strict';
  const VERSION = '0.1.0';
  const O = window.Otzaria, hasOtz = !!(O && O.call);
  const $ = s => document.querySelector(s);
  const call = async (m, p) => { if (!hasOtz) return { success: false }; try { const r = await O.call(m, p || {}); return r && typeof r === 'object' && 'success' in r ? r : { success: true, data: r }; } catch (e) { return { success: false, error: e }; } };

  let DATA = window.MIKVAOT_DATA;
  const TYPE = { women: 'נשים', men: 'גברים', kelim: 'כלים' };
  const ACC = { partial: 'נגישות חלקית', basic: 'נגישות בסיסית', full: 'נגישות מלאה', 'full-lift': 'נגישות מלאה כולל מנוף' };
  const state = { type: '', acc: false, city: '', q: '', favOnly: false, favs: [], online: false };

  // ── עזרים ──
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s || '').replace(/[֑-ׇ"'׳״`’\-–—,.()]/g, ' ').replace(/יי/g, 'י').replace(/וו/g, 'ו').replace(/\s+/g, ' ').trim();
  function hl(text) {
    const t = esc(text), words = norm(state.q).split(' ').filter(w => w.length > 1).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return words.length ? t.replace(new RegExp('(' + words.join('|') + ')', 'g'), '<mark>$1</mark>') : t;
  }
  let toastT;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2600); }
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

  // ── ערכת צבעים ──
  const kebab = s => s.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
  function applyTheme(t) {
    if (!t) return;
    const root = document.documentElement.style, cs = t.colorScheme || {};
    Object.keys(cs).forEach(k => root.setProperty('--color-' + kebab(k), cs[k]));
    document.documentElement.dataset.theme = t.mode === 'dark' ? 'dark' : 'light';
  }

  // ── שמירה ──
  const save = (k, v) => call('storage.set', { key: k, value: v });
  function saveView() {
    save('view', { type: state.type, acc: state.acc, city: state.city });
    call('plugin.setRestoreState', { state: { type: state.type, acc: state.acc, city: state.city, q: state.q, favOnly: state.favOnly, scroll: $('#list').scrollTop } });
  }

  // ── סינון ──
  function filtered() {
    const words = norm(state.q).split(' ').filter(Boolean);
    return DATA.items.filter(it => {
      if (state.type && it.type !== state.type) return false;
      if (state.acc && !ACC[it.acc]) return false;
      if (state.favOnly && !state.favs.includes(it.id)) return false;
      if (state.city && !words.length && it.city !== state.city) return false;
      if (words.length) { const hay = norm([it.city, it.hood, it.address, it.name].join(' ')); if (!words.every(w => hay.includes(w))) return false; }
      return true;
    });
  }

  // ── רינדור ──
  function phoneRow(k, p) {
    if (!p) return '';
    return `<div class="row"><span class="k">${k}</span><span class="phone">${esc(p)}</span><button class="mini" data-copy="${esc(p)}" title="העתקת המספר">העתק</button></div>`;
  }
  function card(it) {
    const fav = state.favs.includes(it.id);
    const title = it.name ? (/^מקווה/.test(it.name) ? it.name : 'מקווה ' + it.name) : (it.hood || it.address);
    const sub = [it.name && it.hood, it.address].filter(Boolean).join(' · ');
    const hours = [it.hours, it.winter && 'חורף: ' + it.winter, it.summer && 'קיץ: ' + it.summer].filter(Boolean).join(' · ');
    return `<article class="card${it.closed ? ' closed' : ''}" data-id="${esc(it.id)}">
      <div class="card-head"><div class="card-title">${hl(title)}<small>${hl(sub)}${state.city ? '' : ' · ' + esc(it.city)}</small></div>
        <span class="badge ${it.type}">${TYPE[it.type]}</span>${it.closed ? '<span class="badge warn">סגור לפי המקור</span>' : ''}</div>
      ${phoneRow('טלפון', it.phone)}${phoneRow('אחראי/ת', it.contact)}
      ${hours ? `<div class="row"><span class="k">שעות</span><span>${esc(hours)}</span></div>` : ''}
      ${ACC[it.acc] ? `<div class="row"><span class="k">נגישות</span><span>${ACC[it.acc]}</span></div>` : ''}
      <div class="card-foot">
        ${state.online ? '<button class="mini" data-act="map">פתיחה במפה</button><button class="mini" data-act="waze">Waze</button>' : ''}
        <button class="mini" data-act="copyAddr">העתקת כתובת</button>
        <button class="mini" data-act="report">דיווח על טעות</button>
        <button class="mini star" data-act="fav" aria-pressed="${fav}" title="מועדף">${fav ? '★' : '☆'}</button>
      </div>
      <div class="src">מקור: ${esc((DATA.cities[it.city] || {}).council?.name || '')} · נבדק ${esc(it.checked.split('-').reverse().join('.'))}</div>
    </article>`;
  }
  function render() {
    const list = filtered(), byCity = new Map();
    list.forEach(it => { if (!byCity.has(it.city)) byCity.set(it.city, []); byCity.get(it.city).push(it); });
    const order = ['women', 'men', 'kelim'];
    let html = '';
    for (const [city, arr] of byCity) {
      const c = (DATA.cities[city] || {}).council || {};
      arr.sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type) || (a.hood || '').localeCompare(b.hood || '', 'he'));
      html += `<div class="group"><h2>${esc(city)}</h2><span class="council">${esc(c.name || '')}${c.phone ? ' · <span class="phone">' + esc(c.phone) + '</span>' : ''}${c.extra ? ' · ' + esc(c.extra) : ''}</span></div>`;
      html += arr.map(card).join('');
    }
    $('#list').innerHTML = html || `<div class="empty">${state.favOnly ? 'אין עדיין מועדפים. לחצו ☆ בכרטיס מקווה.' : 'לא נמצאו מקוואות. נסו עיר אחרת או נקו את הסינון.'}<br><br>רוצים להוסיף עיר? "אודות" ← "דיווח על מקווה חסר".</div>`;
    $('#crumb').textContent = (state.favOnly ? 'מועדפים · ' : '') + (state.q ? 'חיפוש' : state.city || 'כל הערים') + ' · ' + list.length + ' מקוואות';
    $('#printHead').textContent = 'מקוואות — ' + (state.city || 'כל הערים') + (state.type ? ' · ' + TYPE[state.type] : '');
    document.querySelectorAll('#types .chip').forEach(b => b.setAttribute('aria-selected', String(b.dataset.type === state.type)));
    $('#accOnly').checked = state.acc; $('#city').value = state.city; $('#btnFav').setAttribute('aria-pressed', String(state.favOnly));
    dayTimes();
  }
  function fillCities() {
    const cities = Object.keys(DATA.cities).sort((a, b) => a.localeCompare(b, 'he'));
    $('#city').innerHTML = '<option value="">כל הערים</option>' + cities.map(c => `<option>${esc(c)}</option>`).join('');
  }

  // ── זמני היום מלוח השנה של אוצריא (שקיעה/צאת הכוכבים בעיר הנבחרת) ──
  let calCities = null, lastDay = '';
  async function dayTimes() {
    const bar = $('#daybar');
    const city = state.city || '';
    if (city === lastDay) return; lastDay = city;
    if (!hasOtz) return;
    if (!calCities) { const r = await call('calendar.getCities'); calCities = r.success && Array.isArray(r.data) ? r.data : []; }
    let p = null;
    const nc = norm(city.split('-')[0]);
    const m = city && calCities.find(c => c.inIsrael !== false && norm(c.name).startsWith(nc));
    if (m) p = { city: m.name };
    else if (city && DATA.cities[city]) p = { lat: DATA.cities[city].lat, lng: DATA.cities[city].lon, timezone: 'Asia/Jerusalem', inIsrael: true };
    const r = await call('calendar.getDailyTimes', p || {});
    if (!r.success || !r.data) { bar.hidden = true; return; }
    const d = r.data, part = [d.sunset && `שקיעה <b>${esc(d.sunset)}</b>`, d.tzet && `צאת הכוכבים <b>${esc(d.tzet)}</b>`].filter(Boolean);
    bar.innerHTML = part.length ? `היום${city ? ' ב' + esc(city) : ''}: ` + part.join(' · ') + ' <span>(לפי לוח השנה של אוצריא)</span>' : '';
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
    let best = null, bd = 1e9;
    for (const [c, v] of Object.entries(DATA.cities)) { const d = dist(pos.lat, pos.lon, v.lat, v.lon); if (d < bd) { bd = d; best = c; } }
    state.city = best; state.q = ''; $('#q').value = ''; render(); saveView();
    toast(bd > 25 ? `העיר הקרובה במאגר: ${best} (כ-${Math.round(bd)} ק"מ). עדיין אין נתונים לאזור שלך.` : `נפתחה ${best}`);
  }

  // ── פעולות בכרטיס ──
  $('#list').addEventListener('click', async e => {
    const cp = e.target.closest('[data-copy]'); if (cp) return copy(cp.dataset.copy, 'המספר הועתק');
    const b = e.target.closest('[data-act]'); if (!b) return;
    const it = DATA.items.find(x => x.id === b.closest('.card').dataset.id); if (!it) return;
    const addr = `${it.address}, ${it.city}`;
    if (b.dataset.act === 'copyAddr') copy(addr, 'הכתובת הועתקה');
    else if (b.dataset.act === 'map') openExternal('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('מקווה ' + addr));
    else if (b.dataset.act === 'waze') openExternal('https://waze.com/ul?q=' + encodeURIComponent(addr));
    else if (b.dataset.act === 'fav') {
      state.favs = state.favs.includes(it.id) ? state.favs.filter(x => x !== it.id) : [...state.favs, it.id];
      save('favs', state.favs); render();
    } else if (b.dataset.act === 'report') report(it);
  });
  async function report(it) {
    const head = it ? `טעות בפרטי מקווה: ${TYPE[it.type]} · ${it.city} · ${it.address} (${it.id})\nמה צריך לתקן: ` : 'מקווה חסר / עיר חסרה — פרטים (עיר, כתובת, טלפון, שעות, מקור):\n';
    const r = await call('feedback.report', { details: `[מקוואות ${VERSION}] ` + head, reportType: 'content' });
    if (!r.success) toast('הדיווח לא נשלח'); else if (r.data === 'cancelled') return; else call('ui.showSuccess', { message: 'תודה! הדיווח נשלח למפתחת התוסף' });
  }

  // ── סרגל ──
  $('#types').addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; state.type = b.dataset.type; render(); saveView(); });
  $('#accOnly').addEventListener('change', e => { state.acc = e.target.checked; render(); saveView(); });
  $('#city').addEventListener('change', e => { state.city = e.target.value; state.q = ''; $('#q').value = ''; render(); saveView(); });
  let qT; $('#q').addEventListener('input', e => { clearTimeout(qT); qT = setTimeout(() => { state.q = e.target.value; render(); saveView(); }, 120); });
  $('#btnFav').addEventListener('click', () => { state.favOnly = !state.favOnly; render(); saveView(); });
  $('#btnLoc').addEventListener('click', locate);
  $('#btnPrint').addEventListener('click', async () => {
    const opt = { pageSize: 'a4', orientation: 'portrait', marginMm: 12, printBackgrounds: false };
    if (!hasOtz) return window.print();
    const r = await call('ui.print', Object.assign({ jobName: $('#printHead').textContent }, opt));
    if (!r.success) window.print();
  });
  $('#list').addEventListener('scroll', () => { clearTimeout(qT); qT = setTimeout(saveView, 400); }, { passive: true });

  // ── אודות / מקורות / ייבוא נתונים ──
  function info() {
    const n = DATA.items.length, cities = Object.keys(DATA.cities).length;
    const src = Object.entries(DATA.cities).map(([c, v]) => `<li>${esc(c)} — ${esc(v.council.name)}${v.council.phone ? ' · <span class="phone">' + esc(v.council.phone) + '</span>' : ''} <button class="mini" data-url="${esc(v.council.url)}">מקור</button></li>`).join('');
    $('#infoBody').innerHTML = `
      <p>מדריך מעשי למקוואות נשים, גברים וכלים: כתובת, טלפון, שעות ונגישות. ${n} מקוואות ב-${cities} ערים, נתונים מ-${esc(DATA.version.split('-').reverse().join('.'))}.</p>
      <p><b>התוסף אינו עוסק בהלכה.</b> לכל שאלה — רב הקהילה והאחראית/האחראי במקווה. השעות משתנות; יש לאמת בטלפון.</p>
      <h3>מקורות הנתונים</h3><ul>${src}</ul>
      <p class="src">הנתונים נלקחו מאתרי המועצות הדתיות והרשויות. ערים נוספות ייכנסו לאחר קבלת אישור מהגופים המחזיקים רשימות.</p>
      <h3>עדכון נתונים</h3>
      <p>אפשר לטעון קובץ נתונים מעודכן (mikvaot-data.json) שמתפרסם בדף ההורדות של התוסף.</p>
      <div class="btns"><button class="btn tonal" id="imp">טעינת קובץ נתונים</button>${localStorageData ? '<button class="btn tonal" id="impReset">חזרה לנתונים המובנים</button>' : ''}
      <button class="btn tonal" id="rep">דיווח על מקווה חסר</button><button class="btn tonal" id="home">דף הבית של התוסף</button></div>
      <p class="src">מקוואות ${VERSION} · חד בדרא · מיקום אוטומטי דרך הגשר "אחת שאלתי" (אם מותקן)</p>`;
    $('#infoScrim').hidden = false;
  }
  $('#btnInfo').addEventListener('click', info);
  $('#infoClose').addEventListener('click', () => $('#infoScrim').hidden = true);
  $('#infoScrim').addEventListener('click', async e => {
    if (e.target === e.currentTarget) return e.currentTarget.hidden = true;
    const u = e.target.closest('[data-url]'); if (u) return openExternal(u.dataset.url);
    const id = e.target.id;
    if (id === 'rep') report(null);
    else if (id === 'home') openExternal('https://github.com/Hadabadra/Prayer-pointA/tree/%D7%9E%D7%A7%D7%95%D7%95%D7%90%D7%95%D7%AA');
    else if (id === 'imp') importData();
    else if (id === 'impReset') { await call('storage.remove', { key: 'data' }); localStorageData = null; DATA = window.MIKVAOT_DATA; fillCities(); render(); info(); toast('חזרה לנתונים המובנים'); }
  });
  let localStorageData = null;
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
    DATA = d; localStorageData = d; await save('data', d); fillCities(); render(); info();
    call('ui.showSuccess', { message: `נטענו ${d.items.length} מקוואות (${d.version})` });
  }

  // ── מקלדת ──
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('#infoScrim').hidden) return $('#infoScrim').hidden = true;
    if (e.key === '/' && document.activeElement !== $('#q')) { e.preventDefault(); $('#q').focus(); }
  });

  // ── אתחול ──
  async function start(payload) {
    payload = payload || {};
    if (payload.theme) applyTheme(payload.theme); else { const r = await call('app.getTheme'); if (r.success) applyTheme(r.data); }
    const d = await call('storage.get', { key: 'data' });
    if (d.success && valid(d.data) && d.data.version >= DATA.version) { DATA = d.data; localStorageData = d.data; }
    const f = await call('storage.get', { key: 'favs' }); if (f.success && Array.isArray(f.data)) state.favs = f.data;
    const v = await call('storage.get', { key: 'view' }); if (v.success && v.data) Object.assign(state, v.data);
    const rs = payload.restore && payload.restore.state; if (rs) Object.assign(state, rs);
    if (state.city && !DATA.cities[state.city]) state.city = '';
    let online = payload.connectivity ? payload.connectivity.isOnline : null;
    if (online == null) { const c = await call('app.getConnectivity'); online = c.success && c.data ? c.data.isOnline : !hasOtz; }
    state.online = !!online;
    fillCities(); $('#q').value = state.q || ''; render();
    if (rs && rs.scroll) $('#list').scrollTop = rs.scroll;
  }
  if (hasOtz) {
    O.on('plugin.boot', start);
    O.on('theme.changed', applyTheme);
    O.on('calendar.city_changed', () => { lastDay = null; dayTimes(); });
  } else start(null);
})();
