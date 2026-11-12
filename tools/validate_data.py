#!/usr/bin/env python3
"""בדיקת תקינות לנתוני המקוואות (רצה ב-CI לפני כל שחרור): שדות חובה, סוג, קואורדינטות, טלפונים, כפילויות."""
import json, os, re, sys
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
d = json.load(open(os.path.join(H, "mikvaot-data.json"), encoding="utf-8"))
err, warn = [], []
ids = set()
for i, it in enumerate(d["items"]):
    w = f'{it.get("city")} | {it.get("address")}'
    for k in ("id", "type", "city", "address"):
        if not it.get(k): err.append(f"חסר {k}: {w}")
    if it.get("type") not in ("women", "men", "kelim", "unknown"): err.append(f"סוג לא מוכר {it.get('type')}: {w}")
    if it.get("id") in ids: err.append(f"מזהה כפול: {it.get('id')}")
    ids.add(it.get("id"))
    if it.get("lat") is not None and not (-90 <= it["lat"] <= 90 and -180 <= it["lon"] <= 180): err.append(f"קואורדינטות שגויות: {w}")
    if it.get("city") not in d["cities"]: err.append(f"עיר בלי רשומת עיר: {w}")
    p = re.sub(r"[^\d+]", "", it.get("phone") or "")
    if it.get("phone") and len(p) < 7: warn.append(f"טלפון קצר: {it['phone']} ({w})")
for e in err: print("שגיאה:", e)
for x in warn[:30]: print("אזהרה:", x)
print(f"{len(d['items'])} רשומות · {len(err)} שגיאות · {len(warn)} אזהרות")
sys.exit(1 if err else 0)
