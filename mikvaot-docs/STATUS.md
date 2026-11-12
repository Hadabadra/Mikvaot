# מקוואות — מצב (12.11.2026)

**הגרסה: 2.1.0 יציבה (stable). מושהה עד ~מאי 2027.** אין issues או PRs פתוחים.

- מאגר: Hadabadra/Mikvaot, ענף main. דחיפה ל-main עם גרסה חדשה → CI בודק שהחבילה `mikvaot-<גרסה>.otzplugin` שבענף זהה לאריזת הקוד (שם+CRC), יוצר Release ומפרסם לחנות (`.github/workflows/mikvaot-release.yml`).
- לפני דחיפה: `bash tools/sync-shared.sh` ואז `python3 mikvaot-build/pack.py mikvaot mikvaot-<גרסה>.otzplugin`.
- **המקור המשותף לכל התוספים** הוא `shared/` כאן: map-core, basemap, streets, report (דיווח קריסה 1.1.0), promo. גבולות עירוב מוריד אותו ב-CI; כיוון תפילה ולשון הקודש מעתיקים ידנית.
- תיקוני משתמשים: `mikvaot-build/fixes.json` (מוחל בבנייה), וגם ישירות ב-`mikvaot-data.json` + שורה 2 של `mikvaot/data.js`. יומן השינויים בתוסף = שורה 3 של data.js, נבנה מ-`mikvaot-docs/CHANGELOG.md`.
- כלל: מקוואות רק ממקור רשמי/מאושר; פרטים מדיווח משתמש — עם "דיווח משתמש (issue #N)". התוסף אינו עוסק בהלכה — מפנה לרב ולאחראית המקווה.

## מה נכנס ב-2.1.0 (12.11.2026)
- "מקווה משלי": `state.mine` ב-storage `mine`, מתמזג ל-DATA.items ב-index() (`mine:true`, id `mine:<ts>`); `mineDialog`/`mineDelete`.
- מיקום: גשר ← העיר בלוח השנה (`calendarCityPos`) ← navigator.geolocation.
- כפתור "הלכות" (`HAL`, `halDialog`, `openSrc` מגבולות עירוב): מקורות בלבד; "יורחב אחרי קבלת חומר מורחב". התוסף לא כותב סיכומי הלכה — לחומר מורחב צריך טקסט ממקור שהיא תביא.
- נתונים חדשים דרך `mikvaot-build/fixes.json` (מפתח חדש `cities` לנקודה/מועצה) והחלה מהירה ב-`python3 tools/apply_fixes.py` (בלי סריקה). ירושלים: נספח ז' במכרז המועצה הדתית 2024; אלעד/ביתר עילית: אתרי העירייה.
- `tools/validate_data.py` רץ ב-CI לפני האריזה. תבנית Issue: `.github/ISSUE_TEMPLATE/missing-mikveh.yml`.
- כפתור בסרגל הקורא (`toolbarItems`, הסתרה ב-storage `hideToolbar`), "שמירה כקובץ" בייצוא (`fs.beginBinaryWrite`).
- plan.json שוכתב: בוצע / נשאר פתוח ולמה. SOURCES-REQUEST.md — נוסח פנייה למקורות.
- אימות מקורות: דפי זהב — המבנה השתנה (הכתובת עברה לדף העסק); scrape_dzahav.py תוקן. ראו "אימות 12.11" למטה.

## מה נכנס ב-2.0.0
- #14 מקווה גברים קרלין, חפציבה (הבעל שם טוב 1, מודיעין עילית) — לפי דיווח משתמש.
- `shared/report/crash-report.js` 1.1.0 (מכיוון תפילה) + מתג "הצעת דיווח קריסה" באודות.
- תיאור חנות חדש, יציב.

## בדיקת SDK (11.11.2026)
- כבר בשימוש: `plugin.setRestoreState`, `searchFieldActions`, `ui.print`, `calendar.*`, `notifications.scheduleSystem`, `app.getConnectivity`.
- לא מתאים: `ui.printFile` (אין קבצי PDF), `app.getDivineNamesDisplay`/`events.setOptions`, `network.fetchFile`. פיצ'רי 0.9.99 — רק אחרי שתצא.

## נשאר פתוח (לאחר ההשהיה)
- טבריה ויצמן (#6), מקוואות גברים בבני ברק (#8) — אין מקור רשמי. כשיימצא: להוסיף דרך fixes.json. (אלעד נוסף ב-2.1.0.)
- #15 בת ים, החלוצים 9 — הדיווח הגיע בלי פירוט מה לתקן; לבדוק אם ידווח שוב.
- #13 הלכות טהרה, מבחנים ויומן חזרות — מחוץ לתחום התוסף (מידע מעשי בלבד); לא יתווסף.
- מנוע המפה של כיוון תפילה אל shared (Prayer-pointA#23), עינים למקרא אל shared (madaei-hatanach#258), מספרי בתים לא מקוונים, איחוד עם גבולות עירוב (ההחלטה שלה).
