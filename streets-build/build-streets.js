// מוריד רחובות ובתי כנסת מ-OpenStreetMap (Overpass) לכל עיר ושומר קובץ קומפקטי לכל עיר ב-streets/<slug>.json.
// רץ ב-GitHub Actions (streets-build.yml). שימוש: node streets-build/build-streets.js [out-dir]
const fs = require('fs'), path = require('path');
const MC = require('../shared/map-core/map-core.js');
const cities = require('../shared/streets/cities.json');
const out = process.argv[2] || 'streets';
fs.mkdirSync(out, { recursive: true });
const R = 3500, SERVERS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(lat, lon) {
  const q = `[out:json][timeout:180];(way["highway"]["name"](around:${R},${lat},${lon});nwr["amenity"="place_of_worship"]["religion"="jewish"](around:${R},${lat},${lon}););out tags geom;`;
  for (let t = 0; t < 4; t++) for (const s of SERVERS) {
    try {
      const r = await fetch(s, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': 'otzaria-plugins-streets/1.0 (https://github.com/Hadabadra/Mikvaot)' }, body: 'data=' + encodeURIComponent(q) });
      if (r.ok) return await r.json();
      console.log('  ', s, r.status);
    } catch (e) { console.log('  ', s, String(e)); }
    await sleep(15000);
  }
  return null;
}
(async () => {
  const done = new Set(); let ok = 0, fail = [];
  for (const [name, c] of Object.entries(cities)) {
    if (done.has(c.slug)) continue; done.add(c.slug);
    console.log(name, c.slug);
    const j = await get(c.lat, c.lon);
    if (!j) { fail.push(name); continue; }
    try {
      const a = MC.compactOverpass(j, c.lat, c.lon, R); a.name = name;
      fs.writeFileSync(path.join(out, c.slug + '.json'), JSON.stringify(a)); ok++;
    } catch (e) { console.log('  ', e.message); fail.push(name); }
    await sleep(8000);
  }
  console.log('נוצרו', ok, 'נכשלו', fail.join(', '));
  if (!ok) process.exit(1);
})();
