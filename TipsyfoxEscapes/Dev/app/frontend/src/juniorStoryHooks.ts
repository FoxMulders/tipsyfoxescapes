export type JuniorStoryHook = {
  title: string;
  detail: string;
  /** Lowercase tokens; hook scores when any appear in theme + environment + props text. */
  themeKeywords: string[];
  envKeywords: string[];
};

const JUNIOR_STORY_HOOKS: JuniorStoryHook[] = [
  {
    title: "The giant’s reading nook (micro-scale)",
    detail:
      "A coffee table becomes a “stone archive,” floor cushions are “scroll stacks,” and a lamp is a “watchtower”—kids navigate the epic without moving furniture.",
    themeKeywords: ["library", "book", "haunted", "archive", "scholar", "tome", "codex", "reading"],
    envKeywords: ["library", "study", "reading", "bookshelf", "desk", "office", "classroom"],
  },
  {
    title: "Whispers between the stacks",
    detail:
      "Shelving aisles are “lanes of echoing titles”; a bookmark ribbon becomes a “trail of clues” only visible when they stand at kid height.",
    themeKeywords: ["library", "haunted", "ghost", "secret", "mystery", "archive"],
    envKeywords: ["library", "bookshelf", "hallway", "closet", "basement"],
  },
  {
    title: "The curator’s midnight desk",
    detail:
      "A desk lamp is a “beacon,” drawers are “locked folios,” and sticky notes are “forbidden index cards” the junior crew must sort before adults advance.",
    themeKeywords: ["library", "museum", "curator", "archive", "detective", "mystery"],
    envKeywords: ["desk", "office", "study", "library", "classroom"],
  },
  {
    title: "Ghost of a 1990s arcade (rec-room energy)",
    detail:
      "Lean into rec-room energy—balls become “trapped souls” to pot in order, joysticks become séance toggles, high scores become séance phrases (keep lighting bright for younger ages).",
    themeKeywords: ["arcade", "game", "retro", "pixel", "neon", "cyber"],
    envKeywords: ["arcade", "game room", "rec room", "basement", "pool table", "foosball"],
  },
  {
    title: "The giant’s living room (micro-scale)",
    detail:
      "A pool table becomes a “vast green plain,” a sofa “leather mountains,” a side table a “looming plateau”—you supply the perspective story; they navigate in-place.",
    themeKeywords: ["giant", "scale", "fantasy", "adventure", "quest"],
    envKeywords: ["living room", "pool table", "sofa", "couch", "family room", "basement"],
  },
  {
    title: "Sensory / perception chamber",
    detail:
      "“Echo chamber” beats use sound and touch in dim (not dark) light; “2D glitch” uses forced perspective murals where a clue only lines up from one standing spot.",
    themeKeywords: ["sensory", "perception", "illusion", "mystery", "science"],
    envKeywords: ["garage", "studio", "classroom", "hallway", "any"],
  },
  {
    title: "Inside the motherboard (micro-world tech)",
    detail:
      "Furniture reads as oversized resistors, cable runs as power conduits; breadcrumbs and pull-tabs become ant-scale props for a colony heist.",
    themeKeywords: ["tech", "robot", "cyber", "laboratory", "science", "invention"],
    envKeywords: ["garage", "office", "classroom", "workshop", "computer"],
  },
  {
    title: "Patent office of impossible inventions",
    detail:
      "Tables become filing stations; everyday objects are “rejected prototypes” kids must classify before the main crew unlocks the next beat.",
    themeKeywords: ["invention", "steampunk", "laboratory", "mad scientist", "workshop"],
    envKeywords: ["garage", "workshop", "office", "classroom", "kitchen"],
  },
  {
    title: "Greenhouse of the living codex",
    detail:
      "Plants and shelves become “specimen pages”; watering cans and pots are “living ink” props—great when your space already has greenery or kitchen herbs.",
    themeKeywords: ["garden", "botanist", "greenhouse", "nature", "jungle", "fairy"],
    envKeywords: ["patio", "backyard", "kitchen", "sunroom", "garage"],
  },
  {
    title: "Mundane laundromat → dimension sorter",
    detail:
      "Washers sort “dimensions” to recover a sock-macguffin—best when your venue already looks everyday and you want gentle surreal humor.",
    themeKeywords: ["surreal", "comedy", "everyday", "time", "portal"],
    envKeywords: ["laundry", "utility", "basement", "garage", "hallway"],
  },
  {
    title: "Spooky but safe library after-hours",
    detail:
      "Use bright task lighting; “ghost” beats are misheard pages and shadow puppets behind shelves—mild spook without true darkness for junior ages.",
    themeKeywords: ["haunted", "library", "ghost", "spooky", "halloween"],
    envKeywords: ["library", "classroom", "hallway", "community", "church"],
  },
];

const scoreHook = (hook: JuniorStoryHook, corpus: string): number => {
  let score = 0;
  for (const kw of hook.themeKeywords) {
    if (corpus.includes(kw)) score += 3;
  }
  for (const kw of hook.envKeywords) {
    if (kw === "any") continue;
    if (corpus.includes(kw)) score += 2;
  }
  return score;
};

/** Theme/environment-aligned junior hooks; drops zero-score ideas unless we need filler. */
export const filterJuniorStoryHooks = (
  themeName: string,
  environmentType: string,
  availableItems: string,
  limit = 6,
): JuniorStoryHook[] => {
  const corpus = `${themeName} ${environmentType} ${availableItems}`.toLowerCase();
  const ranked = JUNIOR_STORY_HOOKS.map((hook) => ({ hook, score: scoreHook(hook, corpus) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.hook.title.localeCompare(b.hook.title));

  const picked = ranked.slice(0, limit).map((row) => row.hook);
  if (picked.length >= Math.min(4, limit)) return picked;

  const fallback = JUNIOR_STORY_HOOKS.filter((hook) => hook.themeKeywords.some((kw) => corpus.includes(kw))).slice(
    0,
    limit,
  );
  if (fallback.length >= 4) return fallback;

  return JUNIOR_STORY_HOOKS.slice(0, limit);
};
