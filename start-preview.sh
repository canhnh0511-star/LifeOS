#!/usr/bin/env sh
cd "$(dirname "$0")"
echo 'Open http://localhost:4173/preview/'
python3 -m http.server 4173
