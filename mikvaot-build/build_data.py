#!/usr/bin/env python3
"""בונה את mikvaot/data.js מנתוני המועצות הדתיות (מקורות רשמיים בלבד).
מידע מעשי בלבד: כתובת, טלפון, שעות, נגישות. בלי שמות פרטיים של אחראיות — רק טלפון.
שימוש: python3 mikvaot-build/build_data.py   (מתוך שורש הענף)"""
import json, os, re

CHECKED = "2026-10-22"

# עיר: (קו רוחב, קו אורך) — מרכז העיר בקירוב, לחישוב "העיר הקרובה" ממיקום הגשר
CITIES = {
    "בני ברק": (32.0840, 34.8338),
    "תל אביב-יפו": (32.0853, 34.7818),
    "פתח תקווה": (32.0871, 34.8875),
    "נוף הגליל": (32.7019, 35.3233),
    "מודיעין עילית": (31.9310, 35.0440),
    "מודיעין-מכבים-רעות": (31.8980, 35.0104),
}

COUNCILS = {
    "תל אביב-יפו": {"name": "המועצה הדתית תל אביב-יפו", "phone": "03-6938989",
                    "extra": "מחלקת מקוואות: 03-6938972", "address": "אורי לסר 1 (פינת דוד המלך 33)",
                    "url": "https://rabanut.co.il/"},
    "פתח תקווה": {"name": "המועצה הדתית פתח תקווה", "phone": "03-9051555",
                  "address": "חובבי ציון 37", "url": "https://mpt.org.il/directory-mikvah/"},
    "נוף הגליל": {"name": "המועצה הדתית נוף הגליל", "phone": "04-6554354",
                  "address": "לבנה 8", "url": "https://mdnh.org.il/directory-mikvah/"},
    "מודיעין עילית": {"name": "עיריית מודיעין עילית — מקוואות", "phone": "08-6668977",
                      "extra": "קביעת תורים: 08-6668977 · מנוי מקוואות גברים: 052-6644496",
                      "url": "https://www.modil.org.il/%D7%A8%D7%A9%D7%99%D7%9E%D7%AA-%D7%94%D7%9E%D7%A7%D7%95%D7%95%D7%90%D7%95%D7%AA/"},
    "בני ברק": {"name": "עיריית בני ברק — מחלקת מקוואות", "phone": "03-6365473",
                "extra": "מנהל המחלקה: 050-4132825 · פיקוח: 050-4129878", "address": "ירושלים 58",
                "url": "https://www.bnei-brak.muni.il/mikvahs/"},
    "מודיעין-מכבים-רעות": {"name": "עיריית מודיעין-מכבים-רעות — מקוואות",
                          "extra": "רכזת בלניות: 053-4831585",
                          "url": "https://www.modiin.muni.il/modiinwebsite/ArticlePage.aspx?PageID=145_374"},
}

SRC_TA_W = "https://rabanut.co.il/%D7%97%D7%99%D7%A4%D7%95%D7%A9-%D7%9E%D7%A7%D7%95%D7%95%D7%90%D7%95%D7%AA/%D7%A8%D7%A9%D7%99%D7%9E%D7%AA-%D7%9E%D7%A7%D7%95%D7%95%D7%90%D7%95%D7%AA-%D7%A0%D7%A9%D7%99%D7%9D/"
SRC_TA_K = "https://rabanut.co.il/%d7%97%d7%99%d7%a4%d7%95%d7%a9-%d7%9e%d7%a7%d7%95%d7%95%d7%90%d7%95%d7%aa/%d7%a8%d7%a9%d7%99%d7%9e%d7%aa-%d7%9e%d7%a7%d7%95%d7%95%d7%90%d7%95%d7%aa-%d7%9b%d7%9c%d7%99%d7%9d/"

items = []
def add(city, type_, address, *, name="", hood="", phone="", contact="", hours="",
        summer="", winter="", acc="unknown", closed=False, src=None):
    items.append({k: v for k, v in dict(
        type=type_, name=name, city=city, hood=hood, address=address,
        phone=phone, contact=contact, hours=hours, summer=summer, winter=winter,
        acc=acc, closed=closed or None, src=src or COUNCILS[city]["url"], checked=CHECKED,
    ).items() if v not in ("", None)})

# ── תל אביב-יפו — נשים (שעת סגירה קיץ/חורף) ────────────────────────
TA = [
    ("צפון", "פקיעין 12", "03-5464899", "050-8785926", "22:30", "21:30", "unknown", False),
    ("צפון", "צירלסון 10", "03-5468893", "054-8458150", "22:30", "21:30", "unknown", False),
    ("צפון — עין מרים", "בן יהודה 86", "03-5228188", "052-7162237", "22:30", "21:30", "partial", False),
    ("רמת אביב", "טאגור 32", "03-6439725", "", "", "", "unknown", True),
    ("רמת החייל", "הט\"ז 8", "03-6470623", "054-4742089", "22:30", "21:30", "full-lift", False),
    ("נווה שרת", "ראול ולנברג 37", "03-6472626", "054-5615574", "22:30", "21:30", "full-lift", False),
    ("הדר יוסף", "מרק יעקב 3", "03-6470960", "052-7671382", "22:30", "21:30", "unknown", False),
    ("בר כוכבא", "בר כוכבא 54", "03-5288055", "054-4742089", "22:30", "21:30", "unknown", False),
    ("מרכז", "יבנה 10", "03-6296512", "055-5562776", "22:30", "21:30", "unknown", False),
    ("נווה צדק", "פינס 24", "03-5108677", "050-8995665", "22:30", "21:30", "unknown", False),
    ("קרית שלום", "החזיון 3א", "03-6817093", "050-4102304", "22:30", "21:30", "unknown", False),
    ("שפירא", "חכמי ישראל 65", "03-6880892", "052-3266514", "22:30", "21:30", "unknown", False),
    ("כפיר", "בושם 59", "03-6319535", "054-7708312", "22:30", "21:30", "unknown", False),
    ("ביצרון", "שד' ההשכלה 10", "03-5610089", "052-2422636", "22:30", "21:30", "unknown", False),
    ("יד אליהו", "שד' החייל 4א", "03-5371256", "052-7686197", "22:30", "21:30", "unknown", False),
    ("יפו", "שד' התחיה 4", "03-6827142", "050-7924243", "22:00", "21:00", "basic", False),
    ("תל כביר", "אוריאל יעקובוב 4", "03-5187164", "", "22:30", "21:30", "full", True),
    ("שכונת עזרא", "כסלו 23", "03-6876211", "054-7904695", "22:30", "21:30", "unknown", False),
    ("יפו", "סג'רה 9", "03-6965166", "052-6218097", "22:30", "22:00", "unknown", False),
]
for hood, addr, ph, ct, s, w, acc, closed in TA:
    add("תל אביב-יפו", "women", addr, hood=hood, phone=ph, contact=ct,
        summer=("עד " + s) if s else "", winter=("עד " + w) if w else "",
        acc=acc, closed=closed, src=SRC_TA_W)

# ── תל אביב-יפו — כלים (בתיאום עם הבלן) ───────────────────────────
TAK = [("יד אליהו", "שד' החייל 4א", "03-5371256"), ("ביצרון", "שד' ההשכלה 10", "03-5610089"),
       ("כפיר", "בושם 59", "03-6319535"), ("קרית שלום", "החזיון 3א", "03-6817093"),
       ("שכונת עזרא", "כסלו 23", "03-6876211"), ("שפירא", "שד' חכמי ישראל 65", "03-6880892"),
       ("מרכז", "יבנה 10", "03-6296512"), ("נווה צדק", "פינס 24", "03-5108677"),
       ("מרכז", "בר כוכבא 54", "03-5288055"), ("צפון", "צירלסון 10", "03-5468893"),
       ("יפו", "סג'רה 9", "03-6470960"), ("נווה שרת", "ראול ולנברג 37", "03-6472626"),
       ("הדר יוסף", "מרק יעקב 3", "03-6470960")]
for hood, addr, ph in TAK:
    add("תל אביב-יפו", "kelim", addr, hood=hood, phone=ph, hours="בתיאום טלפוני עם הבלן במקווה", src=SRC_TA_K)

# ── פתח תקווה ────────────────────────────────────────────────────
PT_W_H = "חורף: מחצי שעה לפני צאת הכוכבים עד 22:00 · קיץ: עד 23:00"
add("פתח תקווה", "men", "ההגנה 25", name="טהרת אשר — מרכז העיר", contact="055-5519522",
    hours="א'–ה' 05:00–11:00 · ערבי שבתות וחגים 05:00–13:45")
add("פתח תקווה", "men", "שמואל הנגיד 1", name="כפר אברהם — חן הצפון", contact="055-6876069",
    hours="א'–ה' 05:00–10:00 · ערבי שבתות וחגים 05:00–15:00 (סגירת דלתות 14:45)")
for name, addr, ph, ct in [
    ("חן הצפון", "שמואל הנגיד 1", "03-9348104", "054-8433268"),
    ("מוסטובוי", "מוסטובוי 11", "03-9226792", ""),
    ("מעיין חנה — תורן", "שבט גד 4", "03-9324591", "052-7687074"),
    ("פג'ה", "דוד רמז 54", "03-9305437", "054-7717580"),
    ("שעריה", "השופטים 18", "03-9324523", "052-7193502"),
    ("חיים עוזר", "חיים עוזר 8", "03-9344973", "054-2884390"),
    ("נווה גן", "אסירי ציון 13", "03-9210463", "054-6535337"),
    ("באר מרים", "העצמאות 6", "03-9336414", "050-2961056"),
    ("מעיין חיים", "דרך מנחם בגין 30", "03-5716840", "054-7724916"),
    ("נווה דקלים — משכן שמעון", "דורני שלום 5", "03-5058891", "054-7724936"),
]:
    add("פתח תקווה", "women", addr, name=name, phone=ph, contact=ct, hours=PT_W_H)

# ── נוף הגליל ────────────────────────────────────────────────────
add("נוף הגליל", "women", "קדושת אהרון 1", name="מלכות דוד", phone="04-3012099", contact="053-3114923",
    winter="16:15–21:30", summer="18:30–22:00")
add("נוף הגליל", "women", "נרקיסים", name="מקווה צפוני", phone="04-6268086", contact="050-8993096",
    winter="16:15–21:00", summer="19:00–23:00")
add("נוף הגליל", "women", "חרוד / יזרעאל", name="מקווה דרומי", phone="04-3012098",
    winter="16:15–21:00", summer="18:30–22:00")

# ── מודיעין עילית ────────────────────────────────────────────────
MI_MEN_H = "א'–ה' בבוקר עד 10:30 · יום ו' עד שעה לפני שבת"
for hood, addr, ph in [("קרית ספר", "מסילת יוסף 13", "08-9741758"), ("קרית ספר", "אבני נזר 14", "08-9740156"),
                       ("ברכפלד", "שד' יחזקאל 33", "08-9743656"), ("ברכפלד", "יהודה הנשיא 26א", "08-9742091"),
                       ("חפציבה", "אלישיב 23", "08-9740578"), ("נאות הפסגה", "הריטב\"א 4", "08-9745035"),
                       ("קרית ספר", "חזון דוד 19", "08-9741839")]:
    add("מודיעין עילית", "women", addr, hood=hood, phone=ph, hours="תורים: 08-6668977")
for hood, addr in [("קרית ספר", "אבני נזר 16"), ("קרית ספר", "מסילת יוסף 13"), ("קרית ספר", "חזון דוד 19"),
                   ("ברכפלד", "שד' יחזקאל 33"), ("ברכפלד", "יהודה הנשיא 26א"), ("חפציבה", "קהילות יעקב 1"),
                   ("נאות הפסגה", "הריטב\"א 4")]:
    add("מודיעין עילית", "men", addr, hood=hood, hours=MI_MEN_H)
for hood, addr in [("קרית ספר", "אבני נזר 16"), ("קרית ספר", "אבני נזר 46 — חצר אחורית"),
                   ("קרית ספר", "חזון דוד 19 — גישה לרכבים מרחוב שערי תשובה"), ("ברכפלד", "שד' יחזקאל 33"),
                   ("ברכפלד", "יהודה הנשיא 26א"), ("חפציבה", "קהילות יעקב 1"), ("נאות הפסגה", "הריטב\"א 4")]:
    add("מודיעין עילית", "kelim", addr, hood=hood)

# ── מודיעין-מכבים-רעות — כלים (עד השקיעה) ─────────────────────────
for addr, ph in [("אליהו הנביא 14", "08-9715759"), ("עמק דותן 35", "08-9707133"), ("אבני החושן 24", "08-9704870"),
                 ("גבעת הלבונה 2, רעות", "08-9262876"), ("יעל הגיבורה 62", "08-6517908")]:
    add("מודיעין-מכבים-רעות", "kelim", addr, phone=ph, hours="עד השקיעה")

# ── בני ברק — אתר העירייה (שעות כלליות; בערבי שבת וחג יש לברר בטלפון) ──────
BB_H = "יום יום: פתיחה שעה לפני זמן הטבילה, סגירה 23:00 · ערבי שבת וחג — לברר בטלפון"
for name, addr, ph in [("ויז'ניץ", "רבינא 14", "03-5744870"), ("זכרון מאיר", "חפץ חיים 7 / מהרש\"ל 14", "03-6187479"),
                       ("מי נחת", "אחיה השילוני 4", "03-5709617"), ("מרכז", "קאליש 14 (פינת מימון)", "03-5794489"),
                       ("נווה אחיעזר", "נחשוני 28", "03-5744869"), ("פרדס כץ", "דנגור 12א (בצד ימין של בית הכנסת)", "03-5790636"),
                       ("קריית הרצוג", "נויפלד 15 / אברבנאל 46", "03-6196867"), ("שיכון ג'", "בארי 7", "03-5744868"),
                       ("שיכון ה'", "זבולון המר 13 (מאחורי בר אילן 33)", "03-5794661"), ("סוקולוב", "אבן שפרוט 4", "03-9608182"),
                       ("הסופרים", "מתחת לגשר", "053-3121976")]:
    add("בני ברק", "women", addr, name=name, hood=name, phone=ph, hours=BB_H)
add("בני ברק", "women", "אבני נזר 13 (צמוד ל\"אם וילד\")", name="רמת אלחנן", hood="רמת אלחנן", phone="03-5705417",
    hours="יום יום: פתיחה שעה לפני זמן הטבילה, סגירה 01:00 (מקווה תורן)")

# ── מקורות ארציים (באישור): דפי זהב וארגון טהרת המשפחה ───────────────
# הנתונים הגולמיים נשאבים ב-scrape_dzahav.py / scrape_mikvah_org.py לתיקיית raw/.
# מקווה שכבר קיים (אותו טלפון, או נקודת ציון עד ~80 מ') — מועשר בנקודת ציון/שעות ולא משוכפל.
here0 = os.path.dirname(os.path.abspath(__file__))
SRC_NAMES = {"dz": "דפי זהב", "mo": "ארגון טהרת המשפחה (mikvah.org)"}
for c in items:
    c["srcName"] = COUNCILS[c["city"]]["name"]

CITY_HE = {  # mikvah.org (אנגלית) → עברית
    "jerusalem": "ירושלים", "haifa": "חיפה", "bet shemesh": "בית שמש", "ramat bet shemesh": "בית שמש",
    "ramat bet shemesh b": "בית שמש", "kiryat gat": "קרית גת", "modiin": "מודיעין-מכבים-רעות",
    "maccabim-reut": "מודיעין-מכבים-רעות", "kfar chabad": "כפר חב\"ד", "migdal ha'emek": "מגדל העמק",
    "sfad": "צפת", "ashdod": "אשדוד", "bnei brak": "בני ברק", "azor": "אזור", "gan yavne": "גן יבנה",
    "ofakim": "אופקים", "tel mond": "תל מונד", "tel aviv": "תל אביב-יפו", "arad": "ערד", "naharia": "נהריה",
    "eilat": "אילת", "be'er sheva": "באר שבע", "cholon": "חולון", "lod": "לוד", "petach tikvah": "פתח תקווה",
    "petach tikva": "פתח תקווה", "migdal": "מגדל", "metulla": "מטולה", "lower galilee": "גליל תחתון",
    "kiryat shmuel": "קרית שמואל", "shechunat yaakov": "שכונת יעקב", "ramat hasharon": "רמת השרון",
    "kiryat hasharon, netanya": "נתניה", "kiryat ono": "קרית אונו", "maale ephraim": "מעלה אפרים",
    "moshav avital": "אביטל", "ramat gan": "רמת גן", "lev hashomron": "יצהר", "nofit": "נופית",
    "yahud monoson": "יהוד-מונוסון", "givat shmuel": "גבעת שמואל", "tiberias": "טבריה", "har adar": "הר אדר",
}
CITY_ALIAS = {  # שמות עבריים שונים לאותה עיר
    "תל אביב": "תל אביב-יפו", "תל אביב יפו": "תל אביב-יפו", "יפו": "תל אביב-יפו", "דרום תל אביב": "תל אביב-יפו",
    "צפון תל אביב": "תל אביב-יפו", "ירושלים העתיקה": "ירושלים", "פתח תקוה": "פתח תקווה", "מודיעין": "מודיעין-מכבים-רעות",
    "מכבים רעות": "מודיעין-מכבים-רעות", "רעות": "מודיעין-מכבים-רעות", "קריית גת": "קרית גת", "קריית אתא": "קרית אתא",
    "קריית ביאליק": "קרית ביאליק", "קריית מוצקין": "קרית מוצקין", "קריית ים": "קרית ים", "קריית שמונה": "קרית שמונה",
    "קריית מלאכי": "קרית מלאכי", "קריית ארבע": "קרית ארבע", "קריית אונו": "קרית אונו", "קריית חיים חיפה": "חיפה",
    "קריית חיים": "חיפה", "נצרת עילית": "נוף הגליל", "מודיעין עלית": "מודיעין עילית", "ביתר עלית": "ביתר עילית",
    "בית שמש רמה": "בית שמש", "רמת בית שמש": "בית שמש", "אלעד ": "אלעד", "יהוד": "יהוד-מונוסון",
}
KNOWN = set(CITIES) | set(CITY_HE.values()) | set(CITY_ALIAS.values())

def he_city(s):
    s = re.sub(r"\s+", " ", s or "").strip(" ,")
    if s in CITY_ALIAS: return CITY_ALIAS[s]
    if s in KNOWN: return s
    for k in sorted(KNOWN | set(CITY_ALIAS), key=len, reverse=True):  # "שכונת גאולה ירושלים" → ירושלים
        if k and k in s:
            return CITY_ALIAS.get(k, k)
    return s

def kind(name):
    n = name.lower()
    if re.search(r"כלים|keilim|kelim|keylim", n): return "kelim"
    if re.search(r"גברים|men'?s|\bmen\b|מרחץ", n) and not re.search(r"נשים|women", n): return "men"
    if re.search(r"נשים|women|טהרה|taharah|taharas|nashim|mikve|mikvah|mikveh", n): return "women"
    return "unknown"

digits = lambda p: re.sub(r"\D", "", p or "").lstrip("0").removeprefix("972").lstrip("0")
def fmt_phone(p):
    d = re.sub(r"\D", "", p or "")
    if d.startswith("972"): d = "0" + d[3:]
    if len(d) == 10: return d[:3] + "-" + d[3:]
    if len(d) == 9: return d[:2] + "-" + d[2:]
    return p.strip()

def near(a, b):
    return a.get("lat") and b.get("lat") and abs(a["lat"] - b["lat"]) < 0.0008 and abs(a["lon"] - b["lon"]) < 0.0009

DAYS = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"]
def dz_hours(raw):
    if not raw: return ""
    parts = (raw.split(",") + [""] * 7)[:7]
    t = lambda x: f"{int(x[:-2] or 0)}:{x[-2:]}"
    spans = []
    for i, p in enumerate(parts):
        txt = "–".join(t(x) for x in p.split("-")) if re.fullmatch(r"\d{3,4}-\d{3,4}", p or "") else ""
        if spans and spans[-1][2] == txt and spans[-1][1] == i - 1: spans[-1][1] = i
        else: spans.append([i, i, txt])
    out = [f"{DAYS[a]}{'–' + DAYS[b] if b > a else ''} {txt}" for a, b, txt in spans if txt]
    return " · ".join(out)

def merge(rec):
    if not rec.get("city"): return True  # בלי עיר — לא נכנס
    ph = digits(rec.get("phone"))
    for it in items:
        if it.get("city") != rec["city"]: continue
        if (ph and ph in (digits(it.get("phone")), digits(it.get("contact")))) or near(it, rec):
            for k in ("lat", "lon"):
                if rec.get(k) and not it.get(k): it[k] = rec[k]
            if rec.get("hours") and not (it.get("hours") or it.get("summer") or it.get("winter")):
                it["hours"] = rec["hours"]
            it.setdefault("also", [])
            if rec["srcName"] not in it["also"] and rec["srcName"] != it["srcName"]: it["also"].append(rec["srcName"])
            return True
    return False

raw_dir = os.path.join(here0, "raw")
added = {"dz": 0, "mo": 0}
mo_path, dz_path = os.path.join(raw_dir, "mikvah_org.json"), os.path.join(raw_dir, "dzahav.json")
if os.path.exists(mo_path):
    for r in json.load(open(mo_path, encoding="utf-8")):
        city = CITY_HE.get(r["city"].strip().lower(), r["city"].strip())
        rec = dict(type=kind(r["name"]) if kind(r["name"]) != "unknown" else "women", name=r["name"], city=city,
                   address=r["street"], phone=fmt_phone(r["phone"]), hours=r["schedule"], lat=r["lat"], lon=r["lon"],
                   src=r["url"], srcName=SRC_NAMES["mo"], lang="en", checked=CHECKED)
        if r.get("hint_keilim") and rec["type"] == "women" and re.search(r"keilim|kelim", r["name"], re.I): rec["type"] = "kelim"
        if not merge(rec):
            items.append({k: v for k, v in rec.items() if v not in ("", None)}); added["mo"] += 1
if os.path.exists(dz_path):
    for r in json.load(open(dz_path, encoding="utf-8")):
        a = r["address"].strip()
        street, _, cty = a.rpartition(",") if "," in a else ("", "", a)
        city = he_city(cty.strip())
        name = re.sub(r"^(מקו+ה)\s*-\s*", r"\1 ", r["name"]).strip()
        rec = dict(type=kind(name), name=name, city=city, address=street.strip() or "", phone=fmt_phone(r["phone"]),
                   hours=dz_hours(r.get("hoursRaw")), lat=r["lat"], lon=r["lon"], src=r["url"],
                   srcName=SRC_NAMES["dz"], checked=CHECKED)
        if not rec["address"]: rec["address"] = name
        if not merge(rec):
            items.append({k: v for k, v in rec.items() if v not in ("", None)}); added["dz"] += 1
print("added from national sources:", added)

# מרכזי ערים: מהטבלה הקבועה, ואם אין — ממוצע נקודות הציון של המקוואות בעיר
for it in items:
    if it["city"] not in CITIES:
        pts = [(x["lat"], x["lon"]) for x in items if x["city"] == it["city"] and x.get("lat")]
        if pts: CITIES[it["city"]] = (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts))
for c in CITIES: COUNCILS.setdefault(c, None)

# מזהה יציב
seen = {}
for it in items:
    base = f"{it['city']}|{it['type']}|{it['address']}"
    seen[base] = seen.get(base, 0) + 1
    it["id"] = re.sub(r"\s+", "-", base) + ("" if seen[base] == 1 else f"#{seen[base]}")

cities_out = {}
for c in sorted({i["city"] for i in items}):
    a, b = CITIES.get(c, (None, None))
    cities_out[c] = {k: v for k, v in {"lat": a, "lon": b, "council": COUNCILS.get(c)}.items() if v is not None}
data = {"version": CHECKED, "sources": [v["name"] for v in COUNCILS.values() if v] + list(SRC_NAMES.values()),
        "cities": cities_out, "items": items}
here = os.path.dirname(os.path.abspath(__file__))
out = os.path.join(here, "..", "mikvaot", "data.js")
with open(out, "w", encoding="utf-8") as f:
    f.write("/* נוצר אוטומטית מ-mikvaot-build/build_data.py — לא לערוך ידנית */\n")
    f.write("window.MIKVAOT_DATA = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n")
with open(os.path.join(here, "..", "mikvaot-data.json"), "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=1)
from collections import Counter
print(len(items), "items", dict(Counter(i["type"] for i in items)), dict(Counter(i["city"] for i in items)))
