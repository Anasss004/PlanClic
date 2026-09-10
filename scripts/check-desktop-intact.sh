#!/usr/bin/env bash
# Échoue si le diff introduit une classe responsive min-width (sm:/md:/lg:/xl:/2xl:)
# non préfixée par "max-", c.-à-d. une règle susceptible de s'appliquer >= 1024px.
# Les variantes max-* compilent en @media (width < ...) : inertes sur desktop par construction.
set -uo pipefail
base="${1:-main}"
bad=$(git diff "$base" -U0 -- '*.tsx' '*.css' \
  | grep '^+' | grep -v '^+++' \
  | grep -oE '(^|[^a-z-])(sm|md|lg|xl|2xl):[^ "`]+' \
  | grep -vE 'max-(sm|md|lg|xl|2xl):' \
  | sed -E 's/^[^a-z0-9]*//' | sort -u)
if [ -n "$bad" ]; then
  echo "❌ Classes min-width ajoutées (risque desktop) :"
  echo "$bad"
  exit 1
fi
echo "✅ Aucune classe min-width ajoutée — desktop (>= 1024px) inchangé par construction."
