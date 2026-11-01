#!/usr/bin/env bash
# מעדכן את הבסיס העולמי של המפה המשותפת מתוך עינים למקרא (Hadabadra/madaei-hatanach).
set -e
cd "$(dirname "$0")/.."
src="https://raw.githubusercontent.com/Hadabadra/madaei-hatanach/main/guides/places/data/geo-basemap.js"
{ echo "/* בסיס עולמי משותף (מפה 2.0): מועתק מעינים למקרא, guides/places/data/geo-basemap.js (Natural Earth, נחלת הכלל; תוויות בעברית). לא לערוך כאן ידנית — tools/sync-basemap.sh */"; curl -fsSL "$src"; echo; echo "window.NE_DATA = NE_DATA;"; } > shared/basemap/world-basemap.js.tmp
mv shared/basemap/world-basemap.js.tmp shared/basemap/world-basemap.js
echo "עודכן shared/basemap/world-basemap.js"
