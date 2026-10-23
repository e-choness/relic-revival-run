# Museum artwork and procedural score plan

Prepared 2026-10-15 before implementation.

## Findings in this repository

MuseumScene draws the same small procedural rectangles and silhouettes used by the HUD. No artifact image assets exist. Unvisited exhibits receive 92% opaque brown covers, so they appear empty. The gallery uses only 170 × 88 pixels per artifact, and its detail view allocates 330 × 210 pixels to the image.

AudioDirector composes three independent 16-eighth-note random walks, repeats them in a fixed sequence, plays tonic/fifth bass every bar, and repeats the same eight-step percussion pattern. Melody notes disappear randomly according to combo. There is no harmonic accompaniment, phrase-level orchestration, stereo staging, or reverberation. The constant degree-4 phrase ending does not represent the same interval across pentatonic, heptatonic, and microtonal scales. The audio clock also drives gameplay, so musical changes must preserve that timing contract.

## Research and design decisions

- [Open Music Theory: the sentence](https://openmusictheory.github.io/sentence.html) describes presenting and repeating a basic idea, developing it, and closing with a cadence. Use that as a game-composition device, not a claim that every represented tradition follows Western sentence form.
- [Hierarchical structure in melody, rhythm and harmony](https://arxiv.org/abs/2010.07518) studies phrase repetition and musical hierarchy. This supports testing relationships between phrases rather than treating more independent random notes as musical depth.
- [Audiokinetic: creating interactive music](https://www.audiokinetic.com/en/public-library/2024.1.8_8893/?id=creating_interactive_music&source=Help) distinguishes layer-based and sequence-based interactivity. Combine a stable thematic sequence with evolving accompaniment.
- [MDN: advanced audio sequencing](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques) explains envelopes, sampled instruments, filters, and scheduling. Keep the short scheduler lookahead and AudioContext clock; avoid frame-based note timing.
- [MDN: ConvolverNode](https://developer.mozilla.org/en-US/docs/Web/API/ConvolverNode) documents impulse-response processing. Use one small, deterministic stereo room response, with filtered sends and a dry rhythmic foundation.

## Artifact inventory and reference direction

All images are original generated game illustrations, not museum photographs or archaeological reconstructions. References guide recognizable forms and materials. No museum images are redistributed. Do not invent readable manuscript translations, accession numbers, or provenance.

| Culture | Illustration content | Visual direction / reference |
| --- | --- | --- |
| Mexico | Maya mural fragment and stone stela | Carved limestone, traces of red and turquoise pigment; [Met Maya monuments](https://www.metmuseum.org/es/press-releases/maya-stelae-2021-news). |
| Portugal | Azulejo tile panel | Cobalt-and-white glazed floral and architectural ornament; [Museu Nacional do Azulejo catalogue](https://raiz.museusemonumentos.pt/DetalhesObra/Index/1046069?tipo=OBJ). |
| China | Silk landscape scroll and bronze ding | Woven silk, ink wash, tripod vessel; [Met ding](https://www.metmuseum.org/art/collection/search/823596). |
| Egypt | Painted wooden coffin | Painted wood, figurative lid, ochre/red/blue decoration; [Met painted coffin](https://www.metmuseum.org/art/collection/search/544323). |
| Greece | Black-figure amphora and marble frieze | Terracotta, black slip, pale carved marble; [Met neck-amphora](https://www.metmuseum.org/art/collection/search/250551). |
| Peru | Paracas embroidered textile | Fine colored embroidery and repeated figures; [Met Andean textile research](https://www.metmuseum.org/exhibitions/listings/2011/the-andean-tunic-400-bce1800-ce). |
| Japan | Lacquer box and ukiyo-e print | Black lacquer with gold ornament and a woodblock print on paper; [Smithsonian writing box](https://www.si.edu/object/writing-box-suzuribako%3Afsg_F2005.2a-m). |
| India | Chola bronze and Ajanta mural fragment | Bronze dancer in a ring of flame, earth-pigment mural; [Met Nataraja](https://www.metmuseum.org/art/collection/search/39328). |
| Iran | Safavid tilework | Blue, turquoise, cream, and ochre floral tile panel; [Royal Ontario Museum tile research](https://www.rom.on.ca/blogs/safavid-tile-project-i-technology). |
| Nigeria | Benin bronze plaque | Raised court figures, warm cast-metal surface; [Met plaque](https://www.metmuseum.org/art/collection/search/316393). |
| Cambodia | Angkor sandstone relief | Warm sandstone, low carved figures, worn edges; [UNESCO Bayon conservation](https://www.unesco.org/en/articles/unesco-celebrates-30-years-safeguarding-bayon-temple-angkor-thom-project). |
| Mali | Timbuktu manuscripts | Cream paper, leather cover, black/red writing and a geometric astronomical diagram; [UNESCO manuscripts](https://www.unesco.org/en/articles/mali-timbuktu-manuscripts). |

## Artwork production and integration

1. Generate a separate landscape illustration per culture using the built-in image tool. Use a warm paper background, quiet margins, consistent ink-and-gouache detail, and complete object silhouettes. Preserve paired subjects where the level names two objects. Avoid captions inside the images.
2. Save masters in `art/artifacts/` and exact prompt/provenance metadata there. Export optimized WebP files to `public/assets/artifacts/`, targeting at most 1024 pixels wide for detailed exhibit views.
3. Add a shared loader and renderer. Load all artifacts only when visiting the museum; individual runs load their own image. The shared renderer fits images inside their bounds without stretching and falls back to existing procedural art on a failed load.
4. Use the renderer for museum cards, exhibit details, run HUD, finale, and results. Preserve restoration overlays and gameplay logic, but reduce museum wear opacity so art is always identifiable.
5. Rework gallery card proportions and detail layout. Separate collection state from the illustration: awaiting care, percentage restored, and stars. Keep keyboard/gamepad navigation and accessible Back/Listen actions. Keep notes readable at seven damage types.

## Music composition formula

Use the existing eighth-note grid: 8 steps/bar, 16 steps/phrase, 4 related phrases/64 steps per thematic cycle. This is a game arrangement framework; do not claim authentic raga, maqam, or other traditional composition from a scale alone.

1. **Motif:** seeded, bounded scale-degree motion with an authored rhythm chosen from several patterns. A recognizable opening survives repetition. Rests create space for answers.
2. **Development:** A, A′, B, resolving A. A′ changes a small number of weak-beat notes; B transforms contour/register while retaining rhythm; the final phrase approaches tonic. Use actual scale intervals to find the closest fifth. No independent random dropout of important melody notes.
3. **Harmonic support:** per-profile choices between tonal movement, open modal intervals, and a sustained tonic foundation. Tonal profiles may use diatonic triads; pentatonic/modal profiles use scale-contained open voicings; drone profiles avoid a generic functional chord progression. Registers separate bass, accompaniment, and melody.
4. **Counterline:** short answers only in lead rests or designated breathing spaces. It becomes more audible with intensity instead of duplicating the lead continuously.
5. **Rhythm:** preserve established percussion identities, add restrained phrase-boundary fills, seeded velocity accents, and a quiet pulse where appropriate. Downbeats stay exact; any offbeat timing offset must remain small and must not move the gameplay clock.
6. **Arrangement:** section-level entry/exit of support voices; smooth combo-dependent gains and a distinct low-condition texture. Low combo still gets a coherent melody. Museum listening uses a moderate presentation mix independent of the last run's combo/condition.

## Audio rendering and lifecycle

- Reuse local CC0 instrument samples, with the existing synthesizers as fallback. Do not relabel substitute samples as authentic recordings of the instruments named in design notes.
- Separate lead, response, harmony, bass, percussion, drone, and tension buses. Give pitched support modest stereo separation; keep bass centered.
- Add one short stereo convolver with high/low filtering and restrained gain. Keep percussion/bass primarily dry for readable timing.
- Preserve headroom with conservative voice gains and a gentle output compressor. Keep effects audible; avoid volume increases masquerading as richer composition.
- Fade old music buses on track changes, retire their nodes, and avoid queued old notes entering the next track. Bound scheduler catch-up after a long stall rather than creating a burst of notes in the past.
- Maintain `beatPosition()` and continuous `setTempoScale()` behavior. Pause ducking and mute must affect all added layers.

## Validation and acceptance

1. Unit tests: seed determinism; exact phrase duration; related motif repetitions; closed tonic ending; finite pitches, including Iranian half-semitones; bounded registers/velocities/event counts; no response notes over lead activity; culture arrangements cover all twelve profiles.
2. Artifact checks: all culture IDs have a nonempty runtime image and prompt record; optimized size targets; fallback path remains usable.
3. Browser review: empty, partial, and completed museum collections; all detail cards; long titles and seven notes; sound preview and return to menu; HUD/results/finale artwork; desktop and landscape phone screenshots; no console errors.
4. Audio review: export representative quiet/full/danger excerpts, check non-silence, peaks and stereo output, and compare melody continuity and accompaniment. Include tonal, pentatonic, and microtonal/drone profiles. Record what was measured versus subjectively auditioned.
5. Run unit suite, TypeScript and production build. Keep previous UI/balance changes intact and leave source, assets, provenance, and review artifacts available locally.

## Implementation order

Generate artifact masters → integrate shared artwork and museum layout → implement pure composition and tests → integrate audio buses/scheduler → visual/audio review → final build and documentation. Independent image generation may run while code is prepared. No additional service or runtime music-generation API is required.
