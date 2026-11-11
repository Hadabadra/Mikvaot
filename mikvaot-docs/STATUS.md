# מקוואות — מצב (11.11.2026)

**הגרסה: 2.0.0 יציבה (stable). מושהה עד ~מאי 2027.** אין issues או PRs פתוחים.

- מאגר: Hadabadra/Mikvaot, ענף main. דחיפה ל-main עם גרסה חדשה → CI בודק שהחבילה `mikvaot-<גרסה>.otzplugin` שבענף זהה לאריזת הקוד (שם+CRC), יוצר Release ומפרסם לחנות (`.github/workflows/mikvaot-release.yml`).
- לפני דחיפה: `bash tools/sync-shared.sh` ואז `python3 mikvaot-build/pack.py mikvaot mikvaot-<גרסה>.otzplugin`.
- **המקור המשותף לכל התוספים** הוא `shared/` כאן: map-core, basemap, streets, report (דיווח קריסה 1.1.0), promo. גבולות עירוב מוריד אותו ב-CI; כיוון תפילה ולשון הקודש מעתיקים ידנית.
- תיקוני משתמשים: `mikvaot-build/fixes.json` (מוחל בבנייה), וגם ישירות ב-`mikvaot-data.json` + שורה 2 של `mikvaot/data.js`. יומן השינויים בתוסף = שורה 3 של data.js, נבנה מ-`mikvaot-docs/CHANGELOG.md`.
- כלל: מקוואות רק ממקור רשמי/מאושר; פרטים מדיווח משתמש — עם "דיווח משתמש (issue #N)". התוסף אינו עוסק בהלכה — מפנה לרב ולאחראית המקווה.

## מה נכנס ב-2.0.0
- #14 מקווה גברים קרלין, חפציבה (הבעל שם טוב 1, מודיעין עילית) — לפי דיווח משתמש.
- `shared/report/crash-report.js` 1.1.0 (מכיוון תפילה) + מתג "הצעת דיווח קריסה" באודות.
- תיאור חנות חדש, יציב.

## בדיקת SDK (11.11.2026)
- כבר בשימוש: `plugin.setRestoreState`, `searchFieldActions`, `ui.print`, `calendar.*`, `notifications.scheduleSystem`, `app.getConnectivity`.
- לא מתאים: `ui.printFile` (אין קבצי PDF), `app.getDivineNamesDisplay`/`events.setOptions`, `network.fetchFile`. פיצ'רי 0.9.99 — רק אחרי שתצא.

## נשאר פתוח (לאחר ההשהיה)
- אלעד (#5, #12), טבריה ויצמן (#6), מקוואות גברים בבני ברק (#8) — אין מקור רשמי. כשיימצא: להוסיף דרך fixes.json.
- #15 בת ים, החלוצים 9 — הדיווח הגיע בלי פירוט מה לתקן; לבדוק אם ידווח שוב.
- #13 הלכות טהרה, מבחנים ויומן חזרות — מחוץ לתחום התוסף (מידע מעשי בלבד); לא יתווסף.
- מנוע המפה של כיוון תפילה אל shared (Prayer-pointA#23), עינים למקרא אל shared (madaei-hatanach#258), מספרי בתים לא מקוונים, איחוד עם גבולות עירוב (ההחלטה שלה).
