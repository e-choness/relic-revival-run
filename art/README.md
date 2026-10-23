# Visual refresh — working artwork

## Museum collection

All twelve exhibits now have original artifact illustrations. Full-resolution generated
masters live in `art/artifacts/`; optimized WebP copies live in
`public/assets/artifacts/`. The exact prompt for every image is recorded in
`art/artifacts/art-direction.json`. These were generated with the built-in
`image_gen` tool, not the API/CLI. They are interpretive game illustrations, not
documentary photographs or archaeological reconstructions; manuscript marks are
decorative and are not presented as transcribed historical text.

Research references, the pre-implementation plan, and acceptance criteria are in
`art/museum-music-plan.md`. The Cambodia illustration uses a floral sandstone
architectural lintel after figurative image generation failed. All other paired
artifact subjects follow their level labels.

`src/ui/artifacts.ts` loads and fits the same image in museum cards, detailed
exhibits, run HUDs, finales, and results. Museum wear is deliberately subtle:
unrestored exhibits remain visible, with progress stated separately. Procedural
drawings remain an image-load fallback.

Export runtime files with `docker compose run --rm app node scripts/optimize-artifacts.mjs`.
The twelve runtime images total about 2.2 MB; full-size masters remain available
for future artwork revisions.

## Cast and landscapes

This pass retains the game's animal-conservator cast and editable cut-out workflow.
Character source documents still carry `placeholder: true`; they remain working
bases for the owner's drawings. Existing owner-drawn documents are never regenerated.

- **Characters:** `avatars/*.avatar.json`, exported to `public/assets/avatars/`.
  True right-facing profiles with narrow cream coats, a single side lapel, brush
  pockets and utility pouches. Both thighs sit behind the coat hem. Separate upper
  and lower legs, boots, upper arms and forearms provide knees, ankles and elbows.
  These are native editable vector shapes, including the animal heads and tails.
- **Motion:** a forward-leaning run with planted feet, knee compression, lifted
  recovery strides and bent elbows. Cadence follows ground speed to reduce skating.
  Jumps tuck the knees; falling extends the legs for contact. Eased transitions,
  a bent-knee landing settle, and delayed coat/ear/tail movement add weight.
  Brief treatment/mistake gestures leave
  gameplay hitboxes and rhythm timing unchanged. Optional secondary movement
  respects reduced-motion preferences.
- **Landscapes:** twelve illustrated heritage settings in a shared ink-and-gouache
  style. The v3 distance paintings are joined by transparent woodland, coastal,
  or arid middle layers and a painted running path. Their on-screen speeds are
  8%, 32%, and 100% of running speed. Quiet edge strips blend into periodic textures
  once on load, so every layer wraps continuously without mirroring landmarks.
  Alpha-aware blending avoids dark foliage fringes; runtime scrolling is GPU tiled.
  Original PNG masters are in `art/backgrounds/`; compact WebP copies are in
  `public/assets/backgrounds/`. Only Mexico and its shared layers load at startup;
  other scenes load their setting when visited. The skyline is an image-load fallback.
- **Provenance:** backgrounds use the built-in `image_gen` tool, not the API/CLI.
  Exact prompts and master/runtime filenames are recorded in
  `art/backgrounds/parallax-art-direction.json` (v3), with the first-pass prompts
  retained in `art/backgrounds/art-direction-v2.json` (v2; only the PNG masters are kept, as the game uses v3). These are generated concept
  placeholders, not human-drawn final art or archaeological reconstructions.

## Review and maintain

Start `docker compose up app`, then visit:

- http://localhost:5173/tools/art-preview/ — complete cast, animation controls,
  stride scrubbing, live parallax with layer toggles, a wrap inspector, and the
  landscape gallery (development only).
- http://localhost:5173/tools/workshop/ — edit and export the characters.
- http://localhost:5173/?all — try any culture.

Regenerate only the placeholder source docs with
`docker compose run --rm app npm run placeholders -- --force`, then use the
workshop's `window.workshop.exportAll()` to export the PNG parts and rigs.

Convert the landscape masters to runtime WebP with
`docker compose run --rm app node scripts/optimize-backgrounds.mjs`.
This uses the Docker image's existing ffmpeg installation; no extra dependencies.

`scripts/review-art.cjs` is an optional Playwright browser check. It expects the
repository mounted at `/work`, a Playwright module available via `PLAYWRIGHT_MODULE`,
and the game at `GAME_URL` (default `http://host.docker.internal:5173`). Pass
`--skip-export` to review without re-exporting saved character documents.
