#!/usr/bin/env bash
# Garde-fou "desktop intact".
#
# Les variantes Tailwind max-* compilent en @media (width < N) : elles ne peuvent
# pas s'appliquer au-dessus de leur seuil. Le rendu desktop ne peut donc changer
# que si une classe min-width (sm:/md:/lg:/xl:/2xl:) est ajoutée ou retirée.
#
# On compare, fichier par fichier, le jeu de tokens min-width entre la base et la
# version de travail. Comparer les tokens et non les lignes du diff évite les faux
# positifs quand on ajoute un max-* sur une ligne qui contenait déjà un md:.
set -uo pipefail
base="${1:-main}"
statut=0

# Extrait les tokens min-width, en consommant d'abord un éventuel préfixe max-
# pour que "max-md:flex" ne soit jamais compté comme "md:flex".
tokens() {
  grep -oE '(max-)?(sm|md|lg|xl|2xl):[A-Za-z0-9_.:/\[\]#%()-]+' \
    | grep -v '^max-' | sort | uniq -c
}

for f in $(git diff "$base" --name-only -- '*.tsx' '*.css'); do
  [ -f "$f" ] || continue
  avant=$(git show "$base:$f" 2>/dev/null | tokens)
  apres=$(tokens < "$f")
  if [ "$avant" != "$apres" ]; then
    echo "❌ $f — le jeu de classes min-width a changé :"
    diff <(echo "$avant") <(echo "$apres") | sed 's/^/    /'
    statut=1
  fi
done

if [ "$statut" -eq 0 ]; then
  echo "✅ Aucune classe min-width ajoutée ni retirée — rendu >= 1024px inchangé par construction."
fi
exit "$statut"
