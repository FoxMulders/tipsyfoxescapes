/** Titles from puzzlePoolByCategory — QA rejects these on AI-generated puzzles. */
export const STATIC_CATALOG_PUZZLE_TITLES = new Set(
  [
    "Cipher Index",
    "Pattern Archive",
    "Riddle Ledger",
    "Coordinate Cipher Grid",
    "Weighted Switch",
    "Maglock / Magnetic Lock Sequence",
    "Maglock Sequence",
    "RFID Token Gate",
    "Light Sequence Panel",
    "Sound Pattern Lock",
    "Color Logic Matrix",
    "Magnetic Polarity Lock",
  ].map((t) => t.toLowerCase()),
);

export const isStaticCatalogTitle = (title: string): boolean =>
  STATIC_CATALOG_PUZZLE_TITLES.has(title.trim().toLowerCase());
