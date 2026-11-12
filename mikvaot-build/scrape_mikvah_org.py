#!/usr/bin/env python3
"""ארגון טהרת המשפחה (mikvah.org) — כל מקוואות ישראל, מתוך ה-JSON-LD בדף של כל מקווה.
בשימוש באישור הארגון. פלט: mikvaot-build/raw/mikvah_org.json
שימוש: python3 mikvaot-build/scrape_mikvah_org.py"""
import json, os, re, time, html, urllib.request

BASE = "https://mikvah.org"
here = os.path.dirname(os.path.abspath(__file__))
os.makedirs(os.path.join(here, "raw"), exist_ok=True)
UA = {"User-Agent": "Mozilla/5.0 (Otzaria mikvaot plugin data build; with permission)"}

def get(url):
    for i in range(3):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40).read().decode("utf-8", "replace")
        except Exception as e:
            err = e; time.sleep(3)
    raise err

# כל המקוואות בעולם — מתוך מפת האתר (ישראל + חו"ל)
sm = get(BASE + "/sitemap-mikvahs.xml")
links = sorted(set(u.replace(BASE, "") for u in re.findall(r"<loc>([^<]+/mikvaos/\d+/[^<]+)</loc>", sm)))
def one(u):
    try:
        s = get(BASE + u)
    except Exception as e:
        print("skip", u, e); return None
    biz = None
    for m in re.finditer(r'<script[^>]*ld\+json[^>]*>(.*?)</script>', s, re.S):
        try:
            j = json.loads(m.group(1))
        except Exception:
            continue
        if isinstance(j, dict) and j.get("@type") == "LocalBusiness":
            biz = j
    if not biz:
        return None
    a, g = biz.get("address") or {}, biz.get("geo") or {}
    desc = html.unescape(biz.get("description") or "")
    sched = desc.split("Schedule:", 1)[1].strip() if "Schedule:" in desc else ""
    # סוג המקווה מהעמוד (Women/Men/Keilim) — לפי טקסט הדף
    low = (biz.get("name", "") + " " + re.sub(r"<[^>]+>", " ", s[:200000])).lower()
    return {
        "url": BASE + u, "name": html.unescape(biz.get("name", "")), "street": a.get("streetAddress", ""),
        "city": a.get("addressLocality", ""), "region": a.get("addressRegion", ""),
        "country": a.get("addressCountry", "") or u.split("/")[3], "seg": u.split("/")[3], "postal": a.get("postalCode", ""), "lat": g.get("latitude"), "lon": g.get("longitude"),
        "phone": biz.get("telephone", ""), "schedule": sched.rstrip(" ."),
        "hint_men": bool(re.search(r"\bmen'?s mikvah\b|\bmens\b|\bmen only\b", low)),
        "hint_keilim": "keilim" in low or "kelim" in low,
    }

# 12.11.2026: הורדה במקביל (4 חיבורים) — סדר הפלט נשמר לפי מפת האתר
from concurrent.futures import ThreadPoolExecutor
with ThreadPoolExecutor(int(os.environ.get("WORKERS", "4"))) as ex:
    res = list(ex.map(one, links))
out = [r for r in res if r]
json.dump(out, open(os.path.join(here, "raw", "mikvah_org.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(out), "saved")
