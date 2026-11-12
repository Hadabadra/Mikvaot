#!/usr/bin/env python3
"""מחיל את mikvaot-build/fixes.json על הנתונים הארוזים בלי סריקה מחדש:
mikvaot-data.json ושורה 2 של mikvaot/data.js (כמו apply_fixes ב-build_data.py). אפשר להריץ שוב ושוב."""
import json, os, re
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
fx = json.load(open(os.path.join(H, "mikvaot-build/fixes.json"), encoding="utf-8"))
d = json.load(open(os.path.join(H, "mikvaot-data.json"), encoding="utf-8"))
items = d["items"]
for f in fx.get("replace", []):
    for it in items:
        if all(it.get(k) == v for k, v in f["match"].items()):
            it.update(f["set"])
            for k in f.get("drop", []): it.pop(k, None)
have = {(i["city"], i["type"], i["address"]) for i in items}
for r in fx.get("add", []):
    if (r["city"], r["type"], r["address"]) not in have:
        it = dict(r); it["id"] = re.sub(r"\s+", "-", f"{it['city']}|{it['type']}|{it['address']}"); items.append(it)
for c in {i["city"] for i in items}:
    d["cities"].setdefault(c, {})
for c, v in fx.get("cities", {}).items():
    if c in d["cities"]: d["cities"][c].update(v)
s = json.dumps(d, ensure_ascii=False, separators=(",", ":"))
open(os.path.join(H, "mikvaot-data.json"), "w", encoding="utf-8").write(s)
p = os.path.join(H, "mikvaot/data.js"); L = open(p, encoding="utf-8").read().split("\n")
assert L[1].startswith("window.MIKVAOT_DATA = ")
L[1] = "window.MIKVAOT_DATA = " + s + ";"
open(p, "w", encoding="utf-8").write("\n".join(L))
print(len(items), "items")
