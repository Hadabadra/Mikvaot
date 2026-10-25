/* תרגום ממשק מקוואות לאנגלית: מילון מחרוזות מדויקות + תבניות, כמו בגבולות עירוב. תוכן הנתונים (כתובות, הערות) נשאר כמו במקור. */
(function () {
  'use strict';
  const C = {
    'אביטל': 'Avital', 'אופקים': 'Ofakim', 'אזור': 'Azor', 'אילת': 'Eilat', 'אשדוד': 'Ashdod', 'אשקלון': 'Ashkelon', 'באר שבע': 'Beer Sheva', 'ביריה': 'Biria',
    'בית אל': 'Beit El', 'בית שמש': 'Beit Shemesh', 'בני ברק': 'Bnei Brak', 'בת ים': 'Bat Yam', 'גבעת שמואל': 'Givat Shmuel', 'גבעתיים': 'Givatayim',
    'גליל תחתון': 'Lower Galilee', 'גן יבנה': 'Gan Yavne', 'זכרון יעקב': 'Zichron Yaakov', 'חולון': 'Holon', 'חיפה': 'Haifa', 'טבריה': 'Tiberias', 'טירת כרמל': 'Tirat Carmel',
    'יהוד-מונוסון': 'Yehud-Monosson', 'ייט"ב': 'Yitav', 'יצהר': 'Yitzhar', 'ירושלים': 'Jerusalem', 'כפר חב"ד': 'Kfar Chabad', 'לוד': 'Lod', 'מגדל': 'Migdal',
    'מגדל העמק': 'Migdal HaEmek', 'מודיעין עילית': 'Modiin Illit', 'מודיעין-מכבים-רעות': 'Modiin-Maccabim-Reut', 'מטולה': 'Metula', 'מעלה אדומים': 'Maale Adumim',
    'מעלה אפרים': 'Maale Efraim', 'מעלות-תרשיחא': 'Maalot-Tarshiha', 'נהריה': 'Nahariya', 'נוף הגליל': 'Nof HaGalil', 'נופית': 'Nofit', 'נתניה': 'Netanya', 'עלי': 'Eli',
    'עפולה': 'Afula', 'עפולה עילית': 'Afula Illit', 'ערד': 'Arad', 'פתח תקווה': 'Petah Tikva', 'צפת': 'Safed', 'קרית אונו': 'Kiryat Ono', 'קרית ארבע': 'Kiryat Arba',
    'קרית אתא': 'Kiryat Ata', 'קרית גת': 'Kiryat Gat', 'קרית שמואל': 'Kiryat Shmuel', 'קרית שמונה': 'Kiryat Shmona', 'רמת גן': 'Ramat Gan', 'רמת השרון': 'Ramat HaSharon',
    'שכונת יעקב': 'Shchunat Yaakov', 'תל אביב-יפו': 'Tel Aviv-Yafo', 'תל מונד': 'Tel Mond', 'ראשון לציון': 'Rishon LeZion', 'תל אביב': 'Tel Aviv'
  };
  const K = { 'ארצות הברית': 'USA', 'בריטניה': 'UK', 'צרפת': 'France', 'קנדה': 'Canada', 'מקסיקו': 'Mexico', 'ארגנטינה': 'Argentina', 'ברזיל': 'Brazil', 'גרמניה': 'Germany', 'רוסיה': 'Russia',
    'אוקראינה': 'Ukraine', 'איטליה': 'Italy', 'ספרד': 'Spain', 'שווייץ': 'Switzerland', 'בלגיה': 'Belgium', 'הולנד': 'Netherlands', 'אוסטרליה': 'Australia', 'דרום אפריקה': 'South Africa',
    'מרוקו': 'Morocco', 'קולומביה': 'Colombia', 'יפן': 'Japan', 'הודו': 'India', 'סין': 'China', 'פנמה': 'Panama', 'שוודיה': 'Sweden', 'אוסטריה': 'Austria', 'פורטוגל': 'Portugal',
    'יוון': 'Greece', 'אורוגוואי': 'Uruguay', 'בלארוס': 'Belarus', 'קפריסין': 'Cyprus', 'הונגריה': 'Hungary', 'פולין': 'Poland', 'רומניה': 'Romania', 'צ\'כיה': 'Czechia', 'צ\'ילה': 'Chile', 'פרו': 'Peru',
    'אוזבקיסטן': 'Uzbekistan', 'תאילנד': 'Thailand', 'טורקיה': 'Turkey', 'אירלנד': 'Ireland', 'דנמרק': 'Denmark', 'נורווגיה': 'Norway', 'פינלנד': 'Finland', 'בולגריה': 'Bulgaria', 'ליטא': 'Lithuania', 'לטביה': 'Latvia' };
  const W = Object.assign({}, (window.MapUI && window.MapUI.EN) || {}, C, {
    'מקוואות': 'Mikvaot', 'אודות': 'About', 'אודות, מקורות ועדכון נתונים': 'About, sources and data updates', 'ארגונים': 'Organizations', 'ארגונים ומועצות דתיות — טלפונים ואתרים': 'Organizations and religious councils: phones and sites',
    'גברים': 'Men', 'נשים': 'Women', 'כלים': 'Utensils', 'מקווה': 'Mikveh', 'הדפסה': 'Print', 'הדפסה / שמירה כ-PDF של הרשימה המוצגת': 'Print / save the displayed list as PDF', 'הכל': 'All',
    'המיקום שלי': 'My location', 'המיקום שלי — העיר הקרובה': 'My location: nearest city', 'הצגת/הסתרת רשימת הערים': 'Show/hide city list', 'חו"ל': 'Abroad', 'חיפוש': 'Search', 'ייצוא': 'Export', 'ייצוא הרשימה לטקסט להעתקה': 'Export the list as text',
    'ישראל': 'Israel', 'כל הערים': 'All cities', 'מועדפים': 'Favorites', 'מפה': 'Map', 'רשימה': 'List', 'מפה (בפיתוח)': 'Map (in development)', 'נגיש בלבד': 'Accessible only', 'סגירה': 'Close', 'סינון ערים': 'Filter cities',
    'עיר, שכונה או רחוב': 'City, neighborhood or street', 'עם שעות': 'With hours', 'ערים': 'Cities', 'רשימת ערים': 'City list',
    'השעות משתנות בין קיץ לחורף ובערבי שבת וחג — יש לאמת בטלפון לפני ההגעה. לכל שאלה: רב הקהילה והאחראית/האחראי במקווה.': 'Hours vary between summer and winter and on Shabbat and holiday eves. Please verify by phone before going. For any question, ask your community rabbi and the mikveh attendant.',
    'במפה': 'On map', 'פתיחה במפה': 'Open in maps', 'העתקת כתובת': 'Copy address', 'תזכורת / יומן': 'Reminder / calendar', 'דיווח על טעות': 'Report an error', 'העתק': 'Copy', 'טלפון': 'Phone', 'אחראי/ת': 'Attendant', 'שעות': 'Hours', 'נגישות': 'Accessibility',
    'לא פורסמו — יש לברר בטלפון': 'Not published: please call', 'סגור לפי המקור': 'Closed per source', 'נגישות חלקית': 'Partial accessibility', 'נגישות בסיסית': 'Basic accessibility', 'נגישות מלאה': 'Full accessibility', 'נגישות מלאה כולל מנוף': 'Full accessibility incl. lift',
    'לא נמצאה עיר': 'No city found', 'מועדפים ': 'Favorites', 'יומן שינויים': 'Changelog', 'תכנון והמשך': 'Plans', 'חזרה': 'Back', 'סגירה ': 'Close', 'פתיחה בדפדפן': 'Open in browser', 'העתקת קישור': 'Copy link',
    'טעינת קובץ נתונים': 'Load data file', 'חזרה לנתונים המובנים': 'Back to built-in data', 'דיווח על מקווה חסר': 'Report a missing mikveh', 'יומן שינויים מלא': 'Full changelog', 'עדכון נתונים': 'Data update', 'פרטיות': 'Privacy',
    'מקורות הנתונים (באישור)': 'Data sources (with permission)', 'בדיקת עדכון נתונים (בקרוב)': 'Check for data update (coming soon)', 'הוספת מקווה משלי (בקרוב)': 'Add my own mikveh (coming soon)',
    'האפשרות הזו מתוכננת ועדיין לא עובדת. היא מסומנת כאן כדי שיהיה ברור איך תיראה. מחכה לעזרה, הצטרפות:': 'This option is planned and does not work yet. It is shown here so you can see how it will look. Looking for help, join:',
    'הצגה ברשימה': 'Show in list', 'רכיב המפה לא נטען.': 'The map component did not load.', 'הכתובת הועתקה': 'Address copied', 'הרשימה הועתקה': 'List copied', 'הקישור הועתק': 'Link copied', 'הועתק': 'Copied',
    'ללא סוג': 'Unspecified type', 'מקווה חסר': 'Missing mikveh', 'תודה! הדיווח נשלח למפתחת התוסף': 'Thank you! The report was sent to the plugin developer', 'מאתר מיקום…': 'Locating…', 'נוסף ללוח השנה': 'Added to calendar', 'נקבעה התראה': 'Reminder set',
    'ייצוא להעתקה': 'Export for copying', 'ארגונים ומועצות דתיות': 'Organizations and religious councils', 'חורף': 'Winter', 'קיץ': 'Summer'
  });
  const P = [
    [/^הורדת רחובות: (.+)$/, (m, a) => 'Download streets: ' + (window.STREET_CITIES && window.STREET_CITIES[a] ? window.STREET_CITIES[a].en : a)],
    [/^(\d+) מקוואות$/, '$1 mikvaot'], [/^(\d+) ערים$/, '$1 cities'], [/^(.+) ממך$/, '$1 away'], [/^מקווה (.+)$/, 'Mikveh $1'], [/^חורף: (.+)$/, 'Winter: $1'], [/^קיץ: (.+)$/, 'Summer: $1'],
    [/^מקור: (.+)$/, 'Source: $1'], [/^(.+) \| מקוואות$/, '$1 | Mikvaot']
  ];
  let lang = 'he';
  try { lang = localStorage.getItem('mikvaot-lang') || 'he'; } catch (e) {}
  const trCity = t => { const m = /^(.+), ([א-ת' ]+)$/.exec(t); return m && K[m[2]] ? m[1] + ', ' + K[m[2]] : null; };
  const tr = s => {
    const t = s.trim(); if (!t || !/[א-ת]/.test(t)) return null;
    if (W[t]) return s.replace(t, W[t]);
    const c = trCity(t); if (c) return s.replace(t, c);
    for (const [re, to] of P) if (re.test(t)) return s.replace(t, t.replace(re, to));
    return null;
  };
  const ATTRS = ['title', 'placeholder', 'aria-label'];
  function apply(root) {
    if (lang !== 'en' || !root) return;
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); const nodes = []; while (tw.nextNode()) nodes.push(tw.currentNode);
    for (const n of nodes) { if (n.parentElement && n.parentElement.closest('textarea,script,style')) continue; const r = tr(n.nodeValue); if (r !== null && r !== n.nodeValue) n.nodeValue = r; }
    const els = root.querySelectorAll ? root.querySelectorAll('[title],[placeholder],[aria-label]') : [];
    for (const el of els) for (const a of ATTRS) { const v = el.getAttribute(a); if (v) { const r = tr(v); if (r !== null && r !== v) el.setAttribute(a, r); } }
  }
  function setLang(l) { lang = l; try { localStorage.setItem('mikvaot-lang', l); } catch (e) {} location.reload(); }
  window.MIKVAOT_I18N = { get lang() { return lang; }, setLang };
  function init() {
    const b = document.getElementById('btnLang');
    if (b) { b.textContent = lang === 'en' ? 'עב' : 'EN'; b.title = lang === 'en' ? 'עברית' : 'English'; b.onclick = () => setLang(lang === 'en' ? 'he' : 'en'); }
    if (lang !== 'en') return;
    document.documentElement.lang = 'en'; document.documentElement.dir = 'ltr'; document.title = 'Mikvaot';
    apply(document.body);
    let busy = false;
    new MutationObserver(ms => { if (busy) return; busy = true; try { for (const m of ms) { if (m.type === 'attributes') apply(m.target); for (const n of m.addedNodes) n.nodeType === 1 ? apply(n) : n.nodeType === 3 && n.parentElement && apply(n.parentElement); } } finally { busy = false; } })
      .observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
