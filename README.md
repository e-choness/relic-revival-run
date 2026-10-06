# Relic Revival Run

A runner about restoring cultural heritage. Play as an animal art restorer and run through twelve cultures, from Mexico and Portugal to Mali. Use the right conservation tool on each kind of damage to bring masterpieces back to life.

This is a **remake** by Echo Yin of the 2023 game-jam original by **Studio Jojo**, made for the [Mini Game Work Jam](https://itch.io/jam/mini-game-work-jam-2023), a jam that advocates against the illicit traffic of cultural property.
- **What carries over:** the remake builds on the original's concept and design.
- **What's new:** it is a new web-based build, and most of the original assets are not part of it.

- Original game: [paoowo.itch.io/relic-revival-run](https://paoowo.itch.io/relic-revival-run)
- Original trailer: [YouTube](https://www.youtube.com/watch?v=MbZWifvPbOs)

## Features

- **12 cultures, rising difficulty.**
  - **Cultures:** Mexico, Portugal, China, Egypt, Greece, Peru, Japan, India, Iran, Nigeria, Cambodia, Mali.
  - **Artifacts and damage:** each culture has its own artifact and damage types drawn from real conservation problems (salt efflorescence, bronze disease, foxing, insect infestation, and more).
- **Tools that match real practice.** Poultices draw out salts, an anoxic bag treats insects, a solvent gel removes old repairs. A UV lamp reveals hidden damage, and a camera documents it before treatment.
- **The game teaches its rules.** A field guide before every run, a tool-bar legend, tool hints, and feedback on every mistake.
- **Reactive music** built on each culture's scales and rhythms. It grows with your combo and turns tense as the artifact suffers.
- **Controls for every player:** keyboard, mouse, touch and gamepad; remappable keys; menus you can navigate without a mouse; reduced-motion support.

## Development

The game uses Phaser 3, TypeScript and Vite. Everything runs in Docker:

```sh
docker compose up app                              # dev server on http://localhost:5173
docker compose run --rm app npm test               # unit tests
docker compose run --rm app npm run package:itch   # release/relic-revival-run-web.zip (itch.io HTML5)
docker compose run --rm win                        # Windows portable + installer in release/
```

The avatar workshop, a dev-only tool for drawing the cut-out characters, runs at http://localhost:5173/tools/workshop/.

## The original (2023)

The Unity jam project is kept in `legacy/` for reference only, and will be removed.

### Making of

- [Making of Sound](https://www.youtube.com/watch?v=6v6Oa1RjByw)

- [Making of Music](https://www.youtube.com/watch?v=gu-DScXpfLM)

### Studio Jojo devlog

- [Studio Jojo DevLog (Part I) — Mini Game Work Jam: Against the Illicit Traffic of Cultural Property](https://medium.com/@echoness/studio-jojo-dev-log-part-i-mini-game-work-jam-against-the-illicit-traffic-of-cultural-property-9635821233bb)

- [Studio Jojo Devlog (Part 2) — Coming Up With Cool Game Design](https://medium.com/@echoness/studio-jojo-devlog-part-2-coming-up-cool-game-design-6fda70498ea1)

- [Studio Jojo Devlog (Part 3) — An Overall Study of The Delicate Work of Art Restorers](https://medium.com/@echoness/studio-jojo-devlog-part-3-an-overall-study-of-the-delicate-work-of-art-restorers-3ef56625a53b)

- [Studio Jojo Devlog (Part 4) — Game Design Details Revealed!](https://medium.com/@echoness/studio-jojo-devlog-part-4-game-design-details-revealed-65f03787b111)

- [Studio Jojo Devlog (Part 5) — Level Design, Soundtrack and Character Arts](https://medium.com/@echoness/studio-jojo-devlog-part-5-level-design-soundtrack-and-character-arts-fe7b35ac9750)

- [Studio Jojo Devlog (Part 6) — Gameplay Implementation and the Unitization of Unity’s Updated Input System](https://medium.com/@echoness/studio-jojo-devlog-part-6-gameplay-implementation-and-the-unitization-of-unitys-updated-input-d4ee3413b6ac)
  
- [Studio Jojo Devlog (Part 7) — Relic Revival Run : From Prototype to Reality](https://medium.com/@echoness/studio-jojo-part-7-relic-revival-run-from-prototype-to-reality-67323875aba3)
  

## Credits

- **Remake:** Echo Yin.
- **Original game:** Studio Jojo.
- **Fonts:** [Borel](https://fonts.google.com/specimen/Borel) and [Edu SA Beginner](https://fonts.google.com/specimen/Edu+SA+Beginner), under the SIL Open Font License.

## License

- **Code** is under the [PolyForm Noncommercial License 1.0.0](LICENSE).
- **Art and audio** are under [CC BY-NC 4.0](LICENSE-ASSETS).
- **Fonts, bundled libraries and third-party audio clips** keep their own licenses (see `LICENSE-ASSETS`).
- The original 2023 jam release remains under the MIT license it was published with.
