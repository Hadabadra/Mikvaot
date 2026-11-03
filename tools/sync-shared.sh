#!/usr/bin/env bash
# מפה משותפת (Prayer-pointA#11): המקור הראשי הוא shared/ במאגר הזה (Hadabadra/Mikvaot).
# הסקריפט מעתיק את קבצי המפה המשותפים לתיקיית התוסף. מריצים אחרי כל שינוי ב-shared/ ולפני אריזה.
set -e
cd "$(dirname "$0")/.."
for f in map-core/map-core.js map-core/map-ui.js streets/streets-cities.js basemap/world-basemap.js; do cp "shared/$f" "mikvaot/$(basename "$f")"; done
mkdir -p mikvaot/shared/report mikvaot/shared/promo && cp shared/report/crash-report.js mikvaot/shared/report/ && cp shared/promo/achat-promo.js shared/promo/achat-promo.css mikvaot/shared/promo/
echo "סונכרן: map-core.js map-ui.js streets-cities.js world-basemap.js → mikvaot/"
