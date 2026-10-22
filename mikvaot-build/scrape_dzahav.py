#!/usr/bin/env python3
"""דפי זהב (d.co.il) — קטגוריית מקוואות (8120): שם, כתובת, טלפון, נקודת ציון ושעות מדף העסק.
בשימוש באישור דפי זהב. פלט: mikvaot-build/raw/dzahav.json
שימוש: python3 mikvaot-build/scrape_dzahav.py"""
import json, os, re, time, html, urllib.request

here = os.path.dirname(os.path.abspath(__file__))
os.makedirs(os.path.join(here, "raw"), exist_ok=True)
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
      "Accept-Language": "he-IL,he"}

def get(url):
    err = None
    for i in range(3):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40).read().decode("utf-8", "replace")
        except Exception as e:
            err = e; time.sleep(3)
    raise err

clean = lambda s: re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s))).strip()
out, seen = [], set()
# סריקת כל דפי הקטגוריה (כל האזורים וכל עמודי העימוד) לפי הקישורים שבדפים עצמם
todo, done = ["/h-c8120-e0-p0-l0/"], set()
while todo:
    path = todo.pop(0)
    if path in done:
        continue
    done.add(path)
    s = get("https://www.d.co.il" + path)
    for l in re.findall(r'href="(/h-c8120-e\d+-p\d+-l0/)"', s):
        if l not in done:
            todo.append(l)
    cards = re.split(r'<li data-card ', s)[1:]
    new = 0
    for c in cards:
        cid = re.search(r'data-customer-id="(\d+)"', c)
        if not cid or cid.group(1) in seen:
            continue
        seen.add(cid.group(1)); new += 1
        co = re.search(r'data-coordinates="([\d.]+),([\d.]+)"', c)
        name = re.search(r'<h3[^>]*>(.*?)</h3>', c, re.S)
        addr = re.search(r'id="result_item_navigate".*?<span>(.*?)</span>', c, re.S)
        tel = re.search(r'href="tel:([\d-]+)"', c)
        out.append({"id": cid.group(1), "name": clean(name.group(1)) if name else "",
                    "address": clean(addr.group(1)) if addr else "", "phone": tel.group(1) if tel else "",
                    "lat": float(co.group(1)) if co else None, "lon": float(co.group(2)) if co else None,
                    "url": f"https://www.d.co.il/{cid.group(1)}/8120/"})
    print(path, "new", new, "total", len(out), "queue", len(todo))
    time.sleep(1)

# שעות פעילות מדף העסק
for n, it in enumerate(out, 1):
    try:
        s = get(it["url"])
    except Exception as e:
        print("skip", it["url"], e); continue
    m = re.search(r'data-clossing-hours="([^"]*)"', s)
    if m and m.group(1).strip(","):
        it["hoursRaw"] = m.group(1)  # ראשון..שבת, "730-1930" לכל יום, ריק = סגור/לא ידוע
    time.sleep(0.7)
    if n % 20 == 0:
        print("details", n, len(out))
json.dump(out, open(os.path.join(here, "raw", "dzahav.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(out), "saved", sum(1 for i in out if i.get("hoursRaw")), "with hours")
