#!/usr/bin/env bash
# Publica dist/ en GitHub Pages (NO ejecutar sin aprobación: crea un repo PÚBLICO).
# Uso: REPO=climax-shortdrama ./scripts/deploy-gh-pages.sh
set -euo pipefail
export GIT_AUTHOR_NAME="${GIT_AUTHOR_NAME:-CLÍMAX deploy}" GIT_AUTHOR_EMAIL="${GIT_AUTHOR_EMAIL:-hele-png@users.noreply.github.com}"
export GIT_COMMITTER_NAME="$GIT_AUTHOR_NAME" GIT_COMMITTER_EMAIL="$GIT_AUTHOR_EMAIL"
REPO="${REPO:-climax-shortdrama}"
OWNER="$(gh api user -q .login)"
cd "$(dirname "$0")/.."
npm run build
gh repo view "$OWNER/$REPO" >/dev/null 2>&1 || gh repo create "$OWNER/$REPO" --public --description "CLÍMAX · prototipo PWA de mini dramas" 
TMP="$(mktemp -d)"; cp -r dist/. "$TMP"; touch "$TMP/.nojekyll"
cd "$TMP" && git init -q -b gh-pages && git add -A && git commit -qm "deploy $(date -Iseconds)"
git push -f "https://github.com/$OWNER/$REPO.git" gh-pages
gh api -X POST "repos/$OWNER/$REPO/pages" -f "source[branch]=gh-pages" -f "source[path]=/" >/dev/null 2>&1 || \
gh api -X PUT "repos/$OWNER/$REPO/pages" -f "source[branch]=gh-pages" -f "source[path]=/" >/dev/null 2>&1 || true
echo "URL: https://$OWNER.github.io/$REPO/  (tarda ~1 min en estar disponible)"
