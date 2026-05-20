import express from "express";
import cors from "cors";
import { readFileSync, promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { loadEnv } from "./loadEnv.js";

loadEnv();
import { billingPlanById, quotePlanCheckout, resolveBillingPlanId, type BillingPlanId } from "./billing/catalog.js";
import { countActiveVenueLiveSessions, getActiveLiveConnectionStats, registerLiveRoutes } from "./liveGame.js";
import { fleetActivationError, liveOpsFrozenError } from "./enterpriseGate.js";
import type { TargetInterface } from "../../shared/contracts.js";
import { targetInterfaceToOperatingMode, type OperatingMode } from "../../shared/liveContracts.js";
import { registerBillingRoutes, registerSquareWebhook, type BillingRouteDeps } from "./billing/routes.js";
import {
  CURATED_TRIAL_THEME_ORDER,
  FREE_TIER_ROOM_ALLOWANCE,
  isTrialTierUser,
  trialAccessError,
  trialSaveError,
} from "./billing/trial.js";
import { ensureDataDir, getDataDir } from "./dataDir.js";
import { buildOAuthCallbackUrl, resolveAuthCallbackBaseUrl } from "./oauthCallbackUrl.js";
import {
  oauthCredentialSetupHint,
  readOAuthClientCredentials,
} from "./oauthConfig.js";
import { exchangeOAuthCode } from "./oauthTokenExchange.js";
import { createOAuthState, verifyOAuthState } from "./oauthState.js";
import { createVercelDiskSyncMiddleware } from "./vercelDiskSync.js";
import {
  canAuthenticateWithPassword,
  deriveUsername,
  indexUserUsername,
  normalizeEmail,
  normalizeUsername,
  resolveLoginIdentifier,
  verifyUserPassword,
} from "./authIdentity.js";
import { AuthTokenStore, resolveAuthUserId, resolveAuthValidation, sendAuthError } from "./authSession.js";
import { requireAuthUserId, respondAuthValidation } from "./authMiddleware.js";
import { registerAdminRoutes } from "./adminRoutes.js";
import { buildRoomFlowchartMermaid } from "../../shared/roomFlowchart.js";
import {
  buildProgressionGraph,
  deriveStoryViewsFromGraph,
  type ProgressionGraph,
} from "../../shared/progressionGraph.js";
import {
  consumeManifestCredit,
  defaultRoomManifest,
  normalizeRoomManifest,
  sessionHasFullPuzzleAccess,
  type RoomManifest,
} from "./roomManifest.js";
import { hasMakerElectronicsAccessForUser } from "./billing/entitlements.js";
import { shouldRedactElectronicForExportUser } from "./exportRunbook.js";
import {
  redactPuzzlesForClient,
  redactStoryPlanForClient,
  stripMakerElectronicsFromPuzzles,
  type PuzzlePreview,
} from "./puzzlePresentation.js";
import {
  EXPORT_PDF_PRINT_GUIDE,
  buildConsolidatedBomTable,
  buildGmLiveOpsBriefing,
  buildTechnicalPuzzleSections,
  sanitizeExportPuzzlesForBilling,
  type ExportPuzzleRef,
  type ExportSessionContext,
} from "./exportRunbook.js";
import {
  exportRunbookAccessError,
  generationAccessError,
  hasGmConsoleAccess,
  isReadOnlyAccount,
  resolveLifecycleStatus,
  tierTypeForUser,
  type LifecycleStatus,
} from "./userLifecycle.js";
import { allPuzzlesPassedPuzzleQa, applyPuzzleQaGate, type PuzzleQaReport } from "./puzzleQa.js";
import {
  enrichPuzzlesWithManufacturingSchema,
  PUZZLE_GENERATION_INVENTORY_POLICY,
} from "./puzzleManufacturingSchema.js";
import { loadPlanningSessions, persistPlanningSessions } from "./runtimePersistence.js";
import { handleFacebookWebhookVerify } from "./oauthServerless.js";
import { handleGitHubWebhook } from "./githubWebhook.js";

type PuzzleReferenceLink = {
  title: string;
  url: string;
  /** Human-readable credit for tutorial / inspiration sources (copyright hygiene). */
  creditTo?: string;
  /** Official or affiliate URL to support the creator (disclose in UI and exports). */
  affiliateUrl?: string;
};
type Puzzle = {
  id: string;
  category: "logic" | "physical" | "electronic";
  themeTags: string[];
  title: string;
  objective: string;
  howItWorks: string;
  themeFitReason?: string;
  referenceLinks: PuzzleReferenceLink[];
  solveSteps: string[];
  difficulty: "easy" | "medium" | "hard";
  /** Main room vs parallel junior add-on (easy–medium) track. */
  audienceTrack?: "main" | "youth_addon";
  /** When true, host guidance: adult primary path may depend on this youth-accessible outcome. */
  gatesAdultProgression?: boolean;
  stageHint?: string;
  /** Host inventory prop this beat must physically engage (when inventory-led). */
  physical_anchor_prop?: string;
  /** Printable why + where narrative for build teams. */
  narrative_justification?: string;
  /** Procurement list for this puzzle (parts + anchor prop). */
  bill_of_materials?: string[];
  /** Official wiring / fabrication guide URL. */
  build_documentation_url?: string;
  electronicDetails?: {
    parts: string[];
    wiringDiagram: string[];
    wiringDiagramSvg: string;
    buildSteps: string[];
    arduinoCode: string;
    pinoutTable?: Array<{ pin: string; function: string; connectsTo: string }>;
  };
  /** Puzzle QA department report (links scrubbed; copy/diagram checks). */
  puzzleQa?: PuzzleQaReport;
};

const refPlayfulTechnology = (title: string): PuzzleReferenceLink => ({
  title,
  url: "https://www.youtube.com/@playfultechnology",
  creditTo:
    "Playful Technology (Robert / TheHat94) — public Arduino escape-room electronics tutorials cited for technique; in-app sketches are originals, not copies of their videos or code.",
  affiliateUrl: "https://www.youtube.com/@playfultechnology?sub_confirmation=1",
});

const refPuzzlePieces = (title: string): PuzzleReferenceLink => ({
  title,
  url: "https://www.youtube.com/@PuzzlePieces",
  creditTo: "Puzzle Pieces — puzzle build education channel (referenced for general build patterns).",
  affiliateUrl: "https://www.youtube.com/@PuzzlePieces?sub_confirmation=1",
});

const refRoomEscapeArtist = (title: string): PuzzleReferenceLink => ({
  title,
  url: "https://roomescapeartist.com/",
  creditTo: "Room Escape Artist — blog and industry puzzle resources.",
});

/** Curated DIY / idea articles (not affiliate). Injected into puzzle reference lists for build inspiration. */
const refDiyPuzzleIdeaSites: PuzzleReferenceLink[] = [
  {
    title: "Escape Room Geeks — DIY puzzles",
    url: "https://escaperoomgeeks.com/diy-puzzles/",
    creditTo: "Escape Room Geeks — DIY puzzle ideas and build inspiration.",
  },
  {
    title: "Escape Hour — puzzle ideas for escape rooms",
    url: "https://escapehour.ca/blog/27-top-11-puzzle-ideas-for-escape-rooms/",
    creditTo: "Escape Hour — blog article with puzzle ideas for escape rooms.",
  },
  {
    title: "Escape Room Tips — puzzle ideas",
    url: "https://escaperoomtips.com/design/escape-room-puzzle-ideas",
    creditTo: "Escape Room Tips — design article with puzzle ideas.",
  },
];

type RecommendedPuzzleBrief = Pick<Puzzle, "id" | "title" | "category" | "objective" | "howItWorks" | "difficulty">;
type Theme = {
  id: string;
  name: string;
  tldr: string;
  description: string;
  recommendedPuzzles?: RecommendedPuzzleBrief[];
};
type StoryStage = {
  stage: number;
  title: string;
  storyBeat: string;
  whyThisStageExists: string;
  objective: string;
  whatPlayersMustDo: string[];
  requiredPuzzleIds: string[];
  requiredPuzzleTitles: string[];
  reveals: string;
};
type StoryPuzzleLink = {
  puzzleId: string;
  puzzleTitle: string;
  storyRole: string;
  unlocks: string;
};
type StoryPlan = {
  situation: string;
  premise: string;
  missionObjective: string;
  progressionRule: string;
  stages: StoryStage[];
  puzzleLinks: StoryPuzzleLink[];
  /** Session-scoped dependency graph (puzzles, gates, codes, finale). */
  progressionGraph?: ProgressionGraph;
  /** Markdown: table + short ASCII hint for host staging (main track). */
  stagingDiagram?: string;
};
type ThemeCoachStoredMessage = { id: string; role: "user" | "assistant"; content: string };

type VenueBuildType = "professional_empty" | "prebuilt_space";

type SessionState = {
  planningInput: {
    playersConcurrent: number;
    participantsTotal: number;
    sessionDurationMinutes: number;
    environmentType: string;
    availableItems: string[];
    existingPuzzles: { name: string; link: string; roomPart: string }[];
    /** Target challenge for generated and suggested puzzles. */
    roomDifficulty: "easy" | "medium" | "hard";
    /** Parallel junior add-on room (same fiction), easy–medium puzzles only. */
    youthAddOnEnabled: boolean;
    /** If true, at least one junior-track outcome is framed as required for adults to advance. */
    youthAddOnGatesAdultFlow: boolean;
    /** Optional ages or facilitation note for hosts (plain text). */
    youthAddOnAgeNote: string;
    /** Host context: commercial run, holiday, team building, etc. Biases theme ordering and briefs. */
    eventType: string;
    /** When set, sizes the main-track puzzle target instead of the duration/players formula (1–24). */
    mainTrackPuzzleCountOverride: number | null;
    /** Optional explicit counts for generated (non–premade) slots; all three set to use; scaled server-side to fit remaining slots. */
    puzzleMixLogic: number | null;
    puzzleMixPhysical: number | null;
    puzzleMixElectronic: number | null;
    /** When true, generated theme ordering favors settings that align with the physical environment (indoor/outdoor, school, etc.). */
    themeMustMatchEnvironment: boolean;
    /** Commercial empty shell vs. existing furnished space (home, office, rec room). */
    venueBuildType: VenueBuildType;
    /** Explicit home vs venue live-ops path (Step 1). */
    targetInterface: TargetInterface;
  };
  /** Custom-theme coach transcript; only exposed via authed session APIs for the session owner. */
  themeCoachChat: ThemeCoachStoredMessage[];
  customThemes: Theme[];
  generatedThemes: Theme[];
  selectedTheme?: Theme;
  generatedThemeCount: number;
  seenThemeIds: Set<string>;
  /** Normalized display titles already shown this session — blocks repeat names on refresh even with new ids. */
  seenThemeTitlesLower: Set<string>;
  seenPuzzleIds: Set<string>;
  currentPuzzles: Puzzle[];
  /** Nice-to-have build notes (spacing, QA reminders, inventory ideas). */
  suggestedAdditions: string[];
  /** Must-address gaps (missing locks, clue surface, Arduino bench, etc.). */
  suggestedAdditionsRequired: string[];
  currentStoryPlan?: StoryPlan;
  /** Home host vs retail venue live-ops mode (derived from plan tier when unset). */
  operatingMode?: OperatingMode;
  /** Draft vs manifested room — credit reserved at successful puzzle generation. */
  roomManifest: RoomManifest;
  /** Server-side lease — extended on touch and silent client renewals. */
  leaseExpiresAt?: number;
};

const EMPTY_ROOM_INSTALL_HEADING = "## What to install in your empty room";

const parseVenueBuildType = (value: unknown, fallback: VenueBuildType = "prebuilt_space"): VenueBuildType =>
  value === "professional_empty" || value === "prebuilt_space" ? value : fallback;

const parseTargetInterface = (value: unknown, fallback: TargetInterface = "home_party"): TargetInterface =>
  value === "home_party" || value === "commercial_venue" ? value : fallback;

const isProfessionalEmptyVenue = (session: SessionState): boolean =>
  session.planningInput.venueBuildType === "professional_empty";

const venueBuildTypeExportLabel = (v: VenueBuildType): string =>
  v === "professional_empty"
    ? "Professional empty room (build from scratch)"
    : "Prebuilt space (home, office, rec room, etc.)";

const normalizeSessionPlanningInput = (
  raw: SessionState["planningInput"] | undefined,
): SessionState["planningInput"] => {
  if (!raw) {
    return {
      playersConcurrent: 4,
      participantsTotal: 6,
      sessionDurationMinutes: 45,
      environmentType: "",
      availableItems: [],
      existingPuzzles: [],
      roomDifficulty: "medium",
      youthAddOnEnabled: false,
      youthAddOnGatesAdultFlow: false,
      youthAddOnAgeNote: "",
      eventType: "",
      mainTrackPuzzleCountOverride: null,
      puzzleMixLogic: null,
      puzzleMixPhysical: null,
      puzzleMixElectronic: null,
      themeMustMatchEnvironment: false,
      venueBuildType: "prebuilt_space",
      targetInterface: "home_party",
    };
  }
  return {
    ...raw,
    venueBuildType: parseVenueBuildType(raw.venueBuildType),
    themeMustMatchEnvironment: Boolean(raw.themeMustMatchEnvironment),
    targetInterface: parseTargetInterface(raw.targetInterface),
  };
};

const buildEmptyRoomInstallChecklistLines = (environmentType: string): string[] => {
  const envNote = environmentType.trim()
    ? `_Tailored to your selected environment type: **${environmentType.trim()}** — adapt zones and finishes to match the fiction._`
    : "_Select an environment type in planning to help theme generation; install zones below apply to any commercial shell._";
  return [
    EMPTY_ROOM_INSTALL_HEADING,
    "",
    envNote,
    "",
    "Starter checklist for a ticketed escape room venue:",
    "",
    "1. **Entry & briefing zone** — waiver/consent table, clock/timer display, coat hooks, briefing monitor or printed rules.",
    "2. **Lock & latch infrastructure** — hasp boxes, mag locks on strike plates you install (not real egress hardware), key cabinets, resettable padlocks.",
    "3. **Prop & puzzle stations** — 2–4 dedicated work surfaces (desks, plinths, cabinets) sized for concurrent groups; cable routes planned.",
    "4. **Clue surfaces** — pin boards, whiteboards, or backlit frames for team deductions; keep one central recap zone.",
    "5. **Lighting** — dimmable zones, accent spots on puzzle faces, emergency egress lighting untouched and code-compliant.",
    "6. **Control desk / GM position** — sightlines to major zones, hint delivery (intercom or tablet), reset checklist, spare batteries.",
    "7. **Electronics bench** — Arduino/MCU prototypes on a service shelf; strain relief and labeled harnesses before mounting in-set.",
    "8. **Audio / ambience** — hidden speakers for tone; volume limits so adjacent rooms are not spoiled.",
    "9. **Safety & operations** — fire exits clear, no trip hazards across cable runs, first-aid kit, prop quarantine area for resets.",
    "10. **Finish pass** — paint/theme dressing, signage that boundaries gameplay from staff-only areas.",
    "",
  ];
};

const injectVenueBuildContextIfMissing = (description: string, session: SessionState): string => {
  if (!isProfessionalEmptyVenue(session)) return description;
  if (description.includes(EMPTY_ROOM_INSTALL_HEADING)) return description;
  return `${description}\n\n${buildEmptyRoomInstallChecklistLines(session.planningInput.environmentType).join("\n")}`;
};

const applyVenueBuildTypeToPuzzleCopy = (puzzles: Puzzle[], session: SessionState): Puzzle[] => {
  if (!isProfessionalEmptyVenue(session)) return puzzles;
  const installNote =
    " Plan fixture placement for a **professional empty room**: mount this beat on installed prop stations or control-desk zones—not ad-hoc living-room furniture.";
  return puzzles.map((puzzle) => {
    if (puzzle.themeTags.includes("user-provided")) return puzzle;
    if (puzzle.howItWorks.includes("professional empty room")) return puzzle;
    return { ...puzzle, howItWorks: `${puzzle.howItWorks}${installNote}` };
  });
};

const serializeSessionForDisk = (session: SessionState) => ({
  ...session,
  seenThemeIds: [...session.seenThemeIds],
  seenThemeTitlesLower: [...session.seenThemeTitlesLower],
  seenPuzzleIds: [...session.seenPuzzleIds],
});

const deserializeSessionFromDisk = (raw: Record<string, unknown>): SessionState => {
  const data = raw as Omit<SessionState, "seenThemeIds" | "seenThemeTitlesLower" | "seenPuzzleIds"> & {
    seenThemeIds?: string[];
    seenThemeTitlesLower?: string[];
    seenPuzzleIds?: string[];
    roomManifest?: unknown;
  };
  return {
    ...data,
    planningInput: normalizeSessionPlanningInput(data.planningInput),
    seenThemeIds: new Set(data.seenThemeIds ?? []),
    seenThemeTitlesLower: new Set(data.seenThemeTitlesLower ?? []),
    seenPuzzleIds: new Set(data.seenPuzzleIds ?? []),
    roomManifest: normalizeRoomManifest(data.roomManifest),
  };
};

type SkipEntryType = "theme" | "puzzle";
type SkipEntry = {
  type: SkipEntryType;
  id: string;
  skippedAtMs: number;
};
const MAX_ROOM_ALLOWANCE = 100_000;

type StoredUser = {
  id: string;
  name: string;
  email: string;
  username: string;
  provider: "local" | "google" | "facebook" | "github";
  password?: string;
  isAdmin: boolean;
  role: "admin" | "user";
  lifecycleStatus?: LifecycleStatus;
  subscriptionActive?: boolean;
  subscriptionExpiresAt?: string | null;
  /** Max saved plans at once for this account (delete frees a slot). Purchases increase this — not time-based. */
  roomAllowance: number;
  /**
   * Full electronic-detail exports consume one credit for paid-catalog accounts (not admins).
   * When zero, exports use the same redaction as the free tier until credits are topped up.
   */
  exportCreditsRemaining: number;
  /** Set when a trial account completes their one-time export. */
  trialUsedAt?: string | null;
  /** Highest commercial pack purchased (studio/venue unlock GM console). */
  lastPurchasedPlanId?: BillingPlanId;
  /** Venue Blueprint fleet / multi-room live ops enabled by enterprise onboarding. */
  isEnterpriseProvisioned?: boolean;
  createdAt?: string;
  /** false only while the local/email user is awaiting verification; undefined/true = verified. */
  emailVerified?: boolean;
  /** One-time token sent to the user's inbox; cleared after use. */
  emailVerificationToken?: string;
  /** ISO timestamp of last token issuance (used for 24-hour expiry). */
  emailVerificationSentAt?: string;
};
type PublicUser = {
  id: string;
  name: string;
  email: string;
  provider: StoredUser["provider"];
  isAdmin: boolean;
  roomAllowance: number;
  savedRoomCount: number;
  roomsRemaining: number;
  hasFullCatalog: boolean;
  billingTier: "admin" | "pack" | "trial" | "free";
  exportCreditsRemaining: number;
  trialUsed: boolean;
  trialRemaining: boolean;
  canSaveRooms: boolean;
  /** Extra save slots from shared org/team pools (same bonus applies to every listed member). */
  orgPoolBonusSlots: number;
  commercialTier: "free" | "home" | "studio" | "venue";
  hasGmConsole: boolean;
  operatingModeDefault: OperatingMode;
  role: "admin" | "user";
  tierType: ReturnType<typeof tierTypeForUser>;
  lifecycleStatus: LifecycleStatus;
  subscriptionInactive: boolean;
  readOnlyMode: boolean;
  canExportRunbook: boolean;
  hasMakerElectronics: boolean;
  isEnterpriseProvisioned: boolean;
};
type SavedPlan = {
  planId: string;
  userId: string;
  sessionId: string;
  name: string;
  approvedForBuild: boolean;
  createdAt: string;
  updatedAt: string;
  data: {
    planningInput: SessionState["planningInput"];
    themes: Theme[];
    selectedThemeId: string;
    puzzles: Puzzle[];
    suggestedAdditions: string[];
    suggestedAdditionsRequired?: string[];
    storyPlan: StoryPlan | null;
    compatibilityPassed: boolean;
    exportContent: string;
    themeCoachChat?: ThemeCoachStoredMessage[];
  };
};

const app = express();
app.set("trust proxy", 1);
// Allow frontend calls from the local dev server.
app.use(cors());

let billingRouteDeps: BillingRouteDeps | null = null;
registerSquareWebhook(app, () => {
  if (!billingRouteDeps) {
    throw new Error("Billing routes are not initialized yet.");
  }
  return billingRouteDeps;
});

app.post("/api/webhooks/github", express.raw({ type: "application/json" }), (req, res) => {
  void handleGitHubWebhook(req, res);
});

// Parse JSON request bodies for API endpoints.
app.use(express.json());
app.use((_req, res, next) => {
  res.on("finish", () => {
    void (async () => {
      await authTokenStore.syncToDisk();
      await persistPlanningSessions(sessions, (session) => serializeSessionForDisk(session as SessionState));
    })();
  });
  next();
});
let nextSessionId = 1;
const sessions = new Map<string, SessionState>();
const PLANNING_SESSION_LEASE_MS = 7 * 24 * 60 * 60 * 1000;

const touchSessionLease = (session: SessionState): void => {
  session.leaseExpiresAt = Date.now() + PLANNING_SESSION_LEASE_MS;
};

const isSessionLeaseExpired = (session: SessionState): boolean =>
  typeof session.leaseExpiresAt === "number" && session.leaseExpiresAt < Date.now();

const resolvePlanningSession = (sessionId: unknown, options?: { touchLease?: boolean }): SessionState | undefined => {
  if (typeof sessionId !== "string") return undefined;
  const id = sessionId.trim();
  if (!id) return undefined;
  const session = sessions.get(id);
  if (!session) return undefined;
  if (isSessionLeaseExpired(session)) {
    sessions.delete(id);
    return undefined;
  }
  session.planningInput = normalizeSessionPlanningInput(session.planningInput);
  if (options?.touchLease !== false) touchSessionLease(session);
  return session;
};

/** Distinguish missing sessionId from a stale id (serverless restart / TTL) so clients can re-auth or recreate. */
const respondInvalidPlanningSession = (res: express.Response, sessionId: unknown): void => {
  const hasId = typeof sessionId === "string" && sessionId.trim().length > 0;
  if (hasId) {
    res.status(404).json({
      error: {
        code: "INVALID_SESSION",
        message: "Planning session not found or expired. Start a new session.",
        details: [],
      },
    });
    return;
  }
  res.status(400).json({
    error: { code: "INVALID_SESSION", message: "sessionId is required.", details: [] },
  });
};
let nextThemeId = 1000;
let globalGeneratedThemeCount = 0;
const SKIP_TTL_MS = 24 * 60 * 60 * 1000;
/**
 * JSON persistence lives under `data/` relative to `process.cwd()` (the backend package dir when using
 * `npm run dev` / `npm start` from `Dev/app/backend`). Use lowercase path segments only: Oracle Linux
 * and other case-sensitive filesystems will not resolve `Data/Users.json` as the same file.
 */
const skipHistoryPath = path.join(getDataDir(), "skip-history.json");
const skipEntries = new Map<string, SkipEntry>();
const usersByEmail = new Map<string, StoredUser>();
const usersByUsername = new Map<string, string>();
const authTokenStore = new AuthTokenStore();
let nextUserId = 1;
const savedPlansPath = path.join(getDataDir(), "user-plans.json");
const usersPath = path.join(getDataDir(), "users.json");
const organizationPoolsPath = path.join(getDataDir(), "organization-pools.json");
const billingAuditPath = path.join(getDataDir(), "billing-audit.jsonl");
const usageLedgerPath = path.join(getDataDir(), "usage-ledger.json");
const savedPlansByUser = new Map<string, SavedPlan[]>();
/** Planning session -> user id (first authenticated creator or claim). */
const sessionUserOwners = new Map<string, string>();
type UsageLedgerFile = {
  devices: Record<string, { reservedForUserId: string }>;
  ipHashes: Record<string, { reservedForUserId: string }>;
};
const usageLedger: UsageLedgerFile = { devices: {}, ipHashes: {} };
type OrganizationPool = {
  id: string;
  name: string;
  /** Added to each member's effective saved-room cap (team/org pool). */
  bonusSlots: number;
  memberEmailsLower: string[];
};
type OrganizationPoolsFile = { pools: OrganizationPool[] };
let organizationPools: OrganizationPool[] = [];

const pooledOrgBonusSlotsForEmail = (emailLower: string): number => {
  let sum = 0;
  for (const pool of organizationPools) {
    if (pool.memberEmailsLower.includes(emailLower)) sum += Math.max(0, Math.floor(pool.bonusSlots));
  }
  return Math.min(MAX_ROOM_ALLOWANCE, sum);
};

const readBillingAuditLines = async (limit: number): Promise<Array<Record<string, unknown>>> => {
  try {
    const raw = await fs.readFile(billingAuditPath, "utf8");
    const lines = raw.split("\n").filter(Boolean);
    const parsed = lines
      .map((line) => {
        try {
          return JSON.parse(line) as Record<string, unknown>;
        } catch {
          return null;
        }
      })
      .filter(Boolean) as Array<Record<string, unknown>>;
    return parsed.slice(-limit).reverse();
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
};

const appendBillingAudit = async (entry: {
  ts?: string;
  userId?: string;
  email?: string;
  action: string;
  detail?: Record<string, unknown>;
}): Promise<void> => {
  const line = JSON.stringify({
    ts: entry.ts ?? new Date().toISOString(),
    userId: entry.userId,
    email: entry.email,
    action: entry.action,
    detail: entry.detail ?? {},
  });
  try {
    await fs.mkdir(path.dirname(billingAuditPath), { recursive: true });
    await fs.appendFile(billingAuditPath, `${line}\n`, "utf8");
  } catch {
    // best-effort
  }
};

const loadOrganizationPools = async (): Promise<void> => {
  try {
    const raw = await fs.readFile(organizationPoolsPath, "utf8");
    const parsed = JSON.parse(raw) as OrganizationPoolsFile;
    organizationPools = Array.isArray(parsed.pools)
      ? parsed.pools.map((p) => {
          const rawMembers = [
            ...(Array.isArray(p.memberEmailsLower) ? p.memberEmailsLower : []),
            ...(Array.isArray((p as unknown as { memberEmails?: unknown }).memberEmails)
              ? ((p as unknown as { memberEmails: unknown[] }).memberEmails as unknown[])
              : []),
          ];
          return {
            id: String(p.id ?? "pool").trim() || "pool",
            name: String(p.name ?? "Team pool").trim() || "Team pool",
            bonusSlots: Math.max(0, Math.floor(Number(p.bonusSlots) || 0)),
            memberEmailsLower: rawMembers.map((e) => String(e).trim().toLowerCase()).filter(Boolean),
          };
        })
      : [];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      // eslint-disable-next-line no-console
      console.warn("Could not load organization pools:", err);
    }
    organizationPools = [];
  }
};

const persistOrganizationPools = async (): Promise<void> => {
  const payload = {
    pools: organizationPools.map((p) => ({
      id: p.id,
      name: p.name,
      bonusSlots: p.bonusSlots,
      memberEmails: p.memberEmailsLower,
    })),
  };
  await fs.mkdir(path.dirname(organizationPoolsPath), { recursive: true });
  await fs.writeFile(organizationPoolsPath, JSON.stringify(payload, null, 2), "utf8");
};

/** Theme ids eligible for trial filtering (fixed offer uses CURATED_TRIAL_THEME_ORDER). */
const FREE_TRIAL_THEME_IDS = new Set([...CURATED_TRIAL_THEME_ORDER, "th_4", "th_5"]);

const getFixedCuratedTrialThemes = (session: SessionState): Theme[] => {
  const picked = CURATED_TRIAL_THEME_ORDER.map((id) => themePool.find((theme) => theme.id === id)).filter(
    (theme): theme is Theme => Boolean(theme),
  );
  return injectItemsIntoThemes(enrichThemesWithRecommended(picked, session), session);
};

const consumeTrialIfNeeded = async (user: StoredUser): Promise<boolean> => {
  if (!isTrialTierUser(user) || user.trialUsedAt) return false;
  user.trialUsedAt = new Date().toISOString();
  await persistUsers();
  await appendBillingAudit({
    userId: user.id,
    email: user.email,
    action: "trial_consumed",
    detail: {},
  });
  return true;
};

const DEFAULT_ADMIN_EMAILS_LOWER = new Set(["bradmulders@gmail.com"]);

const parseAdminEmails = (): Set<string> => {
  const merged = new Set(DEFAULT_ADMIN_EMAILS_LOWER);
  const raw = String(process.env.ADMIN_EMAILS ?? "").trim();
  if (!raw) return merged;
  for (const entry of raw.split(/[,;\s]+/)) {
    const e = entry.trim().toLowerCase();
    if (e) merged.add(e);
  }
  return merged;
};

const hashClientIp = (ip: string): string => {
  const salt = String(process.env.USAGE_HASH_SALT ?? "escape-room-builder-usage-salt-change-in-prod");
  return crypto.createHash("sha256").update(`${salt}|${ip}`).digest("hex").slice(0, 32);
};

const getRequestIp = (req: express.Request): string => {
  const forwarded = String(req.headers["x-forwarded-for"] ?? "")
    .split(",")[0]
    ?.trim();
  if (forwarded) return forwarded;
  return String(req.socket.remoteAddress ?? req.ip ?? "");
};

const readDeviceIdHeader = (req: express.Request): string => {
  const raw = String(req.headers["x-device-id"] ?? "").trim();
  if (!raw || raw.length > 120) return "";
  return raw;
};

const savedPlanCountForUser = (userId: string): number => (savedPlansByUser.get(userId) ?? []).length;

const effectiveRoomAllowance = (user: StoredUser): number => {
  if (user.isAdmin) return MAX_ROOM_ALLOWANCE;
  const personal = Math.max(
    FREE_TIER_ROOM_ALLOWANCE,
    Math.min(MAX_ROOM_ALLOWANCE, Math.floor(Number(user.roomAllowance) || 0)),
  );
  const orgBonus = pooledOrgBonusSlotsForEmail(user.email);
  return Math.min(MAX_ROOM_ALLOWANCE, personal + orgBonus);
};

/** Full theme catalog + custom themes + unredacted electronics in exports. */
const hasFullCatalogAccessUser = (user: StoredUser | undefined): boolean => {
  if (!user) return false;
  if (user.isAdmin) return true;
  return user.roomAllowance > FREE_TIER_ROOM_ALLOWANCE;
};

const puzzlesForClientResponse = (
  puzzles: Puzzle[],
  fullAccess: boolean,
  billingUser: StoredUser | undefined,
): Puzzle[] | PuzzlePreview[] => {
  const gated = redactPuzzlesForClient(puzzles, fullAccess);
  if (!fullAccess || !Array.isArray(gated)) return gated as PuzzlePreview[];
  return stripMakerElectronicsFromPuzzles(gated as Puzzle[], hasMakerElectronicsAccessForUser(billingUser));
};

const PLAN_TIER_RANK: Record<BillingPlanId, number> = {
  free: 0,
  casual_hobbyist: 1,
  home_enthusiast: 2,
  creative_studio: 3,
  venue_blueprint: 4,
};

const isOperatorPlanId = (planId: string | undefined): boolean => {
  const resolved = planId ? resolveBillingPlanId(planId) : undefined;
  return resolved === "creative_studio" || resolved === "venue_blueprint";
};

const isHomePaidPlanId = (planId: string | undefined): boolean => {
  const resolved = planId ? resolveBillingPlanId(planId) : undefined;
  return resolved === "casual_hobbyist" || resolved === "home_enthusiast";
};

const commercialTierForUser = (user: StoredUser): PublicUser["commercialTier"] => {
  if (user.isAdmin) return "venue";
  const planId = user.lastPurchasedPlanId ? resolveBillingPlanId(user.lastPurchasedPlanId) : undefined;
  if (planId === "venue_blueprint") return "venue";
  if (planId === "creative_studio") return "studio";
  if (isHomePaidPlanId(user.lastPurchasedPlanId)) return "home";
  return user.roomAllowance > FREE_TIER_ROOM_ALLOWANCE ? "home" : "free";
};

const hasGmConsoleForUser = (user: StoredUser): boolean => hasGmConsoleAccess(user);

const operatingModeDefaultForUser = (user: StoredUser): OperatingMode =>
  hasGmConsoleForUser(user) ? "venue" : "home";

const deriveSessionOperatingMode = (session: SessionState, req?: express.Request): OperatingMode => {
  const ti = session.planningInput.targetInterface;
  if (ti === "home_party" || ti === "commercial_venue") {
    return targetInterfaceToOperatingMode(ti);
  }
  if (session.operatingMode === "home" || session.operatingMode === "venue") return session.operatingMode;
  const et = (session.planningInput.eventType ?? "").toLowerCase();
  if (/\b(commercial|ticketed|venue|escape room)\b/.test(et)) return "venue";
  if (session.planningInput.venueBuildType === "professional_empty") return "venue";
  return "home";
};

const toPublicUser = (user: StoredUser): PublicUser => {
  const savedRoomCount = savedPlanCountForUser(user.id);
  const cap = effectiveRoomAllowance(user);
  const orgPoolBonusSlots = pooledOrgBonusSlotsForEmail(user.email);
  const roomsRemaining = Math.max(0, cap - savedRoomCount);
  let billingTier: PublicUser["billingTier"] = "free";
  if (user.isAdmin) billingTier = "admin";
  else if (user.roomAllowance > FREE_TIER_ROOM_ALLOWANCE) billingTier = "pack";
  else if (isTrialTierUser(user) && !user.trialUsedAt) billingTier = "trial";
  const exportCreditsRemaining = user.isAdmin ? 1_000_000 : Math.max(0, Math.floor(Number(user.exportCreditsRemaining) || 0));
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    provider: user.provider,
    isAdmin: user.isAdmin,
    /** Effective saved-plan slot cap (personal purchases + org pool bonus). */
    roomAllowance: cap,
    savedRoomCount,
    roomsRemaining,
    hasFullCatalog: hasFullCatalogAccessUser(user),
    billingTier,
    exportCreditsRemaining,
    orgPoolBonusSlots,
    trialUsed: Boolean(user.trialUsedAt),
    trialRemaining: isTrialTierUser(user) && !user.trialUsedAt,
    canSaveRooms: user.isAdmin || cap > 0,
    commercialTier: commercialTierForUser(user),
    hasGmConsole: hasGmConsoleForUser(user),
    operatingModeDefault: operatingModeDefaultForUser(user),
    role: user.isAdmin ? "admin" : "user",
    tierType: tierTypeForUser(user),
    lifecycleStatus: resolveLifecycleStatus(user),
    subscriptionInactive: resolveLifecycleStatus(user) === "delinquent",
    readOnlyMode: isReadOnlyAccount(user),
    canExportRunbook:
      user.isAdmin ||
      (isTrialTierUser(user) && !user.trialUsedAt) ||
      (hasFullCatalogAccessUser(user) && exportCreditsRemaining > 0),
    hasMakerElectronics: hasMakerElectronicsAccessForUser(user),
    isEnterpriseProvisioned: Boolean(user.isAdmin || user.isEnterpriseProvisioned),
  };
};

const getStoredUserById = (userId: string): StoredUser | undefined => {
  for (const user of usersByEmail.values()) {
    if (user.id === userId) return user;
  }
  return undefined;
};

const applyAdminFlagsFromEnv = (): void => {
  const admins = parseAdminEmails();
  const bootstrapAdminPassword = String(process.env.ADMIN_BOOTSTRAP_PASSWORD ?? "").trim();
  for (const user of usersByEmail.values()) {
    if (admins.has(user.email)) {
      user.isAdmin = true;
      user.role = "admin";
      user.username = deriveUsername(user.email, user.name, user.username);
      indexUserUsername(user, usersByUsername, user.email);
      if (!user.password && bootstrapAdminPassword && DEFAULT_ADMIN_EMAILS_LOWER.has(user.email)) {
        user.password = bootstrapAdminPassword;
      }
    }
    if (typeof user.exportCreditsRemaining !== "number" || !Number.isFinite(user.exportCreditsRemaining)) {
      user.exportCreditsRemaining =
        user.roomAllowance > FREE_TIER_ROOM_ALLOWANCE ? Math.min(5000, user.roomAllowance * 10) : 0;
    }
  }
};

const ensureBootstrapAdminUser = (): boolean => {
  const bootstrapAdminPassword = String(process.env.ADMIN_BOOTSTRAP_PASSWORD ?? "").trim();
  if (!bootstrapAdminPassword) return false;
  let changed = false;
  for (const email of DEFAULT_ADMIN_EMAILS_LOWER) {
    if (usersByEmail.has(email)) continue;
    const user: StoredUser = {
      id: `usr_${nextUserId++}`,
      name: "Brad Mulders",
      email,
      username: deriveUsername(email, "Brad Mulders"),
      provider: "local",
      password: bootstrapAdminPassword,
      isAdmin: true,
      role: "admin",
      roomAllowance: MAX_ROOM_ALLOWANCE,
      exportCreditsRemaining: 1_000_000,
      createdAt: new Date().toISOString(),
    };
    usersByEmail.set(email, user);
    indexUserUsername(user, usersByUsername, email);
    changed = true;
  }
  return changed;
};

const persistUsers = async (): Promise<void> => {
  const rows = Array.from(usersByEmail.values()).map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    provider: user.provider,
    password: user.password,
    isAdmin: user.isAdmin,
    role: user.role,
    lifecycleStatus: user.lifecycleStatus ?? resolveLifecycleStatus(user),
    subscriptionActive: user.subscriptionActive ?? null,
    subscriptionExpiresAt: user.subscriptionExpiresAt ?? null,
    roomAllowance: user.roomAllowance,
    exportCreditsRemaining: user.exportCreditsRemaining,
    trialUsedAt: user.trialUsedAt ?? null,
    lastPurchasedPlanId: user.lastPurchasedPlanId ?? null,
    isEnterpriseProvisioned: Boolean(user.isEnterpriseProvisioned),
    createdAt: user.createdAt ?? null,
    emailVerified: user.emailVerified ?? true,
    emailVerificationToken: user.emailVerificationToken ?? null,
    emailVerificationSentAt: user.emailVerificationSentAt ?? null,
  }));
  const { writeJsonBlob } = await import("./kvJsonStore.js");
  await writeJsonBlob("users.json", rows);
};

const loadUsers = async (): Promise<void> => {
  try {
    const { readJsonBlob } = await import("./kvJsonStore.js");
    const rows = (await readJsonBlob<
      Array<
      Partial<StoredUser> & {
        subscriptionActive?: boolean;
        subscriptionExpiresAt?: string | null;
        freeTrialRoomConsumed?: boolean;
        trialUsedAt?: string | null;
      }
    >
    >("users.json")) ?? [];
    usersByEmail.clear();
    usersByUsername.clear();
    let maxNum = 0;
    const bootstrapAdminPassword = String(process.env.ADMIN_BOOTSTRAP_PASSWORD ?? "").trim();
    for (const row of rows) {
      const email = String(row.email ?? "").trim().toLowerCase();
      if (!email || !row.id) continue;
      const idMatch = /^usr_(\d+)$/.exec(String(row.id));
      if (idMatch) maxNum = Math.max(maxNum, Number(idMatch[1]));
      let roomAllowance = Number((row as { roomAllowance?: unknown }).roomAllowance);
      if (!Number.isFinite(roomAllowance) || roomAllowance < FREE_TIER_ROOM_ALLOWANCE) {
        roomAllowance = FREE_TIER_ROOM_ALLOWANCE;
      }
      if (
        row.subscriptionActive &&
        row.subscriptionExpiresAt &&
        new Date(String(row.subscriptionExpiresAt)).getTime() > Date.now()
      ) {
        roomAllowance = Math.max(roomAllowance, 15);
      }
      let exportCreditsRemaining = Number((row as { exportCreditsRemaining?: unknown }).exportCreditsRemaining);
      if (!Number.isFinite(exportCreditsRemaining)) {
        exportCreditsRemaining =
          roomAllowance > FREE_TIER_ROOM_ALLOWANCE ? Math.min(5000, roomAllowance * 10) : 0;
      }
      exportCreditsRemaining = Math.max(0, Math.floor(exportCreditsRemaining));
      let trialUsedAt: string | null = null;
      if (typeof row.trialUsedAt === "string" && row.trialUsedAt.trim()) {
        trialUsedAt = row.trialUsedAt.trim();
      } else if (row.freeTrialRoomConsumed) {
        trialUsedAt = new Date(0).toISOString();
      }
      const isAdminRow = Boolean(row.isAdmin);
      let password = typeof row.password === "string" ? row.password : undefined;
      if (!password && isAdminRow && bootstrapAdminPassword && DEFAULT_ADMIN_EMAILS_LOWER.has(email)) {
        password = bootstrapAdminPassword;
      }
      const user: StoredUser = {
        id: String(row.id),
        name: String(row.name ?? "User").trim(),
        email,
        username: deriveUsername(email, String(row.name ?? "User"), (row as { username?: string }).username),
        provider: (row.provider as StoredUser["provider"]) ?? "local",
        password,
        isAdmin: isAdminRow,
        role: isAdminRow ? "admin" : "user",
        lifecycleStatus:
          row.lifecycleStatus === "active" || row.lifecycleStatus === "delinquent" || row.lifecycleStatus === "canceled"
            ? row.lifecycleStatus
            : undefined,
        subscriptionActive: typeof row.subscriptionActive === "boolean" ? row.subscriptionActive : undefined,
        subscriptionExpiresAt:
          row.subscriptionExpiresAt === null || typeof row.subscriptionExpiresAt === "string"
            ? row.subscriptionExpiresAt
            : undefined,
        roomAllowance: Math.min(MAX_ROOM_ALLOWANCE, Math.floor(roomAllowance)),
        exportCreditsRemaining,
        trialUsedAt,
        lastPurchasedPlanId: row.lastPurchasedPlanId
          ? resolveBillingPlanId(String(row.lastPurchasedPlanId))
          : undefined,
        isEnterpriseProvisioned: Boolean((row as { isEnterpriseProvisioned?: boolean }).isEnterpriseProvisioned),
        createdAt:
          typeof (row as { createdAt?: string }).createdAt === "string"
            ? (row as { createdAt: string }).createdAt
            : undefined,
        // Existing accounts without this field default to verified (backwards-compatible).
        emailVerified: (row as { emailVerified?: boolean }).emailVerified === false ? false : true,
        emailVerificationToken:
          typeof (row as { emailVerificationToken?: string }).emailVerificationToken === "string"
            ? (row as { emailVerificationToken: string }).emailVerificationToken
            : undefined,
        emailVerificationSentAt:
          typeof (row as { emailVerificationSentAt?: string }).emailVerificationSentAt === "string"
            ? (row as { emailVerificationSentAt: string }).emailVerificationSentAt
            : undefined,
      };
      usersByEmail.set(email, user);
      indexUserUsername(user, usersByUsername, email);
    }
    nextUserId = Math.max(nextUserId, maxNum + 1);
    applyAdminFlagsFromEnv();
    const seededAdmin = ensureBootstrapAdminUser();
    if (usersByEmail.size > 0) await persistUsers();
    else if (seededAdmin) await persistUsers();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      // eslint-disable-next-line no-console
      console.warn("Could not load users:", error);
    }
  }
};

app.use(
  createVercelDiskSyncMiddleware({
    authStore: authTokenStore,
    loadUsers,
  }),
);

const loadUsageLedger = async (): Promise<void> => {
  try {
    const raw = await fs.readFile(usageLedgerPath, "utf8");
    const parsed = JSON.parse(raw) as UsageLedgerFile;
    usageLedger.devices = parsed.devices ?? {};
    usageLedger.ipHashes = parsed.ipHashes ?? {};
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      // eslint-disable-next-line no-console
      console.warn("Could not load usage ledger:", error);
    }
  }
};

const persistUsageLedger = async (): Promise<void> => {
  await fs.mkdir(path.dirname(usageLedgerPath), { recursive: true });
  await fs.writeFile(usageLedgerPath, JSON.stringify(usageLedger, null, 2), "utf8");
};

const themePool: Theme[] = [
  {
    id: "th_1",
    name: "Haunted Library",
    tldr:
      "A vanished curator’s notes point toward a sealed annex, and the public stacks still hold the cipher—decode them before the house runs out of borrowed time.",
    description: `## Storyline

A reclusive curator disappeared mid-inventory, leaving marginalia, false catalog entries, and a trail of bookplates that all point to a sealed annex no one admits exists.

## Puzzle Loadout

Cipher wheels, book-edge indexing, sliding false spines, weight-triggered shelves, and low-tech physical reveals that never rely on smartphones.

## Props & Set Dressing

Leather folios, brass reading lamps, card-catalog drawers, wax seals, a standing globe wired as a clue hub, and glass-front cases you can rearrange safely.

## Setting & Era

Late-Victorian / Edwardian scholarly manor tone—eerie but family-appropriate, with gaslight mystery pacing.`,
  },
  {
    id: "th_2",
    name: "Railway Heist",
    tldr:
      "Recover a stolen ledger before the midnight express boards—dispatch boards, route puzzles, and signal logic keep the platform under merciless clock pressure.",
    description: `## Storyline

Your crew must recover a stolen ledger before the midnight express departs. Guards are bribed, not gone—so silence, timing, and misdirection matter as much as the codes.

## Puzzle Loadout

Route puzzles, combination luggage, signal-flag logic, parcel routing math, and a timed dispatch-board sequence that sells “operations control” energy.

## Props & Set Dressing

Platform chalk, parcel stamps, conductor punch cards, LED-safe oil lanterns, a telegraph key feeding a code chain, and ticketing ephemera you can laminate.

## Setting & Era

1930s–40s streamlined steam glamour with an Art Deco ticketing hall silhouette—enough clock faces to justify countdown pressure.`,
  },
  {
    id: "th_3",
    name: "Submerged Lab",
    tldr:
      "When uplink fails and faux breach alarms stack, your crew reroutes life-support logic using believable lab panels and restrained electronics only.",
    description: `## Storyline

A research habitat loses uplink; pressure alarms stage a faux breach while players reroute life-support logic and decide what is “real” versus staged.

## Puzzle Loadout

Flow-chart deduction, color-coded valve order, waterproof keypad housings, and one restrained electronics prop that reads as lab telemetry—not sci-fi magic.

## Props & Set Dressing

Acrylic porthole panels, specimen racks, dive checklists, annotated whiteboards, and clearly labeled trainer panels for anything powered.

## Setting & Era

Near-future marine science: grounded, plausible, and easy to dress with thrifted lab glass and blue-gel lighting.`,
  },
  {
    id: "th_4",
    name: "Clockmaker Vault",
    tldr:
      "Contesting heirs must prove lineage inside a workshop-vault where gear ratios, timed windows, and loupe work stand in for a missing will.",
    description: `## Storyline

Heirs must prove lineage inside a workshop-vault where every gear ratio is a metaphor for inheritance—and the final release is literally clocked.

## Puzzle Loadout

Pendulum timing windows, gear-train arithmetic, magnifier inspection, and sequential lockboxes disguised as tool chests.

## Props & Set Dressing

Jeweler’s loupes, brass calipers, fusee chains, annotated blueprints, and a master regulator clock face that accepts modular inserts.

## Setting & Era

1890s–1910s European precision-craft ambience: wood smoke in the language, brass in the lighting, and no anachronistic touchscreens.`,
  },
  {
    id: "th_5",
    name: "Arcade Blackout",
    tldr:
      "Finish the owner’s abandoned “high score ritual” before the wrecking ball—retro cabinets, DIP codes, and marquee-light order hide the real path.",
    description: `## Storyline

A beloved arcade is minutes from demolition unless someone completes the owner’s unfinished “high score ritual” and proves the venue still has a heartbeat.

## Puzzle Loadout

CRT-safe facades, DIP-switch patterns, joystick-direction codes, marquee-light sequences, and ticket-count math that feels like muscle memory.

## Props & Set Dressing

Token cups, cabinet side-art stencils, ticket spools, a jukebox playlist that hides ordering clues, and replaceable marquee transparencies.

## Setting & Era

Late 1980s–90s neon-and-chrome nostalgia—sticky carpet optional, cable management mandatory.`,
  },
  {
    id: "th_6",
    name: "Signal Outpost",
    tldr:
      "At a failing relay you must authenticate a distress pattern before jamming spreads—Morse-style grids, antenna alignment, and chart triangulation carry the proof.",
    description: `## Storyline

A remote relay station catches a distress pattern players must authenticate before interference spreads—every step should feel like field comms discipline.

## Puzzle Loadout

Morse-style audio grids, antenna alignment puzzles, frequency-dial math, and paper-chart triangulation with measurable distances in-room.

## Props & Set Dressing

Field manuals, vacuum-tube shells (non-powered), patch cables on a labeled trainer panel, red-lens safelights, and grease-pencil marks you can wipe.

## Setting & Era

Cold War–adjacent 1960s–70s comms bunker: analog-first, map-heavy, and perfect for basements or garages dressed as “site B.”`,
  },
];
const generatedThemeAdjectives = [
  "Forsaken",
  "Neon",
  "Clockwork",
  "Frozen",
  "Sunken",
  "Crimson",
  "Hidden",
  "Astral",
  "Arcane",
  "Shattered",
];
const generatedThemeNouns = [
  "Observatory",
  "Vault",
  "Catacombs",
  "Laboratory",
  "Outpost",
  "Sanctuary",
  "Citadel",
  "Archives",
  "Theater",
  "Foundry",
];
const generatedThemeTwists = [
  "Power cycles every 90 seconds, forcing teams to cache clues out loud.",
  "Clues split between light and shadow—UV-safe props only in marked zones.",
  "A wrong code resets a visible latch chain, so note-taking matters.",
  "Ambient audio hides a steganographic rhythm players must isolate.",
  "Roles unlock different drawers; players must negotiate handoffs quickly.",
  "Clues only arm in strict order—parallel work still converges on one sequence.",
  "Decoy mechanisms outnumber the true route by design—document what failed.",
  "Each solve physically reconfigures the table layout for the next beat.",
  "Synchronized two-player actions arm the finale relay—practice the cadence.",
  "Rotating clue stations mean half the team loses line-of-sight on purpose.",
];

const generatedThemePuzzleLeans = [
  "logic-first deduction with one tactile physical capstone",
  "physical sequencing plus a restrained electronic feedback puzzle",
  "pattern recognition across mismatched media (paper, metal, light)",
  "layered ciphers with a short cooperative relay between two stations",
  "spatial reasoning with map overlays and measurable distances in-room",
];

const generatedThemePropPalettes = [
  "etched metal tags, hand-annotated forms, and repurposed instrument housings",
  "laminated schematics, color-coded cable trainers, and magnetic latch boards",
  "archival boxes, waxed twine, chalkboard grids, and stamped ticket chits",
  "frosted acrylic panels, dial bezels, and tactile indicator jewels",
  "vintage control knobs (detented), safety glass, and labeled breaker facades",
];

const generatedThemeEras = [
  "Time period: industrial-revolution workshop meets modern safety codes.",
  "Time period: 1970s research annex with analog-first interfaces.",
  "Time period: near-future utilitarian lab—credible props, no holograms required.",
  "Time period: interwar transit hall—deco geometry, brass, and streamlined signage.",
  "Time period: 1990s backstage tech cage—CRT facades, rack labels, zip-tie discipline.",
];

const getThemeContext = (theme?: Theme): { requiredTag?: string; bannedTags: string[] } => {
  // Infer compatibility constraints from the selected theme text.
  const text = `${theme?.name ?? ""} ${theme?.description ?? ""} ${theme?.tldr ?? ""}`.toLowerCase();
  if (
    text.includes("old west") ||
    text.includes("western") ||
    text.includes("cowboy") ||
    text.includes("saloon")
  ) {
    return {
      requiredTag: "old-west",
      bannedTags: ["modern-timepiece", "modern-electronics"],
    };
  }
  return { bannedTags: [] };
};

const isPuzzleCompatibleWithTheme = (puzzle: Puzzle, theme?: Theme): boolean => {
  const context = getThemeContext(theme);
  if (context.bannedTags.some((tag) => puzzle.themeTags.includes(tag))) return false;
  if (!context.requiredTag) return true;
  return puzzle.themeTags.includes(context.requiredTag) || puzzle.themeTags.includes("generic");
};

const deriveThemeFitReason = (puzzle: Puzzle, theme?: Theme, session?: SessionState): string => {
  const themeName = theme?.name ?? "this theme";
  const text = `${theme?.name ?? ""} ${theme?.description ?? ""} ${theme?.tldr ?? ""}`.toLowerCase();
  const env = session?.planningInput.environmentType?.trim();
  const professionalEmpty = session ? isProfessionalEmptyVenue(session) : false;
  const envTail = professionalEmpty
    ? env
      ? ` In your **${env}** build-out, plan a dedicated fiction station (desk cluster, wall panel, or prop plinth) you will **install** for this beat—not borrowed household furniture.`
      : " Plan this beat on fixtures you will install in the empty venue—prop stations, lock housings, and control-desk sightlines."
    : env
      ? ` In **${env}**, stage this as a deliberate fiction station (desk, wall, cabinet cluster)—not a random worksheet—so the beat visibly belongs in that room.`
      : "";
  const isSciFi =
    text.includes("guardians") ||
    text.includes("galaxy") ||
    text.includes("space") ||
    text.includes("futur") ||
    text.includes("ship") ||
    text.includes("prison");
  const isPrisonBreak = text.includes("prison") || text.includes("lockdown") || text.includes("cell");
  const isOldWest =
    text.includes("old west") || text.includes("western") || text.includes("cowboy") || text.includes("saloon");

  const usesElectronics = puzzle.themeTags.includes("modern-electronics");
  const usesMechanical = puzzle.themeTags.includes("mechanical");
  const usesDeduction = puzzle.themeTags.includes("mystery") || puzzle.themeTags.includes("deduction");
  const title = puzzle.title.toLowerCase();
  const hasLedOrSignal =
    title.includes("signal") ||
    title.includes("pulse") ||
    title.includes("relay") ||
    puzzle.objective.toLowerCase().includes("light");

  let core: string;
  if (isOldWest) {
    if (puzzle.themeTags.includes("old-west")) {
      core = `For "${themeName}", this puzzle uses period-appropriate interaction and props, so it feels native to an Old West setting rather than modern tech.`;
    } else {
      core = `For "${themeName}", this puzzle still fits because it avoids immersion-breaking modern elements while advancing the same frontier-style clue progression.`;
    }
  } else if (isSciFi && isPrisonBreak && usesElectronics && hasLedOrSignal) {
    core = `For "${themeName}", this puzzle reads like a futuristic prison control system: LED/signal feedback resembles security circuitry, making the challenge feel like sabotaging or rerouting cell-block tech.`;
  } else if (isSciFi && usesElectronics) {
    core = `For "${themeName}", this puzzle fits because electronic feedback and signal logic match a high-tech sci-fi environment and make the room feel like functioning advanced infrastructure.`;
  } else if (isPrisonBreak && usesMechanical) {
    core = `For "${themeName}", this puzzle fits the prison-break tone by focusing on controlled physical mechanisms, similar to bypassing locks or manipulating constrained escape hardware.`;
  } else if (usesMechanical) {
    core = `For "${themeName}", this puzzle fits by providing tactile mechanical interaction that grounds the scenario in believable in-world machinery and props.`;
  } else if (usesDeduction) {
    core = `For "${themeName}", this puzzle fits by turning narrative clues into deduction, reinforcing the story logic instead of feeling like an isolated mini-game.`;
  } else if (usesElectronics) {
    core = `For "${themeName}", this puzzle fits because its interactive electronic behavior supports the room's technical systems feel and staged reveals.`;
  } else {
    core = `For "${themeName}", this puzzle's mechanic maps directly onto a story beat in that scenario — players should re-skin every prop and clue label to reference "${themeName}" fiction so the interaction feels native to the world, not a generic worksheet dropped into the room.`;
  }
  return `${core}${envTail}`;
};

const withThemeFitReasons = (puzzles: Puzzle[], theme?: Theme, session?: SessionState): Puzzle[] =>
  puzzles.map((puzzle) => ({
    ...puzzle,
    themeFitReason: deriveThemeFitReason(puzzle, theme, session),
  }));

/** Puzzle QA gate: scrub reference links and attach per-puzzle QA report (see QA/departments/puzzle_qa.md). */
const withPuzzleQaForTheme = (puzzles: Puzzle[], themeName: string): Puzzle[] =>
  applyPuzzleQaGate(puzzles, { themeName: themeName.trim() || "Selected theme" });

const withPuzzleQaForSession = (session: SessionState, puzzles: Puzzle[]): Puzzle[] =>
  withPuzzleQaForTheme(puzzles, session.selectedTheme?.name ?? "Selected theme");

const applyTrialExportRedaction = (lines: string[], redact: boolean): string[] => {
  if (!redact) return lines;
  const marker = "## Electronic Puzzle Implementation Details";
  const idx = lines.indexOf(marker);
  if (idx === -1) return lines;
  return [
    ...lines.slice(0, idx),
    "",
    "## Electronic Puzzle Implementation Details",
    "",
    "_Export omitted maker electronics: wiring diagrams, pinouts, build steps, and Arduino sketches. Upgrade to **Home Host Enthusiast** or **Creative Studio** for full maker packs, or use a Casual Hobbyist pass for host-only runbooks._",
    "",
    "_Third-party tutorials are credited under “Puzzle Video and Build References”; use the listed support / affiliate links to compensate original creators._",
    "",
  ];
};

const normalizePlanningInventory = (items: string[]): string[] => {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of items) {
    const t = String(raw ?? "").trim();
    if (!t) continue;
    const low = t.toLowerCase().replace(/\s+/g, " ");
    if (low === "not specified yet") continue;
    if (seen.has(low)) continue;
    seen.add(low);
    out.push(t.length > 80 ? `${t.slice(0, 77)}…` : t);
    if (out.length >= 22) break;
  }
  return out;
};

const zoneTipForRoom = (room: string): string => {
  const r = room.toLowerCase();
  if (r.includes("garage")) {
    return "Stage on a cleared workbench or labeled crate—keep unrelated tools behind a curtain or sheet.";
  }
  if (r.includes("basement")) {
    return "Use one bright table or stair-landing zone so props are not lost in storage clutter.";
  }
  if (r.includes("living") || r.includes("family")) {
    return "Prefer a coffee-table riser or removable tray so resets do not disturb the whole room.";
  }
  return "Use a dedicated prop table or labeled shelf so clue objects read as intentional, not ambient clutter.";
};

/** First alphabetic character uppercased (sentence start for host-facing lines). */
const sentenceCaseLead = (s: string): string => {
  const t = s.trim();
  if (!t) return t;
  const i = t.search(/[A-Za-z]/);
  if (i < 0) return t;
  return t.slice(0, i) + t.charAt(i).toUpperCase() + t.slice(i + 1);
};

const describeInventoryItemUncased = (item: string, room: string): { placement: string; puzzleUses: string } => {
  const s = item.toLowerCase();
  const z = zoneTipForRoom(room);

  const defPlacement = `${z} Mark “${item}” in-play with a small tent card or tape border.`;
  const defUses = `Write one concrete beat for “${item}” (count, order, hidden pocket, light angle, magnetic reveal, or measured span)—it must earn a clue or lock step. Pure set dressing is fine elsewhere, but listed inventory should not be filler, and large furniture must not replace real door hardware or egress latches.`;

  if (/\bkey\b/.test(s)) {
    return {
      placement: `${z} Use a labeled key board or shadow silhouette so keys cannot walk off between groups.`,
      puzzleUses: "Ordered key hangs, partial silhouettes, or ‘one key missing’ deduction feeding a combo lock.",
    };
  }
  if (/\block\b|\bpadlock\b|\bhasp\b/.test(s)) {
    return {
      placement: `${z} Mount locks at standing height for adults; duplicate a kid-height latch if you run a junior track.`,
      puzzleUses: "Shackle color codes, multi-lock sequencing, or ‘wrong lock’ decoys with one true shear line.",
    };
  }
  if (/\bflashlight\b|\btorch\b|\blamp\b|\bblacklight\b|\buv\b/.test(s)) {
    return {
      placement: `${z} Provide fresh batteries in a labeled bin; tape down cord runs if mains-powered.`,
      puzzleUses: "Hidden UV text, selective shadows, Morse-blink timing, or ‘paint only visible under angled light’.",
    };
  }
  if (/\bmagnet\b|\bfridge\s+magnet\b|\bmagnets?\b/.test(s)) {
    return {
      placement: `${z} Keep polarity consistent on a metal panel; shield unrelated steel surfaces with felt.`,
      puzzleUses: "Hidden letter stacks, sliding cipher tiles, or ‘floating’ sequence that resets with a swipe.",
    };
  }
  if (/\bmini[-\s]?fridge\b|\bfridge\b|\brefrigerator\b/.test(s)) {
    return {
      placement: `${z} Tape the door so players only open it when the beat calls for it; keep food odors out of clue props.`,
      puzzleUses:
        "Use the cabinet as **stable mass** players add or remove (canned goods, books, sandbags) until a balance arm, lever, or pressure stage hits the trip point—do not pretend the fridge is only a magnet board unless you listed magnets separately.",
    };
  }
  if (/\bdart\b|\bdartboard\b|\bdart\s+board\b/.test(s)) {
    return {
      placement: `${z} Mount at a safe height with dull tips only; mark the working face with a subtle ring sticker for resets.`,
      puzzleUses:
        "Numbered wedges or ring sectors as a **cipher index** (sum sectors hit, read a spoke code, or map miss zones to a bookshelf row)—avoid unrelated whiteboard tropes unless the clue is visibly tied to the board.",
    };
  }
  if (/\bstring\b|\brope\b|\byarn\b|\bribbon\b/.test(s)) {
    return {
      placement: `${z} Pre-cut lengths and bag them so resets are fast; avoid trip hazards across walkways.`,
      puzzleUses: "Tension bridges, measured spans, knot identity, or color-braid patterns that map to a code wheel.",
    };
  }
  if (/\bmirror\b/.test(s)) {
    return {
      placement: `${z} Mount so players can’t see GM reset positions; add a smudge-free cloth at the station.`,
      puzzleUses: "Backward text, split-beam geometry, or ‘look from one exact stance’ reveals.",
    };
  }
  if (/\bbook\b|\bjournal\b|\bdiary\b/.test(s)) {
    return {
      placement: `${z} Flag the real clue book with a ribbon or color edge; shelve decoys that feel different in weight.`,
      puzzleUses: "Dog-eared page numbers, margin micro-writing, or bookmark slots that expose a secondary index.",
    };
  }
  if (/\bcard\b|\bdecks\b/.test(s)) {
    return {
      placement: `${z} Use a single sealed deck per reset; mark the working deck subtly on the tuck case.`,
      puzzleUses: "Marked-card order, suit arithmetic, or ‘one card missing’ that completes a matrix on the wall.",
    };
  }
  if (/\bdice\b/.test(s)) {
    return {
      placement: `${z} Roll inside a tray to keep dice from scattering under furniture.`,
      puzzleUses: "Target sums, pip patterns as bitmaps, or ‘illegal roll’ rules that encode a combo step.",
    };
  }
  if (/\bclock\b|\bwatch\b|\btimer\b/.test(s)) {
    return {
      placement: `${z} Set a consistent ‘room time’; label if players may adjust hands or only read positions.`,
      puzzleUses: "Hand-angle codes, chime counts, stopwatch windows, or synchronized two-station timing relays.",
    };
  }
  if (/\bboard\b|\bwhiteboard\b|\bchalk\b/.test(s)) {
    return {
      placement: `${z} Mount at team eye-line with erasers staged; photograph the clean template for resets.`,
      puzzleUses: "Erasable deduction grids, ‘ghosted’ faint lines only visible after heat or solvent gag (optional).",
    };
  }
  if (/\bpen\b|\bpencil\b|\bmarker\b/.test(s)) {
    return {
      placement: `${z} Provide one working color set per team; cap markers overnight to avoid drying.`,
      puzzleUses: "Color-layer overlays, pressure-indent reading, or ‘wrong ink’ that fluoresces differently.",
    };
  }
  if (/\bpaper\b|\bprint\b|\bposter\b|\bmap\b/.test(s)) {
    return {
      placement: `${z} Sleeve sheets in acrylic or clipboards so wind and hands do not destroy them.`,
      puzzleUses: "Overlay transparencies, tear-tabs, map fold creases as indices, or punch-hole binary patterns.",
    };
  }
  if (/\bbattery\b|\bwire\b|\bled\b|\barduino\b|\bsensor\b/.test(s)) {
    return {
      placement: `${z} Build a small ‘electronics corral’ with strain relief and labeled grounds for safety.`,
      puzzleUses: "Simple input/output states, LED color order, or threshold sensors that only fire when props are staged correctly.",
    };
  }
  if (/\bspeaker\b|\bradio\b|\bheadphone\b/.test(s)) {
    return {
      placement: `${z} Keep volume neighbor-safe; label ‘press play once’ to avoid accidental loops.`,
      puzzleUses: "Spectral hides, spoken digit drops, or stereo pan clues requiring two listeners.",
    };
  }
  if (/\bbox\b|\bchest\b|\bcontainer\b/.test(s)) {
    return {
      placement: `${z} Weight boxes differently so players can tell clue containers by feel (document for resets).`,
      puzzleUses: "Nested reveals, false bottoms, or multi-latch order where each latch references another prop.",
    };
  }
  if (/\bchair\b|\btable\b|\bcushion\b|\bpillow\b/.test(s)) {
    return {
      placement: `${z} Mark ‘safe to move’ vs ‘fixed scenery’ with color dots only staff understand.`,
      puzzleUses:
        "Seat numbers, cushion tags under zippers, throw-pillow order, or table-leaf positions that encode a step—do not use furniture weight or cushions to operate real door locks or egress hardware.",
    };
  }
  if (/\bcandle\b|\bmatch\b/.test(s)) {
    return {
      placement: `${z} Prefer LED substitutes for kid-heavy groups; if open flame, enforce distance and extinguishers.`,
      puzzleUses: "Wax drip counts, matchstick tallies, or heat-reveal inks only if safety-reviewed.",
    };
  }
  if (/\bmask\b|\bcostume\b|\bhat\b/.test(s)) {
    return {
      placement: `${z} Sanitize between groups; hang on labeled hooks so resets match photos.`,
      puzzleUses: "Role-based sightlines (‘only the captain may read’), color roles, or emblem matching on wall panels.",
    };
  }
  if (/\bphone\b|\btablet\b|\bscreen\b/.test(s)) {
    return {
      placement: `${z} Airplane mode + brightness locked; provide a cheat card if the device is part of a timed gag.`,
      puzzleUses: "Fake OS folders, QR hops, or ‘last notification’ timestamps as a code source.",
    };
  }
  if (/\btv\b|\btelevision\b|\bmonitor\b|\bprojector\b|\bchromecast\b|\broku\b/.test(s)) {
    return {
      placement: `${z} Run a looping “evidence reel” or ambient loop on a dedicated input; label remotes and lock admin menus.`,
      puzzleUses:
        "Timestamped frames as codes, split-screen compare tasks, color-grade keys, or a short clip the team must transcribe—optionally draft companion narration in your editor; replace with a licensed or original asset before opening.",
    };
  }
  if (/\bping[-\s]?pong\b|\bpool table\b|\bbilliard\b/.test(s)) {
    return {
      placement: `${z} Clear the playfield for clue-safe layouts; pad sharp corners if kids use the junior track.`,
      puzzleUses:
        "Printed evidence spread on the surface, under-rail dead drops, scoreboard digits as a combo, or table-leaf positions that encode a sequence—treat the table as a story stage, not background noise.",
    };
  }
  if (/\bsofa\b|\bcouch\b|\bsettee\b/.test(s)) {
    return {
      placement: `${z} Mark cushions staff may lift versus cushions players may search; photograph reset positions.`,
      puzzleUses:
        "Hidden pocket tags, seam-stitch counts, throw-pillow order, or a seat-number relay that routes teams to the next station—never use sofa motion or cushions to open real doors; keep latches on proper puzzle boxes or strike hardware only.",
    };
  }
  if (/\btape\b|\bglue\b|\bsticker\b/.test(s)) {
    return {
      placement: `${z} Pre-cut pieces to speed resets; residue-free painter’s tape for historic walls.`,
      puzzleUses: "Tape lengths as rulers, sticker residue patterns, or removable layers that expose a second graphic.",
    };
  }
  if (/\btoolbox\b|\bwrench\b|\bscrewdriver\b/.test(s)) {
    return {
      placement: `${z} Shadow-board outlines so missing tools are obvious during QC; pad sharp points.`,
      puzzleUses: "Torque order, bit-size matching, or ‘wrong tool marks’ that point to a hidden panel.",
    };
  }

  return { placement: defPlacement, puzzleUses: defUses };
};

const describeInventoryItem = (item: string, room: string): { placement: string; puzzleUses: string } => {
  const r = describeInventoryItemUncased(item, room);
  return { placement: sentenceCaseLead(r.placement), puzzleUses: sentenceCaseLead(r.puzzleUses) };
};

const STUDIO_BUILD_POLICY_HEADING = "## Studio Build Policy";

/** Appended to theme briefs so hosts bias toward original builds and QA electronics before opening. */
const hasStudioBuildPolicySection = (description: string): boolean =>
  /\n##\s*Studio\s+Build\s+Policy\b/im.test(description);

const appendStudioBuildPolicyToDescription = (description: string): string => {
  if (hasStudioBuildPolicySection(description)) return description;
  const block = [
    STUDIO_BUILD_POLICY_HEADING,
    "",
    "**Originality:** Prefer novel mechanics, clues, and staging authored for this room’s fiction and footprint—avoid leaning on overused internet escape-room tropes or cloning third-party published builds.",
    "**References:** Web and video links in exports are for technique, credit, and safety context—your shipped room should still read as bespoke to your venue.",
    "**Electronics (Arduino / microcontrollers):** Specify circuits and firmware you control end-to-end; run full **QA** (every state transition, wrong-input handling, power loss, cable faults, clean reset) before live play.",
  ].join("\n");
  return `${description}\n\n${block}`;
};

const exportStudioBuildPolicyLines = (): string[] => [
  "## Studio Build Policy",
  "- **Originality:** Design bespoke puzzle beats for this run; do not regurgitate generic online walkthrough puzzles as your final show.",
  "- **References:** External links document influences and attribution—they are not a build script to copy.",
  "- **Electronics:** Prototype Arduino / MCU gags yourself; complete a QA pass (states, resets, failure modes, safety) before players touch them.",
  "",
];

const buildAnchorChecklistExportLines = (session: SessionState): string[] => {
  const inv = normalizePlanningInventory(session.planningInput.availableItems);
  if (inv.length === 0) return [];
  const room = session.planningInput.environmentType.trim() || "your physical room";
  const rows = inv.map((raw, i) => {
    const { placement, puzzleUses } = describeInventoryItem(raw, session.planningInput.environmentType);
    return `${i + 1}. **${raw}** — _Do not relocate without redesigning dependent puzzles._ Story placement: ${placement} Puzzle integration: ${puzzleUses}`;
  });
  return [
    "## Build Team Anchor Checklist",
    "_Hand this list to your build team. These props are contractually part of puzzle logic and story beats for this export._",
    `- **Venue:** ${room}`,
    ...rows,
    "",
  ];
};

const buildExecutiveSummaryExportLines = (session: SessionState): string[] => {
  const theme = session.selectedTheme;
  const story = session.currentStoryPlan;
  const mainPuzzles = session.currentPuzzles.filter((p) => p.audienceTrack !== "youth_addon");
  const categories = new Set(mainPuzzles.map((p) => p.category));
  return [
    "## Thematic executive summary",
    "",
    theme
      ? `**${theme.name}** — ${theme.tldr ?? "Host-ready escape experience aligned to your room constraints."}`
      : "_Theme not selected — generate themes before export._",
    "",
    story?.situation?.trim()
      ? story.situation
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .join("\n")
      : "_Story situation not generated yet._",
    "",
    `- **Mission:** ${story?.missionObjective?.trim() || "—"}`,
    `- **Main-track puzzles:** ${mainPuzzles.length} (${[...categories].join(", ") || "categories pending"})`,
    `- **Recommended flow:** ${getRecommendedFlowPathKind(session)}`,
    `- **Session clock:** ${session.planningInput.sessionDurationMinutes} minutes · **Concurrent players:** ${session.planningInput.playersConcurrent}`,
    "",
  ];
};

const buildMasterBlueprintExportLines = (session: SessionState): string[] => {
  const logic = session.currentPuzzles.filter((p) => p.category === "logic");
  const physical = session.currentPuzzles.filter((p) => p.category === "physical");
  const electronic = session.currentPuzzles.filter((p) => p.category === "electronic");
  const inv = session.planningInput.availableItems.filter(Boolean);
  return [
    "## Master blueprint",
    "",
    "### Logic beats",
    ...(logic.length > 0
      ? logic.map((p) => `- **${p.title}** (${p.difficulty}): ${p.objective}`)
      : ["- _No logic puzzles in this export._"]),
    "",
    "### Physical builds & props",
    ...(physical.length > 0
      ? physical.flatMap((p) => [
          `- **${p.title}** (${p.difficulty}): ${p.objective}`,
          `  - Host steps: ${(p.solveSteps ?? []).slice(0, 2).join(" → ") || p.howItWorks.slice(0, 160)}`,
        ])
      : ["- _No physical puzzles in this export._"]),
  ...(inv.length > 0
      ? ["", "**Stated inventory anchors:**", ...inv.map((item) => `  - ${item}`)]
      : []),
    "",
    "### 3D print & fabrication",
    "- Mechanical enclosures, latch carriers, and scenic shells should be modeled in your CAD/ slicer workflow before install week.",
    "- Print tolerances: plan ±0.3 mm for sliding fits; label each prop with puzzle ID for reset crews.",
    "- Decorative skins may be FDM/ resin; load-bearing latch parts prefer PETG/ ABS or machined inserts.",
    "",
    "### Electronics integration",
    ...(electronic.length > 0
      ? electronic.flatMap((p) => {
          const parts = p.electronicDetails?.parts ?? [];
          const wiring = p.electronicDetails?.wiringDiagram ?? [];
          return [
            `- **${p.title}**`,
            ...(parts.length > 0 ? [`  - Parts: ${parts.join("; ")}`] : []),
            ...(wiring.length > 0 ? [`  - Pinout / wiring: ${wiring.join(" | ")}`] : []),
            `  - Technique references: [Playful Technology](https://www.youtube.com/@playfultechnology) (Arduino escape-room patterns; verify against your generated sketch).`,
          ];
        })
      : ["- _No electronic puzzles — skip MCU bench prep._"]),
    "",
  ];
};

const buildMermaidFlowchartExportLines = (session: SessionState): string[] => {
  const story = session.currentStoryPlan;
  if (!story) {
    return ["## Master flowchart (Mermaid)", "", "_Generate puzzles and storyline to produce the dependency graph._", ""];
  }
  const mermaid = buildRoomFlowchartMermaid(
    {
      missionObjective: story.missionObjective,
      progressionRule: story.progressionRule,
      stages: story.stages.map((s) => ({
        stage: s.stage,
        title: s.title,
        storyBeat: s.storyBeat,
        requiredPuzzleIds: s.requiredPuzzleIds,
        requiredPuzzleTitles: s.requiredPuzzleTitles,
      })),
      puzzleLinks: story.puzzleLinks.map((l) => ({
        puzzleId: l.puzzleId,
        puzzleTitle: l.puzzleTitle,
        storyRole: l.storyRole,
      })),
    },
    session.currentPuzzles.map((p) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      stageHint: p.stageHint,
      audienceTrack: p.audienceTrack,
    })),
  );
  if (!mermaid) {
    return ["## Master flowchart (Mermaid)", "", "_No puzzle nodes available for flowchart._", ""];
  }
  return ["## Master flowchart (Mermaid)", "", "Puzzle names and stage gates reflect your story plan dependencies.", "", "```mermaid", mermaid, "```", ""];
};

type FlowPathKind = "linear" | "nonlinear" | "multilinear";

/** Bias narrative + export guidance from concurrent players, duration, junior add-on, and event context. */
const getRecommendedFlowPathKind = (session: SessionState): FlowPathKind => {
  const pc = session.planningInput.playersConcurrent;
  const mins = session.planningInput.sessionDurationMinutes;
  const e = (session.planningInput.eventType ?? "").trim().toLowerCase();
  const youth = session.planningInput.youthAddOnEnabled;
  const teamish =
    /\b(team building|team-building|corporate|retreat|offsite|off-site|staff day|multigenerational|family reunion)\b/i.test(
      e,
    );

  if (youth || teamish) return "multilinear";
  if (pc >= 6) return "nonlinear";
  if (pc >= 5 && mins >= 35) return "nonlinear";
  if (pc <= 4 && mins <= 45) return "linear";
  if (pc <= 3) return "linear";
  return "nonlinear";
};

const RUN_GEOMETRY_HEADING = "## Run geometry (from your timing, headcount, and event)";

const buildRunGeometryMarkdown = (session: SessionState): string => {
  const pc = session.planningInput.playersConcurrent;
  const mins = session.planningInput.sessionDurationMinutes;
  const eventLine = (session.planningInput.eventType ?? "").trim() || "Not specified (general audience).";
  const room = session.planningInput.environmentType.trim() || "your play space";
  const venueLine = isProfessionalEmptyVenue(session)
    ? "Professional empty room — install fixtures and stations from scratch"
    : "Prebuilt space — use existing furniture and layout where safe";
  const rec = getRecommendedFlowPathKind(session);
  const recLabel =
    rec === "linear"
      ? "Linear (path of one)"
      : rec === "multilinear"
        ? "Multi-linear (parallel paths)"
        : "Non-linear (open path)";
  const explain =
    rec === "linear"
      ? `With **${pc} players at one time** and **${mins} minutes**, favor a **clear sequential spine** so everyone shares the same beats; keep a staffed hint ladder so one stuck lock does not idle the whole group.`
      : rec === "multilinear"
        ? `With **${pc} concurrent players**${session.planningInput.youthAddOnEnabled ? ", a **junior add-on**," : ""} and event context “${eventLine}”, plan **split work that reconverges**—balance tracks so neither cohort waits long.`
        : `With **${pc} concurrent players** and **${mins} minutes**, favor **several live puzzles** feeding one finale meta beat; recap story centrally so busy corners still hear the through-line.`;

  const linearRoom =
    `In **${room}**, run a **single spine** along one wall or furniture line (e.g. entry console → bookshelf → finale desk) so the team physically follows the story; avoid scattering locks so players do not backtrack through unrelated zones.`;
  const nonlinearRoom =
    `In **${room}**, open **two to three concurrent stations** in different corners (each with its own surface and lighting) so ${pc} people are not stacked on one table; use a **central clue board** or audible “all-hands” recap so teams in separate corners still share the narrative.`;
  const multilinearRoom =
    `In **${room}**, assign **Track A / Track B** to opposite sides of the footprint (or “kids table” vs “adult wall”) so parallel crews are not overhearing each other’s solutions; plan a **merge beat** at a shared hub (kitchen island, large table, or doorway threshold) before the finale.`;

  return [
    RUN_GEOMETRY_HEADING,
    "",
    `- **Venue build:** ${venueLine}`,
    `- **Physical room:** ${room}`,
    `- **Event context:** ${eventLine}`,
    `- **Generator bias for this session:** ${recLabel} — ${explain}`,
    "",
    "### Path types (how they land in *your* room)",
    "",
    "**1. Linear (path of one)** — One ordered chain of puzzles; each solve unlocks the next station.",
    `- **In ${room}:** ${linearRoom}`,
    "- **Pros:** Easiest narrative and game-state control; everyone sees every puzzle.",
    "- **Cons:** One stuck group stalls the entire run; awkward for **6+** concurrent players who end up watching.",
    "- **Best for:** Small groups (**2–4**), beginners, shorter clocks when you want one shared spotlight.",
    "",
    "**2. Non-linear (open path)** — Several puzzles live at once; branches converge on a final meta puzzle.",
    `- **In ${room}:** ${nonlinearRoom}`,
    "- **Pros:** Keeps everyone busy; if one player is stuck on math, someone else can tackle a physical task.",
    "- **Cons:** Can feel chaotic; players may miss story beats if they camp in different corners.",
    "- **Best for:** Larger crews (**5+**), longer sessions, experienced players.",
    "",
    "**3. Multi-linear (parallel paths)** — Two or more tracks run together; both must succeed before merge or finale.",
    `- **In ${room}:** ${multilinearRoom}`,
    "- **Pros:** Forces communication and teamwork; pairs naturally with a **junior add-on** (kids on one track, adults on another).",
    "- **Cons:** Requires balancing so one team is not waiting ten minutes on the other.",
    "- **Best for:** Team-building events and multi-generational groups.",
    "",
  ].join("\n");
};

const injectRunGeometryIfMissing = (description: string, session: SessionState): string => {
  if (description.includes(RUN_GEOMETRY_HEADING)) return description;
  return `${description}\n\n${buildRunGeometryMarkdown(session)}`;
};

const themeEventAffinityScore = (theme: Theme, session: SessionState): number => {
  const et = (session.planningInput.eventType ?? "").trim().toLowerCase();
  if (!et) return 0;
  const blob = `${theme.name} ${theme.tldr} ${theme.description}`.toLowerCase();
  let score = 0;
  if (/\b(halloween|spook|trick-or|trick or|october|costume|all hallows)\b/.test(et)) {
    if (theme.id === "th_1" || blob.includes("haunt") || blob.includes("library")) score += 14;
    if (blob.includes("vault") || blob.includes("crypt") || blob.includes("arcane")) score += 7;
  }
  if (/\b(christmas|xmas|holiday party|winter celebration|yule|hanukkah|hanukah)\b/.test(et)) {
    if (theme.id === "th_4" || blob.includes("clock") || blob.includes("workshop")) score += 12;
    if (theme.id === "th_2" || blob.includes("rail") || blob.includes("express")) score += 9;
  }
  if (/\b(team building|team-building|corporate|retreat|staff)\b/.test(et)) {
    if (theme.id === "th_6" || blob.includes("relay") || blob.includes("signal") || blob.includes("dispatch")) score += 12;
    if (theme.id === "th_2") score += 8;
  }
  if (/\b(birthday|kids|family party|bar mitzvah|quince)\b/.test(et)) {
    if (theme.id === "th_5" || blob.includes("arcade") || blob.includes("game")) score += 11;
  }
  if (/\b(commercial|venue|ticketed|public room)\b/.test(et)) {
    if (blob.includes("lab") || blob.includes("vault") || blob.includes("bunker")) score += 7;
  }
  return score;
};

/** Heuristic alignment between theme copy and the host's physical environment (used when themeMustMatchEnvironment is on). */
const themeEnvironmentFitScore = (theme: Theme, envRaw: string): number => {
  const env = envRaw.trim().toLowerCase();
  if (!env) return 0;
  const blob = `${theme.name} ${theme.tldr ?? ""} ${theme.description}`.toLowerCase();
  let score = 0;
  const outdoorEnv =
    /\b(outdoor|outside|yard|patio|deck|garden|park|campsite|lawn|field|beach|trail|woods?|forest)\b/.test(env);
  const indoorCue = /\b(library|vault|classroom|office|kitchen|attic|basement|bunker|cockpit|studio|warehouse|containment|cellar)\b/;
  const clearlyOutdoorBlob =
    /\b(outdoor|yard|garden|trail|campsite|festival grounds|forest|beach|field|woods?)\b/.test(blob);
  if (outdoorEnv && indoorCue.test(blob) && !clearlyOutdoorBlob) score -= 30;
  if (!outdoorEnv && /\b(yard|forest trail|campsite)\b/.test(blob) && !/\b(indoor|room|hall|office)\b/.test(blob)) score -= 12;

  const schoolish = /\b(school|classroom|campus|lockers|homeroom)\b/.test(env);
  if (schoolish) {
    if (/\b(school|library|detention|principal|homework|study hall|campus|cafeteria)\b/.test(blob)) score += 22;
    if (/\b(vault|speakeasy|casino|submarine|clockmaker|wine cellar|penthouse)\b/.test(blob)) score -= 20;
  }

  const submerged =
    /\b(submerged|underwater|flooded|pool|aquarium|scuba)\b/.test(env) || /\b(pool|aquarium)\b/.test(env);
  if (submerged) {
    if (/\b(science\s+lab|marine biolog|research\s+vessel|subaquatic|aquatic lab|rov)\b/.test(blob)) score += 20;
    if (/\blab\b/.test(blob) && !/\b(science|marine|aqua|water|ocean|sub|rov|research)\b/.test(blob)) score -= 18;
  }

  return score;
};

const sortThemesForSessionAffinity = (pool: Theme[], session: SessionState): Theme[] => {
  const envGate = session.planningInput.themeMustMatchEnvironment;
  const scored = pool.map((t) => ({
    t,
    s:
      themeEventAffinityScore(t, session) +
      (envGate ? themeEnvironmentFitScore(t, session.planningInput.environmentType) : 0) +
      crypto.randomInt(0, 1000) / 10000,
  }));
  scored.sort((a, b) => b.s - a.s);
  return scored.map((x) => x.t);
};

const injectItemsIntoThemeDescription = (theme: Theme, session: SessionState): Theme => {
  let description = injectRunGeometryIfMissing(theme.description, session);
  description = injectVenueBuildContextIfMissing(description, session);
  let tldr = theme.tldr;
  const inv = normalizePlanningInventory(session.planningInput.availableItems);
  if (
    inv.length > 0 &&
    !/\n##\s*Your Available Items\b/im.test(description) &&
    !/\n##\s*Your available items\b/im.test(description)
  ) {
    const room = session.planningInput.environmentType.trim() || "your physical room";
    const lines = inv.slice(0, 14).map((raw, i) => {
      const { placement, puzzleUses } = describeInventoryItem(raw, session.planningInput.environmentType);
      return `${i + 1}. **${raw}** — *Story placement:* ${placement} *Puzzle integration:* ${puzzleUses}`;
    });
    const block = [
      "## Your Available Items (Story Integration)",
      "",
      `Anchored to **${room}**. Treat this list as a **suggested prop pool** for the whole run—you do **not** need to use every object, and beats can omit props that do not serve the story. If the host **mentioned** something in their planning context (environment, event, or free-text notes), **consider** it even when it is not repeated in this appendix. Prefer a few strong props reused well; do not use large furniture or soft goods to operate **real egress doors or life-safety hardware**; keep latches on dedicated puzzle boxes or strike plates you install for play. Avoid improvised sharp tools as keys or pry bars.`,
      "",
      ...lines,
      "",
      "_Generator note: Prefer beats you can stage from this inventory before you buy niche specialty props._",
      "",
      "### Puzzle generation policy",
      PUZZLE_GENERATION_INVENTORY_POLICY,
    ].join("\n");
    description = `${description}\n\n${block}`;
    const tldrExtra = ` Uses your listed props (${inv.slice(0, 3).join(", ")}).`;
    tldr =
      theme.tldr && !theme.tldr.toLowerCase().includes("listed props")
        ? `${theme.tldr}${tldrExtra}`.slice(0, 320)
        : theme.tldr;
  }
  description = appendStudioBuildPolicyToDescription(description);
  return applyThemeNarrativeQualityPass({ ...theme, description, tldr: tldr ?? theme.tldr });
};

const injectItemsIntoThemes = (themes: Theme[], session: SessionState): Theme[] =>
  themes.map((theme) => injectItemsIntoThemeDescription(theme, session));

const puzzleAnchorText = (puzzle: Puzzle): string =>
  `${puzzle.title} ${puzzle.objective} ${puzzle.howItWorks}`.toLowerCase();

/** Prefer inventory items whose affordances match the puzzle copy (avoid random fridge→cipher pairings). */
const scoreInventoryForPuzzle = (puzzle: Puzzle, item: string): number => {
  const t = puzzleAnchorText(puzzle);
  const s = item.toLowerCase();
  let score = 0;
  const cat = puzzle.category;
  const wantsMass = /\b(balance|weight|pressure|scale|plate|equilibrium|mass|load|heavy|tilt|lever)\b/.test(t);
  const wantsMagnet = /\b(magnet|polarity|ferrous|steel|attract)\b/.test(t);
  const wantsCipher = /\b(cipher|decode|code|index|message|phrase|encode|crypt|encoded)\b/.test(t);
  const wantsNumberRing = /\b(wedge|sector|ring|radial|spoke|segment)\b/.test(t) || wantsCipher;

  if (/\bmini[-\s]?fridge\b|\bfridge\b|\brefrigerator\b/.test(s) && !/\bmagnet\b/.test(s)) {
    if (wantsMass) score += 22;
    else if (cat === "physical") score += 10;
    else score += 2;
  }
  if (/\bmagnet\b|\bfridge\s+magnet\b/.test(s)) {
    if (wantsMagnet) score += 18;
    if (wantsMass) score += 1;
    if (wantsCipher) score += 5;
  }
  if (/\bdart\b|\bdartboard\b|\bdart\s+board\b/.test(s)) {
    if (wantsCipher || wantsNumberRing) score += 20;
    if (cat === "logic") score += 6;
  }
  if (/\b(whiteboard|chalkboard|cork board)\b/.test(s) && (wantsCipher || /\b(grid|matrix|deduction)\b/.test(t))) score += 12;
  if (/\b(book|journal|diary|paper|map|card|dice)\b/.test(s) && (wantsCipher || cat === "logic")) score += 8;
  if (cat === "electronic" && /\b(arduino|led|battery|wire|sensor|screen|tv|speaker|radio)\b/.test(s)) score += 12;
  if (cat === "physical" && /\b(rope|string|tape|box|lock|scale|weight|table|chair|tool)\b/.test(s)) score += 7;
  if (cat === "logic" && /\b(pen|marker|clock|timer)\b/.test(s)) score += 5;
  if (/\b(lock|padlock|hasp|key)\b/.test(s) && /\b(lock|latch|unlock|container|door)\b/.test(t)) score += 14;
  if (/\b(flashlight|blacklight|uv|lamp)\b/.test(s) && /\b(light|shadow|hidden|glow|uv)\b/.test(t)) score += 12;
  return score;
};

const MIN_INVENTORY_ANCHOR_SCORE = 10;

const annotatePuzzlesWithInventoryAnchors = (session: SessionState, puzzles: Puzzle[]): Puzzle[] =>
  enrichPuzzlesWithManufacturingSchema(puzzles, {
    normalizeInventory: normalizePlanningInventory,
    describeItem: describeInventoryItem,
    scoreItemForPuzzle: (puzzle, item) => scoreInventoryForPuzzle(puzzle as Puzzle, item),
    minAnchorScore: MIN_INVENTORY_ANCHOR_SCORE,
    sentenceCaseLead,
    environmentType: session.planningInput.environmentType,
    themeName: session.selectedTheme?.name ?? "Selected theme",
    availableItems: session.planningInput.availableItems,
  });

const buildSuggestedAdditionLists = (
  session: SessionState,
  puzzles: Puzzle[],
): { required: string[]; optional: string[] } => {
  const required: string[] = [];
  const optional: string[] = [];
  const pc = session.planningInput.playersConcurrent;
  const mins = session.planningInput.sessionDurationMinutes;
  const pathKind = getRecommendedFlowPathKind(session);
  const pathLabel =
    pathKind === "linear"
      ? "Linear (path of one)"
      : pathKind === "multilinear"
        ? "Multi-linear (parallel paths)"
        : "Non-linear (open path)";
  optional.push(
    `Run geometry: with **${pc} players at one time** and **${mins} minutes**, the generator biases toward **${pathLabel}**—match staffing, hinting, and floor layout to that shape (see **Run geometry** in the theme brief).`,
  );
  const room = session.planningInput.environmentType.toLowerCase();
  const items = session.planningInput.availableItems.map((item) => item.toLowerCase());
  const hasItem = (needle: string) => items.some((item) => item.includes(needle));
  const electronicCount = puzzles.filter((puzzle) => puzzle.category === "electronic").length;
  const inv = normalizePlanningInventory(session.planningInput.availableItems);

  if (isProfessionalEmptyVenue(session)) {
    required.push(
      "Map the empty shell before ordering props: entry/briefing zone, 2–4 puzzle stations, GM control position, and a finale cluster.",
    );
    optional.push(
      "Professional empty room: install lock hardware on dedicated puzzle boxes or strike plates you add—never repurpose real egress latches.",
    );
    optional.push(
      "Run the **What to install in your empty room** checklist in your theme brief before commissioning furniture or electronics.",
    );
  } else {
    optional.push(
      "Label the room boundary and puzzle zones so players understand where gameplay objects are intentionally placed.",
    );
  }
  optional.push(
    "Originality stance: adapt generator ideas into **venue-specific** puzzles—logic, physical, and especially **Arduino/microcontroller** builds should be yours to prototype, then **QA** (all states, resets, power loss, safety) before opening night; treat web references as technique/credit only, not a script to clone.",
  );
  optional.push(
    "Prop discipline: list props you **might** use across the run (deduction aids, containers, electronics). The generator may tie only **high-confidence** matches to a specific puzzle; you can still stage unused items for mood as long as they do not read as fake puzzles.",
  );
  if (inv.length > 0) {
    optional.push(
      `Inventory-led build: ${inv.length} distinct item(s) are driving theme appendices, puzzle tie-ins, and export placement notes—reset photos should show each prop in its documented home.`,
    );
    for (const raw of inv.slice(0, 10)) {
      const { placement, puzzleUses } = describeInventoryItem(raw, session.planningInput.environmentType);
      optional.push(`Item “${raw}”: ${placement} Puzzle ideas: ${puzzleUses}`);
    }
  }

  if (!hasItem("lock")) {
    required.push("Add at least 2 lockable containers (hasp box, lock box, or drawer latch) for staged reveals.");
  }
  if (!hasItem("board") && !hasItem("whiteboard")) {
    required.push("Add a clue board or pin area for team clue tracking and deduction mapping.");
  }
  if (electronicCount > 0 && !hasItem("arduino")) {
    required.push(
      "Add an electronics kit station (Arduino, breadboard, jumper wires, resistors) to support electronic puzzles.",
    );
  }
  if (electronicCount > 0) {
    optional.push(
      "Electronic / Arduino beats: prototype on the bench, then run a formal **QA** pass (every valid and invalid input, reset, unplug mid-sequence, heat, and trip hazards) before mounting in the set—ship original behaviors, not clones of public tutorials.",
    );
  }
  if (!isProfessionalEmptyVenue(session) && (room.includes("living room") || room.includes("house"))) {
    optional.push("Add temporary cable covers/tape routes to keep wiring safe in shared household spaces.");
    optional.push("Add removable prop mounts (command hooks/strips) to avoid permanent room modifications.");
  }
  if (isProfessionalEmptyVenue(session)) {
    optional.push("Cable trenches or surface raceways along walls keep Arduino harnesses off the player path in a commercial shell.");
  }
  if (room.includes("garage") || room.includes("basement")) {
    optional.push("Add focused lighting for clue visibility and a clear safe path around stored equipment.");
  }
  if (session.planningInput.youthAddOnEnabled) {
    optional.push(
      "Junior add-on: provide kid-height surfaces, stable seating, and bright signage; keep reset props within reach of a helper.",
    );
    if (session.planningInput.youthAddOnGatesAdultFlow) {
      optional.push(
        "Junior track gates adult flow: document relay rules (who carries tokens, how adults verify junior outcomes) so pacing stays fair and calm.",
      );
    }
  }

  return { required, optional };
};

const estimatePuzzleCount = (playersConcurrent: number, sessionDurationMinutes: number): number => {
  // Time-first guardrails:
  // Very short sessions must have very few puzzles, otherwise rooms become unsolvable.
  if (sessionDurationMinutes <= 5) return 1;
  if (sessionDurationMinutes <= 10) return Math.min(2, Math.max(1, Math.ceil(playersConcurrent / 3)));
  if (sessionDurationMinutes <= 15) return Math.min(3, Math.max(2, Math.ceil(playersConcurrent / 2)));
  if (sessionDurationMinutes <= 30) {
    const raw = Math.ceil((playersConcurrent * sessionDurationMinutes) / 38);
    return Math.min(8, Math.max(2, raw));
  }

  // Standard sessions (30+ min): scale by players and runtime.
  const raw = Math.ceil((playersConcurrent * sessionDurationMinutes) / 30);
  return Math.max(4, Math.min(18, raw));
};

const puzzleStageOrderWeight = (puzzle: Puzzle): number => {
  const hint = (puzzle.stageHint ?? "").toLowerCase();
  if (!hint) return 2;
  if (
    hint.includes("final") ||
    hint.includes("exit") ||
    hint.includes("end") ||
    hint.includes("opens final door") ||
    hint.includes("boss")
  ) {
    return 3;
  }
  if (
    hint.includes("intro") ||
    hint.includes("start") ||
    hint.includes("begin") ||
    hint.includes("opening")
  ) {
    return 1;
  }
  if (hint.includes("mid") || hint.includes("middle")) {
    return 2;
  }
  return 2;
};

type CategoryTriple = { logic: number; physical: number; electronic: number };

const resolveMainTrackPuzzleCount = (session: SessionState): number => {
  const auto = estimatePuzzleCount(
    session.planningInput.playersConcurrent,
    session.planningInput.sessionDurationMinutes,
  );
  const raw = session.planningInput.mainTrackPuzzleCountOverride;
  if (raw === null || raw === undefined) return auto;
  if (!Number.isFinite(raw)) return auto;
  return Math.min(24, Math.max(1, Math.trunc(raw)));
};

const computeDefaultCategoryCounts = (remaining: number, sessionMinutes: number): CategoryTriple => {
  let electronicCount = 0;
  let logicCount = 0;
  let physicalCount = 0;
  if (remaining === 1) {
    logicCount = 1;
  } else if (remaining === 2) {
    logicCount = 1;
    physicalCount = 1;
  } else if (remaining > 2) {
    electronicCount = Math.max(1, Math.ceil(remaining * 0.4));
    logicCount = Math.max(1, Math.floor(remaining * 0.3));
    physicalCount = Math.max(1, remaining - electronicCount - logicCount);

    if (sessionMinutes <= 10) {
      electronicCount = Math.min(electronicCount, 1);
      logicCount = Math.min(logicCount, 1);
      physicalCount = Math.max(1, remaining - electronicCount - logicCount);
    } else if (sessionMinutes <= 15) {
      electronicCount = Math.min(electronicCount, 1);
      physicalCount = Math.max(1, remaining - electronicCount - logicCount);
    }

    const shrinkToBudget = (): void => {
      let total = electronicCount + logicCount + physicalCount;
      let guard = 0;
      while (total > remaining && guard < 24) {
        guard += 1;
        if (electronicCount > 1 && electronicCount >= logicCount && electronicCount >= physicalCount) electronicCount -= 1;
        else if (physicalCount > 1 && physicalCount >= logicCount) physicalCount -= 1;
        else if (logicCount > 1) logicCount -= 1;
        else if (electronicCount > 1) electronicCount -= 1;
        else if (physicalCount > 1) physicalCount -= 1;
        else break;
        total = electronicCount + logicCount + physicalCount;
      }
    };
    const growToBudget = (): void => {
      let total = electronicCount + logicCount + physicalCount;
      let guard = 0;
      while (total < remaining && guard < 24) {
        guard += 1;
        const prev = total;
        if (sessionMinutes <= 10) {
          physicalCount += 1;
        } else if (electronicCount <= physicalCount && electronicCount <= logicCount) {
          electronicCount += 1;
        } else if (physicalCount <= logicCount) {
          physicalCount += 1;
        } else {
          logicCount += 1;
        }
        total = electronicCount + logicCount + physicalCount;
        if (total === prev) break;
      }
    };
    shrinkToBudget();
    growToBudget();
  }
  return { logic: logicCount, physical: physicalCount, electronic: electronicCount };
};

const parsePlanningMixTriple = (session: SessionState): CategoryTriple | null => {
  const L = session.planningInput.puzzleMixLogic;
  const P = session.planningInput.puzzleMixPhysical;
  const E = session.planningInput.puzzleMixElectronic;
  if (L === null || L === undefined || P === null || P === undefined || E === null || E === undefined) return null;
  if (!Number.isFinite(L) || !Number.isFinite(P) || !Number.isFinite(E)) return null;
  return { logic: Math.trunc(L), physical: Math.trunc(P), electronic: Math.trunc(E) };
};

const resolveGeneratedCategoryCounts = (session: SessionState, remaining: number, sessionMinutes: number): CategoryTriple => {
  const mix = parsePlanningMixTriple(session);
  if (mix && remaining > 0) {
    let { logic, physical, electronic } = mix;
    const sum0 = logic + physical + electronic;
    if (sum0 === 0) return computeDefaultCategoryCounts(remaining, sessionMinutes);
    if (sum0 !== remaining) {
      const scale = remaining / sum0;
      logic = Math.max(0, Math.round(logic * scale));
      physical = Math.max(0, Math.round(physical * scale));
      electronic = Math.max(0, remaining - logic - physical);
    }
    if (sessionMinutes <= 10) {
      electronic = Math.min(electronic, 1);
      logic = Math.min(logic, 1);
      physical = Math.max(1, remaining - electronic - logic);
    } else if (sessionMinutes <= 15) {
      electronic = Math.min(electronic, 1);
      physical = Math.max(1, remaining - electronic - logic);
    }
    let total = logic + physical + electronic;
    let guard = 0;
    while (total > remaining && guard < 30) {
      guard += 1;
      if (electronic > 1 && electronic >= logic && electronic >= physical) electronic -= 1;
      else if (physical > 1 && physical >= logic) physical -= 1;
      else if (logic > 1) logic -= 1;
      else if (electronic > 1) electronic -= 1;
      else if (physical > 1) physical -= 1;
      else break;
      total = logic + physical + electronic;
    }
    guard = 0;
    while (total < remaining && guard < 30) {
      guard += 1;
      const prev = total;
      if (sessionMinutes <= 10) {
        physical += 1;
      } else if (electronic <= physical && electronic <= logic) {
        electronic += 1;
      } else if (physical <= logic) {
        physical += 1;
      } else {
        logic += 1;
      }
      total = logic + physical + electronic;
      if (total === prev) break;
    }
    if (remaining >= 3) {
      if (logic === 0 || physical === 0) return computeDefaultCategoryCounts(remaining, sessionMinutes);
      if (sessionMinutes > 15 && electronic === 0) return computeDefaultCategoryCounts(remaining, sessionMinutes);
    }
    return { logic, physical, electronic };
  }
  return computeDefaultCategoryCounts(remaining, sessionMinutes);
};

const createStoryPlan = (theme: Theme | undefined, puzzles: Puzzle[], session: SessionState): StoryPlan => {
  // Stage hints control where user-provided puzzles appear in progression.
  const themeName = theme?.name ?? "Unknown Theme";
  const themeDescription = theme?.description ?? "No description provided.";
  const storyPlain = extractStorylinePlain(themeDescription);
  const missionObjective =
    collapseWs(theme?.tldr?.trim() ?? "") ||
    (storyPlain ? pickBestTldrFromStoryline(storyPlain, themeName) : "") ||
    firstSentenceForTldr(
      storyPlain || collapseWs(themeDescription.replace(/^[\s\S]*?##\s*Storyline\s*\n+/i, "").split(/\n##/)[0] ?? ""),
    ) ||
    "Complete the mission before time elapses.";
  const missionObjectiveClipped = missionObjective.length > 380 ? `${missionObjective.slice(0, 377)}…` : missionObjective;
  const inv = normalizePlanningInventory(session.planningInput.availableItems);
  const invSituation =
    inv.length > 0
      ? ` Host-stated props to weave through the run: ${inv.slice(0, 10).join("; ")}${inv.length > 10 ? " (see export inventory section for full list)." : "."}`
      : "";
  const invProgression =
    inv.length > 0
      ? " Document a reset photo for each listed prop so staging matches every group."
      : "";
  const pathKind = getRecommendedFlowPathKind(session);
  const eventSnippet = (session.planningInput.eventType ?? "").trim()
    ? ` Host framing: ${(session.planningInput.eventType ?? "").trim()}.`
    : "";
  const stageWhyMid =
    pathKind === "linear"
      ? "Keeps the room on one readable timeline—route traffic so everyone sees the same reveals in order, and keep a staffed hint path if a single lock stalls."
      : pathKind === "multilinear"
        ? "Mirrors multi-linear play: parallel work should reconverge on a merge beat so neither crew idles—especially when junior and adult tracks both exist."
        : "Supports non-linear concurrency—two live puzzles keep larger groups from standing in a ring around one desk.";
  const stageWhyFinal =
    pathKind === "linear"
      ? "Collapses the chain into one finale condition that fits a smaller team that stayed together."
      : pathKind === "multilinear"
        ? "Merges split tracks into one closing beat—verify timing so both sides arrive with clues in hand."
        : "Converges open branches into a single ending sequence so chaotic mid-game energy still lands one exit story.";
  const progressionGraph = buildProgressionGraph({
    puzzles,
    playersConcurrent: session.planningInput.playersConcurrent,
    environmentType: session.planningInput.environmentType,
    inventoryItems: inv,
    pathKind,
  });
  const derived = deriveStoryViewsFromGraph(
    progressionGraph,
    puzzles,
    missionObjectiveClipped,
    session.planningInput.environmentType,
    { mid: stageWhyMid, final: stageWhyFinal },
  );

  return {
    situation: `Players are cast inside a ${themeName} scenario and must decode layered clues before the environment reaches failure state.${eventSnippet}${invSituation}`,
    premise: `${themeName}: ${missionObjectiveClipped}`,
    missionObjective: missionObjectiveClipped,
    progressionRule: derived.progressionRule + (invProgression ? ` ${invProgression}` : ""),
    stages: derived.stages,
    puzzleLinks: derived.puzzleLinks,
    progressionGraph,
    stagingDiagram: derived.stagingDiagram,
  };
};

const shuffle = <T>(items: T[]): T[] => {
  // Fisher-Yates shuffle (cryptographic index picks for varied theme draws per session).
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(0, i + 1);
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
};

/** Theme ids already committed in a saved plan — never offer them to another builder. */
const globallyReservedThemeIdsFromSaves = new Set<string>();
/** Lowercased display titles from any theme on a saved plan — blocks duplicate titles for others. */
const globallyReservedSavedThemeTitlesLower = new Set<string>();
/** themeId|sortedPuzzleIds for every saved plan — puzzle sets must not be regenerated for others. */
const savedPlanThemePuzzleSignatures = new Set<string>();

const rebuildGlobalSavedAssetLocks = (): void => {
  globallyReservedThemeIdsFromSaves.clear();
  globallyReservedSavedThemeTitlesLower.clear();
  savedPlanThemePuzzleSignatures.clear();
  for (const plans of savedPlansByUser.values()) {
    for (const plan of plans) {
      const tid = plan.data.selectedThemeId;
      if (tid) globallyReservedThemeIdsFromSaves.add(tid);
      for (const t of plan.data.themes ?? []) {
        globallyReservedThemeIdsFromSaves.add(t.id);
        if (t.name?.trim()) globallyReservedSavedThemeTitlesLower.add(t.name.trim().toLowerCase());
      }
      const puzzles = plan.data.puzzles ?? [];
      if (tid && puzzles.length > 0) {
        savedPlanThemePuzzleSignatures.add(`${tid}|${puzzles.map((p) => p.id).sort().join(",")}`);
      }
    }
  }
};

const savedPlanPuzzleSignatureKey = (themeId: string, puzzles: Puzzle[]): string =>
  `${themeId}|${puzzles.map((p) => p.id).sort().join(",")}`;

/** If this theme + puzzle id multiset already exists on a saved plan, swap pool puzzles until unique (best-effort). */
const breakDuplicateSavedRoomPuzzleSet = (themeId: string, puzzles: Puzzle[], theme: Theme | undefined): Puzzle[] => {
  let current = [...puzzles];
  if (!theme || !savedPlanThemePuzzleSignatures.has(savedPlanPuzzleSignatureKey(themeId, current))) return current;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const idx = current.findIndex((p) => !String(p.id).startsWith("pz_existing_"));
    if (idx === -1) return current;
    const cat = current[idx].category;
    const candidates = shuffle(
      puzzlePoolByCategory[cat].filter(
        (p) =>
          isPuzzleCompatibleWithTheme(p, theme) &&
          !isSkipped("puzzle", p.id) &&
          p.id !== current[idx].id &&
          !current.some((c) => c.id === p.id),
      ),
    );
    const pick = candidates[0];
    if (!pick) return current;
    current[idx] = pick;
    if (!savedPlanThemePuzzleSignatures.has(savedPlanPuzzleSignatureKey(themeId, current))) return current;
  }
  return current;
};

const skipKey = (type: SkipEntryType, id: string): string => `${type}:${id}`;

const pruneExpiredSkips = (): void => {
  const now = Date.now();
  for (const [key, entry] of skipEntries.entries()) {
    if (now - entry.skippedAtMs >= SKIP_TTL_MS) {
      skipEntries.delete(key);
    }
  }
};

const isSkipped = (type: SkipEntryType, id: string): boolean => {
  pruneExpiredSkips();
  const entry = skipEntries.get(skipKey(type, id));
  if (!entry) return false;
  return Date.now() - entry.skippedAtMs < SKIP_TTL_MS;
};

const markSkipped = (type: SkipEntryType, id: string): void => {
  skipEntries.set(skipKey(type, id), { type, id, skippedAtMs: Date.now() });
};

const persistSkipHistory = async (): Promise<void> => {
  pruneExpiredSkips();
  try {
    await fs.mkdir(path.dirname(skipHistoryPath), { recursive: true });
    const payload = JSON.stringify({ entries: Array.from(skipEntries.values()) }, null, 2);
    await fs.writeFile(skipHistoryPath, payload, "utf8");
  } catch {
    // Best-effort persistence only.
  }
};

const loadSkipHistory = async (): Promise<void> => {
  try {
    const raw = await fs.readFile(skipHistoryPath, "utf8");
    const parsed = JSON.parse(raw) as { entries?: SkipEntry[] };
    if (!Array.isArray(parsed.entries)) return;
    for (const entry of parsed.entries) {
      if (!entry?.id || !entry?.type || !entry?.skippedAtMs) continue;
      skipEntries.set(skipKey(entry.type, entry.id), entry);
    }
    pruneExpiredSkips();
  } catch {
    // No saved history yet.
  }
};

const puzzlePoolByCategory: Record<Puzzle["category"], Puzzle[]> = {
  logic: [
    {
      id: "pz_logic_1",
      category: "logic",
      themeTags: ["generic", "mystery"],
      title: "Cipher Index",
      objective: "Decode the message.",
      howItWorks:
        "Players discover an encoded clue and a key hint in separate locations. They must identify the cipher pattern, apply the key, and decode the final phrase that reveals the next lock combination.",
      referenceLinks: [
      ],
      solveSteps: ["Find key", "Apply shift"],
      difficulty: "medium",
    },
    {
      id: "pz_logic_2",
      category: "logic",
      themeTags: ["generic", "symbolic"],
      title: "Pattern Archive",
      objective: "Match symbol sequence to unlock clue.",
      howItWorks:
        "Players gather symbols from props around the room. They compare symbol order to a reference board and reconstruct the correct sequence, which opens a hidden compartment.",
      referenceLinks: [
        refRoomEscapeArtist("Room Escape Artist puzzle ideas")],
      solveSteps: ["Collect symbols", "Align sequence"],
      difficulty: "medium",
    },
    {
      id: "pz_logic_3",
      category: "logic",
      themeTags: ["generic", "deduction"],
      title: "Riddle Ledger",
      objective: "Solve chained riddles to extract a 4-digit code.",
      howItWorks:
        "Players solve a sequence of short clues where each answer points to the next riddle card. The final answers map to numbers that open the next lock.",
      referenceLinks: [
      ],
      solveSteps: ["Read first riddle", "Follow answer chain", "Convert final answers to code"],
      difficulty: "medium",
    },
    {
      id: "pz_logic_4",
      category: "logic",
      themeTags: ["generic", "mapping"],
      title: "Coordinate Cipher Grid",
      objective: "Use coordinates to decode a hidden instruction.",
      howItWorks:
        "Players combine coordinate clues from multiple props and index into a letter grid, revealing a phrase that unlocks the next puzzle stage.",
      referenceLinks: [
      ],
      solveSteps: ["Collect coordinate clues", "Map clues onto grid", "Decode resulting phrase"],
      difficulty: "medium",
    }],
  physical: [
    {
      id: "pz_physical_1",
      category: "physical",
      themeTags: ["generic", "mechanical"],
      title: "Weighted Switch",
      objective: "Balance objects to unlock compartment.",
      howItWorks:
        "A pressure plate or balance mechanism only triggers when object mass is distributed correctly. Players test combinations until the mechanism reaches equilibrium and releases a latch.",
      referenceLinks: [
      ],
      solveSteps: ["Collect weights", "Balance tray"],
      difficulty: "medium",
    },
    {
      id: "pz_physical_2",
      category: "physical",
      themeTags: ["generic", "magnet"],
      title: "Magnetic Lock Sequence",
      objective: "Align magnetic triggers in order.",
      howItWorks:
        "Magnetic sensors are hidden behind marked points. Players move a magnet in the correct order and timing to activate all sensors and unlock the next clue container.",
      referenceLinks: [
        {
          title: "Adafruit reed switch guide",
          url: "https://learn.adafruit.com/search?q=reed%20switch",
        }],
      solveSteps: ["Find magnet points", "Activate sequence"],
      difficulty: "medium",
    },
    {
      id: "pz_physical_3",
      category: "physical",
      themeTags: ["generic", "assembly"],
      title: "Artifact Assembly",
      objective: "Assemble parts in the correct orientation to reveal a clue.",
      howItWorks:
        "Players gather separated parts of an object and physically align them. A hidden pattern or message only appears when assembled correctly.",
      referenceLinks: [
      ],
      solveSteps: ["Find all parts", "Align in correct order", "Read revealed clue"],
      difficulty: "medium",
    },
    {
      id: "pz_physical_4",
      category: "physical",
      themeTags: ["generic", "navigation"],
      title: "Pathfinder Track",
      objective: "Route a token through the correct track sequence.",
      howItWorks:
        "Players must interpret route markers and physically move a token along a constrained path. A wrong route dead-ends and forces a retry.",
      referenceLinks: [
      ],
      solveSteps: ["Interpret route hints", "Navigate token path", "Trigger endpoint switch"],
      difficulty: "medium",
    }],
  electronic: [
    {
      id: "pz_electronic_1",
      category: "electronic",
      themeTags: ["generic", "modern-electronics"],
      title: "Signal Relay",
      objective: "Complete the circuit to light the clue.",
      howItWorks:
        "Players complete a button-and-LED circuit driven by an Arduino. When they press the button sequence correctly, the sketch toggles LEDs and reveals the success signal.",
      referenceLinks: [
      ],
      solveSteps: ["Wire LEDs", "Upload sketch"],
      difficulty: "medium",
      electronicDetails: {
        parts: [
          "Arduino Uno (or compatible)",
          "Breadboard",
          "2x LEDs (red/green)",
          "2x 220 ohm resistors",
          "1x push button",
          "1x 10k ohm resistor",
          "Jumper wires",
          "USB cable"],
        wiringDiagram: [
          "D8 -> 220 ohm resistor -> Red LED anode, LED cathode -> GND",
          "D9 -> 220 ohm resistor -> Green LED anode, LED cathode -> GND",
          "Button leg 1 -> 5V",
          "Button leg 2 -> D2 and 10k ohm resistor to GND (pulldown)",
          "Arduino GND -> breadboard ground rail"],
        wiringDiagramSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="980" height="420" viewBox="0 0 980 420">
  <rect x="20" y="20" width="220" height="360" fill="#f4f6f8" stroke="#333"/>
  <text x="130" y="48" text-anchor="middle" font-family="Arial" font-size="18">Arduino Uno</text>
  <text x="36" y="96" font-family="Arial" font-size="14">D8</text>
  <text x="36" y="126" font-family="Arial" font-size="14">D9</text>
  <text x="36" y="156" font-family="Arial" font-size="14">D2</text>
  <text x="36" y="186" font-family="Arial" font-size="14">5V</text>
  <text x="36" y="216" font-family="Arial" font-size="14">GND</text>
  <circle cx="92" cy="92" r="3" fill="#111"/><circle cx="92" cy="122" r="3" fill="#111"/><circle cx="92" cy="152" r="3" fill="#111"/><circle cx="92" cy="182" r="3" fill="#111"/><circle cx="92" cy="212" r="3" fill="#111"/>

  <rect x="280" y="20" width="680" height="360" fill="#fff" stroke="#333"/>
  <text x="620" y="48" text-anchor="middle" font-family="Arial" font-size="18">Breadboard (with rails and holes)</text>
  <line x1="310" y1="78" x2="930" y2="78" stroke="#d32f2f" stroke-width="3"/>
  <line x1="310" y1="94" x2="930" y2="94" stroke="#1976d2" stroke-width="3"/>
  <line x1="310" y1="320" x2="930" y2="320" stroke="#d32f2f" stroke-width="3"/>
  <line x1="310" y1="336" x2="930" y2="336" stroke="#1976d2" stroke-width="3"/>
  <text x="934" y="82" font-family="Arial" font-size="11">+ rail</text>
  <text x="934" y="98" font-family="Arial" font-size="11">- rail</text>
  <text x="934" y="324" font-family="Arial" font-size="11">+ rail</text>
  <text x="934" y="340" font-family="Arial" font-size="11">- rail</text>

  <g fill="#bbb">
    <circle cx="340" cy="140" r="2"/><circle cx="360" cy="140" r="2"/><circle cx="380" cy="140" r="2"/><circle cx="400" cy="140" r="2"/><circle cx="420" cy="140" r="2"/>
    <circle cx="340" cy="160" r="2"/><circle cx="360" cy="160" r="2"/><circle cx="380" cy="160" r="2"/><circle cx="400" cy="160" r="2"/><circle cx="420" cy="160" r="2"/>
    <circle cx="340" cy="180" r="2"/><circle cx="360" cy="180" r="2"/><circle cx="380" cy="180" r="2"/><circle cx="400" cy="180" r="2"/><circle cx="420" cy="180" r="2"/>
    <circle cx="520" cy="140" r="2"/><circle cx="540" cy="140" r="2"/><circle cx="560" cy="140" r="2"/><circle cx="580" cy="140" r="2"/><circle cx="600" cy="140" r="2"/>
    <circle cx="520" cy="160" r="2"/><circle cx="540" cy="160" r="2"/><circle cx="560" cy="160" r="2"/><circle cx="580" cy="160" r="2"/><circle cx="600" cy="160" r="2"/>
    <circle cx="520" cy="180" r="2"/><circle cx="540" cy="180" r="2"/><circle cx="560" cy="180" r="2"/><circle cx="580" cy="180" r="2"/><circle cx="600" cy="180" r="2"/>
  </g>

  <circle cx="710" cy="150" r="10" fill="#d32f2f"/><text x="726" y="154" font-family="Arial" font-size="12">Red LED</text>
  <circle cx="710" cy="186" r="10" fill="#2e7d32"/><text x="728" y="190" font-family="Arial" font-size="12">Green LED</text>
  <rect x="650" y="230" width="120" height="24" fill="#ddd" stroke="#333"/><text x="778" y="246" font-family="Arial" font-size="12">Push Button</text>

  <polyline points="610,150 624,144 638,156 652,144 666,156 680,150" fill="none" stroke="#8d6e63" stroke-width="2"/>
  <text x="686" y="154" font-family="Arial" font-size="11">220R</text>
  <polyline points="610,186 624,180 638,192 652,180 666,192 680,186" fill="none" stroke="#8d6e63" stroke-width="2"/>
  <text x="686" y="190" font-family="Arial" font-size="11">220R</text>
  <polyline points="610,254 624,248 638,260 652,248 666,260 680,254" fill="none" stroke="#8d6e63" stroke-width="2"/>
  <text x="686" y="258" font-family="Arial" font-size="11">10k</text>

  <line x1="92" y1="92" x2="610" y2="150" stroke="#1976d2" stroke-width="2.5"/><text x="250" y="104" font-family="Arial" font-size="11">D8</text>
  <line x1="680" y1="150" x2="700" y2="150" stroke="#1976d2" stroke-width="2.5"/>
  <line x1="92" y1="122" x2="610" y2="186" stroke="#1976d2" stroke-width="2.5"/><text x="250" y="132" font-family="Arial" font-size="11">D9</text>
  <line x1="680" y1="186" x2="700" y2="186" stroke="#1976d2" stroke-width="2.5"/>

  <line x1="92" y1="182" x2="650" y2="242" stroke="#e53935" stroke-width="2.5"/><text x="250" y="176" font-family="Arial" font-size="11">5V to button leg 1</text>
  <line x1="92" y1="152" x2="650" y2="242" stroke="#fb8c00" stroke-width="2.5"/><text x="250" y="154" font-family="Arial" font-size="11">D2 to button leg 2</text>
  <line x1="770" y1="242" x2="610" y2="254" stroke="#fb8c00" stroke-width="2.5"/>
  <line x1="680" y1="254" x2="680" y2="336" stroke="#424242" stroke-width="2.5"/>

  <line x1="92" y1="212" x2="710" y2="160" stroke="#424242" stroke-width="2.5"/>
  <line x1="92" y1="212" x2="710" y2="196" stroke="#424242" stroke-width="2.5"/>
  <line x1="92" y1="212" x2="930" y2="336" stroke="#424242" stroke-width="2"/>
  <text x="300" y="364" font-family="Arial" font-size="12">Gray lines = GND return paths</text>
</svg>`,
        buildSteps: [
          "Assemble circuit exactly as listed in wiring diagram.",
          "Open Arduino IDE, select board and COM port.",
          "Upload the provided sketch.",
          "Press the button in the right sequence to trigger green LED and reveal clue."],
        arduinoCode: `const int redLed = 8;
const int greenLed = 9;
const int buttonPin = 2;
int presses = 0;
unsigned long lastPress = 0;

void setup() {
  pinMode(redLed, OUTPUT);
  pinMode(greenLed, OUTPUT);
  pinMode(buttonPin, INPUT);
  digitalWrite(redLed, HIGH);
}

void loop() {
  int state = digitalRead(buttonPin);
  if (state == HIGH && millis() - lastPress > 300) {
    lastPress = millis();
    presses++;
  }

  if (presses >= 3) {
    digitalWrite(redLed, LOW);
    digitalWrite(greenLed, HIGH);
  }
}`,
      },
    },
    {
      id: "pz_electronic_2",
      category: "electronic",
      themeTags: ["generic", "modern-electronics"],
      title: "Code Pulse",
      objective: "Send pulse pattern to reveal code.",
      howItWorks:
        "The Arduino emits timed buzzer and LED pulses representing a code pattern. Players observe short and long pulses, decode them, and convert the pattern into the answer.",
      referenceLinks: [
        {
          title: "Arduino tone() reference",
          url: "https://www.arduino.cc/reference/en/language/functions/advanced-io/tone/",
        }],
      solveSteps: ["Connect buzzer", "Upload pulse routine"],
      difficulty: "medium",
      electronicDetails: {
        parts: [
          "Arduino Uno (or compatible)",
          "Passive buzzer",
          "1x LED",
          "1x 220 ohm resistor",
          "Breadboard",
          "Jumper wires",
          "USB cable"],
        wiringDiagram: [
          "D6 -> buzzer positive",
          "Buzzer negative -> GND",
          "D10 -> 220 ohm resistor -> LED anode",
          "LED cathode -> GND",
          "Arduino GND -> breadboard ground rail"],
        wiringDiagramSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="340" viewBox="0 0 900 340">
  <rect x="20" y="20" width="220" height="280" fill="#f4f6f8" stroke="#333" />
  <text x="130" y="50" text-anchor="middle" font-family="Arial" font-size="18">Arduino Uno</text>
  <text x="40" y="95" font-family="Arial" font-size="14">D6</text>
  <text x="40" y="125" font-family="Arial" font-size="14">D10</text>
  <text x="40" y="155" font-family="Arial" font-size="14">GND</text>
  <rect x="300" y="20" width="560" height="280" fill="#fff" stroke="#333" />
  <text x="580" y="50" text-anchor="middle" font-family="Arial" font-size="18">Breadboard (hole grid)</text>
  <g fill="#bbb">
    <circle cx="350" cy="110" r="2"/><circle cx="370" cy="110" r="2"/><circle cx="390" cy="110" r="2"/><circle cx="410" cy="110" r="2"/><circle cx="430" cy="110" r="2"/>
    <circle cx="350" cy="130" r="2"/><circle cx="370" cy="130" r="2"/><circle cx="390" cy="130" r="2"/><circle cx="410" cy="130" r="2"/><circle cx="430" cy="130" r="2"/>
  </g>
  <circle cx="430" cy="90" r="16" fill="#ffca28" stroke="#333"/><text x="460" y="95" font-family="Arial" font-size="13">Passive Buzzer</text>
  <circle cx="430" cy="130" r="12" fill="#2e7d32"/><text x="460" y="135" font-family="Arial" font-size="13">LED</text>
  <line x1="80" y1="91" x2="300" y2="91" stroke="#1976d2" stroke-width="3"/>
  <line x1="300" y1="91" x2="414" y2="91" stroke="#1976d2" stroke-width="3"/>
  <line x1="80" y1="121" x2="300" y2="121" stroke="#ef6c00" stroke-width="3"/>
  <line x1="300" y1="121" x2="418" y2="121" stroke="#ef6c00" stroke-width="3"/>
  <line x1="80" y1="151" x2="300" y2="151" stroke="#424242" stroke-width="3"/>
  <line x1="300" y1="151" x2="430" y2="151" stroke="#424242" stroke-width="3"/>
  <text x="620" y="250" font-family="Arial" font-size="13">D6 -> buzzer, D10 -> LED via 220R, GND common</text>
</svg>`,
        buildSteps: [
          "Wire buzzer and LED according to diagram.",
          "Upload sketch to board.",
          "Observe pulse sequence and decode long/short pattern as clue digits."],
        arduinoCode: `const int buzzerPin = 6;
const int ledPin = 10;
const int codePattern[] = {200, 200, 600, 200, 600};

void setup() {
  pinMode(ledPin, OUTPUT);
}

void loop() {
  for (int i = 0; i < 5; i++) {
    tone(buzzerPin, 1200);
    digitalWrite(ledPin, HIGH);
    delay(codePattern[i]);
    noTone(buzzerPin);
    digitalWrite(ledPin, LOW);
    delay(250);
  }
  delay(2000);
}`,
      },
    },
    {
      id: "pz_electronic_4",
      category: "electronic",
      themeTags: ["generic", "modern-electronics"],
      title: "Capacitive Touch Sequence",
      objective: "Touch sensor pads in the correct order to reveal a clue.",
      howItWorks:
        "Players discover an ordered hint and trigger capacitive pads accordingly. The Arduino validates sequence timing and activates an output when correct.",
      referenceLinks: [
      ],
      solveSteps: ["Wire touch pads", "Upload sketch", "Enter discovered sequence"],
      difficulty: "medium",
      electronicDetails: {
        parts: [
          "Arduino Uno (or compatible)",
          "MPR121 touch sensor module (or equivalent)",
          "3 conductive touch pads",
          "Breadboard",
          "Jumper wires",
          "USB cable"],
        wiringDiagram: [
          "MPR121 SDA/SCL -> Arduino SDA/SCL",
          "MPR121 VCC -> 5V, GND -> GND",
          "Pad outputs -> MPR121 electrode pins",
          "D9 -> status LED (optional) through 220 ohm resistor"],
        wiringDiagramSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="260" viewBox="0 0 760 260"><rect x="20" y="20" width="180" height="220" fill="#f4f6f8" stroke="#333"/><text x="110" y="45" text-anchor="middle" font-family="Arial" font-size="15">Arduino</text><rect x="250" y="30" width="220" height="100" fill="#fff" stroke="#333"/><text x="360" y="55" text-anchor="middle" font-family="Arial" font-size="14">MPR121</text><circle cx="560" cy="70" r="14" fill="#ddd" stroke="#333"/><circle cx="610" cy="70" r="14" fill="#ddd" stroke="#333"/><circle cx="660" cy="70" r="14" fill="#ddd" stroke="#333"/><text x="610" y="110" text-anchor="middle" font-family="Arial" font-size="12">Touch Pads</text><line x1="80" y1="90" x2="250" y2="70" stroke="#1976d2" stroke-width="2.5"/><line x1="80" y1="120" x2="250" y2="90" stroke="#1976d2" stroke-width="2.5"/><line x1="80" y1="150" x2="250" y2="110" stroke="#e53935" stroke-width="2.5"/><line x1="80" y1="180" x2="250" y2="120" stroke="#424242" stroke-width="2.5"/><line x1="470" y1="70" x2="546" y2="70" stroke="#fb8c00" stroke-width="2.5"/><line x1="470" y1="85" x2="596" y2="70" stroke="#fb8c00" stroke-width="2.5"/><line x1="470" y1="100" x2="646" y2="70" stroke="#fb8c00" stroke-width="2.5"/></svg>`,
        buildSteps: [
          "Wire MPR121 module and pads.",
          "Upload sequence-validation sketch.",
          "Test each pad, then validate full sequence."],
        arduinoCode: `// Pseudo sketch outline for MPR121 sequence validation
int seq[4] = {0,2,1,2};
int pos = 0;
void onPadTouch(int pad){
  if(pad == seq[pos]) pos++;
  else pos = 0;
  if(pos == 4){ /* unlock output */ }
}`,
      },
    },
    {
      id: "pz_electronic_5",
      category: "electronic",
      themeTags: ["generic", "modern-electronics"],
      title: "RFID Access Chain",
      objective: "Scan RFID tags in the right order to unlock the next clue.",
      howItWorks:
        "Players find tagged props and infer a sequence rule. The Arduino checks scan order and triggers unlock feedback when valid.",
      referenceLinks: [
      ],
      solveSteps: ["Wire RFID reader", "Register tag IDs", "Scan in required order"],
      difficulty: "medium",
      electronicDetails: {
        parts: [
          "Arduino Uno (or compatible)",
          "MFRC522 RFID module",
          "3 RFID tags/cards",
          "Breadboard",
          "Jumper wires",
          "USB cable"],
        wiringDiagram: ["SPI pins to RFID module", "5V/GND power rails", "D9 output LED via 220 ohm resistor"],
        wiringDiagramSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="260" viewBox="0 0 760 260"><rect x="20" y="20" width="180" height="220" fill="#f4f6f8" stroke="#333"/><text x="110" y="45" text-anchor="middle" font-family="Arial" font-size="15">Arduino</text><rect x="260" y="40" width="180" height="120" fill="#fff" stroke="#333"/><text x="350" y="68" text-anchor="middle" font-family="Arial" font-size="14">MFRC522 RFID</text><rect x="520" y="45" width="70" height="40" fill="#eee" stroke="#333"/><rect x="600" y="45" width="70" height="40" fill="#eee" stroke="#333"/><rect x="560" y="95" width="70" height="40" fill="#eee" stroke="#333"/><text x="600" y="155" text-anchor="middle" font-family="Arial" font-size="12">RFID tags</text><line x1="90" y1="90" x2="260" y2="80" stroke="#1976d2" stroke-width="2.5"/><line x1="90" y1="110" x2="260" y2="95" stroke="#1976d2" stroke-width="2.5"/><line x1="90" y1="130" x2="260" y2="110" stroke="#1976d2" stroke-width="2.5"/><line x1="90" y1="150" x2="260" y2="125" stroke="#1976d2" stroke-width="2.5"/></svg>`,
        buildSteps: ["Wire RFID reader over SPI.", "Upload sketch and register tags.", "Validate unlock sequence."],
        arduinoCode: `// Pseudo RFID order check
String needed[3]={"TAG1","TAG3","TAG2"}; int pos=0;
void onTag(String id){ if(id==needed[pos]) pos++; else pos=0; if(pos==3){ /* unlock */ } }`,
      },
    },
    {
      id: "pz_electronic_6",
      category: "electronic",
      themeTags: ["generic", "modern-electronics"],
      title: "Laser Trip Alignment",
      objective: "Align mirrors/sensors to complete all beam paths.",
      howItWorks:
        "Players redirect low-power laser lines into photo sensors. When all channels are aligned simultaneously, the controller triggers the success signal.",
      referenceLinks: [
      ],
      solveSteps: ["Mount emitter/sensors", "Align beams", "Hold all channels stable"],
      difficulty: "hard",
      electronicDetails: {
        parts: [
          "Arduino Uno (or compatible)",
          "3x photoresistors or photodiodes",
          "Low-power laser modules",
          "3x 10k resistors",
          "Breadboard and jumpers"],
        wiringDiagram: ["Photo sensors to analog pins with divider resistors", "Laser modules to power rails", "D10 status output"],
        wiringDiagramSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="260" viewBox="0 0 760 260"><rect x="20" y="20" width="180" height="220" fill="#f4f6f8" stroke="#333"/><text x="110" y="45" text-anchor="middle" font-family="Arial" font-size="15">Arduino</text><circle cx="330" cy="80" r="10" fill="#ff5252"/><circle cx="330" cy="120" r="10" fill="#ff5252"/><circle cx="330" cy="160" r="10" fill="#ff5252"/><rect x="460" y="60" width="20" height="20" fill="#ddd" stroke="#333"/><rect x="460" y="100" width="20" height="20" fill="#ddd" stroke="#333"/><rect x="460" y="140" width="20" height="20" fill="#ddd" stroke="#333"/><line x1="340" y1="80" x2="460" y2="70" stroke="#f44336" stroke-width="2"/><line x1="340" y1="120" x2="460" y2="110" stroke="#f44336" stroke-width="2"/><line x1="340" y1="160" x2="460" y2="150" stroke="#f44336" stroke-width="2"/></svg>`,
        buildSteps: ["Wire analog sensor channels.", "Mount lasers and sensor targets.", "Tune threshold values in sketch."],
        arduinoCode: `// Pseudo alignment check
if(a0>t && a1>t && a2>t){ /* unlock */ }`,
      },
    },
    {
      id: "pz_electronic_3_old_west",
      category: "electronic",
      themeTags: ["old-west", "signal"],
      title: "Telegraph Relay Key",
      objective: "Send the correct telegraph pulse sequence to unlock the marshal's safe clue.",
      howItWorks:
        "Players use a telegraph-style key connected to an Arduino input. Entering the right pulse rhythm simulates a period-correct telegraph code and triggers the unlock signal.",
      referenceLinks: [
      ],
      solveSteps: ["Connect telegraph key switch", "Input pulse sequence", "Read unlocked clue"],
      difficulty: "medium",
      electronicDetails: {
        parts: [
          "Arduino Uno (or compatible)",
          "Momentary push switch (telegraph key style)",
          "Breadboard",
          "1x LED",
          "1x 220 ohm resistor",
          "1x 10k ohm resistor",
          "Jumper wires",
          "USB cable"],
        wiringDiagram: [
          "D2 -> telegraph key output with 10k pulldown to GND",
          "5V -> telegraph key input",
          "D9 -> 220 ohm resistor -> LED anode",
          "LED cathode -> GND"],
        wiringDiagramSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="860" height="300" viewBox="0 0 860 300"><rect x="20" y="20" width="220" height="240" fill="#f4f6f8" stroke="#333"/><text x="130" y="46" text-anchor="middle" font-family="Arial" font-size="16">Arduino Uno</text><text x="40" y="90" font-family="Arial" font-size="13">D2</text><text x="40" y="120" font-family="Arial" font-size="13">D9</text><text x="40" y="150" font-family="Arial" font-size="13">5V</text><text x="40" y="180" font-family="Arial" font-size="13">GND</text><rect x="290" y="20" width="550" height="240" fill="#fff" stroke="#333"/><text x="565" y="46" text-anchor="middle" font-family="Arial" font-size="16">Telegraph Key Circuit</text><rect x="540" y="95" width="120" height="28" fill="#ddd" stroke="#333"/><text x="670" y="114" font-family="Arial" font-size="12">Telegraph Key</text><circle cx="500" cy="150" r="10" fill="#2e7d32"/><text x="516" y="154" font-family="Arial" font-size="12">LED</text><polyline points="460,150 472,144 484,156 496,144 508,156 520,150" fill="none" stroke="#8d6e63" stroke-width="2"/><text x="524" y="154" font-family="Arial" font-size="11">220R</text><polyline points="460,205 472,199 484,211 496,199 508,211 520,205" fill="none" stroke="#8d6e63" stroke-width="2"/><text x="524" y="209" font-family="Arial" font-size="11">10k</text><line x1="80" y1="86" x2="540" y2="109" stroke="#fb8c00" stroke-width="2.5"/><line x1="80" y1="146" x2="540" y2="109" stroke="#e53935" stroke-width="2.5"/><line x1="660" y1="109" x2="460" y2="205" stroke="#fb8c00" stroke-width="2.5"/><line x1="520" y1="205" x2="760" y2="220" stroke="#424242" stroke-width="2.5"/><line x1="80" y1="176" x2="760" y2="220" stroke="#424242" stroke-width="2.5"/><line x1="80" y1="116" x2="460" y2="150" stroke="#1976d2" stroke-width="2.5"/></svg>`,
        buildSteps: [
          "Wire telegraph key and LED as shown.",
          "Upload sketch and open serial monitor.",
          "Tap the key in the correct pattern to complete puzzle."],
        arduinoCode: `const int keyPin = 2;
const int ledPin = 9;
int count = 0;
unsigned long lastTap = 0;
void setup(){pinMode(keyPin,INPUT);pinMode(ledPin,OUTPUT);}
void loop(){
  if(digitalRead(keyPin)==HIGH && millis()-lastTap>180){lastTap=millis();count++;}
  if(count>=5){digitalWrite(ledPin,HIGH);}
}`,
      },
    }],
};

const fillThemeTemplate = (tpl: string, name: string, noun: string, adj: string): string =>
  tpl.replace(/\{name\}/g, name).replace(/\{noun\}/g, noun).replace(/\{adj\}/g, adj.toLowerCase());

const generatedCoreStories = [
  "Inside {name}, the {noun} was sealed after a courier’s spine label stopped matching the manifest: the crate arrived heavier than it departed. Your team is the quiet investigation—rebuild the chain of custody from scuff maps, temperature rings on the floor, and a second keypad code that only appears when two people hold opposite corners of the room.",
  "{name} still carries the {adj} {noun} rumor: a patron recorded a rehearsal that never happened, yet the audio metadata lists your building’s address. Players determine which wall panel was swapped overnight, who signed the fake work order, and what object was smuggled out disguised as a lighting gel crate.",
  "The city mothballed {name} when the {noun} telemetry spiked without any power draw; maintenance insists the breakers were pulled. You are the crew proving whether the anomaly is a hoax, a forgotten battery bank under the floor, or a deliberate blind written into the safety log to cover an off-books export lane.",
  "At {name}, an archivist found {adj} {noun} blueprints folded inside a hymnal—every dimension disagrees with the room you are standing in. Players reconcile the mismatch to expose a hidden chase between two walls where someone cached ledgers, then re-tiled the corridor so the seam reads innocent under casual light.",
  "{name} reopened for one night as a fundraiser until a volunteer collapsed beside the {noun}; the coroner’s draft mentions fibers that do not exist in inventory. Your group retraces that volunteer’s path through props that were touched out of order, proving which station was tampered with and which clue was planted to misdirect the crowd.",
  "Insurance photographs of {name} show a {noun} fixture that was removed years ago, yet the mounting scars in your space are fresh. Players decide whether the photos were altered, the fixture was reinstalled illegally, or a duplicate room was photographed—each option implies a different culprit and a different final key.",
  "A whistleblower mailed fragments to {name}’s mailbox: torn {adj} {noun} receipts that reference a shift nobody scheduled. Your team stitches the night together from overlapping witness notes, inconsistent clock stamps, and a mechanical tell that only triggers when the room’s humidity crosses a threshold the HVAC was never supposed to hit.",
  "The last manager of {name} left a voicemail claiming the {noun} “learned” a melody that unlocks the office; the recording degrades into street noise after eight seconds. Players recover the lost bars from physical residue—chalk pressure, hinge wear, and a relay that only closes when three separate props are aligned the way the melody implies.",
];

const firstSentenceForTldr = (body: string): string => {
  const trimmed = body.trim();
  const match = trimmed.match(/^[\s\S]*?[.!?](?=\s|$)/);
  const sentence = match ? match[0].trim() : trimmed.slice(0, 170);
  return sentence.length > 168 ? `${sentence.slice(0, 165)}…` : sentence;
};

const collapseWs = (s: string): string => s.replace(/\s+/g, " ").trim();

const normalizeThemeTitleKey = (name: string): string => collapseWs(name).toLowerCase();

const THEME_COPY_QA_HEADING = "## Copy QA (Host Read-Through)";

/** Procedural / combinator themes (not hand-authored catalog cards like th_1). */
const isProceduralThemeId = (id: string): boolean =>
  /^th_global_generated_\d+$/.test(id) || /^th_generated_.+_\d+$/.test(id);

const hasUnfilledTemplateTokens = (s: string): boolean => /\{[a-zA-Z][a-zA-Z0-9_]*\}/.test(s);

const extractStorylinePlain = (description: string): string | null => {
  const m = description.match(/^##\s*Storyline\s*\n+([\s\S]*?)(?=\n##\s|$)/im);
  if (!m?.[1]) return null;
  return collapseWs(m[1].replace(/\*\*/g, "").replace(/`/g, ""));
};

const missingThemeStructureHeadings = (description: string): string[] => {
  const need = [
    "## Storyline",
    "## Puzzle Loadout",
    "## Props & Set Dressing",
    "## Setting & Era",
    "## Run Twist",
    "## Studio Build Policy",
  ];
  return need.filter((h) => !description.includes(h));
};

/** Prefer a complete sentence that names the room and lands between ~48–220 characters for readable cards. */
const pickBestTldrFromStoryline = (storylinePlain: string, themeName: string): string => {
  const plain = collapseWs(storylinePlain);
  if (!plain) return collapseWs(themeName);
  const sentences = plain
    .split(/(?<=[.!?])\s+/)
    .map((s) => collapseWs(s))
    .filter(Boolean);
  const parts = sentences.length ? sentences : [plain];
  const nw = themeName.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const lastN = nw[nw.length - 1] ?? "";
  const firstN = nw[0] ?? "";
  const scoreSentence = (s: string): number => {
    const low = s.toLowerCase();
    let sc = 0;
    if (s.length >= 48 && s.length <= 220) sc += 4;
    else if (s.length >= 32 && s.length <= 280) sc += 2;
    else if (s.length < 28) sc -= 5;
    else sc += 1;
    if (lastN && low.includes(lastN)) sc += 3;
    if (firstN && firstN !== lastN && low.includes(firstN)) sc += 1;
    if (/[.!?…]$/.test(s)) sc += 1;
    if (/\b(your team|your crew|you must|players must|the group)\b/i.test(s)) sc += 2;
    if (hasUnfilledTemplateTokens(s)) sc -= 10;
    return sc;
  };
  const seed = parts[0]!;
  let best = parts.reduce((a, b) => (scoreSentence(b) > scoreSentence(a) ? b : a), seed);
  if (best.length > 270) best = `${best.slice(0, 267)}…`;
  if (best && !/[.!?…]$/.test(best)) best = `${best}.`;
  if (best.length < 36) best = firstSentenceForTldr(plain);
  return best.length > 320 ? `${best.slice(0, 317)}…` : best;
};

const novelEditorTldrTouches = (raw: string): string => {
  let t = collapseWs(raw);
  if (!t) return t;
  t = t.replace(/\s+([—–])\s+/g, " $1 ");
  if (!/[.!?…]$/.test(t)) t = `${t}.`;
  return t.length > 320 ? `${t.slice(0, 317)}…` : t;
};

const polishThemeTldrStemAndTail = (fullTldr: string): string => {
  const invMarker = "Uses your listed props";
  const invIdx = fullTldr.toLowerCase().indexOf(invMarker.toLowerCase());
  const stem = invIdx >= 0 ? fullTldr.slice(0, invIdx).trim() : fullTldr;
  const invTail = invIdx >= 0 ? fullTldr.slice(invIdx).trim() : "";
  const polishedStem = novelEditorTldrTouches(stem);
  return invTail ? `${polishedStem} ${invTail}`.replace(/\s+/g, " ").trim().slice(0, 320) : polishedStem;
};

const applyThemeNarrativeQualityPass = (theme: Theme): Theme => {
  const invMarker = "Uses your listed props";
  const invIdx = theme.tldr.toLowerCase().indexOf(invMarker.toLowerCase());
  const stem = invIdx >= 0 ? theme.tldr.slice(0, invIdx).trim() : theme.tldr;
  const invTail = invIdx >= 0 ? theme.tldr.slice(invIdx).trim() : "";
  if (!isProceduralThemeId(theme.id)) {
    return { ...theme, tldr: polishThemeTldrStemAndTail(theme.tldr) };
  }
  const { description, name } = theme;
  const storyline = extractStorylinePlain(description);
  const rebuiltStem =
    storyline && storyline.length >= 24 ? pickBestTldrFromStoryline(storyline, name) : stem;
  let nextTldr =
    invTail.length > 0 ? `${rebuiltStem} ${invTail}`.replace(/\s+/g, " ").trim().slice(0, 320) : rebuiltStem;
  if (nextTldr.length < 30 && stem.length >= 30) {
    nextTldr =
      invTail.length > 0 ? `${stem} ${invTail}`.replace(/\s+/g, " ").trim().slice(0, 320) : stem;
  }

  const autoNotes: string[] = [];
  if (!storyline || storyline.length < 40) {
    autoNotes.push(
      "Storyline read short after assembly—rewrite the opening hook in your own words before you market this room.",
    );
  }
  if (hasUnfilledTemplateTokens(description) || hasUnfilledTemplateTokens(nextTldr)) {
    autoNotes.push("Literal `{placeholder}` text detected—search the brief and replace with venue-specific wording.");
  }
  const missing = missingThemeStructureHeadings(description);
  if (missing.length > 0) {
    autoNotes.push(`Expected brief sections not found (${missing.join("; ")})—treat export as draft until fixed.`);
  }
  if (hasUnfilledTemplateTokens(stem) && !hasUnfilledTemplateTokens(rebuiltStem)) {
    autoNotes.push("TL;DR was rebuilt from the Storyline to remove template leaks or awkward clipping.");
  }

  let nextDescription = description;
  const hasCopyQa = nextDescription.includes(THEME_COPY_QA_HEADING) || /\n##\s*Copy QA\b/i.test(nextDescription);
  if (!hasCopyQa) {
    const bullets = [
      "**TL;DR vs Storyline:** Read both out loud; guests should hear the same premise and stakes. If the TL;DR sounds like a random fragment, rewrite it in one clear host sentence.",
      "**Tone & safety:** Check **Setting & Era** and **Run Twist** against your real audience (ages, jump scares, accessibility, fire code, and staffing).",
      "**Inventory ties:** If **Your Available Items** is present, delete anything you will not place in-room, and confirm weight and safety for every prop you keep.",
      "**Electronics claims:** If the brief implies Arduino or mains-powered gags, budget build plus **QA** time; do not promise beats you cannot reset in your posted turnover window.",
      "**Venue truth:** Replace film logic with steps that match your floor plan, ceiling height, exits, and neighbor noise rules.",
    ];
    if (autoNotes.length > 0) {
      bullets.push("", "**Generator auto-checks:**", ...autoNotes.map((n) => `- ${n}`));
    }
    nextDescription = `${nextDescription}\n\n${THEME_COPY_QA_HEADING}\n\n${bullets.join("\n")}`;
  }

  return { ...theme, description: nextDescription, tldr: polishThemeTldrStemAndTail(nextTldr) };
};

const themeNounKeyFromName = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return parts[parts.length - 1].toLowerCase();
  return collapseWs(name).toLowerCase() || "theme";
};

/** Leading adjective / first meaningful token — skips articles so “The …” titles do not collapse together. */
const themeAdjKeyFromName = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const skipArticle = new Set(["the", "a", "an"]);
  let i = 0;
  while (i < parts.length && skipArticle.has(parts[i]!.toLowerCase())) i += 1;
  const token = parts[i] ?? parts[0];
  return (token ? token.toLowerCase() : "theme") || "theme";
};

const themeEraSignature = (theme: Theme): string => {
  const m = theme.description.match(/##\s*Setting\s*&\s*era\s*\n+([\s\S]*?)(?=\n##|\n\n##|$)/i);
  const firstLine = (m?.[1] ?? "").trim().split("\n")[0] ?? "";
  return collapseWs(firstLine).slice(0, 72).toLowerCase();
};

const themeTldrStemKey = (t: Theme): string => collapseWs(t.tldr ?? "").slice(0, 56).toLowerCase();

const batchThemesArePairwiseDistinct = (themes: Theme[]): boolean => {
  const nouns = themes.map((t) => themeNounKeyFromName(t.name));
  const eras = themes.map((t) => themeEraSignature(t));
  const adjs = themes.map((t) => themeAdjKeyFromName(t.name));
  const tldrs = themes.map((t) => themeTldrStemKey(t));
  return (
    new Set(nouns).size === themes.length &&
    new Set(eras).size === themes.length &&
    new Set(adjs).size === themes.length &&
    new Set(tldrs).size === themes.length
  );
};

type GeneratedSlot = {
  noun: string;
  adj: string;
  eraLine: string;
  eraSig: string;
  storyIdx: number;
  twistIdx: number;
  leanIdx: number;
  propIdx: number;
};

const createGeneratedThemeFromSlot = (prefix: string, slot: GeneratedSlot): Theme => {
  globalGeneratedThemeCount += 1;
  const idx = globalGeneratedThemeCount;
  const name = `${slot.adj} ${slot.noun}`;
  const storyline = fillThemeTemplate(generatedCoreStories[slot.storyIdx], name, slot.noun, slot.adj);
  const tldr = pickBestTldrFromStoryline(storyline, name);
  const twist = generatedThemeTwists[slot.twistIdx];
  const puzzleLean = generatedThemePuzzleLeans[slot.leanIdx];
  const props = generatedThemePropPalettes[slot.propIdx];
  const description = appendStudioBuildPolicyToDescription(
    [
      `## Storyline\n\n${storyline}`,
      `## Puzzle Loadout\n\nRuns ${puzzleLean}, staged so each solve reconfigures what players are allowed to touch or read next. Prefer **original** puzzle beats for this fiction—not generic internet templates.`,
      `## Props & Set Dressing\n\n${props}.`,
      `## Setting & Era\n\n${slot.eraLine}`,
      `## Run Twist\n\n${twist}`,
    ].join("\n\n"),
  );
  return {
    id: `${prefix}_${idx}`,
    name,
    tldr,
    description,
  };
};

const buildSlotsForGeneratedCount = (
  count: number,
  usedNouns: Set<string>,
  usedEraSigs: Set<string>,
): GeneratedSlot[] => {
  const nounPick = shuffle(generatedThemeNouns.filter((n) => !usedNouns.has(n.toLowerCase())));
  const eraEntries = shuffle(
    generatedThemeEras
      .map((eraLine) => ({ eraLine, eraSig: collapseWs(eraLine).slice(0, 72).toLowerCase() }))
      .filter((e) => !usedEraSigs.has(e.eraSig)),
  );
  const storyIdxs = shuffle(generatedCoreStories.map((_, i) => i));
  const twistIdxs = shuffle(generatedThemeTwists.map((_, i) => i));
  const leanIdxs = shuffle(generatedThemePuzzleLeans.map((_, i) => i));
  const propIdxs = shuffle(generatedThemePropPalettes.map((_, i) => i));
  const adjPick = shuffle([...generatedThemeAdjectives]);
  const slots: GeneratedSlot[] = [];
  for (let i = 0; i < count; i += 1) {
    const noun = nounPick[i % nounPick.length] ?? generatedThemeNouns[i % generatedThemeNouns.length];
    const eraEntry = eraEntries[i % eraEntries.length] ?? {
      eraLine: generatedThemeEras[i % generatedThemeEras.length],
      eraSig: collapseWs(generatedThemeEras[i % generatedThemeEras.length])
        .slice(0, 72)
        .toLowerCase(),
    };
    slots.push({
      noun,
      adj: adjPick[i % adjPick.length] ?? "Hidden",
      eraLine: eraEntry.eraLine,
      eraSig: eraEntry.eraSig,
      storyIdx: storyIdxs[i % storyIdxs.length] ?? 0,
      twistIdx: twistIdxs[i % twistIdxs.length] ?? 0,
      leanIdx: leanIdxs[i % leanIdxs.length] ?? 0,
      propIdx: propIdxs[i % propIdxs.length] ?? 0,
    });
  }
  return slots;
};

const buildGeneratedThemesDiverse = (
  count: number,
  prefix: string,
  usedNouns: Set<string>,
  usedEraSigs: Set<string>,
  reservedNames: Set<string>,
  forbiddenTitleKeysLower: Set<string>,
  usedAdjectivesSeed?: Set<string>,
): Theme[] => {
  if (count <= 0) return [];
  const slots = buildSlotsForGeneratedCount(count, usedNouns, usedEraSigs);
  const taken = new Set(reservedNames);
  const usedAdjectivesLower = new Set<string>(usedAdjectivesSeed ? [...usedAdjectivesSeed].map((a) => a.toLowerCase()) : []);
  const out: Theme[] = [];
  for (const slot of slots) {
    let placed = false;
    const tryOrder = shuffle([...generatedThemeAdjectives]);
    const preferFresh = tryOrder.filter((a) => !usedAdjectivesLower.has(a.toLowerCase()));
    const rest = tryOrder.filter((a) => usedAdjectivesLower.has(a.toLowerCase()));
    const ordered = [...preferFresh, ...rest];
    for (const adj of ordered) {
      const candidate = createGeneratedThemeFromSlot(prefix, { ...slot, adj });
      const titleKey = normalizeThemeTitleKey(candidate.name);
      if (
        taken.has(candidate.name) ||
        globallyReservedSavedThemeTitlesLower.has(candidate.name.trim().toLowerCase()) ||
        forbiddenTitleKeysLower.has(titleKey)
      ) {
        continue;
      }
      taken.add(candidate.name);
      usedAdjectivesLower.add(adj.toLowerCase());
      out.push(candidate);
      placed = true;
      break;
    }
    if (!placed) {
      let suffix = out.length + 1;
      let pushed = false;
      for (let guard = 0; guard < 48; guard += 1, suffix += 1) {
        const fallback = createGeneratedThemeFromSlot(prefix, { ...slot, adj: `Alt${suffix}` });
        const fk = normalizeThemeTitleKey(fallback.name);
        if (
          taken.has(fallback.name) ||
          globallyReservedSavedThemeTitlesLower.has(fallback.name.trim().toLowerCase()) ||
          forbiddenTitleKeysLower.has(fk)
        ) {
          continue;
        }
        taken.add(fallback.name);
        usedAdjectivesLower.add(`Alt${suffix}`.toLowerCase());
        out.push(fallback);
        pushed = true;
        break;
      }
      if (!pushed) {
        const emergency = createGeneratedThemeFromSlot(prefix, {
          ...slot,
          adj: `Alt${crypto.randomInt(10_000, 99_999)}`,
        });
        taken.add(emergency.name);
        out.push(emergency);
      }
    }
  }
  return out;
};

const pickGreedyDiverseFromPool = (pool: Theme[], max: number, excludeIds: Set<string>): Theme[] => {
  const shuffled = shuffle(pool.filter((t) => !excludeIds.has(t.id)));
  const picked: Theme[] = [];
  const usedN = new Set<string>();
  const usedE = new Set<string>();
  const usedA = new Set<string>();
  const usedTldr = new Set<string>();
  for (const t of shuffled) {
    if (picked.length >= max) break;
    const nk = themeNounKeyFromName(t.name);
    const ek = themeEraSignature(t);
    const ak = themeAdjKeyFromName(t.name);
    const tk = themeTldrStemKey(t);
    if (usedN.has(nk) || usedE.has(ek) || usedA.has(ak) || usedTldr.has(tk)) continue;
    usedN.add(nk);
    usedE.add(ek);
    usedA.add(ak);
    usedTldr.add(tk);
    picked.push(t);
  }
  return picked;
};

const assembleThreeDiverseThemes = (
  poolCandidates: Theme[],
  idPrefix: string,
  reservedNames: Set<string>,
  excludeIds: Set<string>,
  forbiddenTitleKeysLower: Set<string>,
): Theme[] => {
  const poolFiltered = poolCandidates.filter((t) => !forbiddenTitleKeysLower.has(normalizeThemeTitleKey(t.name)));
  for (let round = 0; round < 35; round += 1) {
    const pool = round === 0 ? [...poolFiltered] : shuffle([...poolFiltered]);
    const picked = pickGreedyDiverseFromPool(pool, 3, excludeIds);
    const need = 3 - picked.length;
    const usedN = new Set(picked.map((t) => themeNounKeyFromName(t.name)));
    const usedE = new Set(picked.map((t) => themeEraSignature(t)));
    const usedAdjSeed = new Set(picked.map((t) => themeAdjKeyFromName(t.name)));
    const nameReserve = new Set([...reservedNames, ...picked.map((p) => p.name)]);
    const generated =
      need > 0
        ? buildGeneratedThemesDiverse(need, idPrefix, usedN, usedE, nameReserve, forbiddenTitleKeysLower, usedAdjSeed)
        : [];
    const batch = [...picked, ...generated];
    if (batch.length === 3 && batchThemesArePairwiseDistinct(batch)) return batch;
  }
  const fallback = shuffle([...poolFiltered]).slice(0, 3);
  if (fallback.length === 3) return fallback;
  const need = 3 - fallback.length;
  const usedN = new Set(fallback.map((t) => themeNounKeyFromName(t.name)));
  const usedE = new Set(fallback.map((t) => themeEraSignature(t)));
  const usedAdjSeed = new Set(fallback.map((t) => themeAdjKeyFromName(t.name)));
  const gen = buildGeneratedThemesDiverse(
    need,
    idPrefix,
    usedN,
    usedE,
    new Set([...reservedNames, ...fallback.map((f) => f.name)]),
    forbiddenTitleKeysLower,
    usedAdjSeed,
  );
  return [...fallback, ...gen].slice(0, 3);
};

const normalizeRoomDifficulty = (value: unknown): "easy" | "medium" | "hard" => {
  const d = String(value ?? "medium").toLowerCase();
  if (d === "easy" || d === "medium" || d === "hard") return d;
  return "medium";
};

const difficultyRank = (d: Puzzle["difficulty"]): number => {
  if (d === "easy") return 0;
  if (d === "hard") return 2;
  return 1;
};

const difficultyDistance = (puzzleDiff: Puzzle["difficulty"], target: Puzzle["difficulty"]): number =>
  Math.abs(difficultyRank(puzzleDiff) - difficultyRank(target));

const parsePlanningBool = (value: unknown, fallback: boolean): boolean => {
  if (value === true || value === "true" || value === 1 || value === "1") return true;
  if (value === false || value === "false" || value === 0 || value === "0") return false;
  return fallback;
};

const parsePlanningNote = (value: unknown, maxLen: number): string => {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLen);
};

/** null = use server formula from duration and concurrent players. */
const parseOptionalMainTrackCountOverride = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(24, Math.max(1, Math.trunc(n)));
};

/** null = omit from explicit mix (auto balance). */
const parseOptionalMixInt = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(20, Math.trunc(n)));
};

const pickYouthPuzzle = (
  session: SessionState,
  theme: Theme | undefined,
  category: Puzzle["category"],
  generationSeenIds: Set<string>,
): Puzzle | null => {
  const compatible = puzzlePoolByCategory[category].filter(
    (puzzle) =>
      isPuzzleCompatibleWithTheme(puzzle, theme) &&
      !isSkipped("puzzle", puzzle.id) &&
      (puzzle.difficulty === "easy" || puzzle.difficulty === "medium"),
  );
  if (compatible.length === 0) return null;
  const scored = compatible
    .map((puzzle) => ({ puzzle, score: puzzle.difficulty === "easy" ? 0 : 1 }))
    .sort((a, b) => a.score - b.score || a.puzzle.id.localeCompare(b.puzzle.id));
  const ordered = scored.map((s) => s.puzzle);
  const unseen = ordered.find(
    (puzzle) => !session.seenPuzzleIds.has(puzzle.id) && !generationSeenIds.has(puzzle.id),
  );
  if (unseen) return unseen;
  return ordered.find((puzzle) => !generationSeenIds.has(puzzle.id)) ?? ordered[0] ?? null;
};

const cloneYouthAddOnPuzzle = (
  base: Puzzle,
  sessionId: string,
  index: number,
  themeName: string,
  gatesAdult: boolean,
  ageNote: string,
): Puzzle => ({
  ...base,
  id: `${base.id}_youth_${sessionId}_${index}`,
  audienceTrack: "youth_addon",
  gatesAdultProgression: gatesAdult,
  difficulty: base.difficulty === "hard" ? "medium" : base.difficulty,
  title: `[Junior add-on] ${base.title}`,
  objective: `Youth-friendly parallel track in the same “${themeName}” story (easy–medium only): ${base.objective}${
    gatesAdult
      ? " — this station’s outcome may be required for the adult crew’s next main-room step (relay / shared reveal)."
      : ""
  }${ageNote ? ` Host age note: ${ageNote}` : ""}`,
  howItWorks: `${base.howItWorks} Facilitation: shorter rules, one demo success, and immediate positive feedback for kids.`,
  themeFitReason: base.themeFitReason
    ? `${base.themeFitReason} Adapted as a junior-accessible add-on beat in the same fiction.`
    : `Parallel junior mission within ${themeName}, scoped to easy–medium interactions.`,
});

const augmentStoryPlanForYouthAddOn = (plan: StoryPlan, session: SessionState): StoryPlan => {
  if (!session.planningInput.youthAddOnEnabled) return plan;
  const age = session.planningInput.youthAddOnAgeNote?.trim();
  const ageLine = age ? ` Host-facing age note: ${age}.` : "";
  const gateLine = session.planningInput.youthAddOnGatesAdultFlow
    ? " The junior add-on includes at least one station whose result (code, token, or relay) may be required before the primary adult crew can advance a main-room beat."
    : " Junior add-on puzzles run in parallel and reinforce the same narrative without mandatory hard gates on the adults.";
  return {
    ...plan,
    situation: `${plan.situation} A companion side-space hosts a junior add-on track using only easy-to-medium puzzles tied to the same fiction.${ageLine}`,
    progressionRule: `${plan.progressionRule} ${gateLine}`,
  };
};

const pickRecommendedPuzzlesForTheme = (
  theme: Theme,
  roomDifficulty: unknown,
  excludePuzzleIds: Set<string>,
): RecommendedPuzzleBrief[] => {
  const target = normalizeRoomDifficulty(roomDifficulty);
  const picks: RecommendedPuzzleBrief[] = [];
  for (const cat of ["logic", "physical", "electronic"] as const) {
    const compatible = puzzlePoolByCategory[cat].filter(
      (puzzle) => isPuzzleCompatibleWithTheme(puzzle, theme) && !excludePuzzleIds.has(puzzle.id),
    );
    const scored = compatible
      .map((puzzle) => ({ puzzle, dist: difficultyDistance(puzzle.difficulty, target) }))
      .sort((a, b) => a.dist - b.dist || a.puzzle.id.localeCompare(b.puzzle.id));
    const chosen = scored[0]?.puzzle;
    if (chosen) {
      excludePuzzleIds.add(chosen.id);
      picks.push({
        id: chosen.id,
        title: chosen.title,
        category: chosen.category,
        objective: chosen.objective,
        howItWorks: chosen.howItWorks,
        difficulty: chosen.difficulty,
      });
    }
  }
  return picks;
};

/** One screen of themes: no puzzle brief is reused across cards; each theme still gets L/P/E when the pool allows. */
const enrichThemesWithRecommended = (themes: Theme[], session: SessionState): Theme[] => {
  const excludePuzzleIds = new Set<string>();
  return themes.map((theme) => ({
    ...theme,
    recommendedPuzzles: pickRecommendedPuzzlesForTheme(theme, session.planningInput.roomDifficulty, excludePuzzleIds),
  }));
};

const issueAuthForUser = async (user: StoredUser) => authTokenStore.issueTokenPair(user.id);

/** Linear scan — only called during token-based verify/resend flows, not hot paths. */
const findUserByVerificationToken = (token: string): StoredUser | undefined => {
  for (const u of usersByEmail.values()) {
    if (u.emailVerificationToken === token) return u;
  }
  return undefined;
};

/**
 * Send a verification email.
 * - Uses Resend REST API when RESEND_API_KEY is set.
 * - Otherwise logs the link to the console and (in non-Vercel environments) returns the URL
 *   so the caller can include it in the signup response for developer convenience.
 */
const sendVerificationEmail = async (
  toEmail: string,
  token: string,
  appBaseUrl: string
): Promise<{ devUrl?: string }> => {
  const verificationUrl = `${appBaseUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  const fromAddress = String(process.env.EMAIL_FROM ?? "Tipsy Fox Escapes <noreply@tipsyfoxescapes.com>").trim();
  const resendKey = String(process.env.RESEND_API_KEY ?? "").trim();
  const smtpUser = String(process.env.SMTP_USER ?? "").trim();
  const smtpPass = String(process.env.SMTP_PASS ?? "").trim();

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Verify your email</title></head>
<body style="font-family:sans-serif;background:#f9f6f1;margin:0;padding:24px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:10px;padding:32px;border:1px solid #e5d9c8">
    <h2 style="font-family:Georgia,serif;color:#c8694e;margin-top:0">Tipsy Fox Escapes</h2>
    <p style="color:#2c2515;font-size:15px;line-height:1.6">
      Thanks for signing up! Click the button below to verify your email address and activate your account.
    </p>
    <p style="text-align:center;margin:28px 0">
      <a href="${verificationUrl}"
         style="display:inline-block;background:#c8694e;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:15px;font-weight:600">
        Verify my email
      </a>
    </p>
    <p style="color:#7a6a55;font-size:13px">This link expires in 24 hours. If you didn't sign up, you can ignore this email.</p>
    <hr style="border:none;border-top:1px solid #e5d9c8;margin:20px 0">
    <p style="color:#aaa;font-size:11px">Can't click the button? Copy this link:<br>${verificationUrl}</p>
  </div>
</body>
</html>`;

  // Priority 1: Resend REST API
  if (resendKey) {
    try {
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({
          from: fromAddress,
          to: [toEmail],
          subject: "Verify your Tipsy Fox Escapes email",
          html,
        }),
      });
      if (!resp.ok) {
        const errText = await resp.text().catch(() => "(no body)");
        console.error(`[verify-email] Resend API error ${resp.status}: ${errText}`);
      }
    } catch (e) {
      console.error("[verify-email] Failed to call Resend API:", e);
    }
    return {};
  }

  // Priority 2: SMTP (Gmail App Password or any SMTP server)
  if (smtpUser && smtpPass) {
    try {
      const nodemailer = await import("nodemailer");
      const smtpHost = String(process.env.SMTP_HOST ?? "smtp.gmail.com").trim();
      const smtpPort = Number(process.env.SMTP_PORT ?? "587");
      const transporter = nodemailer.default.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });
      await transporter.sendMail({
        from: fromAddress,
        to: toEmail,
        subject: "Verify your Tipsy Fox Escapes email",
        html,
      });
      console.log(`[verify-email] ✉  Sent via SMTP to ${toEmail}`);
    } catch (e) {
      console.error("[verify-email] SMTP send failed:", e);
    }
    return {};
  }

  // Priority 3: No email service configured — log the link and surface it in dev
  console.log(`\n[verify-email] ✉  Verification link for ${toEmail}:\n  ${verificationUrl}\n`);
  const isVercel = Boolean(process.env.VERCEL);
  return isVercel ? {} : { devUrl: verificationUrl };
};

const createAuthTokenForUser = async (user: StoredUser): Promise<string> => {
  const issued = await issueAuthForUser(user);
  return issued.authToken;
};

const upsertSocialUser = (provider: StoredUser["provider"], email: string, name: string): StoredUser => {
  const normalizedEmail = email.trim().toLowerCase();
  const adminEmails = parseAdminEmails();
  let user = usersByEmail.get(normalizedEmail);
  if (!user) {
    const isAdmin = adminEmails.has(normalizedEmail);
    user = {
      id: `usr_${nextUserId++}`,
      name: name.trim(),
      email: normalizedEmail,
      username: deriveUsername(normalizedEmail, name),
      provider,
      isAdmin,
      role: isAdmin ? "admin" : "user",
      roomAllowance: FREE_TIER_ROOM_ALLOWANCE,
      exportCreditsRemaining: 0,
      createdAt: new Date().toISOString(),
    };
    usersByEmail.set(normalizedEmail, user);
    indexUserUsername(user, usersByUsername, normalizedEmail);
    void persistUsers();
  } else if (adminEmails.has(normalizedEmail)) {
    user.isAdmin = true;
    user.role = "admin";
    if (!user.username) {
      user.username = deriveUsername(normalizedEmail, user.name);
      indexUserUsername(user, usersByUsername, normalizedEmail);
    }
    void persistUsers();
  }
  return user;
};

/** Normalize returnTo for OAuth; only http(s) allowed (blocks javascript:, etc.). */
const safeOAuthReturnTo = (raw: string): URL => {
  const fallback = "http://localhost:5173/";
  const trimmed = String(raw ?? "").trim() || fallback;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") return new URL(fallback);
    return u;
  } catch {
    return new URL(fallback);
  }
};

const buildAuthSuccessRedirect = (
  returnTo: string,
  tokens: { authToken: string; refreshToken: string; accessExpiresAt: number },
  user: StoredUser,
): string => {
  const url = safeOAuthReturnTo(returnTo);
  url.searchParams.set("auth_token", tokens.authToken);
  url.searchParams.set("refresh_token", tokens.refreshToken);
  url.searchParams.set("access_expires_at", String(tokens.accessExpiresAt));
  url.searchParams.set("auth_user", encodeURIComponent(JSON.stringify(toPublicUser(user))));
  return url.toString();
};

const redirectOAuthStartFailure = (res: express.Response, returnToRaw: string, code: string, message: string): void => {
  const u = safeOAuthReturnTo(returnToRaw);
  u.searchParams.set("oauth_error", code);
  u.searchParams.set("oauth_message", message);
  res.redirect(302, u.toString());
};

const readAuthUserId = async (req: express.Request): Promise<string | undefined> =>
  resolveAuthUserId(req, authTokenStore);

const readAuthUserIdAsync = readAuthUserId;

const readAuthUser = async (req: express.Request): Promise<StoredUser | undefined> => {
  const id = await readAuthUserId(req);
  if (!id) return undefined;
  return getStoredUserById(id);
};

const readAuthUserAsync = async (req: express.Request): Promise<StoredUser | undefined> => {
  const id = await readAuthUserIdAsync(req);
  if (!id) return undefined;
  return getStoredUserById(id);
};

const claimSessionForAuth = async (
  sessionId: string | undefined,
  req: express.Request,
): Promise<StoredUser | undefined> => {
  if (!sessionId) return undefined;
  const user = await readAuthUser(req);
  if (user) sessionUserOwners.set(sessionId, user.id);
  const ownerId = sessionUserOwners.get(sessionId);
  return ownerId ? getStoredUserById(ownerId) : user;
};

const claimSessionForAuthAsync = async (
  sessionId: string | undefined,
  req: express.Request,
): Promise<StoredUser | undefined> => {
  if (!sessionId) return undefined;
  const user = await readAuthUserAsync(req);
  if (user) sessionUserOwners.set(sessionId, user.id);
  const ownerId = sessionUserOwners.get(sessionId);
  return ownerId ? getStoredUserById(ownerId) : user;
};

const puzzleMutationAccessError = (
  session: SessionState,
  user: StoredUser | undefined,
): { code: string; message: string } | null => {
  if (sessionHasFullPuzzleAccess(session.roomManifest)) return null;
  return generationAccessError(user);
};

/** Require a logged-in user who owns (or can claim) this planning session. */
const requireAuthedSessionOwnership = async (
  req: express.Request,
  res: express.Response,
  sessionId: string,
): Promise<SessionState | undefined> => {
  const userId = await requireAuthUserId(req, res, authTokenStore);
  if (!userId) return undefined;
  const session = resolvePlanningSession(sessionId);
  if (!session) {
    respondInvalidPlanningSession(res, sessionId);
    return undefined;
  }
  const ownerId = sessionUserOwners.get(sessionId);
  if (ownerId && ownerId !== userId) {
    res.status(403).json({
      error: {
        code: "FORBIDDEN",
        message: "This planning session belongs to another account.",
        details: [],
      },
    });
    return undefined;
  }
  if (!ownerId) sessionUserOwners.set(sessionId, userId);
  return session;
};

const persistSavedPlans = async (): Promise<void> => {
  const serialized = Array.from(savedPlansByUser.entries()).flatMap(([userId, plans]) =>
    plans.map((plan) => ({ ...plan, userId })),
  );
  await fs.mkdir(path.dirname(savedPlansPath), { recursive: true });
  await fs.writeFile(savedPlansPath, JSON.stringify(serialized, null, 2), "utf8");
};

const loadSavedPlans = async (): Promise<void> => {
  try {
    const raw = await fs.readFile(savedPlansPath, "utf8");
    const parsed = JSON.parse(raw) as SavedPlan[];
    savedPlansByUser.clear();
    for (const plan of parsed) {
      const list = savedPlansByUser.get(plan.userId) ?? [];
      list.push(plan);
      savedPlansByUser.set(plan.userId, list);
    }
    rebuildGlobalSavedAssetLocks();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      // eslint-disable-next-line no-console
      console.warn("Could not load saved plans:", error);
    }
  }
};

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/health", (_req, res) => {
  void import("./kvJsonStore.js").then(({ isKvConfigured }) => {
    res.json({
      ok: true,
      service: "escape-room-builder",
      authStore: process.env.VERCEL ? (isKvConfigured() ? "kv" : "ephemeral") : "local",
    });
  });
});

app.get("/api/config", (_req, res) => {
  const apiKey = String(process.env.OPENAI_API_KEY ?? "").trim();
  const isAiEnabled = apiKey.length > 10 && apiKey.startsWith("sk-");
  res.json({ isAiEnabled });
});

app.get("/version", (_req, res) => {
  const readVersion = (): string => {
    const bundled = path.join(__dirname, "..", "..", "api", "app-version.json");
    try {
      const data = JSON.parse(readFileSync(bundled, "utf8")) as { version?: string };
      if (typeof data.version === "string" && data.version.trim()) return data.version.trim();
    } catch {
      /* fall through */
    }
    try {
      const pkg = JSON.parse(
        readFileSync(path.join(__dirname, "..", "..", "frontend", "package.json"), "utf8"),
      ) as { version?: string };
      return typeof pkg.version === "string" ? pkg.version : "0.0.0";
    } catch {
      return "0.0.0";
    }
  };
  res.setHeader("Cache-Control", "public, max-age=60");
  res.json({ version: readVersion(), build: "local" });
});

app.get("/webhook", (req, res) => {
  handleFacebookWebhookVerify(req, res);
});

app.get("/api/webhooks/facebook", (req, res) => {
  handleFacebookWebhookVerify(req, res);
});

app.post("/api/auth/signup", async (req, res) => {
  const { name, email, password, acceptedTerms, username: usernameRaw } = req.body ?? {};
  if (!name || !email || !password) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "name, email, and password are required.", details: [] },
    });
    return;
  }
  const pwStr = String(password);
  if (
    pwStr.length < 8 ||
    !/[A-Z]/.test(pwStr) ||
    !/[0-9!@#$%^&*()\-_=+[\]{};':",.<>/?\\|`~]/.test(pwStr)
  ) {
    res.status(400).json({
      error: {
        code: "WEAK_PASSWORD",
        message: "Password must be at least 8 characters and include one uppercase letter and one number or special character.",
        details: [],
      },
    });
    return;
  }
  if (acceptedTerms !== true && acceptedTerms !== "true" && acceptedTerms !== 1 && acceptedTerms !== "1") {
    res.status(400).json({
      error: {
        code: "TERMS_REQUIRED",
        message: "You must accept the Terms of Service to create an account.",
        details: [],
      },
    });
    return;
  }
  const normalizedEmail = normalizeEmail(email);
  if (usersByEmail.has(normalizedEmail)) {
    res.status(409).json({
      error: { code: "EMAIL_EXISTS", message: "An account with this email already exists.", details: [] },
    });
    return;
  }
  const adminEmails = parseAdminEmails();
  const username = normalizeUsername(usernameRaw) || deriveUsername(normalizedEmail, String(name));
  if (usersByUsername.has(username)) {
    res.status(409).json({
      error: { code: "USERNAME_EXISTS", message: "That username is already taken.", details: [] },
    });
    return;
  }
  const isAdmin = adminEmails.has(normalizedEmail);
  const verificationToken = crypto.randomUUID();
  const now = new Date().toISOString();
  const user: StoredUser = {
    id: `usr_${nextUserId++}`,
    name: String(name).trim(),
    email: normalizedEmail,
    username,
    provider: "local",
    password: String(password),
    isAdmin,
    role: isAdmin ? "admin" : "user",
    roomAllowance: FREE_TIER_ROOM_ALLOWANCE,
    exportCreditsRemaining: 0,
    createdAt: now,
    // Admins are auto-verified; everyone else must click the link.
    emailVerified: isAdmin ? true : false,
    emailVerificationToken: isAdmin ? undefined : verificationToken,
    emailVerificationSentAt: isAdmin ? undefined : now,
  };
  usersByEmail.set(normalizedEmail, user);
  indexUserUsername(user, usersByUsername, normalizedEmail);
  await persistUsers();

  if (!isAdmin) {
    const baseUrl =
      resolveAuthCallbackBaseUrl(undefined, req.headers as Record<string, string | string[] | undefined>) ||
      `http://localhost:${String(process.env.PORT ?? 3001)}`;
    const { devUrl } = await sendVerificationEmail(normalizedEmail, verificationToken, baseUrl);
    res.status(201).json({
      emailVerificationRequired: true,
      ...(devUrl ? { devVerificationUrl: devUrl } : {}),
    });
    return;
  }

  const tokens = await issueAuthForUser(user);
  res.status(201).json({
    authToken: tokens.authToken,
    refreshToken: tokens.refreshToken,
    accessExpiresAt: tokens.accessExpiresAt,
    refreshExpiresAt: tokens.refreshExpiresAt,
    user: toPublicUser(user),
  });
});

/** GET /api/auth/verify-email?token=... — clicked from the inbox link. */
app.get("/api/auth/verify-email", async (req, res) => {
  const token = String(req.query.token ?? "").trim();
  const baseUrl =
    resolveAuthCallbackBaseUrl(undefined, req.headers as Record<string, string | string[] | undefined>) ||
    `http://localhost:${String(process.env.PORT ?? 3001)}`;
  // Derive the frontend origin — same as base URL but strip /api paths if any.
  const frontendOrigin = baseUrl.replace(/\/api(\/.*)?$/, "");

  if (!token) {
    res.redirect(`${frontendOrigin}/?email_error=invalid_token`);
    return;
  }
  const user = findUserByVerificationToken(token);
  if (!user) {
    res.redirect(`${frontendOrigin}/?email_error=invalid_token`);
    return;
  }
  // 24-hour expiry
  const sentAt = user.emailVerificationSentAt ? new Date(user.emailVerificationSentAt).getTime() : 0;
  if (Date.now() - sentAt > 24 * 60 * 60 * 1000) {
    res.redirect(`${frontendOrigin}/?email_error=token_expired&email=${encodeURIComponent(user.email)}`);
    return;
  }
  user.emailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationSentAt = undefined;
  await persistUsers();
  // Issue tokens and redirect so the user lands logged in
  const tokens = await issueAuthForUser(user);
  const params = new URLSearchParams({
    email_verified: "1",
    auth_token: tokens.authToken,
    refresh_token: tokens.refreshToken,
    access_expires_at: String(tokens.accessExpiresAt),
    refresh_expires_at: String(tokens.refreshExpiresAt),
  });
  res.redirect(`${frontendOrigin}/?${params.toString()}`);
});

/** POST /api/auth/resend-verification — resend the email verification link. */
app.post("/api/auth/resend-verification", async (req, res) => {
  const { email } = req.body ?? {};
  if (!email) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "email is required.", details: [] } });
    return;
  }
  const normalizedEmail = normalizeEmail(email);
  const user = usersByEmail.get(normalizedEmail);
  // Silently succeed if not found / already verified / social user — don't leak existence
  if (!user || user.emailVerified !== false || user.provider !== "local") {
    res.json({ ok: true });
    return;
  }
  // Rate-limit: don't resend more than once per 60 seconds
  const lastSent = user.emailVerificationSentAt ? new Date(user.emailVerificationSentAt).getTime() : 0;
  if (Date.now() - lastSent < 60_000) {
    res.status(429).json({
      error: { code: "RATE_LIMITED", message: "Please wait a moment before requesting another verification email.", details: [] },
    });
    return;
  }
  const newToken = crypto.randomUUID();
  user.emailVerificationToken = newToken;
  user.emailVerificationSentAt = new Date().toISOString();
  await persistUsers();
  const baseUrl =
    resolveAuthCallbackBaseUrl(undefined, req.headers as Record<string, string | string[] | undefined>) ||
    `http://localhost:${String(process.env.PORT ?? 3001)}`;
  const { devUrl } = await sendVerificationEmail(normalizedEmail, newToken, baseUrl);
  res.json({ ok: true, ...(devUrl ? { devVerificationUrl: devUrl } : {}) });
});

app.get("/api/access/room/:step", async (req, res) => {
  const step = String(req.params.step ?? "").trim().toLowerCase();
  const user = await readAuthUser(req);
  if (step === "build") {
    const denied = generationAccessError(user);
    if (denied) {
      res.status(403).json({
        error: { code: denied.code, message: denied.message, details: [] },
        clearSessionPayload: true,
      });
      return;
    }
  } else if (step === "export") {
    const denied = exportRunbookAccessError(user);
    if (denied) {
      res.status(403).json({
        error: { code: denied.code, message: denied.message, details: [] },
        clearSessionPayload: true,
      });
      return;
    }
  } else {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "step must be build or export.", details: [] },
    });
    return;
  }
  res.json({ allowed: true, user: user ? toPublicUser(user) : null });
});

app.post("/api/auth/login", async (req, res) => {
  const body = req.body ?? {};
  const loginRaw = body.login ?? body.email ?? body.username;
  const { password } = body;
  if (!loginRaw || !password) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Email or username and password are required.",
        details: [],
      },
    });
    return;
  }
  const user = resolveLoginIdentifier(loginRaw, usersByEmail, usersByUsername);
  if (!user || !canAuthenticateWithPassword(user) || !verifyUserPassword(user, password)) {
    res.status(401).json({
      error: { code: "INVALID_CREDENTIALS", message: "Invalid email, username, or password.", details: [] },
    });
    return;
  }
  if ((user as StoredUser).emailVerified === false) {
    res.status(403).json({
      error: {
        code: "EMAIL_NOT_VERIFIED",
        message: "Please verify your email address before signing in. Check your inbox for the verification link.",
        details: [],
      },
    });
    return;
  }
  const tokens = await issueAuthForUser(user as StoredUser);
  res.json({
    authToken: tokens.authToken,
    refreshToken: tokens.refreshToken,
    accessExpiresAt: tokens.accessExpiresAt,
    refreshExpiresAt: tokens.refreshExpiresAt,
    user: toPublicUser(user as StoredUser),
  });
});

app.post("/api/auth/refresh", async (req, res) => {
  const refreshToken = String(req.body?.refreshToken ?? "").trim();
  const refreshed = await authTokenStore.refreshTokenPair(refreshToken);
  if (!refreshed.ok) {
    sendAuthError(res, 401, refreshed.code, refreshed.message);
    return;
  }
  const user = getStoredUserById(refreshed.userId);
  if (!user) {
    sendAuthError(res, 401, "USER_NOT_FOUND", "Account not found for this refresh token. Please log in again.");
    return;
  }
  res.json({
    authToken: refreshed.tokens.authToken,
    refreshToken: refreshed.tokens.refreshToken,
    accessExpiresAt: refreshed.tokens.accessExpiresAt,
    refreshExpiresAt: refreshed.tokens.refreshExpiresAt,
    user: toPublicUser(user),
  });
});

app.get("/api/me", async (req, res) => {
  const validation = await resolveAuthValidation(req, authTokenStore);
  if (!validation.ok) {
    respondAuthValidation(res, validation);
    return;
  }
  const user = getStoredUserById(validation.userId);
  if (!user) {
    sendAuthError(res, 401, "USER_NOT_FOUND", "Account not found for this sign-in. Please log in again.");
    return;
  }
  res.json({
    user: toPublicUser(user),
    accessExpiresAt: validation.record.accessExpiresAt,
    trial: {
      curatedThemeIds: [...CURATED_TRIAL_THEME_ORDER],
      trialCatalogOnly: isTrialTierUser(user),
      fixedCatalog: true,
      trialUsed: Boolean(user.trialUsedAt),
      trialRemaining: isTrialTierUser(user) && !user.trialUsedAt,
    },
  });
});

app.patch("/api/me", async (req, res) => {
  const validation = await resolveAuthValidation(req, authTokenStore);
  if (!validation.ok) {
    respondAuthValidation(res, validation);
    return;
  }
  const user = getStoredUserById(validation.userId);
  if (!user) {
    sendAuthError(res, 401, "USER_NOT_FOUND", "Account not found.");
    return;
  }
  const { name, email, currentPassword, newPassword } = req.body ?? {};
  const isLocal = user.provider === "local";
  const changes: Partial<StoredUser> = {};

  // Name — any provider
  if (name !== undefined) {
    const trimmed = String(name).trim();
    if (!trimmed) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Name cannot be empty.", details: [] } });
      return;
    }
    changes.name = trimmed;
  }

  // Email / password changes require local provider + current password
  const wantsEmailChange = email !== undefined && String(email).trim().toLowerCase() !== user.email;
  const wantsPasswordChange = newPassword !== undefined && String(newPassword).trim().length > 0;

  if ((wantsEmailChange || wantsPasswordChange) && !isLocal) {
    res.status(400).json({
      error: {
        code: "PROVIDER_RESTRICTED",
        message: `Email and password are managed by ${user.provider}. Sign in with ${user.provider} to change them.`,
        details: [],
      },
    });
    return;
  }

  if (wantsEmailChange || wantsPasswordChange) {
    if (!currentPassword || !verifyUserPassword(user, String(currentPassword))) {
      res.status(401).json({
        error: { code: "INVALID_CREDENTIALS", message: "Current password is incorrect.", details: [] },
      });
      return;
    }
  }

  if (wantsEmailChange) {
    const newEmail = normalizeEmail(String(email));
    if (usersByEmail.has(newEmail)) {
      res.status(409).json({ error: { code: "EMAIL_EXISTS", message: "An account with that email already exists.", details: [] } });
      return;
    }
    // Move the user in the map to the new key
    usersByEmail.delete(user.email);
    changes.email = newEmail;
  }

  if (wantsPasswordChange) {
    const pw = String(newPassword);
    if (pw.length < 8 || !/[A-Z]/.test(pw) || !/[0-9!@#$%^&*()\-_=+[\]{};':",.<>/?\\|`~]/.test(pw)) {
      res.status(400).json({
        error: {
          code: "WEAK_PASSWORD",
          message: "New password must be at least 8 characters with one uppercase letter and one number or special character.",
          details: [],
        },
      });
      return;
    }
    changes.password = pw;
  }

  if (Object.keys(changes).length === 0) {
    res.json({ user: toPublicUser(user) });
    return;
  }

  Object.assign(user, changes);
  // Re-index under new email key
  usersByEmail.set(user.email, user);
  indexUserUsername(user, usersByUsername, user.email);
  await persistUsers();
  res.json({ user: toPublicUser(user) });
});

app.post("/api/billing/activate-test", async (req, res) => {
  const user = await readAuthUser(req);
  if (!user) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Auth token is required.", details: [] } });
    return;
  }
  if (!user.isAdmin) {
    res.status(403).json({
      error: {
        code: "FORBIDDEN",
        message: "Test activation is restricted to administrator accounts. Use billing webhook fulfillment for customers.",
        details: [],
      },
    });
    return;
  }
  const key = String(process.env.SUBSCRIPTION_ACTIVATION_KEY ?? "").trim();
  const body = req.body as {
    activationKey?: string;
    roomsToAdd?: unknown;
    exportCreditsToAdd?: unknown;
    organizationPool?: { id?: string; name?: string; bonusSlots?: unknown; memberEmails?: unknown };
  };
  const provided = String(body?.activationKey ?? "").trim();
  if (!key || provided !== key) {
    res.status(403).json({
      error: { code: "INVALID_ACTIVATION", message: "Activation key not accepted.", details: [] },
    });
    return;
  }
  const rawAdd = body?.roomsToAdd;
  let roomsToAdd = typeof rawAdd === "number" ? rawAdd : Number(rawAdd);
  if (!Number.isFinite(roomsToAdd) || roomsToAdd < 1) roomsToAdd = 10;
  roomsToAdd = Math.min(Math.floor(roomsToAdd), 5000);
  const rawExportAdd = body?.exportCreditsToAdd;
  let exportCreditsToAdd = typeof rawExportAdd === "number" ? rawExportAdd : Number(rawExportAdd);
  if (!Number.isFinite(exportCreditsToAdd)) exportCreditsToAdd = roomsToAdd;
  exportCreditsToAdd = Math.min(Math.max(0, Math.floor(exportCreditsToAdd)), 50_000);

  user.roomAllowance = Math.min(MAX_ROOM_ALLOWANCE, user.roomAllowance + roomsToAdd);
  user.exportCreditsRemaining = Math.min(500_000, user.exportCreditsRemaining + exportCreditsToAdd);

  const orgInput = body.organizationPool;
  if (orgInput && Array.isArray(orgInput.memberEmails)) {
    const poolId = String(orgInput.id ?? `pool_${Date.now()}`).trim() || `pool_${Date.now()}`;
    const poolName = String(orgInput.name ?? "Team pool").trim() || poolId;
    const bonusSlots = Math.max(0, Math.floor(Number(orgInput.bonusSlots) || 0));
    const memberEmailsLower = orgInput.memberEmails
      .map((e) => String(e).trim().toLowerCase())
      .filter(Boolean);
    const idx = organizationPools.findIndex((p) => p.id === poolId);
    const nextPool: OrganizationPool = {
      id: poolId,
      name: poolName,
      bonusSlots,
      memberEmailsLower,
    };
    if (idx >= 0) organizationPools[idx] = nextPool;
    else organizationPools.push(nextPool);
    await persistOrganizationPools();
  }

  await persistUsers();
  await appendBillingAudit({
    userId: user.id,
    email: user.email,
    action: "activation_test_topup",
    detail: { roomsToAdd, exportCreditsToAdd, organizationPoolId: orgInput ? String(orgInput.id ?? "") : "" },
  });
  res.json({
    ok: true,
    user: toPublicUser(user),
    roomsAdded: roomsToAdd,
    exportCreditsAdded: exportCreditsToAdd,
  });
});

app.post("/api/billing/webhook", async (req, res) => {
  const secret = String(process.env.BILLING_WEBHOOK_SECRET ?? "").trim();
  const provided = String(req.headers["x-billing-webhook-secret"] ?? req.body?.secret ?? "").trim();
  if (!secret || provided !== secret) {
    res.status(403).json({ error: { code: "INVALID_WEBHOOK_SECRET", message: "Webhook not authorized.", details: [] } });
    return;
  }
  const { email, roomsToAdd, exportCreditsToAdd, organizationPool } = req.body as {
    email?: string;
    roomsToAdd?: unknown;
    exportCreditsToAdd?: unknown;
    organizationPool?: { id?: string; name?: string; bonusSlots?: unknown; memberEmails?: unknown };
  };
  const normalizedEmail = String(email ?? "").trim().toLowerCase();
  if (!normalizedEmail) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "email is required.", details: [] } });
    return;
  }
  const target = usersByEmail.get(normalizedEmail);
  if (!target) {
    res.status(404).json({ error: { code: "USER_NOT_FOUND", message: "No user with that email.", details: [] } });
    return;
  }
  let addRooms = typeof roomsToAdd === "number" ? roomsToAdd : Number(roomsToAdd);
  if (!Number.isFinite(addRooms) || addRooms < 0) addRooms = 0;
  addRooms = Math.min(Math.floor(addRooms), 5000);
  let addExports = typeof exportCreditsToAdd === "number" ? exportCreditsToAdd : Number(exportCreditsToAdd);
  if (!Number.isFinite(addExports) || addExports < 0) addExports = addRooms > 0 ? addRooms : 0;
  addExports = Math.min(Math.floor(addExports), 50_000);
  if (addRooms > 0) target.roomAllowance = Math.min(MAX_ROOM_ALLOWANCE, target.roomAllowance + addRooms);
  if (addExports > 0) target.exportCreditsRemaining = Math.min(500_000, target.exportCreditsRemaining + addExports);

  if (organizationPool && Array.isArray(organizationPool.memberEmails)) {
    const poolId = String(organizationPool.id ?? `pool_${Date.now()}`).trim() || `pool_${Date.now()}`;
    const poolName = String(organizationPool.name ?? "Team pool").trim() || poolId;
    const bonusSlots = Math.max(0, Math.floor(Number(organizationPool.bonusSlots) || 0));
    const memberEmailsLower = organizationPool.memberEmails
      .map((e) => String(e).trim().toLowerCase())
      .filter(Boolean);
    const idx = organizationPools.findIndex((p) => p.id === poolId);
    const nextPool: OrganizationPool = { id: poolId, name: poolName, bonusSlots, memberEmailsLower };
    if (idx >= 0) organizationPools[idx] = nextPool;
    else organizationPools.push(nextPool);
    await persistOrganizationPools();
  }

  await persistUsers();
  await appendBillingAudit({
    userId: target.id,
    email: target.email,
    action: "billing_webhook_topup",
    detail: { roomsToAdd: addRooms, exportCreditsToAdd: addExports },
  });
  res.json({ ok: true, user: toPublicUser(target) });
});

app.get("/api/billing/audit-log", async (req, res) => {
  const user = await readAuthUser(req);
  if (!user) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Auth token is required.", details: [] } });
    return;
  }
  try {
    const raw = await fs.readFile(billingAuditPath, "utf8");
    const lines = raw.split("\n").filter(Boolean);
    const parsed = lines
      .map((line) => {
        try {
          return JSON.parse(line) as { ts?: string; userId?: string; email?: string; action?: string; detail?: unknown };
        } catch {
          return null;
        }
      })
      .filter(Boolean) as Array<{ ts?: string; userId?: string; email?: string; action?: string; detail?: unknown }>;
    const mine = user.isAdmin
      ? parsed.slice(-500)
      : parsed.filter((row) => row.userId === user.id || row.email === user.email).slice(-200);
    res.json({ entries: mine.reverse() });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      res.json({ entries: [] });
      return;
    }
    res.status(500).json({ error: { code: "AUDIT_READ_FAILED", message: "Could not read audit log.", details: [] } });
  }
});

app.get("/api/auth/oauth/:provider/start", (req, res) => {
  try {
    const provider = String(req.params.provider ?? "").toLowerCase() as "google" | "facebook" | "github";
    const allowedProviders = new Set(["google", "facebook", "github"]);
    if (!allowedProviders.has(provider)) {
      res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "provider must be google, facebook, or github.", details: [] },
      });
      return;
    }

    const returnTo = String(req.query.returnTo ?? "").trim() || "http://localhost:5173/";
    const callbackBaseUrl = resolveAuthCallbackBaseUrl(
      undefined,
      req.headers as Record<string, string | string[] | undefined>,
    );
    const creds = readOAuthClientCredentials(provider);
    if (!callbackBaseUrl || !creds) {
      const exampleCallback = buildOAuthCallbackUrl(provider, callbackBaseUrl || "http://localhost:5173");
      redirectOAuthStartFailure(
        res,
        returnTo,
        "not_configured",
        `Social sign-in is not configured. Set AUTH_CALLBACK_BASE_URL (with Vite: use your app URL, e.g. http://localhost:5173). ${oauthCredentialSetupHint(provider)} Register this exact redirect URI with ${provider}: ${exampleCallback}`,
      );
      return;
    }

    const callbackUri = buildOAuthCallbackUrl(provider, callbackBaseUrl);
    const state = createOAuthState(provider, returnTo);

    const params = new URLSearchParams({
      client_id: creds.clientId,
      redirect_uri: callbackUri,
      state,
    });
    if (provider === "google") {
      params.set("response_type", "code");
      params.set("scope", "openid email profile");
      params.set("access_type", "offline");
      params.set("prompt", "select_account");
      res.redirect(302, `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
      return;
    }
    if (provider === "facebook") {
      params.set("response_type", "code");
      params.set("scope", "email,public_profile");
      res.redirect(302, `https://www.facebook.com/v20.0/dialog/oauth?${params.toString()}`);
      return;
    }
    params.set("response_type", "code");
    params.set("scope", "read:user user:email");
    res.redirect(302, `https://github.com/login/oauth/authorize?${params.toString()}`);
  } catch (err) {
    const returnTo = String(req.query.returnTo ?? "").trim() || "http://localhost:5173/";
    redirectOAuthStartFailure(
      res,
      returnTo,
      "start_failed",
      `OAuth start failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
});

app.get("/api/auth/oauth/:provider/callback", async (req, res) => {
  const provider = String(req.params.provider ?? "").toLowerCase() as "google" | "facebook" | "github";
  const code = String(req.query.code ?? "");
  const state = String(req.query.state ?? "");
  const oauthError = String(req.query.error ?? "").trim();
  const oauthErrorDescription = String(req.query.error_description ?? "").trim();
  const stateData = verifyOAuthState(state, provider);
  if (!stateData) {
    const fallbackReturn = `${resolveAuthCallbackBaseUrl() || "http://localhost:5173"}/`;
    const message = state
      ? "Invalid or expired OAuth callback state. Start sign-in again from the app."
      : "Missing OAuth state. Start sign-in again from the app.";
    redirectOAuthStartFailure(res, fallbackReturn, "invalid_state", message);
    return;
  }
  if (!code) {
    const message =
      oauthErrorDescription ||
      (oauthError === "redirect_uri_mismatch"
        ? `GitHub redirect URI must exactly match ${buildOAuthCallbackUrl("github")}`
        : oauthError
          ? `${provider} sign-in failed (${oauthError}).`
          : "Authorization was not completed. Try signing in again.");
    redirectOAuthStartFailure(res, stateData.returnTo, oauthError || "access_denied", message);
    return;
  }

  try {
    // Ensure in-memory stores are loaded before touching users/tokens
    await Promise.all([loadUsers(), authTokenStore.ensureLoaded()]).catch(() => {});
    const creds = readOAuthClientCredentials(provider);
    if (!creds) {
      redirectOAuthStartFailure(
        res,
        stateData.returnTo,
        "not_configured",
        oauthCredentialSetupHint(provider),
      );
      return;
    }
    const callbackBase = resolveAuthCallbackBaseUrl(
      undefined,
      req.headers as Record<string, string | string[] | undefined>,
    );
    const callbackUri = buildOAuthCallbackUrl(provider, callbackBase);
    console.log(`[oauth] ${provider} callback — callbackUri: ${callbackUri}`);
    const { email, name } = await exchangeOAuthCode(
      provider,
      code,
      creds.clientId,
      creds.clientSecret,
      callbackUri,
    );
    if (!email) throw new Error(`${provider} account did not provide a usable email.`);
    const user = upsertSocialUser(provider, email, name);
    const tokens = await issueAuthForUser(user);
    res.redirect(buildAuthSuccessRedirect(stateData.returnTo, tokens, user));
  } catch (error) {
    const detail = String(error instanceof Error ? error.message : error);
    // eslint-disable-next-line no-console
    console.error(`[oauth] ${provider} callback failed:`, detail);
    redirectOAuthStartFailure(
      res,
      stateData.returnTo,
      "verification_failed",
      `OAuth verification failed for ${provider}. ${detail}`,
    );
  }
});

app.post("/api/planning/session", async (req, res) => {
  // Validate planning payload and start a new session state.
  const {
    playersConcurrent,
    participantsTotal,
    sessionDurationMinutes,
    environmentType,
    availableItems,
    existingPuzzles,
  } = req.body ?? {};
  if (
    !playersConcurrent ||
    !participantsTotal ||
    !sessionDurationMinutes ||
    !environmentType ||
    !Array.isArray(availableItems)
  ) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Missing required planning input fields.",
        details: [],
      },
    });
    return;
  }
  const newSessionId = `sess_${nextSessionId++}`;
  const ownerId = await readAuthUserIdAsync(req);
  if (ownerId) sessionUserOwners.set(newSessionId, ownerId);
  const bodyMode = (req.body as { operatingMode?: unknown })?.operatingMode;
  const initialOperatingMode: OperatingMode | undefined =
    bodyMode === "home" || bodyMode === "venue" ? bodyMode : undefined;
  sessions.set(newSessionId, {
    operatingMode: initialOperatingMode,
    planningInput: {
      playersConcurrent: Number(playersConcurrent),
      participantsTotal: Number(participantsTotal),
      sessionDurationMinutes: Number(sessionDurationMinutes),
      environmentType: String(environmentType),
      availableItems: availableItems.map((item: unknown) => String(item)),
      existingPuzzles: Array.isArray(existingPuzzles)
        ? existingPuzzles
            .filter(
              (puzzle: unknown) =>
                typeof puzzle === "object" &&
                puzzle !== null &&
                typeof (puzzle as { name?: unknown }).name === "string" &&
                typeof (puzzle as { link?: unknown }).link === "string" &&
                typeof (puzzle as { roomPart?: unknown }).roomPart === "string",
            )
            .map((puzzle: { name: string; link: string; roomPart: string }) => ({
              name: puzzle.name.trim(),
              link: puzzle.link.trim(),
              roomPart: puzzle.roomPart.trim(),
            }))
            .filter((puzzle: { name: string; link: string; roomPart: string }) => puzzle.name && puzzle.link && puzzle.roomPart)
        : [],
      roomDifficulty: normalizeRoomDifficulty((req.body as { roomDifficulty?: unknown })?.roomDifficulty),
      youthAddOnEnabled: parsePlanningBool((req.body as { youthAddOnEnabled?: unknown })?.youthAddOnEnabled, false),
      youthAddOnGatesAdultFlow: parsePlanningBool(
        (req.body as { youthAddOnGatesAdultFlow?: unknown })?.youthAddOnGatesAdultFlow,
        false,
      ),
      youthAddOnAgeNote: parsePlanningNote((req.body as { youthAddOnAgeNote?: unknown })?.youthAddOnAgeNote, 400),
      eventType: parsePlanningNote((req.body as { eventType?: unknown })?.eventType, 200),
      mainTrackPuzzleCountOverride: parseOptionalMainTrackCountOverride(
        (req.body as { mainTrackPuzzleCountOverride?: unknown }).mainTrackPuzzleCountOverride,
      ),
      puzzleMixLogic: parseOptionalMixInt((req.body as { puzzleMixLogic?: unknown }).puzzleMixLogic),
      puzzleMixPhysical: parseOptionalMixInt((req.body as { puzzleMixPhysical?: unknown }).puzzleMixPhysical),
      puzzleMixElectronic: parseOptionalMixInt((req.body as { puzzleMixElectronic?: unknown }).puzzleMixElectronic),
      themeMustMatchEnvironment: parsePlanningBool(
        (req.body as { themeMustMatchEnvironment?: unknown }).themeMustMatchEnvironment,
        false,
      ),
      venueBuildType: parseVenueBuildType((req.body as { venueBuildType?: unknown }).venueBuildType),
      targetInterface: parseTargetInterface((req.body as { targetInterface?: unknown }).targetInterface),
    },
    themeCoachChat: [],
    customThemes: [],
    generatedThemes: [],
    generatedThemeCount: 0,
    seenThemeIds: new Set<string>(),
    seenThemeTitlesLower: new Set<string>(),
    seenPuzzleIds: new Set<string>(),
    currentPuzzles: [],
    suggestedAdditions: [],
    suggestedAdditionsRequired: [],
    roomManifest: defaultRoomManifest(),
  });
  const created = sessions.get(newSessionId)!;
  touchSessionLease(created);
  created.operatingMode = deriveSessionOperatingMode(created, req);
  res.status(201).json({
    sessionId: newSessionId,
    createdAt: new Date().toISOString(),
    operatingMode: created.operatingMode,
    leaseExpiresAt: created.leaseExpiresAt,
  });
});

app.get("/api/planning/session/:sessionId/health", (req, res) => {
  const sessionId = req.params.sessionId;
  const session = resolvePlanningSession(sessionId, { touchLease: false });
  if (!session) {
    respondInvalidPlanningSession(res, sessionId);
    return;
  }
  res.json({
    ok: true,
    sessionId,
    leaseExpiresAt: session.leaseExpiresAt ?? Date.now() + PLANNING_SESSION_LEASE_MS,
  });
});

app.post("/api/planning/session/:sessionId/lease", async (req, res) => {
  const sessionId = req.params.sessionId;
  const session = resolvePlanningSession(sessionId, { touchLease: false });
  if (!session) {
    respondInvalidPlanningSession(res, sessionId);
    return;
  }
  const user = await readAuthUser(req);
  if (user) {
    const ownerId = sessionUserOwners.get(sessionId);
    if (ownerId && ownerId !== user.id && !user.isAdmin) {
      res.status(403).json({ error: { code: "FORBIDDEN", message: "Not your planning session.", details: [] } });
      return;
    }
    if (!ownerId) sessionUserOwners.set(sessionId, user.id);
  }
  touchSessionLease(session);
  res.json({ ok: true, sessionId, leaseExpiresAt: session.leaseExpiresAt });
});

app.patch("/api/planning/session/:sessionId/planning-input", (req, res) => {
  const sessionId = req.params.sessionId;
  const session = resolvePlanningSession(sessionId);
  if (!session) {
    respondInvalidPlanningSession(res, sessionId);
    return;
  }
  const {
    playersConcurrent,
    participantsTotal,
    sessionDurationMinutes,
    environmentType,
    availableItems,
    roomDifficulty,
    youthAddOnEnabled,
    youthAddOnGatesAdultFlow,
    youthAddOnAgeNote,
    eventType,
  } = req.body ?? {};
  if (
    !playersConcurrent ||
    !participantsTotal ||
    !sessionDurationMinutes ||
    !environmentType ||
    !Array.isArray(availableItems)
  ) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Missing required planning input fields.",
        details: [],
      },
    });
    return;
  }
  const bodyRaw = req.body as Record<string, unknown>;
  session.planningInput = {
    playersConcurrent: Number(playersConcurrent),
    participantsTotal: Number(participantsTotal),
    sessionDurationMinutes: Number(sessionDurationMinutes),
    environmentType: String(environmentType),
    availableItems: availableItems.map((item: unknown) => String(item)),
    existingPuzzles: session.planningInput.existingPuzzles,
    roomDifficulty: normalizeRoomDifficulty(
      roomDifficulty !== undefined && roomDifficulty !== null
        ? roomDifficulty
        : session.planningInput.roomDifficulty,
    ),
    youthAddOnEnabled: parsePlanningBool(youthAddOnEnabled, session.planningInput.youthAddOnEnabled),
    youthAddOnGatesAdultFlow: parsePlanningBool(youthAddOnGatesAdultFlow, session.planningInput.youthAddOnGatesAdultFlow),
    youthAddOnAgeNote:
      youthAddOnAgeNote !== undefined && youthAddOnAgeNote !== null
        ? parsePlanningNote(youthAddOnAgeNote, 400)
        : session.planningInput.youthAddOnAgeNote,
    eventType:
      eventType !== undefined && eventType !== null
        ? parsePlanningNote(eventType, 200)
        : (session.planningInput.eventType ?? ""),
    mainTrackPuzzleCountOverride:
      "mainTrackPuzzleCountOverride" in bodyRaw
        ? parseOptionalMainTrackCountOverride(bodyRaw.mainTrackPuzzleCountOverride)
        : session.planningInput.mainTrackPuzzleCountOverride,
    puzzleMixLogic:
      "puzzleMixLogic" in bodyRaw
        ? parseOptionalMixInt(bodyRaw.puzzleMixLogic)
        : session.planningInput.puzzleMixLogic,
    puzzleMixPhysical:
      "puzzleMixPhysical" in bodyRaw
        ? parseOptionalMixInt(bodyRaw.puzzleMixPhysical)
        : session.planningInput.puzzleMixPhysical,
    puzzleMixElectronic:
      "puzzleMixElectronic" in bodyRaw
        ? parseOptionalMixInt(bodyRaw.puzzleMixElectronic)
        : session.planningInput.puzzleMixElectronic,
    themeMustMatchEnvironment:
      "themeMustMatchEnvironment" in bodyRaw
        ? parsePlanningBool(bodyRaw.themeMustMatchEnvironment, session.planningInput.themeMustMatchEnvironment ?? false)
        : (session.planningInput.themeMustMatchEnvironment ?? false),
    venueBuildType:
      "venueBuildType" in bodyRaw
        ? parseVenueBuildType(bodyRaw.venueBuildType, session.planningInput.venueBuildType)
        : session.planningInput.venueBuildType,
    targetInterface:
      "targetInterface" in bodyRaw
        ? parseTargetInterface(bodyRaw.targetInterface, session.planningInput.targetInterface)
        : session.planningInput.targetInterface,
  };
  session.operatingMode = deriveSessionOperatingMode(session, req);
  res.json({ ok: true, operatingMode: session.operatingMode });
});

app.get("/api/planning/session/:sessionId/theme-coach", async (req, res) => {
  const session = await requireAuthedSessionOwnership(req, res, req.params.sessionId);
  if (!session) return;
  res.json({ messages: session.themeCoachChat });
});

app.put("/api/planning/session/:sessionId/theme-coach", async (req, res) => {
  const session = await requireAuthedSessionOwnership(req, res, req.params.sessionId);
  if (!session) return;
  const raw = req.body?.messages;
  if (!Array.isArray(raw)) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "messages must be an array.", details: [] },
    });
    return;
  }
  const cleaned: ThemeCoachStoredMessage[] = [];
  for (const row of raw) {
    if (typeof row !== "object" || row === null) continue;
    const idRaw = (row as { id?: unknown }).id;
    const id =
      typeof idRaw === "string" && idRaw.trim()
        ? idRaw.trim().slice(0, 200)
        : `msg_${cleaned.length}_${Date.now()}`;
    const role = (row as { role?: unknown }).role;
    const content = (row as { content?: unknown }).content;
    if (role !== "user" && role !== "assistant") continue;
    if (typeof content !== "string" || content.length > 8000) continue;
    cleaned.push({ id, role, content });
  }
  session.themeCoachChat = cleaned;
  res.json({ ok: true, messages: session.themeCoachChat });
});

app.post("/api/themes/generate", async (req, res) => {
  const { sessionId } = req.body ?? {};
  const session = resolvePlanningSession(sessionId);
  if (!session) {
    respondInvalidPlanningSession(res, sessionId);
    return;
  }
  const billingUser = await claimSessionForAuthAsync(String(sessionId), req);
  const denied = generationAccessError(billingUser);
  if (denied) {
    res.status(403).json({ error: { code: denied.code, message: denied.message, details: [] } });
    return;
  }
  const fullCatalog = hasFullCatalogAccessUser(billingUser);
  if (!fullCatalog) {
    const enriched = getFixedCuratedTrialThemes(session);
    session.generatedThemes = enriched;
    enriched.forEach((theme) => {
      session.seenThemeIds.add(theme.id);
      const tk = normalizeThemeTitleKey(theme.name);
      if (tk) session.seenThemeTitlesLower.add(tk);
    });
    res.json({
      themes: enriched,
      trialCatalog: { fixed: true, themeIds: [...CURATED_TRIAL_THEME_ORDER] },
    });
    return;
  }
  const poolCandidates = sortThemesForSessionAffinity(
    themePool
      .filter(
        (theme) => !globallyReservedThemeIdsFromSaves.has(theme.id) && !isSkipped("theme", theme.id),
      )
      .filter((theme) => fullCatalog || FREE_TRIAL_THEME_IDS.has(theme.id)),
    session,
  );
  const initialThemes = assembleThreeDiverseThemes(
    poolCandidates,
    "th_global_generated",
    new Set<string>(),
    new Set(session.seenThemeIds),
    session.seenThemeTitlesLower,
  );
  initialThemes.forEach((theme) => {
    session.seenThemeIds.add(theme.id);
    const tk = normalizeThemeTitleKey(theme.name);
    if (tk) session.seenThemeTitlesLower.add(tk);
  });
  const enriched = injectItemsIntoThemes(
    enrichThemesWithRecommended(initialThemes, session),
    session,
  );
  session.generatedThemes = enriched;
  res.json({
    themes: enriched,
  });
});

app.post("/api/themes/refresh", async (req, res) => {
  const { sessionId, excludeThemeIds } = req.body ?? {};
  const session = resolvePlanningSession(sessionId);
  if (!session) {
    respondInvalidPlanningSession(res, sessionId);
    return;
  }
  const billingUser = await claimSessionForAuthAsync(String(sessionId), req);
  const denied = generationAccessError(billingUser);
  if (denied) {
    res.status(403).json({ error: { code: denied.code, message: denied.message, details: [] } });
    return;
  }
  const fullCatalog = hasFullCatalogAccessUser(billingUser);
  if (!fullCatalog) {
    const enriched = getFixedCuratedTrialThemes(session);
    session.generatedThemes = enriched;
    res.json({
      themes: enriched,
      trialCatalog: { fixed: true, themeIds: [...CURATED_TRIAL_THEME_ORDER] },
    });
    return;
  }
  const requestExcludes = new Set<string>(Array.isArray(excludeThemeIds) ? excludeThemeIds : []);
  requestExcludes.forEach((id) => markSkipped("theme", id));
  void persistSkipHistory();
  const excludes = new Set<string>([...requestExcludes, ...session.seenThemeIds]);
  const poolCandidates = sortThemesForSessionAffinity(
    themePool
      .filter(
        (theme) =>
          !excludes.has(theme.id) &&
          !globallyReservedThemeIdsFromSaves.has(theme.id) &&
          !isSkipped("theme", theme.id),
      )
      .filter((theme) => fullCatalog || FREE_TRIAL_THEME_IDS.has(theme.id)),
    session,
  );
  const refreshed = assembleThreeDiverseThemes(
    poolCandidates,
    `th_generated_${sessionId}`,
    new Set<string>(),
    excludes,
    session.seenThemeTitlesLower,
  );
  refreshed.forEach((theme) => {
    session.seenThemeIds.add(theme.id);
    const tk = normalizeThemeTitleKey(theme.name);
    if (tk) session.seenThemeTitlesLower.add(tk);
  });
  const enrichedRefresh = injectItemsIntoThemes(
    enrichThemesWithRecommended(refreshed, session),
    session,
  );
  session.generatedThemes = enrichedRefresh;

  res.json({
    themes: enrichedRefresh,
  });
});

app.post("/api/themes/custom", async (req, res) => {
  // Support user-authored themes and include them in selectable options.
  const { sessionId, name, description } = req.body ?? {};
  const session = resolvePlanningSession(sessionId);
  if (!session) {
    respondInvalidPlanningSession(res, sessionId);
    return;
  }
  const billingUser = await claimSessionForAuthAsync(String(sessionId), req);
  if (!hasFullCatalogAccessUser(billingUser)) {
    res.status(403).json({
      error: {
        code: "SUBSCRIPTION_REQUIRED",
        message: "Custom themes unlock when you have a paid room pack. On the trial, use the same three curated themes or purchase a pack under Account.",
        details: [],
      },
    });
    return;
  }
  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Custom theme name is required.", details: [] } });
    return;
  }
  if (globallyReservedSavedThemeTitlesLower.has(name.trim().toLowerCase())) {
    res.status(409).json({
      error: {
        code: "THEME_TITLE_RESERVED",
        message: "That theme title is already used by a saved room. Choose a different name.",
        details: [],
      },
    });
    return;
  }
  if (session.seenThemeTitlesLower.has(normalizeThemeTitleKey(name.trim()))) {
    res.status(409).json({
      error: {
        code: "THEME_TITLE_SESSION_DUPLICATE",
        message: "That theme title already appeared in this planning session. Pick a new name so each concept stays distinct.",
        details: [],
      },
    });
    return;
  }
  const descTrimmed = typeof description === "string" && description.trim() ? description.trim() : "";
  const descriptionBody = descTrimmed || "Custom theme provided by user—add storyline beats, props, and era notes in the sections below.";
  const collapsedDesc = descTrimmed.replace(/\s+/g, " ").trim();
  const tldrFromUser =
    descTrimmed.length === 0
      ? `You-authored room around “${name.trim()}”—define the hook, props, and era in the full brief.`
      : collapsedDesc.length <= 160
        ? collapsedDesc
        : `${collapsedDesc.slice(0, 157)}…`;
  const customTheme: Theme = {
    id: `th_custom_${nextThemeId++}`,
    name: name.trim(),
    tldr: tldrFromUser,
    description: descTrimmed.includes("##")
      ? descriptionBody
      : `## Storyline\n\n${descriptionBody}\n\n## Puzzle Loadout\n\nAdd your intended puzzle mix (logic / physical / light electronics).\n\n## Props & Set Dressing\n\nList anchor props players can touch.\n\n## Setting & Era\n\nNote time period and aesthetic guardrails.`,
  };
  let customWithRecommended = enrichThemesWithRecommended([customTheme], session)[0];
  customWithRecommended = injectItemsIntoThemeDescription(customWithRecommended, session);
  session.customThemes.push(customWithRecommended);
  session.generatedThemes = [
    customWithRecommended,
    ...session.generatedThemes.filter((theme) => theme.id !== customWithRecommended.id),
  ];
  session.seenThemeIds.add(customWithRecommended.id);
  const ctk = normalizeThemeTitleKey(customWithRecommended.name);
  if (ctk) session.seenThemeTitlesLower.add(ctk);
  res.status(201).json({ theme: customWithRecommended });
});

app.post("/api/planning/session/:sessionId/existing-puzzles", (req, res) => {
  const sessionId = req.params.sessionId;
  const session = resolvePlanningSession(sessionId);
  if (!session) {
    respondInvalidPlanningSession(res, sessionId);
    return;
  }
  const { existingPuzzles } = req.body ?? {};
  if (!Array.isArray(existingPuzzles)) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "existingPuzzles must be an array.", details: [] },
    });
    return;
  }
  session.planningInput.existingPuzzles = existingPuzzles
    .filter(
      (puzzle: unknown) =>
        typeof puzzle === "object" &&
        puzzle !== null &&
        typeof (puzzle as { name?: unknown }).name === "string" &&
        typeof (puzzle as { link?: unknown }).link === "string" &&
        typeof (puzzle as { roomPart?: unknown }).roomPart === "string",
    )
    .map((puzzle: { name: string; link: string; roomPart: string }) => ({
      name: puzzle.name.trim(),
      link: puzzle.link.trim(),
      roomPart: puzzle.roomPart.trim(),
    }))
    .filter((puzzle: { name: string; link: string; roomPart: string }) => puzzle.name && puzzle.link && puzzle.roomPart);
  res.json({ existingPuzzles: session.planningInput.existingPuzzles });
});

app.post("/api/puzzles/generate", async (req, res) => {
  const { sessionId, themeId } = req.body ?? {};
  const session = resolvePlanningSession(sessionId);
  if (!session) {
    respondInvalidPlanningSession(res, sessionId);
    return;
  }
  const billingUser = await claimSessionForAuthAsync(String(sessionId), req);
  const denied = generationAccessError(billingUser);
  if (denied) {
    res.status(403).json({ error: { code: denied.code, message: denied.message, details: [] } });
    return;
  }
  if (!themeId) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "themeId is required.", details: [] } });
    return;
  }
  const selectedTheme =
    themePool.find((theme) => theme.id === themeId) ??
    session.generatedThemes.find((theme) => theme.id === themeId) ??
    session.customThemes.find((theme) => theme.id === themeId);
  if (!selectedTheme) {
    res.status(404).json({ error: { code: "THEME_NOT_FOUND", message: "Theme not found for this session.", details: [] } });
    return;
  }
  session.selectedTheme = selectedTheme;
  const generationSeenIds = new Set<string>();
  const targetDifficulty = normalizeRoomDifficulty(session.planningInput.roomDifficulty);
  const pickPuzzle = (category: Puzzle["category"]): Puzzle => {
    const compatible = puzzlePoolByCategory[category].filter(
      (puzzle) => isPuzzleCompatibleWithTheme(puzzle, session.selectedTheme) && !isSkipped("puzzle", puzzle.id),
    );
    const scored = compatible
      .map((puzzle) => ({ puzzle, dist: difficultyDistance(puzzle.difficulty, targetDifficulty) }))
      .sort((a, b) => a.dist - b.dist || a.puzzle.id.localeCompare(b.puzzle.id));
    const ordered = scored.map((s) => s.puzzle);
    const unseen = ordered.find(
      (puzzle) => !session.seenPuzzleIds.has(puzzle.id) && !generationSeenIds.has(puzzle.id),
    );
    if (unseen) return unseen;
    const notYetInThisBatch = ordered.find((puzzle) => !generationSeenIds.has(puzzle.id));
    return notYetInThisBatch ?? ordered[0] ?? puzzlePoolByCategory[category][0];
  };
  const totalPuzzleCount = resolveMainTrackPuzzleCount(session);
  const context = getThemeContext(session.selectedTheme);
  const existingPuzzleTemplates: Puzzle[] = session.planningInput.existingPuzzles.map((existing, index) => {
    const query = encodeURIComponent(`${existing.name} escape room puzzle build`);
    return {
      id: `pz_existing_${sessionId}_${index + 1}`,
      category: "physical",
      themeTags: context.requiredTag ? ["generic", "user-provided", context.requiredTag] : ["generic", "user-provided"],
      title: existing.name,
      objective: `Use this prebuilt puzzle in the "${existing.roomPart}" part of the room flow.`,
      howItWorks: `User-provided puzzle scheduled for the "${existing.roomPart}" segment.`,
      stageHint: existing.roomPart,
      referenceLinks: [
        { title: `Primary build guide: ${existing.name}`, url: existing.link },
        refPuzzlePieces(`Puzzle Pieces — inspiration for ${existing.name}`),
        refRoomEscapeArtist(`Room Escape Artist — ideas for ${existing.name}`),
      ],
      solveSteps: ["Set up puzzle using the primary build guide", "Integrate into room sequence"],
      difficulty: targetDifficulty,
      audienceTrack: "main",
    };
  });

  const remainingPuzzleCount = Math.max(totalPuzzleCount - existingPuzzleTemplates.length, 0);
  const sessionMinutes = session.planningInput.sessionDurationMinutes;
  const { logic: logicCount, physical: physicalCount, electronic: electronicCount } = resolveGeneratedCategoryCounts(
    session,
    remainingPuzzleCount,
    sessionMinutes,
  );

  const generated: Puzzle[] = [...existingPuzzleTemplates];
  for (let i = 0; i < logicCount; i += 1) {
    const puzzle = pickPuzzle("logic");
    generated.push({ ...puzzle, audienceTrack: "main" });
    generationSeenIds.add(puzzle.id);
  }
  for (let i = 0; i < physicalCount; i += 1) {
    const puzzle = pickPuzzle("physical");
    generated.push({ ...puzzle, audienceTrack: "main" });
    generationSeenIds.add(puzzle.id);
  }
  for (let i = 0; i < electronicCount; i += 1) {
    const puzzle = pickPuzzle("electronic");
    generated.push({ ...puzzle, audienceTrack: "main" });
    generationSeenIds.add(puzzle.id);
  }

  if (session.planningInput.youthAddOnEnabled) {
    const ageNote = session.planningInput.youthAddOnAgeNote?.trim() ?? "";
    const youthCats: Array<"logic" | "physical" | "electronic"> =
      sessionMinutes >= 25 ? ["logic", "physical", "electronic"] : ["logic", "physical"];
    for (let yi = 0; yi < youthCats.length; yi += 1) {
      const picked = pickYouthPuzzle(session, session.selectedTheme, youthCats[yi], generationSeenIds);
      if (!picked) continue;
      const gatesFirst = Boolean(session.planningInput.youthAddOnGatesAdultFlow) && yi === 0;
      generated.push(
        cloneYouthAddOnPuzzle(picked, String(sessionId), yi, session.selectedTheme.name, gatesFirst, ageNote),
      );
      generationSeenIds.add(picked.id);
    }
  }

  // De-duplicate in case a small category pool is exhausted.
  const uniqueGenerated = Array.from(new Map(generated.map((puzzle) => [puzzle.id, puzzle])).values());
  const venueAdjusted = applyVenueBuildTypeToPuzzleCopy(uniqueGenerated, session);
  const generatedWithReasons = withThemeFitReasons(venueAdjusted, session.selectedTheme, session);
  let generatedForResponse = withPuzzleQaForSession(session, generatedWithReasons);
  generatedForResponse = breakDuplicateSavedRoomPuzzleSet(
    session.selectedTheme.id,
    generatedForResponse,
    session.selectedTheme,
  );
  generatedForResponse = withThemeFitReasons(generatedForResponse, session.selectedTheme, session);
  generatedForResponse = withPuzzleQaForSession(session, generatedForResponse);
  generatedForResponse = annotatePuzzlesWithInventoryAnchors(session, generatedForResponse);
  generatedForResponse.forEach((puzzle) => session.seenPuzzleIds.add(puzzle.id));
  session.currentPuzzles = generatedForResponse;
  const lists = buildSuggestedAdditionLists(session, generatedForResponse);
  session.suggestedAdditionsRequired = lists.required;
  session.suggestedAdditions = lists.optional;
  session.currentStoryPlan = augmentStoryPlanForYouthAddOn(
    createStoryPlan(session.selectedTheme, generatedForResponse, session),
    session,
  );
  const compatibilityPassed = generatedForResponse.every((puzzle) =>
    isPuzzleCompatibleWithTheme(puzzle, session.selectedTheme),
  );
  if (!session.roomManifest) session.roomManifest = defaultRoomManifest();
  const manifestResult = consumeManifestCredit(session.roomManifest, billingUser);
  if (manifestResult.creditConsumed || manifestResult.trialConsumed) {
    await persistUsers();
    void appendBillingAudit({
      userId: billingUser?.id,
      email: billingUser?.email,
      action: manifestResult.trialConsumed ? "trial_consumed_at_manifest" : "export_credit_reserved_at_manifest",
      detail: { sessionId: String(sessionId), manifestedAt: session.roomManifest.manifestedAt },
    });
  }
  void appendBillingAudit({
    userId: billingUser?.id,
    email: billingUser?.email,
    action: "ai_room_generation_success",
    detail: {
      sessionId: String(sessionId),
      themeId: String(themeId),
      puzzleCount: generatedForResponse.length,
      manifestStatus: session.roomManifest.status,
      creditConsumedAt: session.roomManifest.creditConsumedAt,
    },
  });
  const fullAccess = sessionHasFullPuzzleAccess(session.roomManifest);
  const clientPuzzles = puzzlesForClientResponse(generatedForResponse, fullAccess, billingUser);
  const clientStory = redactStoryPlanForClient(
    session.currentStoryPlan as unknown as Record<string, unknown>,
    fullAccess,
  );
  res.json({
    puzzles: clientPuzzles,
    compatibilityPassed,
    puzzleQaPassed: allPuzzlesPassedPuzzleQa(generatedForResponse),
    storyPlan: clientStory,
    suggestedAdditions: fullAccess ? session.suggestedAdditions : [],
    suggestedAdditionsRequired: fullAccess ? session.suggestedAdditionsRequired : [],
    roomManifest: session.roomManifest,
    manifestCreditConsumed: manifestResult.creditConsumed,
    trialConsumed: manifestResult.trialConsumed,
    puzzleAccess: fullAccess ? "full" : "preview",
    user: billingUser ? toPublicUser(billingUser) : undefined,
  });
});

app.post("/api/puzzles/:puzzleId/replace", async (req, res) => {
  const { sessionId } = req.body ?? {};
  const puzzleId = req.params.puzzleId;
  const session = resolvePlanningSession(sessionId);
  if (!session) {
    respondInvalidPlanningSession(res, sessionId);
    return;
  }
  const billingUser = await claimSessionForAuth(String(sessionId), req);
  const denied = puzzleMutationAccessError(session, billingUser);
  if (denied) {
    res.status(403).json({ error: { code: denied.code, message: denied.message, details: [] } });
    return;
  }
  const target = session.currentPuzzles.find((puzzle) => puzzle.id === puzzleId);
  if (!target) {
    res
      .status(404)
      .json({ error: { code: "PUZZLE_NOT_FOUND", message: "Puzzle is not in current session set.", details: [] } });
    return;
  }
  const isYouthSlot = target.audienceTrack === "youth_addon";
  const targetDifficulty = normalizeRoomDifficulty(session.planningInput.roomDifficulty);
  const replacementPool = puzzlePoolByCategory[target.category].filter(
    (puzzle) =>
      isPuzzleCompatibleWithTheme(puzzle, session.selectedTheme) &&
      !isSkipped("puzzle", puzzle.id) &&
      (!isYouthSlot || puzzle.difficulty === "easy" || puzzle.difficulty === "medium"),
  );
  const scoredReplacement = replacementPool
    .map((puzzle) => ({
      puzzle,
      dist: isYouthSlot
        ? puzzle.difficulty === "easy"
          ? 0
          : 1
        : difficultyDistance(puzzle.difficulty, targetDifficulty),
    }))
    .sort((a, b) => a.dist - b.dist || a.puzzle.id.localeCompare(b.puzzle.id));
  const orderedReplacement = scoredReplacement.map((s) => s.puzzle);
  const replacement =
    orderedReplacement.find((puzzle) => puzzle.id !== puzzleId && !session.seenPuzzleIds.has(puzzle.id)) ??
    orderedReplacement.find((puzzle) => puzzle.id !== puzzleId);
  if (!replacement) {
    res.status(409).json({
      error: { code: "NO_REPLACEMENT_AVAILABLE", message: "No valid replacement found for this puzzle.", details: [] },
    });
    return;
  }
  markSkipped("puzzle", puzzleId);
  void persistSkipHistory();
  session.seenPuzzleIds.add(replacement.id);
  const mergedReplacement: Puzzle = isYouthSlot
    ? {
        ...replacement,
        difficulty: replacement.difficulty === "hard" ? "medium" : replacement.difficulty,
        title: `[Junior add-on] ${replacement.title}`,
        audienceTrack: "youth_addon",
        gatesAdultProgression: Boolean(target.gatesAdultProgression),
        objective: `Youth-friendly parallel track: ${replacement.objective}`,
      }
    : { ...replacement, audienceTrack: target.audienceTrack ?? "main" };
  session.currentPuzzles = session.currentPuzzles.map((puzzle) => (puzzle.id === puzzleId ? mergedReplacement : puzzle));
  if (session.selectedTheme) {
    session.currentPuzzles = breakDuplicateSavedRoomPuzzleSet(
      session.selectedTheme.id,
      session.currentPuzzles,
      session.selectedTheme,
    );
  }
  session.currentPuzzles = applyVenueBuildTypeToPuzzleCopy(session.currentPuzzles, session);
  session.currentPuzzles = withThemeFitReasons(session.currentPuzzles, session.selectedTheme, session);
  session.currentPuzzles = withPuzzleQaForSession(session, session.currentPuzzles);
  session.currentPuzzles = annotatePuzzlesWithInventoryAnchors(session, session.currentPuzzles);
  const replaceLists = buildSuggestedAdditionLists(session, session.currentPuzzles);
  session.suggestedAdditionsRequired = replaceLists.required;
  session.suggestedAdditions = replaceLists.optional;
  session.currentStoryPlan = augmentStoryPlanForYouthAddOn(
    createStoryPlan(session.selectedTheme, session.currentPuzzles, session),
    session,
  );
  const compatibilityPassed = session.currentPuzzles.every((puzzle) =>
    isPuzzleCompatibleWithTheme(puzzle, session.selectedTheme),
  );
  const fullAccess = sessionHasFullPuzzleAccess(session.roomManifest);
  const clientReplacement = puzzlesForClientResponse([mergedReplacement], fullAccess, billingUser)[0];
  res.json({
    replacedPuzzleId: puzzleId,
    puzzleQaPassed: allPuzzlesPassedPuzzleQa(session.currentPuzzles),
    newPuzzle: clientReplacement,
    compatibilityPassed,
    storyPlan: fullAccess ? session.currentStoryPlan : redactStoryPlanForClient(
      session.currentStoryPlan as unknown as Record<string, unknown>,
      false,
    ),
    suggestedAdditions: fullAccess ? session.suggestedAdditions : [],
    suggestedAdditionsRequired: fullAccess ? session.suggestedAdditionsRequired : [],
    puzzleAccess: fullAccess ? "full" : "preview",
  });
});

app.post("/api/puzzles/:puzzleId/reject", async (req, res) => {
  const { sessionId } = req.body ?? {};
  const puzzleId = req.params.puzzleId;
  const session = resolvePlanningSession(sessionId);
  if (!session) {
    respondInvalidPlanningSession(res, sessionId);
    return;
  }
  const billingUser = await claimSessionForAuth(String(sessionId), req);
  const denied = puzzleMutationAccessError(session, billingUser);
  if (denied) {
    res.status(403).json({ error: { code: denied.code, message: denied.message, details: [] } });
    return;
  }
  const target = session.currentPuzzles.find((puzzle) => puzzle.id === puzzleId);
  if (!target) {
    res
      .status(404)
      .json({ error: { code: "PUZZLE_NOT_FOUND", message: "Puzzle is not in current session set.", details: [] } });
    return;
  }
  markSkipped("puzzle", puzzleId);
  void persistSkipHistory();
  const refusedSlot = {
    category: target.category,
    audienceTrack: target.audienceTrack ?? "main",
    gatesAdultProgression: Boolean(target.gatesAdultProgression),
  };
  session.currentPuzzles = session.currentPuzzles.filter((puzzle) => puzzle.id !== puzzleId);
  if (session.selectedTheme) {
    session.currentPuzzles = withThemeFitReasons(session.currentPuzzles, session.selectedTheme, session);
    session.currentPuzzles = withPuzzleQaForSession(session, session.currentPuzzles);
    session.currentPuzzles = annotatePuzzlesWithInventoryAnchors(session, session.currentPuzzles);
    const rejectLists = buildSuggestedAdditionLists(session, session.currentPuzzles);
    session.suggestedAdditionsRequired = rejectLists.required;
    session.suggestedAdditions = rejectLists.optional;
    session.currentStoryPlan = augmentStoryPlanForYouthAddOn(
      createStoryPlan(session.selectedTheme, session.currentPuzzles, session),
      session,
    );
  }
  const compatibilityPassed = session.currentPuzzles.every((puzzle) =>
    isPuzzleCompatibleWithTheme(puzzle, session.selectedTheme),
  );
  const fullAccess = sessionHasFullPuzzleAccess(session.roomManifest);
  res.json({
    rejectedPuzzleId: puzzleId,
    refusedSlot,
    puzzles: puzzlesForClientResponse(session.currentPuzzles, fullAccess, billingUser),
    compatibilityPassed,
    storyPlan: fullAccess ? session.currentStoryPlan : redactStoryPlanForClient(
      session.currentStoryPlan as unknown as Record<string, unknown>,
      false,
    ),
    suggestedAdditions: fullAccess ? session.suggestedAdditions : [],
    suggestedAdditionsRequired: fullAccess ? session.suggestedAdditionsRequired : [],
    puzzleAccess: fullAccess ? "full" : "preview",
  });
});

app.post("/api/puzzles/fill-slot", async (req, res) => {
  const { sessionId, category, audienceTrack, gatesAdultProgression } = req.body ?? {};
  const session = resolvePlanningSession(sessionId);
  if (!session) {
    respondInvalidPlanningSession(res, sessionId);
    return;
  }
  const billingUser = await claimSessionForAuth(String(sessionId), req);
  const denied = puzzleMutationAccessError(session, billingUser);
  if (denied) {
    res.status(403).json({ error: { code: denied.code, message: denied.message, details: [] } });
    return;
  }
  if (!category || !["logic", "physical", "electronic"].includes(String(category))) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "category must be logic, physical, or electronic.", details: [] },
    });
    return;
  }
  if (!session.selectedTheme) {
    res.status(400).json({
      error: { code: "THEME_REQUIRED", message: "Select a theme before filling a puzzle slot.", details: [] },
    });
    return;
  }
  const slotCategory = category as Puzzle["category"];
  const isYouthSlot = audienceTrack === "youth_addon";
  const targetDifficulty = normalizeRoomDifficulty(session.planningInput.roomDifficulty);
  const usedIds = new Set(session.currentPuzzles.map((puzzle) => puzzle.id));
  const replacementPool = puzzlePoolByCategory[slotCategory].filter(
    (puzzle) =>
      isPuzzleCompatibleWithTheme(puzzle, session.selectedTheme) &&
      !isSkipped("puzzle", puzzle.id) &&
      (!isYouthSlot || puzzle.difficulty === "easy" || puzzle.difficulty === "medium"),
  );
  const scoredReplacement = replacementPool
    .map((puzzle) => ({
      puzzle,
      dist: isYouthSlot
        ? puzzle.difficulty === "easy"
          ? 0
          : 1
        : difficultyDistance(puzzle.difficulty, targetDifficulty),
    }))
    .sort((a, b) => a.dist - b.dist || a.puzzle.id.localeCompare(b.puzzle.id));
  const orderedReplacement = scoredReplacement.map((s) => s.puzzle);
  const replacement =
    orderedReplacement.find((puzzle) => !usedIds.has(puzzle.id) && !session.seenPuzzleIds.has(puzzle.id)) ??
    orderedReplacement.find((puzzle) => !usedIds.has(puzzle.id));
  if (!replacement) {
    res.status(409).json({
      error: { code: "NO_REPLACEMENT_AVAILABLE", message: "No valid puzzle found for this slot.", details: [] },
    });
    return;
  }
  session.seenPuzzleIds.add(replacement.id);
  const ageNote = session.planningInput.youthAddOnAgeNote?.trim() ?? "";
  const youthIndex = session.currentPuzzles.filter((puzzle) => puzzle.audienceTrack === "youth_addon").length;
  const mergedReplacement: Puzzle = isYouthSlot
    ? cloneYouthAddOnPuzzle(
        replacement,
        String(sessionId),
        youthIndex,
        session.selectedTheme.name,
        Boolean(gatesAdultProgression),
        ageNote,
      )
    : { ...replacement, audienceTrack: "main" };
  session.currentPuzzles = [...session.currentPuzzles, mergedReplacement];
  session.currentPuzzles = breakDuplicateSavedRoomPuzzleSet(
    session.selectedTheme.id,
    session.currentPuzzles,
    session.selectedTheme,
  );
  session.currentPuzzles = withThemeFitReasons(session.currentPuzzles, session.selectedTheme, session);
  session.currentPuzzles = withPuzzleQaForSession(session, session.currentPuzzles);
  session.currentPuzzles = annotatePuzzlesWithInventoryAnchors(session, session.currentPuzzles);
  const fillLists = buildSuggestedAdditionLists(session, session.currentPuzzles);
  session.suggestedAdditionsRequired = fillLists.required;
  session.suggestedAdditions = fillLists.optional;
  session.currentStoryPlan = augmentStoryPlanForYouthAddOn(
    createStoryPlan(session.selectedTheme, session.currentPuzzles, session),
    session,
  );
  const compatibilityPassed = session.currentPuzzles.every((puzzle) =>
    isPuzzleCompatibleWithTheme(puzzle, session.selectedTheme),
  );
  const fullAccess = sessionHasFullPuzzleAccess(session.roomManifest);
  res.json({
    newPuzzle: puzzlesForClientResponse([mergedReplacement], fullAccess, billingUser)[0],
    puzzles: puzzlesForClientResponse(session.currentPuzzles, fullAccess, billingUser),
    compatibilityPassed,
    storyPlan: fullAccess ? session.currentStoryPlan : redactStoryPlanForClient(
      session.currentStoryPlan as unknown as Record<string, unknown>,
      false,
    ),
    suggestedAdditions: fullAccess ? session.suggestedAdditions : [],
    suggestedAdditionsRequired: fullAccess ? session.suggestedAdditionsRequired : [],
    puzzleAccess: fullAccess ? "full" : "preview",
  });
});

app.post("/api/plans/:sessionId/export", async (req, res) => {
  // Export full planning output for host/runbook usage.
  const sessionId = req.params.sessionId;
  const session = resolvePlanningSession(sessionId);
  if (!session) {
    respondInvalidPlanningSession(res, sessionId);
    return;
  }
  const billingUser = await claimSessionForAuth(sessionId, req);
  if (!session.roomManifest) session.roomManifest = defaultRoomManifest();
  const creditReservedAtManifest = Boolean(session.roomManifest.creditConsumedAt);
  if (!creditReservedAtManifest) {
    const denied = exportRunbookAccessError(billingUser);
    if (denied) {
      res.status(403).json({ error: { code: denied.code, message: denied.message, details: [] } });
      return;
    }
    res.status(403).json({
      error: {
        code: "ROOM_NOT_MANIFESTED",
        message: "Generate your puzzle set first so an export credit can be reserved to this room.",
        details: [],
      },
    });
    return;
  }
  const hasCatalog = Boolean(billingUser && hasFullCatalogAccessUser(billingUser));
  const creditsBefore =
    billingUser && !billingUser.isAdmin && hasCatalog ? Math.max(0, billingUser.exportCreditsRemaining) : 0;
  const exportCapacityOk =
    Boolean(billingUser?.isAdmin) ||
    creditReservedAtManifest ||
    (hasCatalog && creditsBefore > 0) ||
    Boolean(billingUser && isTrialTierUser(billingUser) && !billingUser.trialUsedAt);
  const redactElectronicBuild = shouldRedactElectronicForExportUser(billingUser) || !exportCapacityOk;
  session.currentPuzzles = withThemeFitReasons(session.currentPuzzles, session.selectedTheme, session);
  session.currentPuzzles = withPuzzleQaForSession(session, session.currentPuzzles);
  session.currentPuzzles = annotatePuzzlesWithInventoryAnchors(session, session.currentPuzzles);
  const exportFlowPathKind = getRecommendedFlowPathKind(session);
  const exportFlowPathLabel =
    exportFlowPathKind === "linear"
      ? "Linear (path of one)"
      : exportFlowPathKind === "multilinear"
        ? "Multi-linear (parallel paths)"
        : "Non-linear (open path)";
  const operatingModeForExport = deriveSessionOperatingMode(session, req);
  const exportCtx: ExportSessionContext = {
    environmentType: session.planningInput.environmentType,
    themeName: session.selectedTheme?.name ?? "Your escape room",
    sessionDurationMinutes: session.planningInput.sessionDurationMinutes,
    playersConcurrent: session.planningInput.playersConcurrent,
    operatingMode: operatingModeForExport,
  };
  const exportPuzzles: ExportPuzzleRef[] = sanitizeExportPuzzlesForBilling(
    session.currentPuzzles.map((puzzle) => ({
      id: puzzle.id,
      title: puzzle.title,
      category: puzzle.category,
      difficulty: puzzle.difficulty,
      objective: puzzle.objective,
      howItWorks: puzzle.howItWorks,
      themeFitReason: puzzle.themeFitReason,
      stageHint: puzzle.stageHint,
      audienceTrack: puzzle.audienceTrack,
      gatesAdultProgression: puzzle.gatesAdultProgression,
      solveSteps: puzzle.solveSteps ?? [],
      referenceLinks: puzzle.referenceLinks ?? [],
      electronicDetails: puzzle.electronicDetails,
      physical_anchor_prop: puzzle.physical_anchor_prop,
      narrative_justification: puzzle.narrative_justification,
      bill_of_materials: puzzle.bill_of_materials,
      build_documentation_url: puzzle.build_documentation_url,
    })),
    billingUser,
  );
  const lines = [
    "# Escape Room Plan",
    "",
    ...EXPORT_PDF_PRINT_GUIDE,
    "## Session",
    `- ID: ${sessionId}`,
    "",
    ...buildExecutiveSummaryExportLines(session),
    ...buildConsolidatedBomTable(exportPuzzles, redactElectronicBuild),
    ...buildMasterBlueprintExportLines(session),
    ...buildMermaidFlowchartExportLines(session),
    "## Planning Input",
    `- Players at one time: ${session.planningInput.playersConcurrent}`,
    `- Total participants: ${session.planningInput.participantsTotal}`,
    `- Session duration (minutes): ${session.planningInput.sessionDurationMinutes}`,
    `- Event context: ${(session.planningInput.eventType ?? "").trim() || "—"}`,
    `- Main-track puzzle target: ${resolveMainTrackPuzzleCount(session)}${
      session.planningInput.mainTrackPuzzleCountOverride != null ? " (host override)" : " (auto from players × minutes)"
    }`,
    ...(session.planningInput.puzzleMixLogic != null &&
    session.planningInput.puzzleMixPhysical != null &&
    session.planningInput.puzzleMixElectronic != null
      ? [
          `- Requested generated mix (logic / physical / electronic, scaled to remaining slots after premades): ${session.planningInput.puzzleMixLogic} / ${session.planningInput.puzzleMixPhysical} / ${session.planningInput.puzzleMixElectronic}`,
        ]
      : []),
    `- Recommended flow path (from headcount & duration): ${exportFlowPathLabel}`,
    `- Room target difficulty (for puzzle selection): ${session.planningInput.roomDifficulty}`,
    `- Junior add-on escape (parallel easy–medium track): ${session.planningInput.youthAddOnEnabled ? "Yes" : "No"}`,
    `- Junior track may gate adult progression: ${session.planningInput.youthAddOnGatesAdultFlow ? "Yes" : "No"}`,
    ...(session.planningInput.youthAddOnAgeNote?.trim()
      ? [`- Junior add-on age / facilitation note: ${session.planningInput.youthAddOnAgeNote.trim()}`]
      : []),
    `- Venue build type: ${venueBuildTypeExportLabel(session.planningInput.venueBuildType)}`,
    `- Environment (physical room / fiction setting): ${session.planningInput.environmentType}`,
    `- Theme ideas should match this environment: ${session.planningInput.themeMustMatchEnvironment ? "Yes (generator ranks venue-aligned picks)" : "No (fantasy may diverge from the room)"}`,
    `- Available items: ${session.planningInput.availableItems.join(", ")}`,
    `- Existing user puzzles: ${session.planningInput.existingPuzzles.length}`,
    ...session.planningInput.existingPuzzles.map(
      (puzzle) => `  - ${puzzle.name} [${puzzle.roomPart}]: ${puzzle.link}`,
    ),
    "",
    ...buildAnchorChecklistExportLines(session),
    ...exportStudioBuildPolicyLines(),
    "## Theme",
    `- Name: ${session.selectedTheme?.name ?? "Not selected"}`,
    `- TL;DR: ${session.selectedTheme?.tldr ?? "—"}`,
    "",
    "### Theme brief",
    ...(session.selectedTheme?.description ?? "No description provided.").split("\n"),
    "",
    `- Theme compatibility checks passed: ${
      session.currentPuzzles.every((puzzle) => isPuzzleCompatibleWithTheme(puzzle, session.selectedTheme))
        ? "Yes"
        : "No"
    }`,
    "",
    "## Storyline",
    `- Situation: ${session.currentStoryPlan?.situation ?? "Not generated yet."}`,
    `- Premise: ${session.currentStoryPlan?.premise ?? "Not generated yet."}`,
    `- Mission objective: ${session.currentStoryPlan?.missionObjective ?? "Not generated yet."}`,
    `- Progression rule: ${
      session.currentStoryPlan?.progressionRule ??
      "At least two puzzle elements should be solved before each reveal."
    }`,
    "",
    "## Stage Flow",
    ...(session.currentStoryPlan?.stages ?? []).flatMap((stage) => [
      `### ${stage.title}`,
      `- Story beat: ${stage.storyBeat}`,
      `- Why this stage exists: ${stage.whyThisStageExists}`,
      `- Objective: ${stage.objective}`,
      "- What players must do:",
      ...stage.whatPlayersMustDo.map((step) => `  - ${step}`),
      `- Required puzzles: ${stage.requiredPuzzleTitles.join(" and ")}`,
      `- Reveal: ${stage.reveals}`,
      "",
    ]),
    "## Puzzle-to-Story Mapping",
    ...(session.currentStoryPlan?.puzzleLinks ?? []).map(
      (link) => `- ${link.puzzleTitle}: ${link.storyRole}. ${link.unlocks}`,
    ),
    "",
    "## Room layout sketch",
    ...(session.currentStoryPlan?.stagingDiagram
      ? session.currentStoryPlan.stagingDiagram.split("\n")
      : ["- _Generate puzzles to produce a numbered staging map._"]),
    "",
    "<!-- pdf-page-break -->",
    "",
    ...buildTechnicalPuzzleSections(exportPuzzles, exportCtx, redactElectronicBuild),
    ...(session.planningInput.youthAddOnEnabled
      ? [
          "## Junior add-on track (easy–medium, same theme)",
          `- Intended as a parallel space for younger players alongside the main ${session.selectedTheme?.name ?? "room"} run.`,
          "",
        ]
      : []),
    ...buildGmLiveOpsBriefing(
      exportPuzzles,
      exportCtx,
      (session.currentStoryPlan?.puzzleLinks ?? []).map((link) => ({
        puzzleTitle: link.puzzleTitle,
        storyRole: link.storyRole,
        unlocks: link.unlocks,
      })),
    ),
    "",
    "## Suggested Elements to Add (If Needed)",
    ...(session.suggestedAdditionsRequired.length > 0
      ? [
          "### Required before opening (gaps in your stated inventory)",
          ...session.suggestedAdditionsRequired.map((item) => `- ${item}`),
          "",
        ]
      : []),
    "### Recommended (workflow, originality, optional props)",
    ...(session.suggestedAdditions.length > 0
      ? session.suggestedAdditions.map((item) => `- ${item}`)
      : ["- No optional elements listed."]),
    "",
    "## Theme Fit Rationale",
    ...session.currentPuzzles.map(
      (puzzle) =>
        `- ${puzzle.title}: ${puzzle.themeFitReason ?? deriveThemeFitReason(puzzle, session.selectedTheme, session)}`,
    ),
    "",
    "## Puzzle Video and Build References",
    ...(session.currentPuzzles.some((p) => (p.referenceLinks ?? []).length > 0)
      ? session.currentPuzzles.flatMap((puzzle) => {
          const refs = puzzle.referenceLinks ?? [];
          if (refs.length === 0) return [];
          return [
            `### ${puzzle.title}`,
            ...refs.flatMap((ref) => {
              const rows = [`- [${ref.title}](${ref.url})`];
              if (ref.creditTo) rows.push(`  - Credit: ${ref.creditTo}`);
              if (ref.affiliateUrl) {
                rows.push(
                  ref.affiliateUrl === ref.url
                    ? `  - Support / official: [${ref.title}](${ref.affiliateUrl})`
                    : `  - Support the creator (subscribe / partner link): [${ref.title} — support](${ref.affiliateUrl})`,
                );
              }
              return rows;
            }),
            "",
          ];
        })
      : ["- _No third-party tutorial links were attached to these template puzzles._", ""]),
    "",
    "## Electronic Puzzle Implementation Details",
    "",
    "_Technique library: [Playful Technology](https://www.youtube.com/@playfultechnology) — compare wiring and pinouts below to your generated hardware before install._",
    "",
    ...session.currentPuzzles
      .filter((puzzle) => puzzle.category === "electronic" && puzzle.electronicDetails)
      .flatMap((puzzle) => [
        `### ${puzzle.title}`,
        "- Parts:",
        ...((puzzle.electronicDetails?.parts ?? []).map((part) => `  - ${part}`)),
        "- Wiring:",
        ...((puzzle.electronicDetails?.wiringDiagram ?? []).map((wire) => `  - ${wire}`)),
        ...((() => {
          const svg = (puzzle.electronicDetails?.wiringDiagramSvg ?? "").trim();
          if (!svg) return [] as string[];
          const safe = svg.replace(/```/g, "′′′");
          return ["", "- Wiring diagram (SVG):", "```svg", safe, "```", ""];
        })()),
        "- Build Steps:",
        ...((puzzle.electronicDetails?.buildSteps ?? []).map((step) => `  - ${step}`)),
        "- Arduino Code:",
        "```cpp",
        puzzle.electronicDetails?.arduinoCode ?? "",
        "```",
        "",
      ]),
  ];
  const exportLines = applyTrialExportRedaction(lines, redactElectronicBuild);
  const formatRaw = String(req.body?.format ?? "markdown").toLowerCase();
  const format = formatRaw === "pdf" || formatRaw === "both" ? formatRaw : "markdown";
  const content = exportLines.join("\n");
  let exportCreditConsumed = creditReservedAtManifest;
  if (
    !creditReservedAtManifest &&
    !redactElectronicBuild &&
    billingUser &&
    !billingUser.isAdmin &&
    hasCatalog
  ) {
    billingUser.exportCreditsRemaining = Math.max(0, billingUser.exportCreditsRemaining - 1);
    exportCreditConsumed = true;
    await persistUsers();
    void appendBillingAudit({
      userId: billingUser.id,
      email: billingUser.email,
      action: "export_credit_consumed",
      detail: { sessionId, creditsAfter: billingUser.exportCreditsRemaining },
    });
  }
  let trialConsumed = creditReservedAtManifest && Boolean(billingUser?.trialUsedAt);
  if (billingUser && isTrialTierUser(billingUser) && !creditReservedAtManifest) {
    trialConsumed = await consumeTrialIfNeeded(billingUser);
  }
  const operatingMode = deriveSessionOperatingMode(session, req);
  session.operatingMode = operatingMode;
  let pdfBase64: string | undefined;
  if (format === "pdf" || format === "both") {
    const { markdownExportToPdfBuffer } = await import("./export/pdfFromMarkdown.js");
    pdfBase64 = (await markdownExportToPdfBuffer(content)).toString("base64");
  }
  res.json({
    planId: `plan_${sessionId}`,
    format: format === "both" ? "both" : format === "pdf" ? "pdf" : "markdown",
    content: format === "pdf" ? undefined : content,
    pdfBase64,
    exportRedacted: redactElectronicBuild,
    exportCreditConsumed,
    exportCreditsRemaining: billingUser ? billingUser.exportCreditsRemaining : 0,
    trialConsumed,
    user: billingUser ? toPublicUser(billingUser) : undefined,
    operatingMode,
    hasGmConsole: operatingMode === "venue",
    sessionId,
  });
});

app.post("/api/plans/:sessionId/save", async (req, res) => {
  const userId = await requireAuthUserId(req, res, authTokenStore);
  if (!userId) return;
  const user = getStoredUserById(userId);
  if (!user) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "User not found.", details: [] } });
    return;
  }
  const saveDenied = trialSaveError(user);
  if (saveDenied) {
    res.status(403).json({ error: { code: saveDenied.code, message: saveDenied.message, details: [] } });
    return;
  }
  const sessionId = req.params.sessionId;
  const session = resolvePlanningSession(sessionId);
  if (!session) {
    respondInvalidPlanningSession(res, sessionId);
    return;
  }
  const isDraft = Boolean(req.body?.draft);
  const approvedForBuild = isDraft ? false : Boolean(req.body?.approvedForBuild);
  if (!isDraft && !approvedForBuild) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "Plan must be approved for build before saving.", details: [] },
    });
    return;
  }
  const priorSaved = savedPlansByUser.get(userId) ?? [];
  const priorCount = priorSaved.length;
  const cap = effectiveRoomAllowance(user);

  if (!user.isAdmin && priorCount >= cap) {
    res.status(403).json({
      error: {
        code: "SUBSCRIPTION_REQUIRED",
        message: `You are using ${priorCount} of ${cap} saved room slot${cap === 1 ? "" : "s"}. Purchase more room slots to save another plan, or delete a saved plan to free a slot.`,
        details: [],
      },
    });
    return;
  }

  const rawName = String(req.body?.name ?? "").trim();
  const planName =
    rawName ||
    (isDraft
      ? `Draft — ${session.selectedTheme?.name ?? "Untitled"} — ${new Date().toLocaleString()}`
      : `${session.selectedTheme?.name ?? "Untitled"} Plan`);
  const compatibilityPassed = session.currentPuzzles.every((puzzle) =>
    isPuzzleCompatibleWithTheme(puzzle, session.selectedTheme),
  );
  const nowIso = new Date().toISOString();
  const plan: SavedPlan = {
    planId: `saved_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId,
    sessionId,
    name: planName,
    approvedForBuild,
    createdAt: nowIso,
    updatedAt: nowIso,
    data: {
      planningInput: session.planningInput,
      themes: session.generatedThemes.length ? session.generatedThemes : [...session.customThemes],
      selectedThemeId: session.selectedTheme?.id ?? "",
      puzzles: session.currentPuzzles,
      suggestedAdditions: session.suggestedAdditions,
      suggestedAdditionsRequired: session.suggestedAdditionsRequired,
      storyPlan: session.currentStoryPlan ?? null,
      compatibilityPassed,
      exportContent: "",
      themeCoachChat: session.themeCoachChat,
    },
  };
  const current = savedPlansByUser.get(userId) ?? [];
  current.unshift(plan);
  savedPlansByUser.set(userId, current.slice(0, 100));
  await persistSavedPlans();
  rebuildGlobalSavedAssetLocks();
  await appendBillingAudit({
    userId,
    email: user.email,
    action: "plan_saved",
    detail: { planId: plan.planId, planName: plan.name, slotCountAfter: priorCount + 1 },
  });
  res.status(201).json({
    savedPlan: {
      planId: plan.planId,
      name: plan.name,
      approvedForBuild: plan.approvedForBuild,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      sessionId,
    },
  });
});

app.get("/api/plans/saved", async (req, res) => {
  const userId = await requireAuthUserId(req, res, authTokenStore);
  if (!userId) return;
  const plans = (savedPlansByUser.get(userId) ?? []).map((plan) => ({
    planId: plan.planId,
    name: plan.name,
    approvedForBuild: plan.approvedForBuild,
    sessionId: plan.sessionId,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
    themeName: plan.data.themes.find((theme) => theme.id === plan.data.selectedThemeId)?.name ?? "Unknown Theme",
    puzzleCount: plan.data.puzzles.length,
  }));
  res.json({ plans });
});

/** Restore in-memory planning session from disk so puzzle replace / generate match the UI after loading a saved plan. */
const rehydrateLiveSessionFromSavedPlan = (plan: SavedPlan, ownerUserId: string): void => {
  const d = plan.data;
  const raw = d.planningInput;
  const planningInput: SessionState["planningInput"] = {
    playersConcurrent: Number.isFinite(Number(raw.playersConcurrent)) ? Number(raw.playersConcurrent) : 4,
    participantsTotal: Number.isFinite(Number(raw.participantsTotal)) ? Number(raw.participantsTotal) : 6,
    sessionDurationMinutes: Number.isFinite(Number(raw.sessionDurationMinutes)) ? Number(raw.sessionDurationMinutes) : 45,
    environmentType: String(raw.environmentType ?? ""),
    availableItems: Array.isArray(raw.availableItems) ? raw.availableItems.map((item) => String(item)) : [],
    existingPuzzles: Array.isArray(raw.existingPuzzles) ? raw.existingPuzzles : [],
    roomDifficulty: normalizeRoomDifficulty(raw.roomDifficulty),
    youthAddOnEnabled: Boolean(raw.youthAddOnEnabled),
    youthAddOnGatesAdultFlow: Boolean(raw.youthAddOnGatesAdultFlow),
    youthAddOnAgeNote: typeof raw.youthAddOnAgeNote === "string" ? raw.youthAddOnAgeNote.slice(0, 400) : "",
    eventType: typeof raw.eventType === "string" ? raw.eventType.slice(0, 200) : "",
    mainTrackPuzzleCountOverride:
      typeof raw.mainTrackPuzzleCountOverride === "number" && Number.isFinite(raw.mainTrackPuzzleCountOverride)
        ? raw.mainTrackPuzzleCountOverride
        : null,
    puzzleMixLogic: typeof raw.puzzleMixLogic === "number" && Number.isFinite(raw.puzzleMixLogic) ? raw.puzzleMixLogic : null,
    puzzleMixPhysical: typeof raw.puzzleMixPhysical === "number" && Number.isFinite(raw.puzzleMixPhysical) ? raw.puzzleMixPhysical : null,
    puzzleMixElectronic:
      typeof raw.puzzleMixElectronic === "number" && Number.isFinite(raw.puzzleMixElectronic) ? raw.puzzleMixElectronic : null,
    themeMustMatchEnvironment: Boolean(raw.themeMustMatchEnvironment),
    venueBuildType: parseVenueBuildType(raw.venueBuildType),
    targetInterface: parseTargetInterface(raw.targetInterface),
  };
  const selectedTheme = d.themes.find((t) => t.id === d.selectedThemeId);
  const session: SessionState = {
    planningInput,
    themeCoachChat: d.themeCoachChat ?? [],
    customThemes: [],
    generatedThemes: [...d.themes],
    selectedTheme,
    generatedThemeCount: d.themes.length,
    seenThemeIds: new Set(d.themes.map((t) => t.id)),
    seenThemeTitlesLower: new Set(
      (d.themes ?? []).flatMap((t) => {
        const k = normalizeThemeTitleKey(t.name ?? "");
        return k ? [k] : [];
      }),
    ),
    seenPuzzleIds: new Set(d.puzzles.map((p) => p.id)),
    currentPuzzles: withPuzzleQaForTheme(d.puzzles.map((p) => ({ ...p })), selectedTheme?.name ?? "Saved plan"),
    suggestedAdditions: [...(d.suggestedAdditions ?? [])],
    suggestedAdditionsRequired: [...(d.suggestedAdditionsRequired ?? [])],
    currentStoryPlan: d.storyPlan ?? undefined,
    roomManifest: defaultRoomManifest(),
  };
  sessions.set(plan.sessionId, session);
  sessionUserOwners.set(plan.sessionId, ownerUserId);
};

app.get("/api/plans/saved/:planId", async (req, res) => {
  const userId = await requireAuthUserId(req, res, authTokenStore);
  if (!userId) return;
  const planId = req.params.planId;
  const plan = (savedPlansByUser.get(userId) ?? []).find((entry) => entry.planId === planId);
  if (!plan) {
    res.status(404).json({ error: { code: "PLAN_NOT_FOUND", message: "Saved plan not found.", details: [] } });
    return;
  }
  rehydrateLiveSessionFromSavedPlan(plan, userId);
  res.json({ savedPlan: plan });
});

app.delete("/api/plans/saved/:planId", async (req, res) => {
  const userId = await requireAuthUserId(req, res, authTokenStore);
  if (!userId) return;
  const planId = req.params.planId;
  const current = savedPlansByUser.get(userId) ?? [];
  const next = current.filter((entry) => entry.planId !== planId);
  if (next.length === current.length) {
    res.status(404).json({ error: { code: "PLAN_NOT_FOUND", message: "Saved plan not found.", details: [] } });
    return;
  }
  savedPlansByUser.set(userId, next);
  await persistSavedPlans();
  rebuildGlobalSavedAssetLocks();
  const u = getStoredUserById(userId);
  if (u) {
    void appendBillingAudit({
      userId,
      email: u.email,
      action: "plan_deleted",
      detail: { planId, remainingAfter: next.length },
    });
  }
  res.json({ deletedPlanId: planId, remaining: next.length });
});

app.get("/api/debug/skip-history", (_req, res) => {
  pruneExpiredSkips();
  const now = Date.now();
  const entries = Array.from(skipEntries.values()).map((entry) => ({
    ...entry,
    expiresAtMs: entry.skippedAtMs + SKIP_TTL_MS,
    remainingMs: Math.max(entry.skippedAtMs + SKIP_TTL_MS - now, 0),
  }));
  res.json({ count: entries.length, entries });
});

app.delete("/api/debug/skip-history", (req, res) => {
  const type = req.query.type as SkipEntryType | undefined;
  const id = req.query.id as string | undefined;

  if (type && type !== "theme" && type !== "puzzle") {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "type must be 'theme' or 'puzzle'.", details: [] },
    });
    return;
  }

  let removed = 0;
  if (!type && !id) {
    removed = skipEntries.size;
    skipEntries.clear();
  } else {
    for (const [key, entry] of skipEntries.entries()) {
      const typeMatch = !type || entry.type === type;
      const idMatch = !id || entry.id === id;
      if (typeMatch && idMatch) {
        skipEntries.delete(key);
        removed += 1;
      }
    }
  }

  void persistSkipHistory();
  res.json({ removed, remaining: skipEntries.size });
});

const applyPlanTopUp = (
  user: StoredUser,
  planId: string,
  options?: { layoutRoomCount?: number },
): { roomsAdded: number; exportCreditsAdded: number } | null => {
  const plan = billingPlanById(planId);
  if (!plan || !plan.purchasable) return null;
  const quote = quotePlanCheckout(plan, options?.layoutRoomCount);
  if (quote.roomsToAdd <= 0) return null;
  user.roomAllowance = Math.min(MAX_ROOM_ALLOWANCE, user.roomAllowance + quote.roomsToAdd);
  user.exportCreditsRemaining = Math.min(500_000, user.exportCreditsRemaining + quote.exportCreditsToAdd);
  const pid = plan.id;
  const prevResolved = user.lastPurchasedPlanId ? resolveBillingPlanId(user.lastPurchasedPlanId) : undefined;
  const prevRank = prevResolved ? PLAN_TIER_RANK[prevResolved] : -1;
  if (PLAN_TIER_RANK[pid] > prevRank) {
    user.lastPurchasedPlanId = pid;
  }
  return { roomsAdded: quote.roomsToAdd, exportCreditsAdded: quote.exportCreditsToAdd };
};

// ─── Inspiration API ───────────────────────────────────────────────────────

interface InspirationPuzzleNode {
  puzzleConcept: string;
  requiredProps: string[];
}

interface InspirationApiResult {
  theme: string;
  narrativeHook: string;
  puzzlesAndProps: InspirationPuzzleNode[];
  source: "openai" | "mock";
}

function buildInspirationMock(environmentType: string, targetNodeCount: number): InspirationApiResult {
  const env = environmentType.toLowerCase();

  type MockTemplate = { keywords: string[]; theme: string; hook: string; nodes: InspirationPuzzleNode[] };
  const TEMPLATES: MockTemplate[] = [
    {
      keywords: ["living room", "lounge", "family room"],
      theme: "The Vanished Archivist",
      hook: "A brilliant archivist vanished overnight, leaving behind a labyrinth of coded journals and hidden compartments. You have 60 minutes to decode her final message before the library seals forever.",
      nodes: [
        { puzzleConcept: "Decode a numeric cipher hidden in book spine numbers arranged on the shelf", requiredProps: ["bookshelf with numbered spines", "printed cipher key card", "pencil"] },
        { puzzleConcept: "Unlock a combination box using a UV-light-revealed clue hidden on a framed photo", requiredProps: ["framed photo with UV-ink message", "UV flashlight", "3-digit combination lock box"] },
        { puzzleConcept: "Reassemble a torn letter to reveal coordinates pointing to the final hiding spot", requiredProps: ["torn paper pieces", "clear tape", "cork board with push pins"] },
        { puzzleConcept: "Match color-coded sticky tabs in a bookshelf to a pattern on the area rug to find the keyword", requiredProps: ["colored sticky note tabs", "area rug with geometric pattern", "notebook"] },
        { puzzleConcept: "Solve a logic grid puzzle printed on the back of a postcard to reveal a 4-digit code", requiredProps: ["printed logic grid postcard", "pencil", "4-digit padlock"] },
        { puzzleConcept: "Use a translucent overlay on an old map to reveal a hidden phrase", requiredProps: ["printed city map", "tracing paper overlay", "red marker"] },
      ],
    },
    {
      keywords: ["kitchen", "dining", "pantry"],
      theme: "The Alchemist's Kitchen",
      hook: "A medieval alchemist's recipe for immortality was hidden here centuries ago. Now you must decode the cryptic ingredient list before the next bell tolls and the secret is lost forever.",
      nodes: [
        { puzzleConcept: "Decode a recipe cipher where ingredient quantities map to letters of the alphabet", requiredProps: ["printed recipe card with coded quantities", "conversion chart", "pencil"] },
        { puzzleConcept: "Arrange spice jars in a specific color sequence to spell a word using label first-letters", requiredProps: ["labeled spice jars", "color-coded shelf markers", "reference clue card"] },
        { puzzleConcept: "Use a kitchen scale to weigh bagged items whose total reveals a numeric code", requiredProps: ["small kitchen scale", "labeled ingredient bags (non-hazardous)", "padlock"] },
        { puzzleConcept: "Find a hidden message on a cutting board visible only when tilted under a lamp", requiredProps: ["wooden cutting board with carved message", "directional lamp", "magnifying glass"] },
        { puzzleConcept: "Match cooking timer settings to a wall chart of alchemical symbols to unlock a cabinet", requiredProps: ["kitchen timer", "printed symbol chart", "small cabinet with padlock"] },
      ],
    },
    {
      keywords: ["bedroom", "guest room", "kids room"],
      theme: "The Dreamweaver's Chamber",
      hook: "A mysterious dreamweaver has trapped you in a waking dream. Every object in the room is a clue to escaping her labyrinth — but only if you can tell what's real from what's illusion.",
      nodes: [
        { puzzleConcept: "Decode a message hidden on the inside of a pillowcase only visible with a UV flashlight", requiredProps: ["pillowcase with UV message", "UV flashlight", "decoded clue card"] },
        { puzzleConcept: "Use a mirror and a reversed map to navigate to the correct drawer handle sequence", requiredProps: ["hand mirror", "printed reversed map", "dresser with labeled drawers"] },
        { puzzleConcept: "Reassemble torn dream journal pages to find the safe word that opens the lockbox", requiredProps: ["torn journal pages", "clear tape", "lockbox with word lock"] },
        { puzzleConcept: "Match constellations on the bedroom ceiling (glow stars) to a star chart to reveal coordinates", requiredProps: ["glow-in-dark star stickers on ceiling", "printed star chart", "coordinate reference"] },
      ],
    },
    {
      keywords: ["garage", "workshop", "basement", "shed"],
      theme: "The Engineer's Last Blueprint",
      hook: "The eccentric inventor who owned this workshop vanished the night before her greatest invention was to be revealed. The prototype is hidden here — find it before her rivals do.",
      nodes: [
        { puzzleConcept: "Read a schematic diagram to determine which tool-hook positions spell a 4-number access code", requiredProps: ["printed schematic", "pegboard with numbered hooks", "tools hung in a pattern"] },
        { puzzleConcept: "Use a battery tester on marked cells — only cells testing 'full' correspond to a binary code", requiredProps: ["battery tester", "assorted labeled batteries", "binary-to-decimal chart"] },
        { puzzleConcept: "Arrange wooden blocks by weight (using a balance) to match a blueprint load specification", requiredProps: ["assorted wooden blocks", "balance scale", "printed load spec card"] },
        { puzzleConcept: "Shine a flashlight through a stencil plate onto the wall to reveal a hidden map", requiredProps: ["metal stencil plate", "flashlight", "blank wall section"] },
        { puzzleConcept: "Trace a circuit diagram on paper to identify the correct switch sequence on a prop panel", requiredProps: ["printed circuit diagram", "cardboard switch panel with labels", "pencil"] },
      ],
    },
  ];

  const match = TEMPLATES.find((t) => t.keywords.some((kw) => env.includes(kw)));
  const tpl = match ?? {
    theme: "The Lost Expedition",
    hook: "A renowned explorer vanished during her final expedition. You've stumbled upon her base camp and must piece together what happened — and escape before the search party closes in.",
    nodes: [
      { puzzleConcept: "Decode a compass cipher using map coordinates from the explorer's field journal", requiredProps: ["compass", "printed journal pages", "grid overlay sheet"] },
      { puzzleConcept: "Reassemble torn expedition photographs to reveal a hidden trail symbol", requiredProps: ["torn photograph pieces", "clear tape", "magnifying glass"] },
      { puzzleConcept: "Unlock a padlocked field kit using a code derived from specimen jar labels", requiredProps: ["padlocked box", "labeled specimen jars", "decoded reference card"] },
      { puzzleConcept: "Match flagging tape colors to a hand-drawn trail map to locate the supply cache", requiredProps: ["colored flagging tape lengths", "hand-drawn trail map", "small locked container"] },
      { puzzleConcept: "Reconstruct a broken radio frequency dial position from scratched log book entries", requiredProps: ["prop radio with dial", "scratched log book", "frequency reference chart"] },
      { puzzleConcept: "Decode Morse code tapped on a wall into a 5-letter word lock combination", requiredProps: ["Morse code reference card", "5-letter word lock", "timing metronome or audio clue"] },
    ],
  };

  const nodes = [...tpl.nodes];
  const filler: InspirationPuzzleNode[] = [
    { puzzleConcept: "Find a hidden note inside a sealed envelope taped behind a picture frame", requiredProps: ["picture frame", "sealed envelope", "adhesive tape"] },
    { puzzleConcept: "Use a black-light pen message on the window to reveal the final clue", requiredProps: ["UV pen", "UV flashlight", "window surface"] },
    { puzzleConcept: "Solve a jigsaw fragment puzzle to reveal a 4-digit numeric code", requiredProps: ["custom jigsaw pieces", "reference image card", "padlock"] },
  ];
  let fi = 0;
  while (nodes.length < targetNodeCount) {
    nodes.push(filler[fi % filler.length] ?? { puzzleConcept: `Bonus challenge ${nodes.length + 1}`, requiredProps: ["paper", "pencil"] });
    fi++;
  }

  return { theme: tpl.theme, narrativeHook: tpl.hook, puzzlesAndProps: nodes.slice(0, targetNodeCount), source: "mock" };
}

async function callOpenAiInspiration(
  apiKey: string,
  input: {
    environmentType: string;
    availableItems: string;
    targetNodeCount: number;
    themeMustMatchEnvironment: boolean;
    eventType: string;
    themeName: string;
  },
): Promise<InspirationApiResult> {
  const envConstraint = input.themeMustMatchEnvironment
    ? `\n\nENVIRONMENTAL CONSTRAINT — HIGH PRIORITY: Strictly limit ALL props, puzzle mechanics, and narrative elements to what is physically realistic and thematically appropriate for a "${input.environmentType}" setting. Do NOT suggest high-tech electronics, futuristic devices, advanced digital equipment, sci-fi technology, or any prop that would be anachronistic or physically impossible in this specific environment. Every puzzle and prop must be something a home host could realistically obtain and set up within the actual constraints of "${input.environmentType}".`
    : "";

  const systemPrompt = [
    "You are an expert escape room designer helping a home host plan a fully original, immersive escape room.",
    "Your task: return a strictly-typed JSON object with a unique theme name, a compelling narrative hook, and exactly the requested number of themed puzzle nodes.",
    "All puzzle concepts must be original, home-buildable, and narratively integrated with the theme.",
    "Props must be real physical items a home host could realistically acquire or craft.",
    "Return ONLY valid JSON with no markdown fences, no commentary, no extra text.",
    envConstraint,
  ]
    .filter(Boolean)
    .join("\n");

  const userPrompt = [
    `Environment: ${input.environmentType || "home living room"}`,
    `Available props / items on hand: ${input.availableItems || "none specified — suggest common household items"}`,
    `Event context: ${input.eventType || "home escape room for friends and family"}`,
    `Theme preference: ${input.themeName || "generate a fresh, original theme"}`,
    `Required puzzle node count: ${input.targetNodeCount}`,
    "",
    "Return JSON matching this exact shape:",
    "{",
    '  "theme": "Unique escape room theme name",',
    '  "narrativeHook": "2–3 sentence story setup that draws players in and sets the stakes",',
    '  "puzzlesAndProps": [',
    '    { "puzzleConcept": "Specific, buildable puzzle mechanic tied to the theme", "requiredProps": ["prop1", "prop2"] }',
    "  ]",
    "}",
    "",
    `puzzlesAndProps MUST contain exactly ${input.targetNodeCount} items. Each puzzleConcept must be distinct, thematically tied, and practically buildable at home.`,
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 1600,
      temperature: 0.75,
    }),
    signal: AbortSignal.timeout(28_000),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI ${response.status}: ${body.slice(0, 300)}`);
  }

  const data = (await response.json()) as { choices: Array<{ message: { content: string } }> };
  const raw = data.choices[0]?.message?.content ?? "";
  const jsonStart = raw.indexOf("{");
  const jsonEnd = raw.lastIndexOf("}");
  if (jsonStart < 0 || jsonEnd <= jsonStart) throw new Error("No JSON object in OpenAI response");
  const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as {
    theme?: unknown;
    narrativeHook?: unknown;
    puzzlesAndProps?: unknown;
  };

  const nodes: InspirationPuzzleNode[] = (Array.isArray(parsed.puzzlesAndProps) ? parsed.puzzlesAndProps : [])
    .map((n: unknown) => {
      const node = n as Record<string, unknown>;
      return {
        puzzleConcept: typeof node.puzzleConcept === "string" ? node.puzzleConcept.trim() : "",
        requiredProps: Array.isArray(node.requiredProps)
          ? (node.requiredProps as unknown[]).filter((p): p is string => typeof p === "string" && p.trim().length > 0)
          : [],
      };
    })
    .filter((n: InspirationPuzzleNode) => n.puzzleConcept.length > 0);

  return {
    theme: typeof parsed.theme === "string" && parsed.theme.trim() ? parsed.theme.trim() : "Custom Escape Room",
    narrativeHook: typeof parsed.narrativeHook === "string" ? parsed.narrativeHook.trim() : "",
    puzzlesAndProps: nodes,
    source: "openai",
  };
}

app.post("/api/inspiration/generate", async (req, res) => {
  const {
    environmentType = "",
    availableItems = "",
    targetNodeCount: rawNodeCount,
    themeMustMatchEnvironment = false,
    eventType = "",
    themeName = "",
  } = (req.body ?? {}) as Record<string, unknown>;

  const targetNodeCount = Math.min(
    24,
    Math.max(1, Number.isFinite(Number(rawNodeCount)) ? Math.trunc(Number(rawNodeCount)) : 4),
  );
  const env = String(environmentType).trim().slice(0, 500);
  const apiKey = String(process.env.OPENAI_API_KEY ?? "").trim();

  if (!apiKey) {
    res.json(buildInspirationMock(env, targetNodeCount));
    return;
  }

  try {
    const result = await callOpenAiInspiration(apiKey, {
      environmentType: env,
      availableItems: String(availableItems).trim().slice(0, 500),
      targetNodeCount,
      themeMustMatchEnvironment: Boolean(themeMustMatchEnvironment),
      eventType: String(eventType).trim().slice(0, 200),
      themeName: String(themeName).trim().slice(0, 200),
    });
    res.json(result);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[inspiration] OpenAI error — falling back to mock:", err instanceof Error ? err.message : String(err));
    res.json(buildInspirationMock(env, targetNodeCount));
  }
});

// ─── End Inspiration API ────────────────────────────────────────────────────

const port = process.env.PORT || 3001;

const recomputeIdCountersFromSessions = (): void => {
  for (const id of sessions.keys()) {
    const match = /^sess_(\d+)$/.exec(id);
    if (match) nextSessionId = Math.max(nextSessionId, Number(match[1]) + 1);
  }
  for (const session of sessions.values()) {
    const themes = [
      ...(session as SessionState).customThemes,
      ...(session as SessionState).generatedThemes,
      ...((session as SessionState).selectedTheme ? [(session as SessionState).selectedTheme!] : []),
    ];
    for (const theme of themes) {
      const match = /(\d+)$/.exec(theme.id);
      if (match) nextThemeId = Math.max(nextThemeId, Number(match[1]) + 1);
    }
  }
};

let bootstrapPromise: Promise<void> | null = null;

const finishBootstrap = async (): Promise<void> => {
  let usersMigrated = false;
  for (const user of usersByEmail.values()) {
    if (user.isAdmin) continue;
    const savedCount = savedPlanCountForUser(user.id);
    if (savedCount > 0 && !user.trialUsedAt) {
      user.trialUsedAt = new Date(0).toISOString();
      usersMigrated = true;
    }
    if (savedCount === 0 && user.roomAllowance === 1 && !user.trialUsedAt) {
      user.roomAllowance = FREE_TIER_ROOM_ALLOWANCE;
      usersMigrated = true;
    }
  }
  if (usersMigrated) await persistUsers();

  billingRouteDeps = {
    readAuthUser: async (req) => {
      const user = await readAuthUser(req);
      return user ? { id: user.id, email: user.email, isAdmin: user.isAdmin } : null;
    },
    findUserById: (userId) => getStoredUserById(userId) ?? null,
    applyPlanTopUp: (user, planId, options) => applyPlanTopUp(user as StoredUser, planId, options),
    persistUsers,
    appendBillingAudit,
    toPublicUser: (user) => toPublicUser(user as StoredUser),
  };
  registerBillingRoutes(app, () => billingRouteDeps!);
  registerLiveRoutes(app, {
    resolvePlanningSession: (sessionId) => resolvePlanningSession(sessionId),
    deriveOperatingMode: (session) => deriveSessionOperatingMode(session as SessionState),
    hasGmConsoleAccess: async (req) => {
      const user = await readAuthUser(req);
      return Boolean(user && hasGmConsoleAccess(user));
    },
    readAuthUser: async (req) => (await readAuthUser(req)) ?? undefined,
    getSessionOwnerId: (sessionId) => sessionUserOwners.get(sessionId),
    assertLiveInitAllowed: async (req, sessionId, operatingMode) => {
      const user = await readAuthUser(req);
      const frozen = liveOpsFrozenError(user);
      if (frozen && operatingMode === "venue") return frozen;
      if (operatingMode !== "venue") return null;
      const ownerId = user?.id ?? sessionUserOwners.get(sessionId);
      if (!ownerId || !user) return null;
      const otherVenue = countActiveVenueLiveSessions(ownerId, sessionId, (sid) => sessionUserOwners.get(sid));
      return fleetActivationError(user, otherVenue);
    },
    appendOperationalAudit: appendBillingAudit,
  });

  registerAdminRoutes(app, {
    readAuthUser: async (req) => (await readAuthUser(req)) ?? undefined,
    usersByEmail,
    persistUsers,
    appendBillingAudit,
    readBillingAudit: readBillingAuditLines,
    toPublicUser: (user) => toPublicUser(user as StoredUser),
    getLiveConnectionStats: getActiveLiveConnectionStats,
    clearSessionLocks: (userId) => {
      let cleared = 0;
      for (const [sessionId, ownerId] of [...sessionUserOwners.entries()]) {
        if (!userId || ownerId === userId) {
          sessionUserOwners.delete(sessionId);
          cleared += 1;
        }
      }
      return cleared;
    },
  });
};

const loadDeferredStorage = async (): Promise<void> => {
  await loadSkipHistory();
  await loadOrganizationPools();
  await loadUsageLedger();
  await loadSavedPlans();
  await loadPlanningSessions(sessions, deserializeSessionFromDisk);
  for (const [id, raw] of [...sessions.entries()]) {
    const session = raw as SessionState;
    if (isSessionLeaseExpired(session)) sessions.delete(id);
    else if (!session.leaseExpiresAt) touchSessionLease(session);
  }
  recomputeIdCountersFromSessions();
};

export async function bootstrap(): Promise<void> {
  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = (async () => {
    await ensureDataDir();
    const onVercel = Boolean(process.env.VERCEL);

    if (onVercel) {
      const { isKvConfigured } = await import("./kvJsonStore.js");
      if (!isKvConfigured()) {
        // eslint-disable-next-line no-console
        console.error(
          "[bootstrap] VERCEL without KV_REST_API_URL/KV_REST_API_TOKEN: auth tokens and users will not persist across serverless instances. Link Upstash Redis (Vercel KV) to this project.",
        );
      }
      await Promise.all([loadUsers(), authTokenStore.ensureLoaded()]);
      await finishBootstrap();
      void loadDeferredStorage().catch((err) => {
        // eslint-disable-next-line no-console
        console.warn("[bootstrap] deferred storage load failed:", err);
      });
      return;
    }

    await loadSkipHistory();
    await loadUsers();
    await loadOrganizationPools();
    await loadUsageLedger();
    await loadSavedPlans();
    await authTokenStore.ensureLoaded();
    await loadPlanningSessions(sessions, deserializeSessionFromDisk);
    recomputeIdCountersFromSessions();
    await finishBootstrap();
  })();

  return bootstrapPromise;
}

export { app };

if (!process.env.VERCEL) {
  void bootstrap().then(() => {
    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`Backend running on http://localhost:${port}`);
    });
  });
}

