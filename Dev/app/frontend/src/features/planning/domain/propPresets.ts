/** Prop preset suggestions for planning environments — extracted from App.tsx */
export function isCommercialVenueEventContext(raw: string): boolean {
  const t = raw.trim().toLowerCase();
  if (!t) return false;
  if (/\bcommercial\b/.test(t)) return true;
  if (/\bticketed\b/.test(t)) return true;
  if (/\bfranchise\b/.test(t)) return true;
  if (/\b(escape|exit)\s*room\b/.test(t) && /\b(venue|business|studio|company|tourist|attraction)\b/.test(t)) return true;
  return false;
}

/** Presets for environment combobox (editable; datalist + free text). */
export const ENVIRONMENT_PRESETS = [
  "Living room",
  "Family room / rec room",
  "Garage",
  "Basement",
  "Kitchen",
  "Dining room",
  "Office / study",
  "Classroom",
  "Conference room",
  "Retail / pop-up space",
  "Backyard / patio",
  "Indoor party venue",
  "Warehouse / studio",
] as const;

/** Select value when the host types a space not listed in ENVIRONMENT_PRESETS. */
export const ENVIRONMENT_CUSTOM_OPTION = "__custom_environment__";

export const EVENT_CONTEXT_PRESETS = [
  "Commercial escape venue (ticketed)",
  "Corporate team building",
  "Halloween party",
  "Christmas / winter holiday party",
  "Birthday party",
  "Wedding reception activity",
  "School or camp program",
  "Nonprofit fundraiser",
  "Private home party",
] as const;

function corpusMentionsEscapeRoom(envRaw: string, eventRaw: string): boolean {
  const c = `${envRaw} ${eventRaw}`.toLowerCase();
  return /\b(escape|exit)\s*room\b|\bescape\s+game\b|\bpuzzle\s*room\b|\bimmersive\s+experience\b/.test(c);
}

/** Dedupe datalist / suggestion rows case-insensitively while preserving first-seen casing. */
function dedupeStringsPreserveOrder(items: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const t = raw.trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

/** Curated escape-room anchors: each entry includes a concrete puzzle role (not décor-only). Sharp tools and similar hazards are omitted. */
export type SuggestedPropOption = {
  label: string;
  purpose: string;
};

export const PROP_LABEL_BLOCKLIST =
  /\b(knives?|knife|blade|razor|machete|axe|chainsaw|firearm|gun|ammunition|bleach|ammonia|chlorine|torch\s*\(propane\)|blow-?torch)\b/i;

function mergePropOptions(map: Map<string, SuggestedPropOption>, options: SuggestedPropOption[]): void {
  for (const o of options) {
    if (PROP_LABEL_BLOCKLIST.test(o.label)) continue;
    const k = o.label.toLowerCase().replace(/\s+/g, " ");
    if (!map.has(k)) map.set(k, o);
  }
}

/** Suggested prop rows for the environment picker—cross-checked to common home / venue escape staging, safety-first. */
export function getSuggestedPropOptionsForPlanning(envRaw: string, eventRaw: string): SuggestedPropOption[] {
  const envFull = envRaw.trim().toLowerCase();
  const eventLower = eventRaw.trim().toLowerCase();
  const escapeCorpus = corpusMentionsEscapeRoom(envFull, eventLower);
  const commercialEscape = isCommercialVenueEventContext(eventRaw);
  const map = new Map<string, SuggestedPropOption>();

  const applyRules = (env: string): void => {
    if (!env) return;
    if (/\bliving\b|lounge|\bden\b/.test(env)) {
      mergePropOptions(map, [
        {
          label: "Sofa",
          purpose:
            "Conceal laminated clue cards, RFID discs, or ribbon-tagged tokens under zippered cushions or Velcro seat tabs—players lift cushions only where you mark ‘in play’. Do not use sofa weight or cushions to operate real door locks or egress hardware.",
        },
        {
          label: "Coffee table",
          purpose:
            "Removable glass insert, shallow drawer, or riser tray for a single-layer matrix clue; photograph the neutral layout for resets. Use for codes and ordering—not as a wedge against a door.",
        },
        { label: "TV", purpose: "Ambient loop with timestamped frame, color bar, or caption typo as index; lock the remote to one input so teams cannot factory-reset the display mid-run." },
        { label: "Side table", purpose: "Stacked coasters as a height code, lamp base rotation index, or drawer with one decoy envelope and one true clue sleeve." },
        { label: "Floor lamp", purpose: "Three-way bulb sequence, pull-chain rhythm, or shade silhouette that projects a shape when aligned—keep cords taped and cool LED bulbs only." },
        { label: "Bookshelf", purpose: "Color-block spine order, gap widths as Morse, or magnetic false spine that hides a flat token—weight shelves so nothing tips when players browse." },
        { label: "Throw pillows",
          purpose: "Numbered tags in seams, color order on the couch, or pocketed inserts that hold a single card each—no loose stuffing players could inhale; wash between groups if fabric touches faces.",
        },
        { label: "Area rug", purpose: "Printed border pattern as a compass rose, corner lift tab for a floor-safe envelope, or rug grid that maps to a wall chart—tape corners for trip safety." },
        {
          label: "Board games",
          purpose: "Rulebook page callouts, meeple color counts, die sum targets, or ‘one component missing’ deduction—reseal boxes between groups and swap in foam dice if throws get energetic.",
        },
      ]);
    }
    if (/\brec\b|rumpus|game room|family room/.test(env)) {
      mergePropOptions(map, [
        { label: "Pool table", purpose: "Pocket labels as digits, rail bumper color order, or felt stencil only visible under your room’s angled light—keep cues tip-blunt and chalk off walkways." },
        { label: "Dart board", purpose: "Numbered wedges as cipher ring inputs (dull tips, short throw line); never rely on sharp steel tips for progression." },
        { label: "Console / games", purpose: "Achievement list with highlighted letters, controller button combo on a dummy profile, or cartridge label swap that points to a shelf coordinate." },
        { label: "Mini fridge", purpose: "Stable mass on a balance puzzle, magnetic poetry on the door only if you also script magnet beats, or shelf-height thermo card—keep food sealed or empty for odor control." },
        { label: "Sofa", purpose: "Same as living-room sofa: cushion hides and tagged pockets only—never door hardware." },
        { label: "TV", purpose: "Same as living-room TV: diegetic broadcast clue channel with locked inputs." },
        { label: "Trophy shelf", purpose: "Nameplate anagram, plaque years as a combo, or engraved motto that indexes another prop—secure heavy trophies so they cannot fall if bumped." },
      ]);
    }
    if (/\bgarage\b/.test(env)) {
      mergePropOptions(map, [
        { label: "Workbench (cleared)", purpose: "Outline tape for a ‘missing tool’ silhouette puzzle or printed schematic that maps bolt sizes to a combo—keep real sharp tools off the bench during play." },
        { label: "Toolbox (closed)", purpose: "Color-dot latches opened in order, foam insert cutouts that reveal a digit when filled, or combo lock on the case itself—not improvised prying." },
        { label: "Pegboard", purpose: "Shadow outlines for which hooks stay empty, painted ring codes behind hung items, or magnet-backed tags players rearrange into a pattern." },
        { label: "Storage totes", purpose: "Barcode stickers as fake SKUs, tote stack height as a digit, or one tote with a false lid hiding a flat clue stack." },
        { label: "Extension cord (GFCI)", purpose: "Cable length as a measuring stick, color tape segments as a code, or ‘plug order’ puzzle with labeled outlets only you energize—tape runs flat to avoid trips." },
        { label: "Step stool (rated, spotter)", purpose: "Height access to read a high decal or retrieve a carabiner-hung token—document weight limit; do not ask players to climb shelves or ladders unsupervised." },
        { label: "Sports gear", purpose: "Jersey numbers, ball inflation order, or racket grip tape colors as a sequence—no thrown projectiles at players." },
        { label: "Bike (stationary display)", purpose: "Spoke count modulo puzzle, frame sticker map, or basket liner with a clue envelope—chain stays on or bike is roped off as set dressing only." },
      ]);
    }
    if (/\bbasement\b/.test(env)) {
      mergePropOptions(map, [
        { label: "Folding table", purpose: "Underside Velcro panel, clamp-on grid for a cipher, or numbered leg positions that must match a basement map." },
        { label: "Plastic bins", purpose: "Dry goods count on labels, lid color stack order, or QR-free printed manifest that hides acrostic text." },
        { label: "Utility sink", purpose: "Drain cover that lifts with a magnet tool you issue, water-level line marked only for a float puzzle (no splashing players)." },
        { label: "Furnace / utility labels", purpose: "Read-only panel letters as an index, breaker facades with dummy switches, or tag colors that map to a pipe diagram poster." },
        { label: "Holiday décor tubs", purpose: "Ornament count by color, nested box Russian-doll reveal, or lid checklist where one unchecked item is the keyword." },
        { label: "Old trunk", purpose: "Hasp combo, false bottom depth, or scent-free sachet pockets with paper clues—pad edges; no spring-loaded surprises toward faces." },
      ]);
    }
    if (/\bkitchen\b/.test(env)) {
      mergePropOptions(map, [
        { label: "Fridge magnets", purpose: "Sliding poetry cipher, polarity puzzle on a steel panel, or word formed only after players return found magnet tiles—no food spoilage puzzles." },
        { label: "Drawer organizer", purpose: "Slot counts, utensil silhouette order (blunt tools only in play), or divider colors that index a pantry chart." },
        { label: "Recipe box", purpose: "Index tabs spell a word, one card has corner notches aligning to an overlay, or serving count math feeding a combo lock elsewhere." },
        { label: "Kitchen timer", purpose: "Start/stop windows that gate audio clues, digit sum at freeze-frame, or synchronized two-station countdown relay." },
        { label: "Pantry jars (dry goods)", purpose: "Weight comparison on a kitchen scale you provide, label letter acrostic, or transparent jar grain height as a bar chart code—no tasting." },
        { label: "Kitchen island", purpose: "Drawer sequence with felt-lined clue trays, butcher-block cartography etched into a mat, or power strip you label for a safe low-voltage LED gag only." },
        { label: "Dish rack", purpose: "Slot order left-to-right, plate rim colors, or mug handle directions that encode a short string for a keypad." },
        {
          label: "Stock pot with lid",
          purpose: "Lid knob rotation index, steam vent hole pattern as braille-like dots (cool pot only), or nested measuring cups inside for a volume riddle—no hot burners during the puzzle beat.",
        },
        {
          label: "Non-stick skillet (cool, clean)",
          purpose: "Printed paper liner with a skillet diagram players annotate, or magnet fishing over the pan surface—do not use hot metal or oil gags in home rooms.",
        },
        {
          label: "Measuring cups / spoons",
          purpose: "Fraction addition to a combo, nested order as a stack code, or hang tags that map to oven-timer digits (timer off while solving).",
        },
        {
          label: "Cutting board (grid printed)",
          purpose: "Dry-erase grid for deduction, corner coordinates for a map, or vinyl overlay with safe rounded corners—no live blades as props; knives stay stored off-stage.",
        },
      ]);
    }
    if (/\bdining\b/.test(env)) {
      mergePropOptions(map, [
        { label: "Buffet / sideboard", purpose: "Drawer pull order, felt-lined silverware tray with one missing slot spelling a letter, or mirrored panel parallax clue." },
        { label: "China cabinet", purpose: "Plate rim pattern viewed through glass, hutch light switch sequence, or saucer stack height code—secure glass doors." },
        {
          label: "LED pillar candles",
          purpose: "Flicker-safe color order remote you control, heights as a bar chart, or labeled ‘on/off’ states that map to binary—no open flame in player reach.",
        },
        { label: "Placemats", purpose: "Rotation or flip reveals second graphic, QR-free printed border math, or seat assignment colors tying to a role puzzle." },
        { label: "Dining chairs", purpose: "Seat pad Velcro pockets, numbered tack dots on legs, or push-in distance from table measured with a paper ruler you supply." },
        { label: "Hutch", purpose: "Glassware tint order, shelf height measurements, or magnetic latch demo that only opens after another station confirms." },
      ]);
    }
    if (/\boffice\b|\bstudy\b|\bconference\b/.test(env)) {
      mergePropOptions(map, [
        { label: "Desk", purpose: "Center drawer false back, pencil cup hole pattern shadow, or cable grommet colors as a mini combo." },
        { label: "Whiteboard", purpose: "Ghosted faint lines revealed by angled light, magnet columns, or ‘last erased’ photo you reset each group—markers capped." },
        { label: "Filing cabinet", purpose: "Hanging folder tabs as acrostic, drawer stop depth that exposes a painted digit, or combo lock you own on one drawer only." },
        { label: "Sticky notes", purpose: "Color columns on a glass wall, repositionable logic grid, or residue-safe ‘missing note’ silhouette puzzle." },
        { label: "Router shelf", purpose: "Cable color order, labeled port map as fiction, or velcroed prop router with LED pattern you scripted—no real admin passwords." },
        { label: "Desk phone", purpose: "Speed-dial sticker map, voicemail timestamps you authored, or handset hook switch rhythm—volume capped." },
        { label: "Name plates", purpose: "Initials anagram, title hierarchy sorting, or magnetic swap tiles that spell a directive." },
      ]);
    }
    if (/\bclassroom\b|\bschool\b/.test(env)) {
      mergePropOptions(map, [
        { label: "Chalkboard / whiteboard", purpose: "Deliberate smudge shapes, three-pass erase reveal, or magnet columns that only work after a desk station confirms." },
        { label: "Cork board", purpose: "Pushpin color matrix, string-and-thumbtack constellation map, or one pinned card with corner notches." },
        { label: "Desk cubbies", purpose: "Numbered slots with identical decoy bins, or cubby depth that fits only one prop envelope you seed." },
        { label: "Textbooks", purpose: "ISBN last digits, glossary tab words, or chapter title acrostic—tape pages you want untouched." },
        { label: "Globe", purpose: "Latitude/longitude clue you print, spin-stopping landmark, or meridian ring alignment—not geopolitical trivia unrelated to your story." },
        { label: "Wall clock", purpose: "Hand angle math, ‘room time’ vs real time note, or removable face with a cipher ring behind it—battery door staff-only." },
        { label: "Blunt art supplies",
          purpose: "Stamp pads for pattern cards, crayon resist reveals, or color-by-number overlay—no scissors or craft knives in player hands; use safety scissors if cutting is required.",
        },
      ]);
    }
    const retailMerch =
      /\bretail\b|\bmerchandising\b|\bboutique\b|\bpop-?up\b|\bstorefront\b|\bmall\b|\bshop\s+floor\b/.test(env) ||
      (/\bstore\b/.test(env) && !/\brestore\b/.test(env));
    if (retailMerch && !escapeCorpus && !commercialEscape) {
      mergePropOptions(map, [
        { label: "Shelf displays", purpose: "Facing counts, color blocks that mirror a window decal, or ‘missing SKU’ card that completes a matrix on a poster." },
        { label: "POS tablet (kiosk mode)", purpose: "Dummy checkout flow with a four-digit ‘total’, barcode scanner reading printed codes you made, or locked browser to one slideshow." },
        { label: "Gift wrap station", purpose: "Ribbon color order, paper roll length marks as ruler ticks, or bow count that indexes a dressing-room lock." },
        { label: "Security tag demo", purpose: "Magnetic detacher you control, tag color binary, or ‘alarm’ light pattern scripted in software—not real EAS alarms." },
        { label: "Shopping basket", purpose: "Slot dividers as a sorting puzzle, handle color combo, or weight check on a labeled scale you provide." },
        { label: "Mannequin", purpose: "Pose angles that line up with wall shadows, outfit accessory count, or tag string that decodes when read backward—stable base bolted." },
      ]);
    }
    if (/\bbackyard\b|\bpatio\b|\bdeck\b/.test(env)) {
      mergePropOptions(map, [
        { label: "Cooler (empty / sealed drinks)", purpose: "Ice pack color stack, drain plug thread count, or interior height marks that map to fence panel numbers—no loose ice that melts onto clues." },
        { label: "String lights", purpose: "Bulb color sequence you set, one dead bulb position as index, or remote channel that flashes a timed Morse you authored." },
        { label: "Patio umbrella", purpose: "Canopy panel numbers when opened, crank rotation clicks, or underside hooks holding lightweight tags only." },
        { label: "Planters", purpose: "Soil depth to a capsule you planted, pot size order on the step, or drainage hole pattern read from below with a mirror on a stick you issue." },
        { label: "Hose reel", purpose: "Click count at full extension, color dot you placed on the handle, or coiled shape that matches a stencil on the deck." },
        { label: "Grill (cold, lid only)", purpose: "Lid dial letters, grate slot count, or side-burner knob pattern with propane off and tagged—never hot surfaces during play." },
        { label: "Outdoor cushions", purpose: "Same as indoor pillows: tagged pockets, color order on bench, or zipper pulls aligned to a compass clue." },
      ]);
    }
    if (
      /\bballroom\b|\bfunction hall\b|\bwedding hall\b|\bparty room\b|\breception hall\b|\bbanquet\b/.test(env) ||
      /\b(birthday|wedding)\s+party\b/.test(eventLower)
    ) {
      mergePropOptions(map, [
        { label: "Folding tables", purpose: "Leg latch order, underside sticker map, or table number cards that permute a finale sequence." },
        { label: "Stack chairs", purpose: "Ganging clip colors, count in each stack, or seat-pad hook pattern that mirrors a stage diagram." },
        { label: "Bluetooth speaker", purpose: "Queued tracks with door knock sounds hiding digits, or volume steps that reveal a word—max volume capped." },
        { label: "Coat rack", purpose: "Hook heights as a graph, hanger color order, or pocketed coat with a prop ticket stub." },
        { label: "Sign-in table", purpose: "Guest book last initials, pen color caps as a code, or acrylic flyer holder with one swapped transparent sheet." },
        { label: "Balloons / décor bin", purpose: "Count by color (air-filled only), ribbon knot tally, or printed mylar numbers you staged—dispose safely post-show." },
      ]);
    }
    if (/\bwarehouse\b|\bstudio\b|\bindustrial\b/.test(env)) {
      mergePropOptions(map, [
        { label: "Rolling cart (brakes on)", purpose: "Shelf height measurements, brake lever positions that act as binary, or bungee color pattern tying to a rack map." },
        { label: "Rolling rack", purpose: "Garment color sequence, hanger spacing, or zip-tie tail lengths you standardize for a count puzzle." },
        { label: "Clip LED work lights", purpose: "Aim angles that reveal retroreflective text, color gels as a filter puzzle, or cord wrap counts—GFCI and grounded fixtures only." },
        { label: "Conduit / cable trays (dressing)", purpose: "Labeled ‘circuits’ that are pure fiction, zip-tie color code, or magnet letters stuck inside a dead panel players open after another clue." },
        { label: "Steel shelving", purpose: "Bay letters, shelf height as digits, or bolt head pattern that matches a wrench poster (poster only—no live torque on structure)." },
        { label: "Fire extinguisher (real, inspection-tagged)", purpose: "PIN seal intact as a story beat, gauge needle position you photo for resets, or ‘break glass’ prop box beside it with the real clue—never repurpose the live extinguisher as a puzzle container.",
        },
      ]);
    }
  };

  if (commercialEscape) {
    mergePropOptions(map, [
      {
        label: "Wall-mounted clue pockets or acrylic rails (in-world)",
        purpose: "Players retrieve ordered envelopes or acrylic cards from labeled rails—staff resets from behind a hinged panel; nothing lives loose on the floor.",
      },
      {
        label: "Diegetic room countdown / mission timer display",
        purpose: "Software-driven timer you control; failure states are scripted, not tied to real egress doors—pair audio stingers with visible safe warnings.",
      },
      {
        label: "UV-reactive paint or ink on set dressing",
        purpose: "Hidden text that appears only under your issued UV flashlight—document placement so UV never points at eyes; wash hands after handling inks you approve.",
      },
      {
        label: "Velcro-faced false panel or bookshelf spine",
        purpose: "Reversible tiles or spines that swap to show new words—Velcro rated for pulls you expect; no structural load on drywall alone.",
      },
      {
        label: "Stacking wooden crates as set dressing",
        purpose: "Crate stencil numbers, weight class stickers players sort, or interior foam cutouts hiding flat props—bolt to platform or strap so stacks cannot tip.",
      },
      {
        label: "Cable raceway dressed as conduit or trim",
        purpose: "Color segments as a code, removable end cap with a clue card, or printed ‘wire diagram’ that is pure fiction over a safe raceway.",
      },
      {
        label: "In-scene dry-erase clue board and markers",
        purpose: "Host-authored grid or suspect matrix; photograph clean template each reset—low-odor markers only.",
      },
      {
        label: "Magnetic latch or strike plate puzzle props",
        purpose: "Practice latches mounted on demo boards, polarity puzzles, or ‘align three tabs’ before a maglock releases a prop drawer—not a life-safety door.",
      },
      {
        label: "Combination lock on a diegetic trunk or cabinet",
        purpose: "Single purpose-built prop box with known combo flow; log combos per group; no shimming real venue furniture.",
      },
      {
        label: "Hidden compartment in furniture on the game floor",
        purpose: "Furniture you engineered with a service panel, gas strut limiter, and soft-close hinges—players never pry venue-built millwork.",
      },
    ]);
  }

  applyRules(envFull);
  const fragments = envFull
    .split(/[/,&]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s !== envFull);
  for (const frag of fragments) {
    applyRules(frag);
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
}
