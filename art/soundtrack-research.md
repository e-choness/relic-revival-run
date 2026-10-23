# Soundtrack research and arrangement notes

Prepared October 2026, when the soundtrack moved from a generated random walk to hand-written
arrangements. The arrangements themselves are data in `src/audio/styles.ts`; `src/audio/score.ts`
turns them into events and `src/audio/AudioDirector.ts` plays them.

## What changed, and why

The previous score developed a seeded two-bar random walk into an eight-bar form. Every culture used
the same structure: 4/4 in eighth notes, five shared drum patterns, and one "answer" instrument. It
was reactive and technically tidy, but nothing in it was specific to a tradition except the scale,
so it did not carry the cultures' identity, and the melodies did not sound composed.

The new score follows how each tradition is actually organised:

- **Meter and rhythm cycles from the tradition.** 6/8 against 3/4 in the Mexican son, maqsum under
  Egyptian hijaz, the syrtos figure in Greece, huayno's long-short-short, teental's sixteen beats,
  a 6/8 Persian reng, the 12/8 standard bell pattern in Nigeria, and 12/8 for the Mande kora.
- **Ensemble roles, not just a lead and a bass.** Each tradition gets its characteristic layering:
  marimba thirds; the fado guitarra filling the singer's breaths; heterophony (guzheng and dizi, ney
  and oud, santur and kamancheh); a tanpura cycle; call and response; pinpeat's core melody under
  its elaboration; the kora's kumbengo ostinato.
- **Written themes.** Each culture has an A and a B theme, original melodies in the tradition's
  idiom, in the form A, A (decorated), B, A with a cadence. They are not transcriptions of
  traditional songs.
- **Performance, not just notes.** Idiomatic ornaments: marimba and santur rolls, guzheng and koto
  bends, ney and bansuri glides, fado/lyra/quena/balafon grace notes. A talking drum that bends its
  strokes. Swing where it belongs. Small, seeded human timing (never on the beat itself). Metric
  accents and a phrase arc in the dynamics.

### Still reactive

The lead always plays its whole tune. What changes with the combo, at bar lines, is who plays
along: level 0 is the tune with a little rhythm; then accompaniment; then counter-voices and the
full drum parts; and in full flow, ornaments on every long note. Low condition still brings in the
tension drone. The gameplay clock is unchanged: damage arrives on beats, and a beat is 60/tempo
seconds in every meter (a dotted quarter in 6/8 and 12/8).

### Constraint: even beats

Gameplay needs evenly spaced beats, so additive meters with uneven beats are out. Greece uses the
syrtos (2/4, long-short-short-short) rather than the kalamatianos (7/8 = 3+2+2). Compound meters
are fine; their beat is the dotted quarter.

## Instruments

All samples are CC0, from the Versilian Community Sample Library. None of them is the instrument named,
except the balafon, the ocarina and the frame and hand drums. They are the closest available
stand-ins, and the arrangements lean on playing technique (rolls, glides, tremolo) to suggest the
real instrument. This pass added the **balafon** (Mali's lead; Nigeria's response) and the clay
**ocarina** (Mexico).

| Culture | Tradition | Lead | Around it | Percussion |
|---|---|---|---|---|
| Mexico | Son, sesquiáltera (6/8 against 3/4) | marimba, rolled | marimba in thirds; ocarina answers | slit drum (zapateado), shaker |
| Portugal | Fado menor (i … V7 … i) | bowed psaltery as the voice | strumstick as guitarra fills; harp as viola (bass on 1 and 3, chord on 2 and 4) | none, as in fado |
| China | Jiangnan-style pentatonic | dan tranh as guzheng, glides and *yao* tremolo | alto recorder as dizi, heterophony | woodblock (ban), gong at sections |
| Egypt | Maqam hijaz over maqsum | tenor recorder as ney, glides | strumstick as oud, heterophony; drone | darbuka dum/tek, riq jingles |
| Greece | Syrtos, dorian | bowed psaltery as lyra, trills | strumstick as laouto in the syrtos rhythm | frame drum, darbuka tek, tambourine |
| Peru | Huayno, minor pentatonic | soprano recorder as quena | second quena in parallel; strumstick as charango | bass drum as bombo, shaker as chajchas |
| Japan | *In* scale with *ma* | dan tranh as koto, bends | alto recorder as shakuhachi echoes; sparse koto | bass drum as taiko, woodblock as hyoshigi |
| India | Raga Yaman in teental | alto recorder as bansuri, meend | harp as tanpura (Pa–Sa–Sa–Sa); strumstick as sitar; drone | conga/bongo as bayan/dayan: the theka, with khali; a tihai cadence |
| Iran | Shur as a 6/8 reng (microtonal) | dan tranh as santur, *riz* tremolo | bowed psaltery as kamancheh, heterophony; drone | darbuka as tombak (tom/bak) |
| Nigeria | Call and response, 12/8 | kalimba (agidigbo-like) calls | balafon responds | agogo standard bell, sekere, conga, talking drum (bending conga) |
| Cambodia | Pinpeat | xylophone as roneat ek, elaborating | vibraphone as kong vong, the core melody | finger cymbals as ching, bass drum as skor, gong |
| Mali | Mande kora and balafon, 12/8 | balafon, grace notes | harp playing the kumbengo ostinato; strumstick birimintingo runs | conga as djembe, shaker |

## Sources by tradition

- **Mexico (son).** Sones are mostly in 6/8 or 3/4, often layered; *sesquiáltera* alternates and
  juxtaposes the two; zapateado is the main rhythmic punctuation.
  [Son mexicano](https://en.wikipedia.org/wiki/Son_mexicano) ·
  [Smithsonian Folkways: son jarocho lesson](https://folkways.si.edu/son-jarocho-veracruz-exploration-dance-forms/music/tools-for-teaching/smithsonian) ·
  [Carnegie Hall Musical Explorers: Villalobos Brothers](https://carnegiehall.org/Education/Programs/Musical-Explorers/New-York-City/Villalobos-Brothers/Lesson-1) ·
  [Marimba](https://en.wikipedia.org/wiki/Marimba) (tremolo technique, Chiapas tradition)
- **Portugal (fado).** [Fado](https://en.wikipedia.org/wiki/Fado) ·
  [Portuguese guitar](https://en.wikipedia.org/wiki/Portuguese_guitar)
- **China.** [Guzheng](https://en.wikipedia.org/wiki/Guzheng) (pressing bends, glissandi, tremolo) ·
  [Jiangnan sizhu](https://en.wikipedia.org/wiki/Jiangnan_sizhu) (heterophony)
- **Egypt.** Maqsum and baladi as dum/tek cycles in 4/4:
  [Maqsoum](https://en.wikipedia.org/wiki/Maqsoum) ·
  [Frishkopf, Arab durub chart (University of Alberta)](https://sites.ualberta.ca/~michaelf/Theory/Durub%20chart%20rev%202009.pdf) ·
  [Iqa'at reference](https://rythm.organology.net/) · [Arabic maqam: the Hijaz family](https://en.wikipedia.org/wiki/Arabic_maqam)
- **Greece.** Kalamatianos is 7/8 (3+2+2); syrtos is 2/4:
  [Greek National Inventory of Intangible Heritage: Kalamatianos](https://ayla.culture.gr/en/kalamatianos-xoros/) ·
  [Syrtos (Kalamatianos) dance notes](https://socalfolkdance.org/syllabi/syllabus_instructor_oakes_2018/Syrtos_(Kalamatianos)_Greek.pdf) ·
  [Britannica: syrtos](https://britannica.com/art/syrtos)
- **Peru.** [Huayno](https://en.wikipedia.org/wiki/Huayno) (2/4 with a long-short-short figure; quena,
  charango, harp). The search turned up mostly secondary descriptions, so verify the rhythm against
  recordings before treating it as definitive.
- **Japan.** [In scale](https://en.wikipedia.org/wiki/In_scale) · [Koto](https://en.wikipedia.org/wiki/Koto_(instrument)) ·
  [Shakuhachi](https://en.wikipedia.org/wiki/Shakuhachi) · [Ma](https://en.wikipedia.org/wiki/Ma_(negative_space))
- **India.** Teental: 16 beats in four groups, sam on 1, claps on 1, 5 and 13, khali (wave) on 9; the
  theka Dha Dhin Dhin Dha …: [Teental](https://en.wikipedia.org/wiki/Teental) ·
  [Teental thekas (University of Washington)](https://sites.math.washington.edu/~gangolli/Music428Thekas.html) ·
  [Tanpura](https://en.wikipedia.org/wiki/Tanpura) · [Tihai](https://en.wikipedia.org/wiki/Tihai)
- **Iran.** Zarbi (metred) pieces such as the reng, often 6/8; santur leads the ensemble with tombak:
  [Rhythm in Persian music](https://en.wikipedia.org/wiki/Rhythm_in_Persian_music) ·
  [The 6/8 pulse ratio in rengs (University of Tehran)](https://jfadram.ut.ac.ir/article_82084.html?lang=en) ·
  [UCSB listening notes](https://cooley.faculty.music.ucsb.edu/classes/mus17/content/mideast/ME%20listennotes%20W03.htm) ·
  [Dastgah-e Shur](https://en.wikipedia.org/wiki/Dastgah-e_Shur)
- **Nigeria.** The seven-stroke standard bell pattern (Yoruba kónkóló), in 12/8; agogo; call and response:
  [Bell pattern](https://en.wikipedia.org/wiki/Bell_pattern) ·
  [Yoruba music](https://en.wikipedia.org/wiki/Yoruba_music) ·
  [The Met: double bell](https://metmuseum.org/art/collection/search/502187) ·
  [Talking drum](https://en.wikipedia.org/wiki/Talking_drum)
- **Cambodia.** The pinpeat ensemble (roneat ek, kong vong, sralai, skor, ching):
  [Pinpeat](https://en.wikipedia.org/wiki/Pinpeat) · [Roneat ek](https://en.wikipedia.org/wiki/Roneat_ek) ·
  [Sounds of Angkor: pin peat ensemble](https://soundsofangkor.org/english/orchestras/pin-peat-ensemble).
  The colotomic detail (ching cycle, elaboration of a core melody) follows general Southeast Asian
  court-ensemble practice; no detailed Khmer source turned up, so treat it as an approximation.
- **Mali.** Kumbengo (the cyclic accompaniment ostinato) and birimintingo (ornate runs over it), on kora
  and bala: [The Met: kora](https://www.metmuseum.org/art/collection/search/503060) ·
  [The Met: bala](https://www.metmuseum.org/art/collection/search/501109) ·
  [Gardner, *The Course of the Hand* (SOAS)](https://eprints.soas.ac.uk/40248/) ·
  [The Kora Café](https://www.thekoracafe.com/music/koramusic/)

## Level and balance

The samples used to be "loudness-normalised" with ffmpeg's `loudnorm`, which measures over a
three-second window and does not work on short one-shots. The library ended up very uneven: the
kalimba (Nigeria's lead) peaked at −59 dBFS, practically silent; the finger cymbals at −41, the dan
tranh at −30; the congas near 0. `scripts/fetch-audio.mjs` now peak-normalises every clip to
−3 dBFS. It also records a per-clip trim in the manifest that evens out average loudness, since a
held recorder note sounds far louder than a decaying pluck at the same peak.

`scripts/review-museum-music.cjs` renders a full cycle of every culture offline and checks headroom,
loudness and stereo. With the per-style `level` trims, every culture's full arrangement sits within
about 3 dB (−27.7 to −24.6 dBFS RMS), with peaks under 0.5.

## Open questions for a musician's ear

Everything above was checked by measurement and by reading. None of it has been judged by someone
who plays these traditions. Worth an expert listen: the Persian koron intervals on a repitched zither
sample. Shur's fifth degree is also a variable note (moteqayyer), often lowered by a microtone in
descending lines; our scale keeps it fixed, which is a known simplification. Also: whether the huayno and syrtos figures feel right at the game's tempos; and whether any
substitute instrument misrepresents its tradition more than it helps.
