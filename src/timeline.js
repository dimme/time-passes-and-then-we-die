// Time model: the slider position u ∈ [0,1] maps non-linearly to a year, so that
// every era gets room on the slider even though they differ by 8 orders of magnitude.

export const NOW = 2026;
export const START = -4.54e9;   // the Earth forms
export const END = 7.59e9;
const M = 1e6, B = 1e9;

// Each anchor is equally spaced on the slider; years are linear between anchors.
const ANCHORS = [
  START, -4.5e9, -4.4e9, -4.0e9, -3.5e9, -2.4e9, -2.2e9, -1.1e9, -720e6, -635e6, -539e6, -470e6, -385e6, -320e6, -299e6, -252.2e6, -251.8e6,
  -235e6, -201e6, -150e6, -66.04e6, -66e6, -65.9e6, -50e6, -7e6, -2.6e6, -300e3, -125e3, -70e3, -50e3, -22e3, -16e3, -11e3,
  -9600, -6000, -4000, -3300, -2700, -2600, -2500, -1900, -1250, -500, -150, 1, 500, 1000, 1250, 1500, 1609, 1650, 1700, 1776, 1811, 1850, 1900, 1930, 1950, 1975, 2000,
  NOW, 2050, 2100, 2200, 2500, 3000, 10000, 100e3, 1 * M, 100 * M, 250 * M, 600 * M, 1.1 * B, 3 * B, 5 * B, 7 * B, END,
];
const N = ANCHORS.length - 1;

export function uToYear(u) {
  const f = Math.max(0, Math.min(1, u)) * N;
  const i = Math.min(N - 1, Math.floor(f));
  return ANCHORS[i] + (ANCHORS[i + 1] - ANCHORS[i]) * (f - i);
}
export function yearToU(y) {
  if (y <= ANCHORS[0]) return 0;
  if (y >= ANCHORS[N]) return 1;
  let lo = 0, hi = N;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (ANCHORS[mid] <= y) lo = mid; else hi = mid; }
  return (lo + (y - ANCHORS[lo]) / (ANCHORS[lo + 1] - ANCHORS[lo])) / N;
}

function big(n) {
  const sig = (v) => (v >= 100 ? v.toFixed(0) : (v >= 10 ? v.toFixed(1) : v.toFixed(2)).replace(/\.?0+$/, ''));
  if (n >= B) return sig(n / B) + ' billion';
  if (n >= M) return sig(n / M) + ' million';
  if (n >= 1e4) return (Math.round(n / (n >= 1e5 ? 1000 : 100)) * (n >= 1e5 ? 1000 : 100)).toLocaleString('en-US');
  return Math.round(n).toLocaleString('en-US');
}

/** Returns { main, sub } strings for the HUD. */
export function formatYear(y) {
  if (y < -12000) return { main: big(-y), sub: 'years ago' };
  if (y < 1) return { main: Math.max(1, Math.round((1 - y) / (y < -4000 ? 100 : 10)) * (y < -4000 ? 100 : 10)).toLocaleString('en-US'), sub: 'BCE' };
  if (y < 1500) return { main: String(Math.round(y / 10) * 10 || 1), sub: 'CE' };
  if (y < 3000) return { main: String(Math.round(y)), sub: Math.round(y) === NOW ? 'now' : y > NOW ? 'CE · ' + Math.round(y - NOW) + ' years from now' : 'CE · ' + Math.round(NOW - y) + ' years ago' };
  if (y < 20000) return { main: (Math.round(y / 100) * 100).toLocaleString('en-US'), sub: 'CE' };
  return { main: big(y - NOW), sub: 'years from now' };
}

// ---------- the Moon ----------
/**
 * Distance to the Moon in km. Tides have been pushing it away ever since it formed just outside the Earth's
 * Roche limit about 4.5 billion years ago: quickly at first, and ever more slowly since (distance ∝ age^(2/13),
 * the classic tidal-friction law, which agrees with ancient tidal deposits: about 97% of today's distance
 * 620 million years ago and about 90% 2.5 billion years ago). It is still leaving.
 */
export function moonDistance(year) {
  const age = year + 4.5e9;
  return age <= 0 ? 0 : Math.max(24000, 384400 * Math.pow(age / 4.5e9, 2 / 13));
}

// ---------- eras (bands on the slider) ----------
export const ERAS = [
  { from: START, name: 'Molten Earth', color: '#c2401c' },
  { from: -4.0e9, name: 'First Life', color: '#b8742a' },
  { from: -2.4e9, name: 'Oxygen · Snowball Earth', color: '#6f9fc0' },
  { from: -539e6, name: 'Life Fills the Seas', color: '#3a8f8f' },
  { from: -420e6, name: 'First Forests', color: '#3f7a4a' },
  { from: -299e6, name: 'Pangaea', color: '#b08a5a' },
  { from: -251.8e6, name: 'Age of Dinosaurs', color: '#5d8a3a' },
  { from: -66.04e6, name: 'The Impact', color: '#c2401c' },
  { from: -65.9e6, name: 'Age of Mammals', color: '#8a9a4a' },
  { from: -2.6e6, name: 'Ice Ages · Old Stone Age', color: '#a9c9dc' },
  { from: -11e3, name: 'Neolithic', color: '#7da05a' },
  { from: -3300, name: 'Bronze Age', color: '#b9853a' },
  { from: -1200, name: 'Iron Age · Antiquity', color: '#8d8d95' },
  { from: 500, name: 'Middle Ages', color: '#4f8a50' },
  { from: 1500, name: 'Exploration · Colony', color: '#a8734a' },
  { from: 1776, name: 'Revolution · Industry', color: '#7a5a4a' },
  { from: 1900, name: 'The 20th Century', color: '#c9b27a' },
  { from: 2000, name: 'Digital Age', color: '#4aa3d8' },
  { from: 2050, name: 'The Warming', color: '#d89a4a' },
  { from: 2200, name: 'Neon Megacity', color: '#c23ad8' },
  { from: 3000, name: 'The Star Age', color: '#9ae0e0' },
  { from: 10000, name: 'After Us', color: '#5a8a5a' },
  { from: 1 * M, name: 'Deep Future', color: '#b98a5a' },
  { from: 1.1 * B, name: 'The Dying Sun', color: '#d8502a' },
];
export function eraAt(y) {
  let e = ERAS[0];
  for (const x of ERAS) if (x.from <= y) e = x;
  return e;
}

// ---------- events (captions) ----------
// t: headline, h: what is happening right here, w: meanwhile, in the wider world
export const EVENTS = [
  [START, 'The Earth forms', 'There is no Manhattan. There is no ground at all. Dust and rock falling together around a young Sun have melted into a ball of magma under a black sky.', 'The Sun is about 50 million years old, and a third dimmer than it will be in your day.'],
  [-4.5e9, 'The Moon', 'A world the size of Mars strikes the Earth. The wreckage gathers into a Moon that hangs enormous and red-hot overhead, some fifteen times closer than the one you know.', 'A day lasts about five hours.'],
  [-4.4e9, 'The first rain', 'The surface crusts over into black rock. Steam condenses, and it rains — for millions of years. The first ocean fills the low ground.', 'The oldest things on Earth that will survive to your time, tiny zircon crystals, form about now.'],
  [-4.1e9, 'Bombardment', 'Asteroids left over from the making of the planets still fall. Each large one boils part of the sea away.', 'Nothing lives anywhere. The Earth is a wet, lifeless rock: no cell, no seed, no eye.'],
  [-3.8e9, 'Something begins', 'Somewhere in warm water, chemistry becomes biology. Nobody knows exactly where, when, or how.', 'From here on, everything alive is descended from this.'],
  [-3.5e9, 'The first living things', 'The sky is an orange haze of methane, the sea green with dissolved iron. In the shallows, mats of microbes build stone mounds layer by layer: stromatolites.', 'For the next three billion years, this is what life looks like. Slime.'],
  [-2.4e9, 'Oxygen', 'Microbes that eat sunlight have been leaking a waste gas for ages. Now it fills the air. The sea rusts red, and the sky turns blue.', 'For most life this is a poison: the first great extinction, caused by the living.'],
  [-2.25e9, 'Snowball Earth', 'With the methane gone the planet freezes, perhaps from pole to equator. You are standing on ice.', 'It lasts some two hundred million years.'],
  [-1.8e9, 'The boring billion', 'Bare rock, shallow seas, a film of microbes. Nothing visibly changes for a thousand million years.', 'Unseen, cells swallow other cells and learn to keep them: the ancestors of every plant and animal.'],
  [-1.1e9, 'The roots of Manhattan', 'Continents collide into the supercontinent Rodinia, and a mountain range as high as the Himalaya stands here. Deep beneath it forms the oldest rock that will one day lie under New York.', 'Still no animals. Still no plants on land.'],
  [-717e6, 'Snowball Earth, again', 'Ice to the equator once more. The mountains have long since worn down to their roots.', 'Under the ice, life holds on around volcanic vents and meltwater pools.'],
  [-600e6, 'The first animals', 'The ice is gone. On the sea floor lie soft, quilted creatures with no mouths, no eyes and no enemies.', 'The land is still bare rock.'],
  [-539e6, 'The Cambrian explosion', 'This spot is a warm, shallow sea south of the equator. Trilobites crawl across lime mud and sand that will become Manhattan\'s marble and schist.', 'In a few million years the seas fill with eyes, shells, claws and teeth.'],
  [-470e6, 'Mountains and moss', 'A chain of volcanic islands collides with the coast. The sea floor is crushed and cooked into the schist that will carry the skyscrapers, and mountains rise overhead.', 'The first plants creep onto land: a green film, no taller than your thumb.'],
  [-420e6, 'Life comes ashore', 'Low, leafless plants stand along the streams. Millipedes and scorpions walk among them, the first animals to breathe air.', 'Fish get jaws.'],
  [-385e6, 'The first forests', 'Trees. The oldest fossil forest ever found grew here, at Gilboa and nearby Cairo, New York.', 'A fish with a neck and wrists hauls itself onto a mudbank.'],
  [-320e6, 'The coal swamps', 'A steaming swamp forest of giant club mosses and tree ferns. Dragonflies with wings as long as your arm; millipedes as long as a car.', 'The air holds half again as much oxygen as yours. These forests will become coal.'],
  [-299e6, 'Pangaea', 'Africa has collided with North America, raising mountains as tall as the Himalaya to the east. Here, on the dry red plains at the heart of the single world-continent, rivers come and go with the seasons.', 'Sail-backed Dimetrodon hunts here. It is no dinosaur: it is nearer kin to you.'],
  [-252.2e6, 'The Great Dying', 'Volcanoes in Siberia pour out lava for a million years. The air sours, the seas turn to acid, the forests die.', 'Nine species in ten vanish. Life has never come closer to ending.'],
  [-251e6, 'Aftermath', 'A hot, bare, quiet world. A few tough, pig-sized burrowers have it almost to themselves.', 'It takes ten million years for forests to return.'],
  [-235e6, 'The first dinosaurs', 'A valley deep inside the supercontinent, in what will be Argentina. The first dinosaurs — small, quick, two-legged — hunt among cycads and tree ferns.', 'No flowers, no grass, no birds. A day lasts about 23 hours.'],
  [-201e6, 'The Atlantic tears open', 'Pangaea rips apart. Lava floods the rift valley just to the west; it will cool into the cliffs of the Palisades — the same cliffs you will see across the Hudson for the next 200 million years.', 'The eruptions trigger a mass extinction. Dinosaurs inherit the Earth.'],
  [-185e6, 'Jurassic', 'A warm, wet rift valley. Conifers and ferns. The dinosaurs are growing.', 'A narrow sea — the infant Atlantic — widens by a few centimetres a year. About as fast as your fingernails grow.'],
  [-150e6, 'The giants', 'Long-necked sauropods shake the ground. Pterosaurs circle above the river.', 'The first birds take wing. Dinosaurs will rule for 165 million years — 550 times longer than our species has existed.'],
  [-100e6, 'Cretaceous', 'Flowering plants, new a few million years ago, are spreading everywhere. The air hums with the insects that pollinate them.', 'Sea levels are 100+ m higher than today. There is no ice at the poles.'],
  [-66.04e6, 'The last ordinary day', 'A light in the sky that does not belong there.', 'A ten-kilometre asteroid is about to hit the Yucatán, 3,000 km to the south.'],
  [-66.02e6, 'Impact', 'The sky burns. Molten glass rains down. Forests ignite across the continent.', 'Three quarters of all species die. For the dinosaurs, 165 million years end in an afternoon.'],
  [-65.95e6, 'Impact winter', 'Soot blocks the sun. Ferns are the first things to grow back in the ash.', 'Small, furry, burrowing survivors inherit an empty world. Some of them are your ancestors.'],
  [-56e6, 'Hothouse Earth', 'A steaming subtropical forest. Small early horses and primates in the canopy.', 'Palm trees grow in the Arctic. Whales still have legs.'],
  [-34e6, 'The world cools', 'The jungle gives way to temperate woodland.', 'Antarctica freezes over. Within ten million years the first apes appear in Africa, and grasslands begin to spread.'],
  [-6e6, 'A branch splits', 'Forest, rivers, mastodons. No one here to see it.', 'In Africa, the line that leads to humans separates from the line that leads to chimpanzees.'],
  [-3.3e6, 'First tools', 'Still only forest and animals.', 'In East Africa, someone chips a stone to make an edge. The Stone Age begins — it will last 99% of the human story.'],
  [-2.6e6, 'The ice ages begin', 'Glaciers start to advance and retreat over this spot, dozens of times, grinding the bedrock flat.', 'Homo habilis, then Homo erectus. Fire is tamed around a million years ago.'],
  [-300e3, 'Homo sapiens', 'Ice. Hundreds of metres of it, right where you are standing.', 'In Africa, our species appears. Every human who will ever live is still ahead.'],
  [-125e3, 'A warm pause', 'The ice has melted back. Oak forest returns; the sea stands a few metres higher than today.', 'Humans number perhaps tens of thousands. Neanderthals hold Europe.'],
  [-70e3, 'Out of Africa', 'The cold is returning. Mammoth and musk ox on open tundra.', 'A few thousand humans leave Africa. Within 60,000 years their descendants reach every continent but Antarctica.'],
  [-40e3, 'Art', 'Tundra. Mammoths. Wind.', 'People paint animals on cave walls in Europe and Indonesia. The Neanderthals vanish.'],
  [-23e3, 'Last Glacial Maximum', 'You are standing on the Laurentide Ice Sheet. Manhattan is buried beneath roughly 300 m of ice; its edge lies just to the south.', 'The sea is 120 m lower. People are already walking in North America — they leave footprints at White Sands.'],
  [-16e3, 'The thaw', 'The ice retreats north, leaving boulders, lakes, and scraped rock. The coast is 150 km away.', 'People spread down the Americas. In Eurasia, wolves are becoming dogs.'],
  [-11e3, 'First people here', 'Paleo-Indians hunt caribou and mastodon across spruce parkland. A campfire — the first human light on this island.', 'The mammoths are dying out. In the Fertile Crescent, people begin to plant wheat. The New Stone Age.'],
  [-9000, 'Farming begins', 'The forest thickens: oak, hickory, chestnut. Small bands fish the rising rivers.', 'Jericho is a walled town. Farming arises independently in several parts of the world.'],
  [-5000, 'The island takes shape', 'Rising seas flood the valleys. Manhattan becomes an island of hills, streams and oyster beds.', 'First cities in Mesopotamia. The wheel. Copper.'],
  [-3300, 'The Bronze Age', 'Archaic peoples gather oysters here; their shell heaps will last for millennia.', 'Writing is invented in Sumer and Egypt. Metal changes war and trade.'],
  [-2560, 'The Great Pyramid', 'Deer, bear, wolves, beaver. Chestnut trees four metres across.', 'Khufu\'s pyramid is finished at Giza. Stonehenge is raised.'],
  [-1200, 'The Iron Age', 'Seasonal camps along the shore. Pottery arrives.', 'Bronze Age empires collapse. Iron spreads. The alphabet.'],
  [-500, 'The classical world', 'The forest is the same forest.', 'Athens, Confucius, the Buddha — all within a century of each other.'],
  [1, 'Year One', 'Woodland peoples trade copper and shell along the coast.', 'Rome rules the Mediterranean; the Han rule China. About 200 million people are alive.'],
  [476, 'Rome falls', 'Bows and arrows replace spear-throwers.', 'The Western Roman Empire ends. The Maya build their great cities.'],
  [1000, 'Mannahatta', 'The Lenape call this place Mannahatta — "island of many hills". They grow maize, beans and squash, and live in bark wigwams.', 'Vikings briefly reach Newfoundland. Europe is in its Middle Ages. China prints books.'],
  [1350, 'A quiet island', 'Perhaps a few hundred Lenape live here among 55 distinct ecosystems.', 'The Black Death kills a third of Europe. The Aztec found Tenochtitlan.'],
  [1492, 'Two worlds meet', 'Nothing changes here. Not yet.', 'Columbus lands in the Caribbean. The printing press is 40 years old. European colonisation of the Americas begins.'],
  [1524, 'A sail', 'Verrazzano anchors in the harbour — the first European to see it — and leaves.', 'Magellan\'s crew has just circled the globe. Cortés has destroyed the Aztec empire.'],
  [1609, 'Henry Hudson', 'The Half Moon sails up the river that will carry his name, looking for China. He finds beaver.', 'Galileo points a telescope at the sky. Jamestown is two years old.'],
  [1626, 'New Amsterdam', 'The Dutch build a fort, a windmill and thirty houses at the island\'s tip. The island is "bought" for 60 guilders of goods.', 'The Pilgrims are at Plymouth. The transatlantic slave trade is growing.'],
  [1653, 'The wall', 'A wooden palisade is built across the island against the English. The path beside it will be Wall Street.', 'Europe\'s Thirty Years\' War has just ended. Newton is ten years old.'],
  [1664, 'New York', 'The English take the town without a shot and rename it for the Duke of York. About 1,500 people live here.', 'The Scientific Revolution is underway.'],
  [1776, 'Revolution', 'Independence is declared; weeks later the British take the city, and a great fire burns a quarter of it.', 'Watt\'s steam engine goes on sale. The Industrial Revolution is beginning.'],
  [1789, 'First capital', 'George Washington is sworn in as president on Wall Street. 33,000 people live here.', 'The French Revolution begins.'],
  [1811, 'The Grid', 'A plan is drawn: 12 avenues, 155 streets. The hills are levelled, the streams buried. Mannahatta disappears beneath Manhattan.', 'Napoleon rules Europe. Steam-powered mills spread.'],
  [1825, 'The Erie Canal', 'The canal makes New York the gateway to a continent. Gas lamps light the streets.', 'The first public steam railway opens in England.'],
  [1850, 'The Industrial city', 'Half a million people. Coal smoke, tenements, factories, immigrants arriving by the shipload.', 'Railways, telegraphs, steamships. The world is shrinking.'],
  [1883, 'Brooklyn Bridge', 'The longest suspension bridge on Earth opens over the East River. Electric light arrives. The Statue of Liberty follows in 1886.', 'The telephone, the light bulb, the motor car — all within a decade.'],
  [1904, 'The subway', 'The subway opens. 3.4 million people. Steel frames and elevators let buildings climb.', 'The Wright brothers have just flown. Einstein is about to publish.'],
  [1917, 'A world at war', 'Troopships leave from the Hudson piers. Motor cars replace horses in barely fifteen years.', 'The First World War. Then the 1918 flu.'],
  [1931, 'The race to the sky', 'The Chrysler Building, then the Empire State Building — built in 410 days — as the Depression begins.', 'Radio, cinema, penicillin.'],
  [1945, 'After the war', 'Sailors kiss strangers in Times Square. The UN will make its home here.', 'The Second World War ends. The atomic age begins.'],
  [1969, 'The Moon', 'Ticker tape for the Apollo 11 crew. Glass boxes replace stone towers.', 'Humans walk on another world, 66 years after their first flight.'],
  [1973, 'The Twin Towers', 'The World Trade Center opens — the tallest buildings on Earth.', 'The first mobile phone call is made on Sixth Avenue.'],
  [1991, 'The Web', 'Wall Street booms. Times Square is cleaned up.', 'The Cold War ends. The World Wide Web goes public.'],
  [2001, 'September 11', 'The Twin Towers fall. 2,753 people die here.', 'The century\'s first shock.'],
  [2007, 'A computer in every pocket', 'Everyone on the sidewalk begins looking down.', 'The smartphone. Social media. Half of humanity now lives in cities.'],
  [2014, 'One World Trade Center', 'A new tower rises 1,776 feet beside the memorial pools.', 'Eight billion people are on their way.'],
  [2020, 'The quiet spring', 'A pandemic empties the streets. For a few weeks you can hear birds on Broadway.', 'The whole world stops at once.'],
  [NOW, 'You are here', 'This is the only moment you actually have. Everything to the left already happened. Nothing to the right is promised.', 'A human lifetime is about 80 years — less than one pixel of this timeline.'],
  [2050, 'The warming', 'Hotter summers, higher tides. Sea walls rise around the island. The cars drive themselves.', 'You may still be here for this one. Or not.'],
  [2100, 'The end of your century', 'The harbour is a metre higher. Towers wear forests. Almost everyone alive in 2026 is gone.', 'Everyone you have ever met has been forgotten, or is about to be.'],
  [2200, 'Neon megacity', 'An imagined future: the streets are canals, the towers are a kilometre tall, the rain never stops and the sky is advertising.', '(From here on, this is the movies\' guess — and ours.)'],
  [2500, 'The long night', 'Flying traffic threads between megatowers. The old city is still down there, in the dark.', 'As far ahead of now as Columbus is behind.'],
  [3000, 'The Star Age', 'An imagined utopia: clean sky, gardens, white spires, and a space elevator rising out of the harbour. Most people live off-world.', 'English is as dead as Old English.'],
  [10000, 'After us', 'The spires are empty. Whether we left, changed, or ended, nobody is here. The forest takes the island back.', 'As far ahead as the invention of farming is behind.'],
  [50000, 'Ruins', 'Steel is rust, glass is sand. Only stumps of stone and the cut bedrock show a city stood here.', 'The constellations have changed shape.'],
  [1 * M, 'No trace', 'Nothing visible remains of us. A thin, odd layer in the rock — plastic, concrete, chicken bones — is our whole memorial.', 'Our species lasted, perhaps, a third of this long.'],
  [50 * M, 'Drifting', 'New species nobody will ever name. The Atlantic has stopped widening and begun to close.', 'Saturn\'s rings are fading.'],
  [250 * M, 'The next supercontinent', 'The continents have crashed back together. This spot is desert, thousands of kilometres from any sea.', 'A full circle: this is as far ahead as the first dinosaurs are behind.'],
  [600 * M, 'The last forests', 'The brightening Sun is breaking the carbon cycle. Trees can no longer photosynthesise. The land goes brown.', 'The last total solar eclipse has already happened.'],
  [1.1 * B, 'The oceans boil', 'The Sun is 10% brighter. The seas evaporate into a suffocating greenhouse. Complex life is over.', 'Life had four billion years on Earth. Animals had one of them.'],
  [3 * B, 'A second Venus', 'Bare, baked rock under a heavy sky. The planet\'s core is cooling; its magnetic shield is failing.', 'The Andromeda galaxy fills the night, about to merge with ours.'],
  [5 * B, 'The Sun begins to die', 'Its hydrogen core is spent. The Sun swells and reddens.', 'Mercury and Venus will go first.'],
  [7 * B, 'Red giant', 'The Sun fills the sky. The ground is glowing. The rocks themselves are melting.', 'The Sun is now two hundred times its old size.'],
  [7.55 * B, 'The end', 'The Sun swallows the Earth. Every place you ever stood, every word, every one — vapour.', 'It was always going to end. That is why it mattered.'],
].map(([y, t, h, w]) => ({ y, t, h, w }));

export function eventAt(y) {
  let e = EVENTS[0];
  for (const x of EVENTS) if (x.y <= y + 1e-6) e = x; else break;
  return e;
}

// ---------- environment keyframes ----------
// Every numeric / colour field is interpolated in slider space between keyframes.
const base = {
  top: 0x3f8fe0, hor: 0xbfe0f5, fogD: 0.0016, sun: 0xfff4d6, sunSize: 0.035, sunEl: 0.95, sunI: 2.2, amb: 1.0,
  ground: 0x4f7a35, water: 0x2f6f8f, sea: 0, hill: 1, ice: -60, cloud: 0.45, precip: 0, pCol: 0xffffff, pVy: -2, pSize: 0.25,
  lava: 0x000000, glow: 0, far: 0x4a6a4a, bloom: 0.22, exposure: 1.0, grass: 0, moonHot: 0, cloudCol: 0xffffff, meteor: 0,
};
const K = (y, o) => ({ y, ...o });
const forest = { ground: 0x3f6a2c, far: 0x35552f, grass: 1 };
const KEYS = [
  // --- before life ---
  K(START, { top: 0x0a0404, hor: 0x8a2410, fogD: 0.004, sun: 0xffd0a0, sunI: 1.1, amb: 0.9, ground: 0x2a0e06, far: 0x2a0e06, lava: 0xff5a10, sea: -40, water: 0x401008, hill: 0.7, cloud: 0, precip: 1, pCol: 0xffa040, pVy: -9, pSize: 0.35, bloom: 0.7, meteor: 0.7 }),
  K(-4.505e9, { top: 0x0a0404, hor: 0x8a2410, fogD: 0.004, sun: 0xffd0a0, sunI: 1.1, amb: 0.9, ground: 0x2a0e06, far: 0x2a0e06, lava: 0xff5a10, sea: -40, water: 0x401008, hill: 0.7, cloud: 0, precip: 1, pCol: 0xffa040, pVy: -9, pSize: 0.35, bloom: 0.7, meteor: 0.7 }),
  K(-4.5e9, { top: 0x601808, hor: 0xffb050, fogD: 0.006, sun: 0xffd0a0, sunI: 1.4, amb: 1.6, ground: 0x401408, far: 0x401408, lava: 0xffb040, sea: -40, water: 0x401008, hill: 0.7, cloud: 0, precip: 1, pCol: 0xffd080, pVy: -14, pSize: 0.45, bloom: 1.1, glow: 0.3, meteor: 1 }),
  K(-4.49e9, { top: 0x0c0504, hor: 0x9a3012, fogD: 0.004, sun: 0xffd0a0, sunI: 1.1, amb: 1.0, ground: 0x2a0e06, far: 0x2a0e06, lava: 0xff6a18, sea: -40, water: 0x401008, hill: 0.7, cloud: 0, precip: 0.8, pCol: 0xffa040, pVy: -9, pSize: 0.35, bloom: 0.45, moonHot: 1, meteor: 0.9 }),
  K(-4.4e9, { top: 0x2a2624, hor: 0x8a7e72, fogD: 0.011, sun: 0xffe0c0, sunI: 0.6, amb: 0.9, ground: 0x1e1a18, far: 0x1a1816, lava: 0x1a0300, sea: -7, water: 0x3a3a32, hill: 0.8, cloud: 1, precip: 1, pCol: 0x9ab0c0, pVy: -30, pSize: 0.16, moonHot: 0.45, cloudCol: 0x9a9690, meteor: 0.1 }),
  K(-4.25e9, { top: 0x7a5236, hor: 0xd8a070, fogD: 0.004, sun: 0xffe6c8, sunI: 1.4, amb: 1.0, ground: 0x26221e, far: 0x221e1a, sea: 0, water: 0x4a5a3a, hill: 0.9, cloud: 0.6, moonHot: 0.05, cloudCol: 0xe8c8a0, meteor: 0.15 }),
  K(-4.1e9, { top: 0x3a1a10, hor: 0xe8703a, fogD: 0.005, sun: 0xffc090, sunI: 1.1, amb: 1.0, ground: 0x241c18, far: 0x201814, lava: 0x300800, sea: -1, water: 0x5a4a30, hill: 0.9, cloud: 0.5, precip: 0.8, pCol: 0xff9a3a, pVy: -9, pSize: 0.35, bloom: 0.5, cloudCol: 0x9a6a50, meteor: 1 }),
  // --- microbes only ---
  K(-3.85e9, { top: 0xa86a40, hor: 0xf0c090, fogD: 0.003, sun: 0xffe8cc, sunI: 1.6, ground: 0x2c2622, far: 0x282420, water: 0x4a7a50, cloud: 0.4, cloudCol: 0xf4d8b4 }),
  K(-2.5e9, { top: 0xa86a40, hor: 0xf0c090, fogD: 0.003, sun: 0xffe8cc, sunI: 1.7, ground: 0x2c2622, far: 0x282420, water: 0x4a7a50, cloud: 0.4, cloudCol: 0xf4d8b4 }),
  K(-2.4e9, { top: 0x5a90c8, hor: 0xe0d8c0, fogD: 0.0022, sunI: 1.8, ground: 0x5a3a2c, far: 0x503428, water: 0x7a4a30, cloud: 0.4 }),
  K(-2.33e9, { top: 0x4a90d8, hor: 0xeaf4fc, fogD: 0.0035, sunI: 1.8, amb: 1.35, ground: 0xdfe8ee, far: 0xe6eef4, sea: -40, ice: 55, cloud: 0.4, precip: 0.8, pVy: -1.6 }),
  K(-2.18e9, { top: 0x4a90d8, hor: 0xeaf4fc, fogD: 0.0035, sunI: 1.8, amb: 1.35, ground: 0xdfe8ee, far: 0xe6eef4, sea: -40, ice: 55, cloud: 0.4, precip: 0.8, pVy: -1.6 }),
  K(-2.1e9, { top: 0x4a90d8, hor: 0xd8e4e8, sunI: 1.9, ground: 0x6a5a4c, far: 0x5a4e42, cloud: 0.4 }),
  K(-1.2e9, { top: 0x4a90d8, hor: 0xd8e4e8, sunI: 1.9, ground: 0x6a5a4c, far: 0x5a4e42, cloud: 0.4 }),
  K(-1.1e9, { top: 0x4a8ad0, hor: 0xd0dce4, fogD: 0.0018, sunI: 2.0, ground: 0x7a746c, far: 0x6a6660, hill: 6, cloud: 0.6 }),
  K(-900e6, { top: 0x4a90d8, hor: 0xd8e4e8, sunI: 2.0, ground: 0x726a60, far: 0x625a52, hill: 3, cloud: 0.45 }),
  K(-730e6, { top: 0x4a90d8, hor: 0xd8e4e8, sunI: 2.0, ground: 0x6a5a4c, far: 0x5a4e42, hill: 1.2, cloud: 0.45 }),
  K(-716e6, { top: 0x4a90d8, hor: 0xeaf4fc, fogD: 0.0035, sunI: 1.9, amb: 1.35, ground: 0xdfe8ee, far: 0xe6eef4, sea: -40, ice: 55, cloud: 0.4, precip: 0.8, pVy: -1.6 }),
  K(-640e6, { top: 0x4a90d8, hor: 0xeaf4fc, fogD: 0.0035, sunI: 1.9, amb: 1.35, ground: 0xdfe8ee, far: 0xe6eef4, sea: -40, ice: 55, cloud: 0.4, precip: 0.8, pVy: -1.6 }),
  K(-632e6, { top: 0x4a94dc, hor: 0xd8e8ec, sunI: 2.0, ground: 0x625a4e, far: 0x565044, water: 0x2f7a8a, cloud: 0.5 }),
  // --- animals in the sea, then plants and animals on land ---
  K(-545e6, { top: 0x4a94dc, hor: 0xd8e8ec, sunI: 2.1, ground: 0x7a6e58, far: 0x6a604c, water: 0x2f7a8a, hill: 0.8, cloud: 0.5 }),
  K(-539e6, { top: 0x3a98e0, hor: 0xd8f0f0, sunI: 2.2, ground: 0xc8b890, far: 0xb8a880, water: 0x2a8a90, sea: 3.25, hill: 0.3, cloud: 0.4 }),
  K(-478e6, { top: 0x3a98e0, hor: 0xd8f0f0, sunI: 2.2, ground: 0xc8b890, far: 0xb8a880, water: 0x2a8a90, sea: 3.25, hill: 0.3, cloud: 0.4 }),
  K(-470e6, { top: 0x4a8ad0, hor: 0xd0dce4, fogD: 0.0018, ground: 0x6a665c, far: 0x5c5850, hill: 5, cloud: 0.6 }),
  K(-440e6, { top: 0x4a8ed4, hor: 0xd4e2e4, ground: 0x687050, far: 0x586044, hill: 3.5, cloud: 0.5, grass: 0.05 }),
  K(-420e6, { top: 0x4a94dc, hor: 0xd8e8e4, ground: 0x5f7046, far: 0x50603c, hill: 2.5, cloud: 0.5, grass: 0.3 }),
  K(-385e6, { top: 0x4498dc, hor: 0xd8ecd8, fogD: 0.0022, ground: 0x4a7038, far: 0x3e5e30, water: 0x3a7a70, hill: 2, cloud: 0.5, grass: 0.85 }),
  K(-320e6, { top: 0x4a98d4, hor: 0xd0e8c8, fogD: 0.004, ground: 0x33562a, far: 0x2c4a26, water: 0x3a5a3a, sea: 1.6, hill: 1.1, cloud: 0.7, grass: 1 }),
  K(-302e6, { top: 0x4a98d4, hor: 0xd8e8c8, fogD: 0.003, ground: 0x4f6a34, far: 0x44582e, water: 0x3a6a5a, hill: 2.4, cloud: 0.55, grass: 0.7 }),
  K(-285e6, { top: 0x5aa0d8, hor: 0xf0d8a8, fogD: 0.002, sunI: 2.5, ground: 0xa8824e, far: 0x987444, water: 0x4a7a70, sea: -6, hill: 2.6, cloud: 0.15, grass: 0.2 }),
  K(-252.3e6, { top: 0x5aa0d8, hor: 0xf0d8a8, fogD: 0.002, sunI: 2.5, ground: 0xa8824e, far: 0x987444, water: 0x4a7a70, sea: -6, hill: 2.4, cloud: 0.15, grass: 0.2 }),
  K(-252.2e6, { top: 0x3a2a22, hor: 0xc86a3a, fogD: 0.007, sun: 0xff9a5a, sunI: 0.8, amb: 0.7, ground: 0x4a3a2e, far: 0x2a2220, water: 0x5a5040, sea: -6, hill: 2.4, cloud: 1, precip: 0.6, pCol: 0x55504a, pVy: -1, pSize: 0.3, cloudCol: 0x5a4a40 }),
  K(-251.8e6, { top: 0x4a3a30, hor: 0xd08a50, fogD: 0.005, sun: 0xffb070, sunI: 1.2, amb: 0.8, ground: 0x5a4a38, far: 0x3a302a, water: 0x5a5040, sea: -6, hill: 2.3, cloud: 0.8, precip: 0.3, pCol: 0x55504a, pVy: -1, pSize: 0.3, cloudCol: 0x7a6858 }),
  K(-246e6, { top: 0x5aa0d8, hor: 0xf2d8a8, fogD: 0.002, sunI: 2.5, ground: 0x9a7e4a, far: 0x8a7042, water: 0x4a7a70, sea: -3, hill: 1.8, cloud: 0.2, grass: 0.15 }),
  // --- the age of dinosaurs ---
  K(-235e6, { grass: 0.7, top: 0x4f9fd8, hor: 0xf2ddb0, fogD: 0.002, ground: 0x7d7a3e, far: 0x6a6a3a, water: 0x3f7f7a, cloud: 0.3 }),
  K(-203e6, { grass: 0.7, top: 0x4f9fd8, hor: 0xf2ddb0, fogD: 0.002, ground: 0x7d7a3e, far: 0x6a6a3a, water: 0x3f7f7a, cloud: 0.3 }),
  K(-201e6, { grass: 0.15, top: 0x3a2a22, hor: 0xd8743a, fogD: 0.006, sun: 0xff9a5a, sunI: 0.9, amb: 0.7, ground: 0x4a3f33, far: 0x2a2220, water: 0x4a4a44, cloud: 0.9, precip: 0.5, pCol: 0x55504a, pVy: -1, pSize: 0.3, cloudCol: 0x5a4a40 }),
  K(-185e6, { grass: 0.9, top: 0x4a9ad8, hor: 0xe8e0b8, fogD: 0.0022, ground: 0x4f7a35, far: 0x3f6030, water: 0x3f7f7a }),
  K(-150e6, { grass: 1, top: 0x3f95dc, hor: 0xd8ecd0, fogD: 0.0024, ground: 0x46782e, far: 0x3a6030, water: 0x3a8078, cloud: 0.5 }),
  K(-66.04e6, { grass: 1, top: 0x4a9ad8, hor: 0xe6e6c0, fogD: 0.002, ground: 0x4a7a30, far: 0x3a6030, water: 0x3a8078 }),
  K(-66.02e6, { bloom: 0.55, top: 0x220a04, hor: 0xff5a14, fogD: 0.007, sun: 0xff3a0a, sunI: 0.8, amb: 1.1, ground: 0x3a241a, far: 0x1a0a05, water: 0x5a2a1a, cloud: 1, precip: 1, pCol: 0xff8a2a, pVy: -9, pSize: 0.35, cloudCol: 0x6a3a28, meteor: 0.8 }),
  K(-65.96e6, { top: 0x1a1a1c, hor: 0x4a4644, fogD: 0.009, sun: 0x6a5a50, sunI: 0.25, amb: 0.45, ground: 0x2c2a28, far: 0x1c1c1c, water: 0x2a2c2e, cloud: 1, precip: 0.8, pCol: 0x8a8884, pVy: -1.2, pSize: 0.3, cloudCol: 0x3a3836 }),
  K(-65.9e6, { grass: 0.4, top: 0x5a6a78, hor: 0xa8a8a0, fogD: 0.004, sunI: 1.2, amb: 0.8, ground: 0x4a5a38, far: 0x3a4a34, cloud: 0.8, cloudCol: 0xa8a49c }),
  K(-50e6, { grass: 1, top: 0x3a98e0, hor: 0xd0f0d8, fogD: 0.003, ground: 0x2f7a2a, far: 0x2a5f2a, water: 0x2f807a, cloud: 0.6 }),
  K(-2.6e6, { ...forest, cloud: 0.5 }),
  K(-1e6, { grass: 0.6, top: 0x6aa0d0, hor: 0xdde8f0, ground: 0x7a8a6a, far: 0x7a8a7a, cloud: 0.6, sea: -10, hill: 1 }),
  K(-300e3, { top: 0x5a9ad8, hor: 0xe8f2fa, fogD: 0.003, ground: 0xdfe8ee, far: 0xe0eaf0, sea: -40, ice: 60, cloud: 0.5, precip: 0.6, pVy: -1.5, amb: 1.3 }),
  K(-162e3, { top: 0x5a9ad8, hor: 0xe8f2fa, fogD: 0.003, ground: 0x9aa890, far: 0xcfd8d8, sea: -30, ice: 10, cloud: 0.5, precip: 0.3, pVy: -1.5 }),
  K(-125e3, { ...forest, sea: 1, cloud: 0.4 }),
  K(-70e3, { grass: 0.7, top: 0x6aa0d0, hor: 0xdce6ec, ground: 0x8a8f5a, far: 0x8a9080, sea: -25, cloud: 0.6 }),
  K(-50e3, { grass: 0.6, top: 0x6aa0d0, hor: 0xdce6ec, ground: 0x93936a, far: 0xa0a8a0, sea: -30, cloud: 0.6, precip: 0.15, pVy: -1.5 }),
  K(-26e3, { grass: 0.2, top: 0x6a9cc8, hor: 0xe4eef4, fogD: 0.003, ground: 0xc8d0d0, far: 0xe0eaf0, sea: -40, ice: -20, cloud: 0.7, precip: 0.6, pVy: -1.6 }),
  K(-22e3, { top: 0x4a90d8, hor: 0xeaf4fc, fogD: 0.0035, ground: 0xe0e8ee, far: 0xe6eef4, sea: -40, ice: 70, cloud: 0.4, precip: 1, pVy: -1.6, amb: 1.35 }),
  K(-17.5e3, { top: 0x5a98d8, hor: 0xe4eef6, fogD: 0.003, ground: 0xaab0aa, far: 0xdfe8ee, sea: -40, ice: 12, cloud: 0.5, precip: 0.5, pVy: -1.6 }),
  K(-16e3, { grass: 0.35, top: 0x6aa0d0, hor: 0xdce6ec, fogD: 0.0026, ground: 0x8f8f7a, far: 0xb8c0c0, sea: -35, ice: -60, cloud: 0.6, precip: 0.1, pVy: -1.6 }),
  K(-11e3, { grass: 0.8, top: 0x5a9ad8, hor: 0xd8e8f0, ground: 0x6f8450, far: 0x55705a, sea: -22, cloud: 0.5 }),
  K(-6000, { ...forest, sea: -3 }),
  K(-3300, { ...forest }),
  K(1609, { ...forest }),
  K(1650, { grass: 1, ground: 0x55783a, far: 0x3a5a33 }),
  K(1776, { grass: 0.7, ground: 0x6a7a48, far: 0x4a5f3a, hill: 0.5 }),
  K(1811, { grass: 0.25, ground: 0x7a7458, far: 0x5a6045, hill: 0.12, hor: 0xc8dce8 }),
  K(1830, { ground: 0x7d7663, far: 0x5f5f50, hill: 0, hor: 0xc8d4d8 }),
  K(1850, { top: 0x6a8fb0, hor: 0xc8c0a8, fogD: 0.003, ground: 0x7a756a, far: 0x5a544c, hill: 0, water: 0x3a5f6a, sunI: 1.8, cloud: 0.6, cloudCol: 0xd8ccb8 }),
  K(1900, { top: 0x7a8a98, hor: 0xc2b094, fogD: 0.0042, sun: 0xffe2b0, ground: 0x77736c, far: 0x4c4640, hill: 0, water: 0x3a5560, sunI: 1.5, cloud: 0.7, cloudCol: 0xb8a890 }),
  K(1950, { top: 0x5a90c8, hor: 0xc8ccc8, fogD: 0.003, ground: 0x7c7c7a, far: 0x505458, hill: 0, water: 0x35596a, cloud: 0.5, cloudCol: 0xdcd8d0 }),
  K(2000, { top: 0x3a88dc, hor: 0xc4dcee, fogD: 0.0022, ground: 0x808286, far: 0x55606a, hill: 0, water: 0x2f6480 }),
  K(NOW, { top: 0x3a88dc, hor: 0xc4dcee, fogD: 0.0022, ground: 0x808286, far: 0x55606a, hill: 0, water: 0x2f6480 }),
  K(2100, { top: 0x5a90c0, hor: 0xe8d8b8, fogD: 0.003, sun: 0xffe8b8, ground: 0x7f8478, far: 0x5a6058, hill: 0, sea: 1.6, water: 0x3a6a70, sunI: 2.4, cloud: 0.35 }),
  K(2165, { top: 0x5a88b0, hor: 0xe0c8a8, fogD: 0.0034, sun: 0xffe0b0, ground: 0x7a7e74, far: 0x5a6058, hill: 0, sea: 2.6, water: 0x3a6068, sunI: 2.2, cloud: 0.5 }),
  K(2200, { bloom: 0.7, top: 0x0a0c1c, hor: 0x3a2048, fogD: 0.0055, sun: 0xb07aa0, sunI: 0.25, amb: 0.5, ground: 0x2a2c34, far: 0x1a1424, hill: 0, sea: 3.05, water: 0x101826, cloud: 1, precip: 1, pCol: 0x9ab8ff, pVy: -30, pSize: 0.16, cloudCol: 0x6a3a7a }),
  K(2500, { bloom: 0.7, top: 0x080a18, hor: 0x40204a, fogD: 0.0055, sun: 0xb07aa0, sunI: 0.25, amb: 0.5, ground: 0x2a2c34, far: 0x1a1424, hill: 0, sea: 3.05, water: 0x101826, cloud: 1, precip: 1, pCol: 0x9ab8ff, pVy: -30, pSize: 0.16, cloudCol: 0x6a3a7a }),
  K(3000, { grass: 1, top: 0x2f8ae8, hor: 0xc8ecf8, fogD: 0.0014, ground: 0x4f9a48, far: 0x3f7a48, hill: 0, sea: 0, water: 0x2a80a0, cloud: 0.3 }),
  K(10000, { grass: 1, top: 0x3f8fe0, hor: 0xc8e4f0, ground: 0x4a7f38, far: 0x3a6035, hill: 0.15, cloud: 0.45 }),
  K(100e3, { ...forest, hill: 0.6 }),
  K(1 * M, { ...forest, hill: 1 }),
  K(100 * M, { grass: 0.8, top: 0x4a98dc, hor: 0xe8e0c0, ground: 0x7f8a48, far: 0x6a7040, hill: 1, sea: -4, water: 0x3a7a80, cloud: 0.35, sunSize: 0.036 }),
  K(250 * M, { top: 0x5aa0d8, hor: 0xf0d8a8, fogD: 0.002, ground: 0xc08a50, far: 0xb07a48, hill: 1, sea: -40, cloud: 0.1, sunI: 2.6, sunSize: 0.037 }),
  K(600 * M, { grass: 0.12, top: 0x7ab0d8, hor: 0xf0dcb0, fogD: 0.0022, ground: 0x9a7a52, far: 0x8a6a48, hill: 1, sea: -6, water: 0x5a8078, cloud: 0.25, sunI: 2.8, sunSize: 0.04, sun: 0xfff8e8 }),
  K(1.1 * B, { top: 0xd8d0b0, hor: 0xf4ead0, fogD: 0.009, ground: 0x8a6a50, far: 0x9a8a70, hill: 1, sea: -14, water: 0x8a8a70, cloud: 1, sunI: 2.0, amb: 1.4, sunSize: 0.045, sun: 0xffffff, precip: 0.5, pCol: 0xffffff, pVy: 3, pSize: 0.5, cloudCol: 0xf4ecd8 }),
  K(3 * B, { top: 0xc09a50, hor: 0xe8c080, fogD: 0.004, ground: 0x6a4a38, far: 0x5a3a2a, hill: 1, sea: -40, cloud: 0.6, sunI: 3.0, amb: 1.0, sunSize: 0.055, sun: 0xfff0d0, cloudCol: 0xe8c890 }),
  K(5 * B, { top: 0xb06a30, hor: 0xf0a050, fogD: 0.003, ground: 0x5a3828, far: 0x4a2a20, hill: 1, sea: -40, cloud: 0.2, sunI: 3.2, amb: 0.9, sunSize: 0.09, sun: 0xffc070, sunEl: 0.7, cloudCol: 0xe8a868 }),
  K(6.5 * B, { bloom: 0.35, top: 0x60200a, hor: 0xf0702a, fogD: 0.003, ground: 0x402018, far: 0x30140e, hill: 1, sea: -40, cloud: 0, sunI: 3.4, amb: 0.9, sunSize: 0.3, sun: 0xff8a3a, sunEl: 0.6, lava: 0x200400 }),
  K(7 * B, { bloom: 0.5, top: 0x3a0a04, hor: 0xe84a14, fogD: 0.0035, ground: 0x30140c, far: 0x200a06, hill: 1, sea: -40, cloud: 0, sunI: 3.6, amb: 1.0, sunSize: 0.62, sun: 0xff5a1a, sunEl: 0.5, lava: 0x802000, precip: 0.6, pCol: 0xffa040, pVy: 4, pSize: 0.3 }),
  K(7.5 * B, { bloom: 0.8, top: 0xa02808, hor: 0xff7a20, fogD: 0.005, ground: 0x401a0c, far: 0x300e06, hill: 1, sea: -40, cloud: 0, sunI: 4, amb: 1.4, sunSize: 1.5, sun: 0xff7a2a, sunEl: 0.45, lava: 0xff5a10, precip: 1, pCol: 0xffc060, pVy: 8, pSize: 0.4, glow: 0.15 }),
  K(END, { bloom: 1.2, top: 0xffc060, hor: 0xffe0a0, fogD: 0.02, ground: 0xffa040, far: 0xffa040, hill: 1, sea: -40, cloud: 0, sunI: 5, amb: 2, sunSize: 3.2, sun: 0xffd080, sunEl: 0.45, lava: 0xffc060, precip: 1, pCol: 0xffffff, pVy: 12, pSize: 0.5, glow: 1 }),
].map((k) => ({ ...base, ...k, u: yearToU(k.y) }));

const COLOR_FIELDS = ['top', 'hor', 'sun', 'ground', 'water', 'pCol', 'lava', 'far', 'cloudCol'];
const NUM_FIELDS = ['fogD', 'sunSize', 'sunEl', 'sunI', 'amb', 'sea', 'hill', 'ice', 'cloud', 'precip', 'pVy', 'pSize', 'glow', 'bloom', 'exposure', 'grass', 'moonHot', 'meteor'];
const rgb = (h) => [(h >> 16 & 255) / 255, (h >> 8 & 255) / 255, (h & 255) / 255];
for (const k of KEYS) for (const f of COLOR_FIELDS) k[f] = rgb(k[f]);

/** Interpolated environment for slider position u. Colours are [r,g,b] in sRGB 0..1. */
export function envAt(u, out = {}) {
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1].u <= u) i++;
  const a = KEYS[i], b = KEYS[i + 1];
  let t = (u - a.u) / Math.max(1e-9, b.u - a.u);
  t = Math.max(0, Math.min(1, t));
  for (const f of NUM_FIELDS) out[f] = a[f] + (b[f] - a[f]) * t;
  // how large the Moon looks follows from how far away it was (0.034 is today's size as drawn)
  const md = moonDistance(uToYear(u)); out.moon = md ? Math.min(0.5, (0.034 * 384400) / md) : 0;
  for (const f of COLOR_FIELDS) {
    const o = out[f] || (out[f] = [0, 0, 0]);
    for (let j = 0; j < 3; j++) o[j] = a[f][j] + (b[f][j] - a[f][j]) * t;
  }
  return out;
}
