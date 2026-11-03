#!/usr/bin/env bash
# "אחת שאלתי" — המקור היחיד מ-03.11.2026: shared/promo במאגר הזה. מועתק גם ב-tools/sync-shared.sh.
set -e; cd "$(dirname "$0")/.."; mkdir -p mikvaot/shared/promo; cp shared/promo/achat-promo.js shared/promo/achat-promo.css mikvaot/shared/promo/; echo "סונכרן: shared/promo → mikvaot/shared/promo"
