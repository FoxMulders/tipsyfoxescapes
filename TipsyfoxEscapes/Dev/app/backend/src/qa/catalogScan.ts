export type CatalogScanFailure = {
  code: string;
  message: string;
  requiredChange: string;
};

export const extractPuzzlePoolSource = (serverSrc: string): string => {
  const start = serverSrc.indexOf("const puzzlePoolByCategory");
  const end = serverSrc.indexOf("const fillThemeTemplate");
  return start >= 0 && end > start ? serverSrc.slice(start, end) : "";
};

export const scanPuzzleCatalog = (pool: string): CatalogScanFailure[] => {
  const failures: CatalogScanFailure[] = [];

  const banned: Array<{ re: RegExp; code: string; message: string; fix: string }> = [
    {
      re: /results\?search_query/g,
      code: "CATALOG_YOUTUBE_SEARCH",
      message: "YouTube search results URL in catalog",
      fix: "Replace with /watch, /embed, or /shorts URL tied to this puzzle, or remove the link.",
    },
    {
      re: /example\.com|placeholder|lorem ipsum/gi,
      code: "CATALOG_PLACEHOLDER",
      message: "Placeholder URL/text in catalog",
      fix: "Use a live HTTPS URL for the actual build reference.",
    },
  ];

  for (const b of banned) {
    const m = pool.match(b.re);
    if (m && m.length > 0) {
      failures.push({ code: b.code, message: `${b.message} (${m.length} occurrence(s))`, requiredChange: b.fix });
    }
  }

  const channelMentions = (pool.match(/Playful Technology channel|Puzzle Pieces channel/g) ?? []).length;
  const searchMentions = (pool.match(/results\?search_query/g) ?? []).length;
  if (channelMentions > 4 && searchMentions > 0) {
    failures.push({
      code: "CATALOG_GENERIC_REFS",
      message: "Catalog relies on generic channel + search links instead of puzzle-specific assets",
      requiredChange:
        "Per puzzle: one specific tutorial video or official doc; remove channel home and search URLs.",
    });
  }

  if (/Playful Technology channel/.test(pool) && /category: "logic"/.test(pool)) {
    failures.push({
      code: "CATALOG_GENERIC_LOGIC_CHANNEL",
      message: "Generic channel links on non-electronic puzzles",
      requiredChange: "Use specific video or doc URLs for logic puzzles.",
    });
  }

  return failures;
};
