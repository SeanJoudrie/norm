/* NORM prototype data: interest tree and demo profiles.
   Tree levels: category > sub-category > interest/title.
   kind "title" leaves use Love / Not for me / Haven't seen. */

const TREE = [
  { id: 'music', name: 'Music', icon: 'headphones', desc: 'Genres, artists and live shows', children: [
    { id: 'edm', name: 'EDM', icon: 'disc-3', desc: 'House, techno, festivals' },
    { id: 'altrock', name: 'Alternative rock', icon: 'guitar', desc: 'Pick the bands you actually play', children: [
      { id: 'radiohead', name: 'Radiohead', icon: 'music', kind: 'artist', desc: 'OK Computer, In Rainbows' },
      { id: 'arcticmonkeys', name: 'Arctic Monkeys', icon: 'music', kind: 'artist', desc: 'AM, Favourite Worst Nightmare' },
      { id: 'strokes', name: 'The Strokes', icon: 'music', kind: 'artist', desc: 'Is This It' },
      { id: 'paramore', name: 'Paramore', icon: 'music', kind: 'artist', desc: 'Riot!, This Is Why' },
    ] },
    { id: 'hiphop', name: 'Hip-hop', icon: 'mic-vocal', desc: 'Rap, R&B crossovers' },
    { id: 'country', name: 'Country', icon: 'music', desc: 'Nashville to outlaw' },
    { id: 'jazz', name: 'Jazz', icon: 'piano', desc: 'Bebop, fusion, late-night sets' },
  ] },
  { id: 'film', name: 'Film', icon: 'film', desc: 'Genres and the movies you rewatch', children: [
    { id: 'horror', name: 'Horror', icon: 'ghost', desc: 'Slashers to slow-burn dread', children: [
      { id: 'shining', name: 'The Shining', icon: 'popcorn', kind: 'title', desc: '1980 · Stanley Kubrick' },
      { id: 'hereditary', name: 'Hereditary', icon: 'popcorn', kind: 'title', desc: '2018 · Ari Aster' },
      { id: 'getout', name: 'Get Out', icon: 'popcorn', kind: 'title', desc: '2017 · Jordan Peele' },
      { id: 'halloween', name: 'Halloween', icon: 'popcorn', kind: 'title', desc: '1978 · John Carpenter' },
    ] },
    { id: 'comedy', name: 'Comedy', icon: 'laugh', desc: 'Stand-up, rom-coms, satire' },
    { id: 'scifi', name: 'Sci-fi', icon: 'rocket', desc: 'Space, time travel, dystopias' },
    { id: 'docs', name: 'Documentaries', icon: 'tv', desc: 'True crime, nature, history' },
  ] },
  { id: 'sports', name: 'Sports', icon: 'trophy', desc: 'Teams you follow and games you play', children: [
    { id: 'nfl', name: 'NFL', icon: 'flag', desc: 'Sundays are spoken for', children: [
      { id: 'patriots', name: 'New England Patriots', icon: 'medal', kind: 'team', desc: 'AFC East' },
      { id: 'chiefs', name: 'Kansas City Chiefs', icon: 'medal', kind: 'team', desc: 'AFC West' },
      { id: 'eagles', name: 'Philadelphia Eagles', icon: 'medal', kind: 'team', desc: 'NFC East' },
    ] },
    { id: 'mlb', name: 'MLB', icon: 'target', desc: 'Baseball, box scores, summer nights', children: [
      { id: 'redsox', name: 'Boston Red Sox', icon: 'medal', kind: 'team', desc: 'AL East' },
      { id: 'yankees', name: 'New York Yankees', icon: 'medal', kind: 'team', desc: 'AL East' },
      { id: 'dodgers', name: 'Los Angeles Dodgers', icon: 'medal', kind: 'team', desc: 'NL West' },
    ] },
    { id: 'soccer', name: 'Soccer', icon: 'volleyball', desc: 'Premier League, MLS, pickup games' },
  ] },
  { id: 'outdoors', name: 'Outdoors', icon: 'mountain', desc: 'Time outside, on purpose', children: [
    { id: 'hiking', name: 'Hiking', icon: 'footprints', desc: 'Day hikes to thru-hikes' },
    { id: 'fishing', name: 'Fishing', icon: 'fish', desc: 'Fly, lake, or deep sea' },
    { id: 'camping', name: 'Camping', icon: 'tent', desc: 'Tents, fires, no signal' },
    { id: 'surfing', name: 'Surfing', icon: 'waves', desc: 'Dawn patrol and beach breaks' },
    { id: 'cycling', name: 'Cycling', icon: 'bike', desc: 'Road, gravel, commuting' },
  ] },
  { id: 'food', name: 'Food & drink', icon: 'utensils', desc: 'Cooking, eating out, what you pour', children: [
    { id: 'cooking', name: 'Cooking', icon: 'chef-hat', desc: 'Weeknight meals to dinner parties' },
    { id: 'baking', name: 'Baking', icon: 'cake', desc: 'Bread, pastry, sourdough starters' },
    { id: 'coffee', name: 'Coffee', icon: 'coffee', desc: 'Pour-over, espresso, café hopping' },
    { id: 'craftbeer', name: 'Craft beer', icon: 'beer', desc: 'Breweries and taprooms' },
    { id: 'plantbased', name: 'Plant-based cooking', icon: 'leaf', desc: 'Vegan and vegetarian' },
  ] },
  { id: 'games', name: 'Games', icon: 'gamepad-2', desc: 'Tabletop, video, and strategy', children: [
    { id: 'boardgames', name: 'Board games', icon: 'dice-5', desc: 'Catan, Wingspan, game nights' },
    { id: 'videogames', name: 'Video games', icon: 'gamepad-2', desc: 'Console, PC, handheld' },
    { id: 'chess', name: 'Chess', icon: 'crown', desc: 'Blitz online or over the board' },
    { id: 'dnd', name: 'Dungeons & Dragons', icon: 'swords', desc: 'Campaigns and one-shots' },
  ] },
  { id: 'arts', name: 'Arts & making', icon: 'palette', desc: 'Things you make with your hands', children: [
    { id: 'sculpting', name: 'Sculpting', icon: 'shapes', desc: 'Clay, stone, wood' },
    { id: 'painting', name: 'Painting', icon: 'brush', desc: 'Oils, acrylics, watercolor' },
    { id: 'photography', name: 'Photography', icon: 'camera', desc: 'Film, digital, street' },
    { id: 'writing', name: 'Writing', icon: 'pen-line', desc: 'Fiction, poetry, journaling' },
  ] },
  { id: 'tech', name: 'Tech', icon: 'cpu', desc: 'Building and tinkering', children: [
    { id: 'coding', name: 'Coding', icon: 'code', desc: 'Side projects and open source' },
    { id: 'ai', name: 'AI', icon: 'bot', desc: 'Models, tools, and the news' },
    { id: 'pcbuild', name: 'Building PCs', icon: 'cpu', desc: 'Parts lists and cable management' },
  ] },
  { id: 'fitness', name: 'Fitness', icon: 'dumbbell', desc: 'How you move', children: [
    { id: 'running', name: 'Running', icon: 'footprints', desc: '5Ks to marathons' },
    { id: 'yoga', name: 'Yoga', icon: 'flower-2', desc: 'Vinyasa, hot, restorative' },
    { id: 'lifting', name: 'Lifting', icon: 'dumbbell', desc: 'Powerlifting, gym routines' },
    { id: 'climbing', name: 'Climbing', icon: 'mountain', desc: 'Bouldering gyms and crags' },
  ] },
  { id: 'travel', name: 'Travel', icon: 'plane', desc: 'Trips, road trips, new cities' },
  { id: 'reading', name: 'Reading', icon: 'book-open', desc: 'Fiction, nonfiction, book clubs' },
  { id: 'politics', name: 'Politics', icon: 'landmark', desc: 'Private by default. Only used for matching.', private: true, children: [
    { id: 'progressive', name: 'Progressive', icon: 'vote', desc: 'Left of center' },
    { id: 'moderate', name: 'Moderate or independent', icon: 'scale', desc: 'Issue by issue' },
    { id: 'conservative', name: 'Conservative', icon: 'vote', desc: 'Right of center' },
    { id: 'civilrights', name: 'Civil rights', icon: 'megaphone', desc: 'Voting rights, equal protection' },
    { id: 'climate', name: 'Climate policy', icon: 'globe', desc: 'Energy, conservation' },
  ] },
];

/* Demo profiles. Tiers: star (Top 20), yes, maybe, no. */
const PROFILES = [
  { id: 'lisa', name: 'Lisa', age: 29, miles: 4, gender: 'woman', mode: 'romance', tone: 1,
    answers: {
      music: 'yes', edm: 'star', altrock: 'maybe', hiphop: 'yes', film: 'yes', horror: 'star', shining: 'star',
      hereditary: 'yes', getout: 'yes', sports: 'yes', nfl: 'yes', patriots: 'star', outdoors: 'yes',
      hiking: 'star', fishing: 'no', camping: 'maybe', food: 'yes', cooking: 'yes', coffee: 'yes',
      travel: 'star', games: 'no', arts: 'maybe', sculpting: 'no', tech: 'maybe', fitness: 'yes', running: 'yes',
    } },
  { id: 'anne', name: 'Anne', age: 33, miles: 2, gender: 'woman', mode: 'friends', tone: 2,
    answers: {
      music: 'yes', altrock: 'star', radiohead: 'star', strokes: 'yes', edm: 'no', film: 'yes', comedy: 'yes',
      horror: 'maybe', sports: 'yes', mlb: 'yes', redsox: 'star', nfl: 'maybe', outdoors: 'yes', fishing: 'star',
      camping: 'yes', hiking: 'yes', games: 'yes',
      boardgames: 'star', dnd: 'yes', chess: 'maybe', tech: 'yes', coding: 'star', ai: 'yes', food: 'yes',
      coffee: 'star', craftbeer: 'yes', reading: 'yes',
    } },
  { id: 'elizabeth', name: 'Elizabeth', age: 31, miles: 7, gender: 'woman', mode: 'both', tone: 3,
    answers: {
      arts: 'yes', sculpting: 'star', painting: 'yes', photography: 'star', writing: 'yes', fitness: 'yes',
      yoga: 'star', climbing: 'yes', travel: 'star', reading: 'star', music: 'yes', jazz: 'yes', edm: 'no',
      sports: 'no', politics: 'yes', progressive: 'yes', civilrights: 'star', climate: 'yes',
      food: 'yes', plantbased: 'yes', cooking: 'yes', coffee: 'yes', film: 'yes', docs: 'yes', horror: 'no',
      outdoors: 'yes', hiking: 'yes', camping: 'maybe', tech: 'maybe', ai: 'yes',
    } },
];

/* Sample answers for the "fill with sample answers" shortcut. */
const SAMPLE_ANSWERS = {
  music: 'yes', edm: 'yes', altrock: 'yes', radiohead: 'yes', arcticmonkeys: 'skip', hiphop: 'no',
  film: 'yes', horror: 'yes', shining: 'yes', hereditary: 'yes', getout: 'skip', comedy: 'yes',
  sports: 'yes', nfl: 'yes', patriots: 'yes', chiefs: 'no', mlb: 'yes', redsox: 'yes',
  outdoors: 'yes', hiking: 'yes', fishing: 'maybe', camping: 'yes', food: 'yes', cooking: 'yes', coffee: 'yes',
  games: 'no', arts: 'maybe', sculpting: 'no', tech: 'yes', coding: 'yes', ai: 'yes', travel: 'yes',
};
const SAMPLE_STARS = ['edm', 'horror', 'patriots', 'hiking', 'shining'];
