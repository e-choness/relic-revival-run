#!/bin/sh
# Copies jam avatar frames and fonts into public/assets, downscaling sprites to 256px tall.
# Run inside the app container: docker compose run --rm app sh scripts/import-legacy-art.sh
set -e
SRC="legacy/Assets/Animation/Character Images"
DST=public/assets/avatars
for pair in axolotl:ajolote lynx:lynx red-panda:red_panda; do
  id=${pair%%:*}; folder=${pair#*:}
  mkdir -p "$DST/$id"
  for anim in run:running jump:jumping fall:falling; do
    name=${anim%%:*}; dir="$SRC/$folder/${anim#*:}"
    n=1
    ls "$dir" | grep '\.png$' | sort | while read -r f; do
      convert "$dir/$f" -resize x256 "$DST/$id/${name}_$(printf %02d $n).png"; n=$((n+1))
    done
  done
done
mkdir -p public/assets/fonts
cp legacy/Assets/UI/Fonts/Borel-Regular.ttf legacy/Assets/UI/Fonts/EduSABeginner-VariableFont_wght.ttf public/assets/fonts/

# Hand-drawn props cropped from the jam tool sheet (WxH+X+Y).
SHEET="$SRC/tools/assets.png"
mkdir -p public/assets/props
crop() { convert "$SHEET" -crop "$2" +repage -trim +repage -resize 96x96 "public/assets/props/$1.png"; }
crop bug 105x175+5+15
crop crack 240x145+380+35
crop stain 135x110+790+50
crop brush 115x115+800+200
crop camera 150x125+40+262
crop uv 155x85+608+465
