/** Curated links for the inspiration drawer; IDs are whitelisted for on-device JSON output. */
export type InspirationCatalogEntry = {
  id: string;
  label: string;
  url: string;
  category: "Tech & DIY" | "Design & theory" | "Community & playthroughs" | "Visual ideas" | "Starter articles";
};

export const INSPIRATION_CATALOG: InspirationCatalogEntry[] = [
  {
    id: "playful-tech",
    label: "Playful Technology — Arduino, RFID, sensors, maglocks (YouTube)",
    url: "https://www.youtube.com/@playfultechnology",
    category: "Tech & DIY",
  },
  {
    id: "puzzle-pieces",
    label: "Puzzle Pieces — creative low-budget DIY builds (YouTube)",
    url: "https://www.youtube.com/@PuzzlePieces",
    category: "Tech & DIY",
  },
  {
    id: "creative-escape-rooms",
    label: "Creative Escape Rooms — props, blog, mechanical inspiration",
    url: "https://www.creativeescaperooms.com/",
    category: "Tech & DIY",
  },
  {
    id: "sherlocked-architect",
    label: "Sherlocked — The Architect (flow, showcraft, GM secrets)",
    url: "https://www.sherlocked.nl/en/the-architect",
    category: "Design & theory",
  },
  {
    id: "puzzling-pursuits",
    label: "Puzzling Pursuits — brainstorming & balancing difficulty",
    url: "https://puzzlingpursuits.com/blogs/news",
    category: "Design & theory",
  },
  {
    id: "indestroom",
    label: "Indestroom — professional puzzle concepts gallery",
    url: "https://indestroom.com/",
    category: "Design & theory",
  },
  {
    id: "room-escape-artist",
    label: "Room Escape Artist — industry news & puzzle writeups",
    url: "https://roomescapeartist.com/",
    category: "Design & theory",
  },
  {
    id: "escape-game-blog",
    label: "The Escape Game — blog (missions, player types)",
    url: "https://theescapegame.com/blog/",
    category: "Community & playthroughs",
  },
  {
    id: "mark-rober",
    label: "Mark Rober — engineering take on escape-room style logic (YouTube)",
    url: "https://www.youtube.com/@MarkRober",
    category: "Community & playthroughs",
  },
  {
    id: "pinterest-er",
    label: "Pinterest — escape room set design search",
    url: "https://www.pinterest.com/search/pins/?q=escape%20room%20design",
    category: "Visual ideas",
  },
  {
    id: "er-geeks",
    label: "Escape Room Geeks — DIY puzzle articles",
    url: "https://escaperoomgeeks.com/diy-puzzles/",
    category: "Starter articles",
  },
  {
    id: "escape-hour",
    label: "Escape Hour — puzzle idea listicle",
    url: "https://escapehour.ca/blog/27-top-11-puzzle-ideas-for-escape-rooms/",
    category: "Starter articles",
  },
  {
    id: "escape-room-tips",
    label: "Escape Room Tips — design puzzle ideas",
    url: "https://escaperoomtips.com/design/escape-room-puzzle-ideas",
    category: "Starter articles",
  },
];

export const INSPIRATION_CATALOG_IDS = new Set(INSPIRATION_CATALOG.map((e) => e.id));
