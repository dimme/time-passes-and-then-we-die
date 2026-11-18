# Time Passes, And Then We Die

A small WebGL game. You stand on one patch of Manhattan and drag a timeline —
from the first dinosaurs, 235 million years ago, to the day the Sun swallows the
Earth, 7.59 billion years from now. There is nothing to shoot and nothing to win.
The point is to feel how little of the line is ours.

## Play

It is a static site with no build step. Serve the folder and open it:

```
python3 -m http.server 8000     # then visit http://localhost:8000
```

(Opening `index.html` straight from disk will not work — browsers block ES modules on `file://`.)

| | |
|---|---|
| Walk | `W` `A` `S` `D` / arrows, `Shift` to run |
| Look | click the view to capture the mouse (`Esc` releases it) |
| Move through time | drag the timeline, scroll the wheel, or hold `Q` / `E` (`Shift` = faster) |
| Let time pass by itself | `Space` |
| Return to now | `N` |
| Sound on / off | `M` |
| Touch | left thumb walks, right thumb looks, drag the timeline |

## What you walk through

| When | What this spot looks like | Meanwhile |
|---|---|---|
| 235–66 million years ago | Cycads, tree ferns, sauropods, pterosaurs; the Palisades erupt | Pangaea splits, the Atlantic opens |
| 66 million years ago | The sky burns, then goes dark | The Chicxulub impact |
| 66–2.6 million years ago | Hothouse jungle, then temperate forest; early mammals, mastodons | Apes; the human line splits off; first stone tools |
| 2.6 million – 11,000 years ago | Ice sheets come and go; mammoths on tundra; you stand on top of the glacier | Homo sapiens, Out of Africa, cave art (Old Stone Age) |
| 11,000 BCE | Spruce parkland and a Paleo-Indian campfire | Farming begins (New Stone Age) |
| 9000 BCE – 1500 CE | The Mannahatta forest; a Lenape village | Bronze Age, pyramids, Iron Age, Rome, Middle Ages |
| 1524–1776 | Sails, Fort Amsterdam, a windmill, the wall of Wall Street, a brick colonial town | Colonisation of the Americas |
| 1776–1900 | The 1811 grid flattens the hills; tenements, factories, smog, the Brooklyn Bridge | Revolution, the Industrial Revolution |
| 1900–2000 | Art Deco towers, the Empire State and Chrysler buildings, glass boxes, the Twin Towers | Two world wars, the Moon, the Web |
| 2001–now | The towers fall; One World Trade Center | You are here |
| 2050–2165 | Heat, rising water, self-driving pods | Everyone alive today is gone |
| 2200–3000 | An imagined neon megacity: canals, kilometre towers, flying traffic, endless rain | (the movies' guess) |
| 3000–10,000 | An imagined utopia: gardens, white spires, a space elevator | |
| 10,000 – 1 million | Ruins, then forest, then no trace | |
| 250 million | A supercontinent desert | |
| 600 million – 3 billion | The last plants die, the oceans boil, bare rock | |
| 5 – 7.59 billion | The Sun swells into a red giant and engulfs the Earth | |

The slider is non-linear so every era gets room. The thin bar beneath it shows the
same span at true scale, where all of human existence is a fraction of a pixel.

## How it works

- `src/timeline.js` — the time model: slider ↔ year mapping, eras, captions, and the
  environment keyframes (sky, sun, fog, sea level, ice, terrain, weather) that are
  interpolated as you scrub.
- `src/world.js` — sky shader, terrain, rivers, ice sheet, weather particles.
- `src/flora.js`, `src/fauna.js` — instanced plants, animals, people, vehicles and ships, each with its own lifespan.
- `src/city.js` — every building lot has a generated history (Dutch house → brick house →
  tenement → tower → megatower → ruin), plus hand-made landmarks.
- `src/audio.js` — every sound is synthesised with Web Audio: ambient beds (wind, insects, water, ice howl,
  traffic, rain, drones) and random events (birds, roars, mammoths, drums, bells, hooves, horns, sirens,
  flying traffic, chimes, thunder), each with its own loudness curve over the timeline.
- `src/controls.js`, `src/ui.js`, `src/main.js` — walking, the HUD and timeline, the loop.

Rendering uses [three.js](https://threejs.org) (MIT), vendored in `vendor/`. All geometry
textures and sounds are generated in code; there are no asset files.

Dates for the deep past and far future are rounded scientific estimates; everything after
about 2100 is imagination.
