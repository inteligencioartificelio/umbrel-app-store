#!/bin/sh
set -eu

# Fresh copy of the bundle on every start so key changes in umbrelOS apply
rm -rf /app/dist
cp -R /app/dist.pristine /app/dist
node /usr/local/bin/inject-client-keys.mjs /app/dist

exec node /app/node_modules/vite/bin/vite.js preview \
  --host 0.0.0.0 --port "${PORT:-4173}" --strictPort
