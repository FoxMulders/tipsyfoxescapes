import {
  createElement,
  Fragment,
  lazy,
  Suspense,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import { computePlanCompletionPercent } from "./planCompletionScore.ts";
import { Link, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  consumeOAuthReturnSnapshot,
  peekOAuthReturnSnapshot,
  stashOAuthReturnSnapshot,
  type OAuthReturnSnapshot,
} from "./oauthReturnSnapshot.ts";
import { isSignInForPuzzlesMessage, toastErrorOnce, toastMessageOnce, TOAST_ID } from "./toastNotify.ts";
import { GlobalFooter } from "@/components/layout/GlobalFooter";
import { BuilderLegalDisclaimer } from "@/components/layout/BuilderLegalDisclaimer";
import { OutputReviewActionBar } from "@/components/builder/OutputReviewActionBar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { StagingPropListItem } from "@/components/builder/StagingPropListItem";
import { PuzzleCategoryBadge } from "@/components/puzzle/PuzzleCategoryBadge";
import { PuzzleRequiredPartsBlock } from "@/components/puzzle/PuzzleRequiredPartsBlock";
import { PuzzleSolveStepsBlock } from "@/components/puzzle/PuzzleSolveStepsBlock";
import { isMaglockPuzzle } from "@/lib/puzzleDisplayUtils";
import { PlanningSnapshotSheet } from "@/components/layout/PlanningSnapshotSheet";
import { TopNavBar } from "@/components/layout/TopNavBar";
import { AppAtmosphere } from "@/components/layout/AppAtmosphere";
import { useTopNavHeight } from "@/hooks/useTopNavHeight";
import { clearOAuthReturnMarker, hasOAuthReturnMarker, setOAuthReturnMarker } from "./oauthClientCookie.ts";
import { completeOAuthExchange } from "./oauthExchangeComplete.ts";
import {
  ephemeralAuthStoreWarning,
  fetchServiceHealth,
  socialLoginBlockedMessage,
  type ServiceHealth,
} from "./serviceHealth.ts";
import {
  clearPendingSocialOAuth,
  launchSocialOAuthRedirect,
  resolveOAuthReturnTo,
  restorePendingSocialOAuthProvider,
  subscribeOAuthPendingRecovery,
} from "./oauthSocialLaunch.ts";
import {
  consumeOAuthPlanningStash,
  peekOAuthPlanningStash,
  stashPlanningSessionForOAuth,
} from "./oauthPlanningBridge.ts";
import {
  consumeWorkspaceDraftForOAuth,
  stashWorkspaceDraftForOAuth,
  type OAuthWorkspaceDraft,
} from "./oauthWorkspaceBridge.ts";
import {
  authFetch,
  configureAuthApi,
  ensureAuthBootstrap,
  isFatalAuthError,
  isRecoverableAuthError,
  parseAuthErrorCode,
} from "./authApi.ts";
import {
  AUTH_STORAGE_KEY,
  clearAuthSession,
  loadAuthSession,
  saveAuthSession,
  subscribeCrossTabAuth,
  type StoredAuthSession,
} from "./authStorage.ts";
import { FlowStepIntro } from "@/components/planning/FlowStepIntro";
import { BuilderErrorBoundary } from "@/components/BuilderErrorBoundary";
import { MissionFlowMap } from "@/components/planning/MissionFlowMap";
import { type BillingPlan } from "@/components/account/PlansAndBillingSection";
import { resolveSquareWebEnvironment } from "@/lib/squareEnv";
import { EmptyRoomInstallChecklist } from "@/components/planning/EmptyRoomInstallChecklist";
import { BuilderPersistentWorkspace } from "@/features/workspace/BuilderPersistentWorkspace";
import { ExperienceThemeSection } from "@/features/workspace/ExperienceThemeSection";
import { WorkspaceSessionExpiredOverlay } from "@/features/workspace/WorkspaceSessionExpiredOverlay";
import { PuzzleThemesStepShell } from "@/features/workspace/PuzzleThemesStepShell";
import { ThemeStepPortalOrStatic } from "@/features/workspace/ThemeStepPortalOrStatic";
import { CouncilTelemetryPanel } from "@/features/planning/components/GenerationTelemetryPanel";
import { OpenAiOpsBanner } from "@/features/planning/components/OpenAiOpsBanner";
import type { GenerationTelemetry } from "@/features/planning/domain/generationTelemetry";
import { PlanningProvider, type PlanningContextValue } from "@/features/planning/context/PlanningProvider";
import { PlanningBridge } from "@/features/planning/context/PlanningBridge";
import { applyRoomSkeletonToLayout, buildHeuristicRoomSkeleton, layoutHasOnlyPresetShell } from "@/features/planning/layout-designer/roomSkeletonLayout";
import type { RoomSkeleton } from "../../shared/roomSkeleton";
import { estimatePuzzleNodes } from "@/features/planning/domain/estimatePuzzleNodes";
import { EVENT_CONTEXT_PRESETS, ENVIRONMENT_CUSTOM_OPTION, ENVIRONMENT_PRESETS, getSuggestedPropOptionsForPlanning, isCommercialVenueEventContext, PROP_LABEL_BLOCKLIST } from "@/features/planning/domain/propPresets";
import { dedupeStringsPreserveOrder } from "@/features/planning/domain/parseItems";
import { PlanningStateSync } from "@/features/planning/context/PlanningStateSync";
import { PlanningAppHydrate } from "@/features/planning/context/PlanningAppHydrate";
import type { PlanningFormState } from "@/features/planning/domain/planningTypes";
import { isCreativeEnginesEnabled } from "@/features/creative-engines/featureFlag.ts";
import { ThemeCuratedCard } from "@/components/planning/ThemeCuratedCard";
import {
  calculateEscapePlanPrice,
  createEscapePlanRoom,
  formatCentsUsd,
  SCALABLE_OPERATOR_PLAN_ID,
  type EscapePlanRoomProfile,
} from "../../shared/escapePlanPricing";
import type { PropFabricationKind } from "@/components/planning/PropFabricationSection";
import type { TargetInterface, VenueBuildType } from "../../shared/contracts";
import { classifyApiCatchError, parseApiJson, unexpectedApiResponseMessage } from "./apiErrors.ts";
import { filterJuniorStoryHooks } from "./juniorStoryHooks.ts";
import {
  fetchPlanningSessionHealth,
  isInvalidPlanningSessionResponse,
  planningSessionRecoveryNotice,
  renewPlanningSessionLease,
} from "./planningSession.ts";
import {
  clearPersistedPlanningSession,
  loadPersistedPlanningSession,
  persistPlanningSessionId,
} from "./planningSessionStore.ts";
import {
  enhancePlanInBrowser,
  isBrowserAiAvailable,
  isMobileLikeDevice,
  polishThemeBriefInBrowser,
  probeBrowserLanguageModel,
  refineThemeFitReasonInBrowser,
} from "./browserAi.ts";
import { ThemeGenerateButton } from "@/components/themes/ThemeGenerateButton";
import { generateThemesInBrowser } from "./browserAiThemes.ts";
import { GenerationProgressIndicator } from "@/components/generation/GenerationProgressIndicator";
import { PUZZLE_GENERATION_PHASES, THEME_GENERATION_PHASES } from "@/components/generation/GenerationProgressPhases";
import { generatePuzzlesInBrowser } from "./browserAiPuzzles.ts";
import { estimateBrowserCategoryCounts } from "./browserGenerationPlanning.ts";
import type { CustomThemeCoachContext, CustomThemeCoachMessage } from "./browserAiCoach.ts";
import {
  buildAssistantCoachMessage,
  getCoachCoverageStatus,
  getLatestPendingCoachOptions,
  isAllowedCoachUserReply,
  isCoachReadyToSynthesize,
  newCoachMessageId,
  type ThemeCoachUiMessage,
} from "@/components/themes/themeCoachUtils";
import { getOrCreateDeviceId } from "./deviceId.ts";
import { initLiveSession } from "@/live/api";
import {
  operatingModeToTargetInterface,
  targetInterfaceToOperatingMode,
  type OperatingMode,
} from "../../shared/liveContracts";

const APP_BUILD_STAMP = typeof __APP_SEMVER__ !== "undefined" ? __APP_SEMVER__ : "0.0.0";

const RoomFlowchartPanel = lazy(() =>
  import("./components/RoomFlowchartPanel.tsx").then((m) => ({ default: m.RoomFlowchartPanel })),
);
const PlansAndBillingSection = lazy(() =>
  import("@/components/account/PlansAndBillingSection").then((m) => ({ default: m.PlansAndBillingSection })),
);
const InspirationDrawerPanel = lazy(() =>
  import("@/components/planning/InspirationDrawerPanel").then((m) => ({ default: m.InspirationDrawerPanel })),
);
const CustomThemeCoachPanel = lazy(() =>
  import("@/components/themes/CustomThemeCoachPanel").then((m) => ({ default: m.CustomThemeCoachPanel })),
);
const UpgradePromptDialog = lazy(() =>
  import("@/components/billing/UpgradePromptDialog").then((m) => ({ default: m.UpgradePromptDialog })),
);
const HomePostExportModal = lazy(() =>
  import("@/components/live/HomePostExportModal").then((m) => ({ default: m.HomePostExportModal })),
);
const CreativeEnginesWorkspace = lazy(() =>
  import("@/features/creative-engines/CreativeEnginesWorkspace.tsx").then((m) => ({ default: m.CreativeEnginesWorkspace })),
);
const BlueprintWorkspace = lazy(() =>
  import("@/features/planning/components/BlueprintWorkspace").then((m) => ({ default: m.BlueprintWorkspace })),
);

const BRAND_NAME = "Tipsy Fox Escapes";
const BRAND_INTRO =
  "Build your next escape room from concept to runbook. Seamlessly combine story beats, puzzle logic, and tech wiring notes into an exportable Markdown plan built specifically for indie creators and home haunts.";

type PuzzleReferenceLink = { title: string; url: string; creditTo?: string; affiliateUrl?: string };
type Puzzle = {
  id: string;
  category: "logic" | "physical" | "electronic";
  title: string;
  objective: string;
  howItWorks: string;
  themeFitReason?: string;
  referenceLinks: PuzzleReferenceLink[];
  solveSteps: string[];
  difficulty: "easy" | "medium" | "hard";
  puzzleQa?: {
    passed: boolean;
    issues: Array<{ code: string; severity: "error" | "warn"; field: string; message: string }>;
  };
  stageHint?: string;
  physical_anchor_prop?: string;
  narrative_justification?: string;
  bill_of_materials?: string[];
  required_parts_and_props?: string[];
  build_documentation_url?: string;
  audienceTrack?: "main" | "youth_addon";
  gatesAdultProgression?: boolean;
  electronicDetails?: {
    parts: string[];
    wiringDiagram: string[];
    wiringDiagramSvg: string;
    buildSteps: string[];
    arduinoCode: string;
    pinoutTable?: Array<{ pin: string; function: string; connectsTo: string }>;
  };
  /** Server preview gate — high-level label only until export credit is reserved. */
  previewLabel?: string;
  locked?: boolean;
};

const isPuzzlePreviewLocked = (puzzle: Puzzle): boolean => Boolean(puzzle.locked);

const puzzleCardHeading = (puzzle: Puzzle, puzzleNumber: number): string =>
  puzzle.previewLabel?.trim() || `Puzzle ${puzzleNumber}: ${puzzle.title}`;

function TrialBlur({ active, label, children }: { active: boolean; label: string; children: ReactNode }) {
  if (!active) return <>{children}</>;
  return (
    <div className="trial-blur-wrap">
      <div className="trial-blur-layer" aria-hidden="true">
        {children}
      </div>
      <div className="trial-blur-overlay">
        <p>{label}</p>
      </div>
    </div>
  );
}

function PuzzleReferenceAttributions({ links }: { links: PuzzleReferenceLink[] }) {
  if (!links?.length) return null;
  return (
    <ul className="reference-attributions muted">
      {links.map((ref, i) => (
        <li key={`${ref.title}-${i}`}>
          <a href={ref.url} target="_blank" rel="noreferrer">
            {ref.title}
          </a>
          {ref.creditTo ? <span className="credit-line"> — {ref.creditTo}</span> : null}
          {ref.affiliateUrl ? (
            <>
              {" "}
              <a className="affiliate-link" href={ref.affiliateUrl} target="_blank" rel="noreferrer sponsored">
                Support creator / affiliate
              </a>
            </>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
type RecommendedPuzzleBrief = Pick<Puzzle, "id" | "title" | "category" | "objective" | "howItWorks" | "difficulty">;
type Theme = { id: string; name: string; description: string; tldr?: string; recommendedPuzzles?: RecommendedPuzzleBrief[] };
type StoryPlan = {
  situation: string;
  premise: string;
  missionObjective: string;
  progressionRule: string;
  stages: Array<{
    stage: number;
    title: string;
    storyBeat: string;
    whyThisStageExists: string;
    objective: string;
    whatPlayersMustDo: string[];
    requiredPuzzleIds: string[];
    requiredPuzzleTitles: string[];
    reveals: string;
  }>;
  puzzleLinks: Array<{
    puzzleId: string;
    puzzleTitle: string;
    storyRole: string;
    unlocks: string;
  }>;
  progressionGraph?: import("./roomFlowchart").ProgressionGraph;
  stagingDiagram?: string;
};
type AuthUser = {
  id: string;
  name: string;
  email: string;
  provider: "local" | "google" | "facebook" | "github";
  isAdmin: boolean;
  roomAllowance: number;
  savedRoomCount: number;
  roomsRemaining: number;
  hasFullCatalog: boolean;
  billingTier: "admin" | "pack" | "trial" | "free";
  exportCreditsRemaining: number;
  orgPoolBonusSlots: number;
  trialUsed: boolean;
  trialRemaining: boolean;
  canSaveRooms: boolean;
  commercialTier: "free" | "home" | "studio" | "venue";
  hasGmConsole: boolean;
  operatingModeDefault: OperatingMode;
  role: "admin" | "user";
  tierType: string;
  lifecycleStatus: "active" | "delinquent" | "canceled";
  subscriptionInactive: boolean;
  readOnlyMode: boolean;
  canExportRunbook: boolean;
  hasMakerElectronics: boolean;
};

const formatBillingTierLabel = (tier: AuthUser["billingTier"]): string => {
  if (tier === "admin") return "Admin";
  if (tier === "pack") return "Paid plan";
  if (tier === "trial") return "Free trial";
  return "Free";
};

const AUTH_PROVIDER_LABELS: Record<AuthUser["provider"], string> = {
  local: "email & password",
  google: "Google",
  facebook: "Facebook",
  github: "GitHub",
};

const normalizeAuthUser = (raw: unknown): AuthUser | null => {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.email !== "string" || typeof o.name !== "string" || typeof o.provider !== "string") {
    return null;
  }
  const isAdmin = Boolean(o.isAdmin);
  let roomAllowance = Number(o.roomAllowance);
  if (!Number.isFinite(roomAllowance) || roomAllowance < 0) {
    roomAllowance = Boolean(o.subscriptionActive) ? 15 : 0;
  }
  roomAllowance = Math.floor(roomAllowance);
  let savedRoomCount = Number(o.savedRoomCount);
  if (!Number.isFinite(savedRoomCount) || savedRoomCount < 0) savedRoomCount = 0;
  savedRoomCount = Math.floor(savedRoomCount);
  let roomsRemaining = Number(o.roomsRemaining);
  if (!Number.isFinite(roomsRemaining) || roomsRemaining < 0) {
    roomsRemaining = Math.max(0, roomAllowance - savedRoomCount);
  }
  roomsRemaining = Math.floor(roomsRemaining);
  let hasFullCatalog = Boolean(o.hasFullCatalog);
  if (o.hasFullCatalog === undefined) {
    hasFullCatalog = isAdmin || roomAllowance > 0;
  }
  let billingTier = o.billingTier as AuthUser["billingTier"];
  if (billingTier !== "admin" && billingTier !== "pack" && billingTier !== "trial" && billingTier !== "free") {
    if (isAdmin) billingTier = "admin";
    else if (roomAllowance > 0) billingTier = "pack";
    else if (Boolean(o.trialRemaining)) billingTier = "trial";
    else billingTier = "free";
  }
  const trialUsed = Boolean(o.trialUsed);
  const trialRemaining = Boolean(o.trialRemaining);
  const canSaveRooms = Boolean(o.canSaveRooms) || isAdmin || roomAllowance > 0;
  let exportCreditsRemaining = Number(o.exportCreditsRemaining);
  if (!Number.isFinite(exportCreditsRemaining) || exportCreditsRemaining < 0) {
    exportCreditsRemaining = isAdmin ? 1_000_000 : hasFullCatalog ? 50 : 0;
  }
  exportCreditsRemaining = Math.floor(exportCreditsRemaining);
  let orgPoolBonusSlots = Number(o.orgPoolBonusSlots);
  if (!Number.isFinite(orgPoolBonusSlots) || orgPoolBonusSlots < 0) orgPoolBonusSlots = 0;
  orgPoolBonusSlots = Math.floor(orgPoolBonusSlots);
  let commercialTier = o.commercialTier as AuthUser["commercialTier"];
  if (commercialTier !== "free" && commercialTier !== "home" && commercialTier !== "studio" && commercialTier !== "venue") {
    commercialTier = isAdmin ? "venue" : hasFullCatalog ? "home" : "free";
  }
  let hasGmConsole = Boolean(o.hasGmConsole);
  if (o.hasGmConsole === undefined) {
    hasGmConsole = isAdmin || commercialTier === "studio" || commercialTier === "venue";
  }
  let operatingModeDefault = o.operatingModeDefault as OperatingMode;
  if (operatingModeDefault !== "home" && operatingModeDefault !== "venue") {
    operatingModeDefault = hasGmConsole ? "venue" : "home";
  }
  const role: AuthUser["role"] = o.role === "admin" || isAdmin ? "admin" : "user";
  const lifecycleStatus =
    o.lifecycleStatus === "delinquent" || o.lifecycleStatus === "canceled" ? o.lifecycleStatus : "active";
  const subscriptionInactive = Boolean(o.subscriptionInactive) || lifecycleStatus === "delinquent";
  const readOnlyMode = Boolean(o.readOnlyMode) || lifecycleStatus === "delinquent" || lifecycleStatus === "canceled";
  let canExportRunbook = Boolean(o.canExportRunbook);
  if (o.canExportRunbook === undefined) {
    canExportRunbook = isAdmin || (hasFullCatalog && exportCreditsRemaining > 0) || (billingTier === "trial" && trialRemaining);
  }
  if (subscriptionInactive || lifecycleStatus === "canceled") canExportRunbook = false;
  let hasMakerElectronics = Boolean(o.hasMakerElectronics);
  if (o.hasMakerElectronics === undefined) {
    const tier = typeof o.tierType === "string" ? o.tierType : "";
    hasMakerElectronics =
      isAdmin || tier === "enthusiast" || tier === "studio" || tier === "venue" || tier === "admin";
  }
  const tierType = typeof o.tierType === "string" ? o.tierType : billingTier;
  return {
    id: o.id,
    name: o.name,
    email: o.email,
    provider: o.provider as AuthUser["provider"],
    isAdmin,
    roomAllowance,
    savedRoomCount,
    roomsRemaining,
    hasFullCatalog,
    billingTier,
    exportCreditsRemaining,
    orgPoolBonusSlots,
    trialUsed,
    trialRemaining,
    canSaveRooms,
    commercialTier,
    hasGmConsole: subscriptionInactive ? false : hasGmConsole,
    operatingModeDefault,
    role,
    tierType,
    lifecycleStatus,
    subscriptionInactive,
    readOnlyMode,
    canExportRunbook,
    hasMakerElectronics,
  };
};
type SavedPlanSummary = {
  planId: string;
  name: string;
  approvedForBuild: boolean;
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  themeName: string;
  puzzleCount: number;
};
type SavedPlanPayload = {
  planningInput: {
    playersConcurrent: number;
    participantsTotal: number;
    sessionDurationMinutes: number;
    environmentType: string;
    availableItems: string[];
    existingPuzzles: Array<{ name: string; link: string; roomPart: string }>;
    roomDifficulty?: "easy" | "medium" | "hard";
    youthAddOnEnabled?: boolean;
    youthAddOnGatesAdultFlow?: boolean;
    youthAddOnAgeNote?: string;
    eventType?: string;
    mainTrackPuzzleCountOverride?: number | null;
    puzzleMixLogic?: number | null;
    puzzleMixPhysical?: number | null;
    puzzleMixElectronic?: number | null;
    themeMustMatchEnvironment?: boolean;
    venueBuildType?: VenueBuildType;
    targetInterface?: TargetInterface;
    propFabrication3dEnabled?: boolean;
    propFabricationKinds?: PropFabricationKind[];
  };
  themes: Theme[];
  selectedThemeId: string;
  puzzles: Puzzle[];
  suggestedAdditions: string[];
  suggestedAdditionsRequired?: string[];
  suggestedSafetyProtocols?: string[];
  storyPlan: StoryPlan | null;
  compatibilityPassed: boolean;
  exportContent: string;
  themeCoachChat?: Array<{ id: string; role: "user" | "assistant"; content: string }>;
};
const API_BASE = "";
const THEME_SESSION_EXPIRED_MESSAGE =
  "You were signed out after 30 minutes without activity. Sign in again to continue AI theme and puzzle generation.";
const HISTORY_STORAGE_KEY = "escape-room-builder-input-history-v1";
/** After idle sign-out, saved draft plan id so the next login can reopen the builder automatically. */
const IDLE_RESUME_PLAN_ID_KEY = "escape-room-builder-idle-resume-plan-v1";
/** Auto sign-out after this many milliseconds without user activity. */
const AUTH_IDLE_SIGNOUT_MS = 30 * 60 * 1000;
/** Show resume / stay-signed-in prompt this many milliseconds before sign-out. */
const AUTH_IDLE_PROMPT_LEAD_MS = 90 * 1000;
type InputHistory = Record<string, string[]>;
const loadHistory = (): InputHistory => {
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as InputHistory;
  } catch {
    return {};
  }
};
const saveHistory = (history: InputHistory): void => {
  try {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch {
    // Ignore localStorage failures.
  }
};

function NarrativeFlowGuide({ storyPlan }: { storyPlan: StoryPlan | null }) {
  return (
    <section className="narrative-flow-guide glass-panel output-review-glass-surface" aria-label="Narrative flow guide">
      <h3 className="output-review-section-title">Narrative flow — parallel paths &amp; finale</h3>
      <dl className="narrative-flow-guide__dl">
        <div>
          <dt>Deduction stations</dt>
          <dd>
            Mid-game <strong>deduction stations</strong> are parallel logic beats where different squads work themed puzzles at the
            same time. Each station yields a partial code, clue object, or story permission that cannot finish the room alone.
          </dd>
        </div>
        <div>
          <dt>Merge gate</dt>
          <dd>
            The <strong>merge gate</strong> (finale) requires artifacts from every open parallel path. Players combine branch outputs
            into one final meta-solve that unlocks the exit or boss beat.
          </dd>
        </div>
      </dl>
      {storyPlan?.puzzleLinks && storyPlan.puzzleLinks.length > 0 ? (
        <div className="narrative-flow-guide__prose">
          <p>
            <strong>What players earn per path:</strong>{" "}
            {storyPlan.puzzleLinks
              .slice(0, 6)
              .map((link) => `${link.puzzleTitle} → ${link.unlocks}`)
              .join("; ")}
            {storyPlan.puzzleLinks.length > 6 ? " …" : ""}
          </p>
          {storyPlan.missionObjective ? (
            <p>
              <strong>Final meta-puzzle:</strong> {storyPlan.missionObjective}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="muted narrative-flow-guide__prose">Generate puzzles to populate branch unlocks in this summary.</p>
      )}
    </section>
  );
}

function ThemeFitReasonLine({
  themeName,
  themeDescription,
  puzzle,
}: {
  themeName: string;
  themeDescription: string;
  puzzle: Puzzle;
}) {
  const raw = puzzle.themeFitReason ?? deriveThemeFitFallback(themeName, themeDescription, puzzle);
  const [display, setDisplay] = useState(raw);
  useEffect(() => {
    setDisplay(raw);
    if (!isBrowserAiAvailable()) return;
    let cancelled = false;
    void refineThemeFitReasonInBrowser({
      themeName,
      themeDescription,
      puzzleTitle: puzzle.title,
      puzzleCategory: puzzle.category,
      objective: puzzle.objective,
      rawThemeFitReason: raw,
    }).then((refined) => {
      if (!cancelled && refined) setDisplay(refined);
    });
    return () => {
      cancelled = true;
    };
  }, [raw, themeName, themeDescription, puzzle.id, puzzle.title, puzzle.category, puzzle.objective]);
  return (
    <p className="inline-space">
      <strong>Why this fits the theme:</strong> {display}
    </p>
  );
}

const deriveThemeFitFallback = (themeName: string, themeDescription: string, puzzle: Puzzle): string => {
  const themeText = `${themeName} ${themeDescription}`.toLowerCase();
  const objective = puzzle.objective.toLowerCase();
  const title = puzzle.title.toLowerCase();
  const isPrison = themeText.includes("prison") || themeText.includes("lockdown") || themeText.includes("cell");
  const isSciFi =
    themeText.includes("guardians") ||
    themeText.includes("galaxy") ||
    themeText.includes("space") ||
    themeText.includes("futur");

  if (isPrison && (title.includes("lock") || objective.includes("lock"))) {
    return `For "${themeName}", this fits naturally because lock-based progression matches prison security logic and makes the puzzle feel like part of a real containment system.`;
  }
  if (isSciFi && puzzle.category === "electronic") {
    return `For "${themeName}", this fits because electronic interaction mirrors futuristic systems and reinforces the high-tech worldbuilding.`;
  }
  if (puzzle.category === "physical") {
    return `For "${themeName}", this puzzle fits by using tactile mechanics that support believable in-world interactions.`;
  }
  if (puzzle.category === "logic") {
    return `For "${themeName}", this puzzle fits by turning narrative clues into deduction, keeping the story progression coherent.`;
  }
  return `For "${themeName}", this puzzle supports the theme through its narrative role and progression function.`;
};

type RefusedPuzzleSlot = {
  slotId: string;
  category: Puzzle["category"];
  audienceTrack?: Puzzle["audienceTrack"];
  gatesAdultProgression?: boolean;
};

type PuzzleWindowBusy = { target: string; action: "replace" | "reject" | "fill" };

function PuzzleRefusedWindow({
  slot,
  displayNumber,
  busy,
  onFillSlot,
}: {
  slot: RefusedPuzzleSlot;
  displayNumber: number;
  busy: boolean;
  onFillSlot: (slotId: string) => void;
}) {
  return (
    <article className="glass-panel puzzle-window puzzle-window--refused" aria-label={`Refused ${formatPuzzleCategory(slot.category)} puzzle slot`}>
      <header className="puzzle-window-toolbar">
        <span className="puzzle-number-badge" aria-hidden>
          {displayNumber}
        </span>
        <div className="puzzle-window-toolbar-main">
          <h4 className="puzzle-output-title">Puzzle removed</h4>
          <p className="puzzle-type-field">
            <span className="puzzle-field-label">Type</span>
            <PuzzleCategoryBadge puzzle={{ id: slot.slotId, title: "Refused slot", category: slot.category }} />
          </p>
        </div>
      </header>
      <div className="puzzle-window-body puzzle-window-body--empty">
        <p className="muted">
          You closed this puzzle. Generate another {formatPuzzleCategory(slot.category).toLowerCase()} idea when you are ready.
        </p>
        {slot.audienceTrack === "youth_addon" ? <p className="muted">Junior add-on track</p> : null}
      </div>
      <footer className="puzzle-window-footer">
        <button type="button" className="primary-btn" disabled={busy} onClick={() => onFillSlot(slot.slotId)}>
          {busy ? "Generating…" : "Generate another"}
        </button>
      </footer>
    </article>
  );
}

function PuzzleWindowsTrack({
  puzzles,
  refusedSlots,
  numberOffset,
  selectedThemeName,
  selectedThemeDescription,
  authUser,
  arduinoPreviewPuzzleId,
  puzzleWindowBusy,
  onToggleArduinoPreview,
  onReplace,
  onReject,
  onFillSlot,
}: {
  puzzles: Puzzle[];
  refusedSlots: RefusedPuzzleSlot[];
  numberOffset: number;
  selectedThemeName: string;
  selectedThemeDescription: string;
  authUser: AuthUser | null;
  arduinoPreviewPuzzleId: string | null;
  puzzleWindowBusy: PuzzleWindowBusy | null;
  onToggleArduinoPreview: (puzzleId: string) => void;
  onReplace: (puzzleId: string) => void;
  onReject: (puzzleId: string) => void;
  onFillSlot: (slotId: string) => void;
}) {
  return (
    <div className="puzzle-windows-grid">
      {puzzles.map((puzzle, index) => (
        <PuzzleWindowCard
          key={puzzle.id}
          puzzle={puzzle}
          puzzleNumber={numberOffset + index + 1}
          selectedThemeName={selectedThemeName}
          selectedThemeDescription={selectedThemeDescription}
          authUser={authUser}
          arduinoPreviewPuzzleId={arduinoPreviewPuzzleId}
          onToggleArduinoPreview={onToggleArduinoPreview}
          onReplace={onReplace}
          onReject={onReject}
          replaceBusy={puzzleWindowBusy?.action === "replace" && puzzleWindowBusy.target === puzzle.id}
          rejectBusy={puzzleWindowBusy?.action === "reject" && puzzleWindowBusy.target === puzzle.id}
        />
      ))}
      {refusedSlots.map((slot, index) => (
        <PuzzleRefusedWindow
          key={slot.slotId}
          slot={slot}
          displayNumber={numberOffset + puzzles.length + index + 1}
          busy={puzzleWindowBusy?.action === "fill" && puzzleWindowBusy.target === slot.slotId}
          onFillSlot={onFillSlot}
        />
      ))}
    </div>
  );
}

function PuzzleWindowCard({
  puzzle,
  puzzleNumber,
  selectedThemeName,
  selectedThemeDescription,
  authUser,
  arduinoPreviewPuzzleId,
  onToggleArduinoPreview,
  onReplace,
  onReject,
  replaceBusy,
  rejectBusy,
}: {
  puzzle: Puzzle;
  puzzleNumber: number;
  selectedThemeName: string;
  selectedThemeDescription: string;
  authUser: AuthUser | null;
  arduinoPreviewPuzzleId: string | null;
  onToggleArduinoPreview: (puzzleId: string) => void;
  onReplace: (puzzleId: string) => void;
  onReject: (puzzleId: string) => void;
  replaceBusy: boolean;
  rejectBusy: boolean;
}) {
  const previewLocked = isPuzzlePreviewLocked(puzzle);
  const maglock = isMaglockPuzzle(puzzle);
  const requiredParts =
    puzzle.required_parts_and_props?.length
      ? puzzle.required_parts_and_props
      : puzzle.bill_of_materials ?? [];
  const makerElectronicsLocked = Boolean(authUser && !authUser.hasMakerElectronics);
  const electronicsBlurLabel = !authUser
    ? "Sign in to see wiring diagrams, build steps, and diagram SVG for your room."
    : "Upgrade to Home Host Enthusiast or Creative Studio to unlock wiring diagrams, Arduino sketches, and schematic SVGs.";
  const titleId = `puzzle-win-${puzzle.id}-title`;
  const heading = puzzleCardHeading(puzzle, puzzleNumber);
  return (
    <article className="glass-panel puzzle-window" aria-labelledby={titleId}>
      <header className="puzzle-window-toolbar">
        <span className="puzzle-number-badge" aria-hidden>
          {puzzleNumber}
        </span>
        <div className="puzzle-window-toolbar-main">
          <h4 id={titleId} className="puzzle-output-title">
            {heading}
          </h4>
          <p className="puzzle-type-field">
            <span className="puzzle-field-label">Type</span>
            <PuzzleCategoryBadge puzzle={puzzle} />
          </p>
        </div>
        <button
          type="button"
          className="puzzle-window-close"
          aria-label={`Refuse puzzle ${puzzleNumber}: ${puzzle.title}`}
          disabled={rejectBusy || replaceBusy}
          onClick={() => onReject(puzzle.id)}
        >
          ×
        </button>
      </header>
      <div className="puzzle-window-body">
      {previewLocked ? (
        <p className="muted puzzle-preview-locked-note" role="note">
          {puzzle.previewLabel ?? heading}. Full objectives, wiring, and build steps unlock after your export credit is reserved at
          puzzle generation.
        </p>
      ) : (
        <>
      <p className="puzzle-meta-line">
        <span className="puzzle-field-label puzzle-field-label--inline">Difficulty</span>
        <span className="puzzle-difficulty-label">{formatDifficultyLabel(puzzle.difficulty)}</span>
        {puzzle.audienceTrack === "youth_addon" ? (
          <>
            <span className="puzzle-meta-sep" aria-hidden>
              {" "}
              ·{" "}
            </span>
            <span className="puzzle-track-pill">Junior add-on</span>
          </>
        ) : null}
        {puzzle.gatesAdultProgression ? (
          <>
            <span className="puzzle-meta-sep" aria-hidden>
              {" "}
              ·{" "}
            </span>
            <span className="puzzle-gate-pill">Gates adult flow</span>
          </>
        ) : null}
      </p>
      <p className="inline-space puzzle-objective-line">{puzzle.objective}</p>
      <p className="inline-space">
        <strong>How it works:</strong> {puzzle.howItWorks}
      </p>
      <ThemeFitReasonLine
        themeName={selectedThemeName}
        themeDescription={selectedThemeDescription}
        puzzle={puzzle}
      />
      {!previewLocked && requiredParts.length > 0 ? (
        <PuzzleRequiredPartsBlock parts={requiredParts} category={puzzle.category} isMaglock={maglock} />
      ) : null}
      {!previewLocked && puzzle.solveSteps?.length ? <PuzzleSolveStepsBlock steps={puzzle.solveSteps} /> : null}
      {puzzle.puzzleQa && !puzzle.puzzleQa.passed ? (
        <div className="puzzle-qa-callout" role="note">
          <p className="puzzle-qa-callout__title">
            <strong>Puzzle QA</strong> — review before you build
          </p>
          <p className="muted puzzle-qa-callout__lead">
            Story Editor QA covers narrative alignment; Puzzle QA checks this card’s links, copy, and electronics. Fix or use{" "}
            <strong>Generate another</strong>.
          </p>
          <ul className="list-compact puzzle-qa-callout__list">
            {puzzle.puzzleQa.issues.map((issue) => (
              <li key={`${issue.code}-${issue.field}`}>
                <span className={issue.severity === "error" ? "puzzle-qa-issue--error" : "puzzle-qa-issue--warn"}>
                  {issue.severity === "error" ? "Must fix" : "Note"}
                </span>{" "}
                {issue.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <PuzzleReferenceAttributions links={puzzle.referenceLinks ?? []} />
      {puzzle.category === "electronic" && puzzle.electronicDetails?.arduinoCode?.trim() ? (
        <div className="arduino-snippet-peek">
          <button type="button" className="secondary-btn" onClick={() => onToggleArduinoPreview(puzzle.id)}>
            {arduinoPreviewPuzzleId === puzzle.id ? "Hide Arduino preview" : "Preview Arduino code"}
          </button>
          {arduinoPreviewPuzzleId === puzzle.id ? (
            <TrialBlur
              active={!authUser || makerElectronicsLocked}
              label={
                !authUser
                  ? "Sign in for the full sketch in export plus complete wiring and build steps below."
                  : electronicsBlurLabel
              }
            >
              <pre className="code-inline arduino-preview-panel">
                {authUser
                  ? puzzle.electronicDetails!.arduinoCode
                  : `${(puzzle.electronicDetails!.arduinoCode ?? "").slice(0, 420)}\n…`}
              </pre>
            </TrialBlur>
          ) : (
            <p className="muted arduino-preview-hint">
              Expand to read the same firmware block that appears in <strong>Export</strong> (sanity-check before you breadboard).
            </p>
          )}
        </div>
      ) : null}
      {puzzle.category === "electronic" && puzzle.electronicDetails ? (
        <div className="electronic-impl-block">
          <p className="muted impl-heading">
            <strong>Parts</strong>
          </p>
          <ul className="list-compact">
            {(puzzle.electronicDetails.parts ?? []).map((part) => (
              <li key={part}>{part}</li>
            ))}
          </ul>
          <TrialBlur active={!authUser || makerElectronicsLocked} label={electronicsBlurLabel}>
            <p className="muted impl-heading">
              <strong>Wiring notes</strong>
            </p>
            <ul className="list-compact">
              {(puzzle.electronicDetails.wiringDiagram ?? []).map((wire) => (
                <li key={wire}>{wire}</li>
              ))}
            </ul>
            <p className="muted impl-heading">
              <strong>Build steps</strong>
            </p>
            <ol className="list-compact">
              {(puzzle.electronicDetails.buildSteps ?? []).map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className="muted impl-heading">
              <strong>Wiring diagram</strong>
            </p>
            <div
              className="wiring-svg-host"
              // eslint-disable-next-line react/no-danger -- SVG is authored server-side for this app.
              dangerouslySetInnerHTML={{ __html: puzzle.electronicDetails.wiringDiagramSvg }}
            />
          </TrialBlur>
        </div>
      ) : null}
        </>
      )}
      </div>
      <footer className="puzzle-window-footer">
        <button type="button" className="secondary-btn" disabled={replaceBusy || rejectBusy} onClick={() => onReplace(puzzle.id)}>
          {replaceBusy ? "Generating…" : "Generate another"}
        </button>
      </footer>
    </article>
  );
}

function JuniorTrackEnvironmentIdeas({
  themeName,
  environmentType,
  availableItems,
}: {
  themeName: string;
  environmentType: string;
  availableItems: string;
}) {
  const hooks = useMemo(
    () => filterJuniorStoryHooks(themeName, environmentType, availableItems),
    [themeName, environmentType, availableItems],
  );
  const themeLabel = themeName.trim() || "your selected theme";
  const envLabel = environmentType.trim() || "your room environment";
  return (
    <details className="junior-env-inspiration">
      <summary>Junior story hooks (theme-first)</summary>
      <p className="muted junior-env-inspiration-lead">
        Hooks below are ranked for <strong>{themeLabel}</strong>, then re-skinned for <strong>{envLabel}</strong>. Keep
        sight-lines and safety rules identical to your real room—only the fiction changes.
      </p>
      <ul className="list-compact junior-env-inspiration-list">
        {hooks.map((hook) => (
          <li key={hook.title}>
            <strong>{hook.title}:</strong> {hook.detail}
          </li>
        ))}
      </ul>
    </details>
  );
}

function JuniorGateIntegrationCallout({
  youthAddOnEnabled,
  youthAddOnGatesAdultFlow,
  juniorGatingPuzzles,
  juniorTrackPuzzles,
}: {
  youthAddOnEnabled: boolean;
  youthAddOnGatesAdultFlow: boolean;
  juniorGatingPuzzles: Puzzle[];
  juniorTrackPuzzles: Puzzle[];
}) {
  if (!youthAddOnEnabled || !youthAddOnGatesAdultFlow) return null;
  if (juniorGatingPuzzles.length > 0) {
    return (
      <div className="junior-gate-callout" role="note">
        <h4 className="junior-gate-title">Junior track → main crew (gating on)</h4>
        <p>
          Hold the adults on the matching main-room beat until the junior crew delivers the outcome from the puzzle(s) below—usually
          a spoken code, physical token, or shared lock state.
        </p>
        <ul className="list-compact junior-gate-list">
          {juniorGatingPuzzles.map((p) => (
            <li key={p.id}>
              <strong>{p.title}</strong>
              <span className="puzzle-gate-pill junior-gate-pill-inline">Gates adult flow</span>
              <p className="muted junior-gate-objective">{p.objective}</p>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (juniorTrackPuzzles.length > 0) {
    return (
      <p className="muted junior-gate-softnote">
        Gating is enabled—check junior cards for <span className="puzzle-gate-pill junior-gate-pill-inline">Gates adult flow</span>.
        The generator usually marks the first junior station when this option is on.
      </p>
    );
  }
  return null;
}

const collapseWs = (s: string): string => s.replace(/\s+/g, " ").trim();

/** Mirrors backend estimate — use {@link estimatePuzzleNodes} from planning domain. */
const estimateClientPuzzleCount = estimatePuzzleNodes;

function RollingPuzzleEstimate({ target }: { target: number }) {
  const [display, setDisplay] = useState(target);
  const displayRef = useRef(display);
  const rafRef = useRef<number | null>(null);
  displayRef.current = display;
  useEffect(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    const from = displayRef.current;
    if (from === target) return;
    const t0 = performance.now();
    const dur = 320;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / dur);
      const ease = 1 - (1 - t) * (1 - t);
      const v = Math.round(from + (target - from) * ease);
      setDisplay(v);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else rafRef.current = null;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target]);
  return <span className="rolling-estimate-num">{display}</span>;
}

function RequiredFieldMark(): ReactNode {
  return (
    <span className="required-field-mark" title="Required" aria-hidden="true">
      *
    </span>
  );
}

function _LegacyMissionFlowMapUnused({
  stepLabels,
  activeIndex,
  youthAddOnEnabled,
  forkSegmentIndex,
}: {
  stepLabels: readonly string[];
  activeIndex: number;
  youthAddOnEnabled: boolean;
  forkSegmentIndex: number | null;
}) {
  const reactId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const n = stepLabels.length;
  const compact = n >= 6;
  /* Spread nodes across a wide track so 5-step flows use the full header width cleanly. */
  const segW = compact ? 72 : n <= 5 ? 132 : 96;
  const w = Math.max(520, 56 + (n - 1) * segW);
  const useFork = youthAddOnEnabled && forkSegmentIndex !== null && forkSegmentIndex >= 0 && forkSegmentIndex < n - 1;
  const h = useFork ? 118 : 88;
  const nodeY = useFork ? 56 : 44;
  const nodeR = compact ? 9 : 11;
  /** Stop connectors at the node ring (not the circle center) so lines don’t pierce halos awkwardly. */
  const lineEndInset = nodeR + 4;
  const xs = stepLabels.map((_, i) => 40 + i * ((w - 80) / Math.max(1, n - 1)));

  const segComplete = (i: number) => activeIndex > i;
  /** Segment i runs from node i to i+1; emphasize the leg that *leads into* the current step (not the leg leading out). */
  const segActive = (i: number) => activeIndex === i + 1;
  const nodeState = (i: number) => {
    if (activeIndex > i) return "done";
    if (activeIndex === i) return "active";
    return "todo";
  };

  const pathD = (i: number): string | null => {
    if (i >= n - 1) return null;
    const x0 = xs[i] ?? 0;
    const x1 = xs[i + 1] ?? 0;
    const dir = Math.sign(x1 - x0) || 1;
    const xa = x0 + dir * lineEndInset;
    const xb = x1 - dir * lineEndInset;
    if (Math.abs(xb - xa) < 6) {
      return `M ${x0} ${nodeY} L ${x1} ${nodeY}`;
    }
    return `M ${xa} ${nodeY} L ${xb} ${nodeY}`;
  };

  const segStroke = (done: boolean, active: boolean): string => {
    if (active) return "rgba(0, 242, 255, 0.98)";
    if (done) return "rgba(175, 228, 255, 1)";
    return "rgba(145, 188, 255, 0.92)";
  };

  const forkSeg = forkSegmentIndex ?? 0;
  const forkBranchD =
    useFork && forkSeg >= 0
      ? (() => {
          const x0 = xs[forkSeg] ?? 0;
          const x1 = xs[forkSeg + 1] ?? 0;
          const dir = Math.sign(x1 - x0) || 1;
          const sx = x0 + dir * lineEndInset;
          const ex = x1 - dir * lineEndInset;
          const mid = (sx + ex) / 2;
          const yTop = nodeY - 20;
          const yBot = nodeY + 20;
          return `M ${sx} ${nodeY} Q ${mid} ${yTop} ${ex} ${nodeY} M ${sx} ${nodeY} Q ${mid} ${yBot} ${ex} ${nodeY}`;
        })()
      : "";

  const glowId = `missionFlowGlow-${reactId}`;

  return (
    <div
      className={`mission-flow-map mission-flow-map--header ${compact ? "mission-flow-map--compact" : ""}`}
      role="img"
      aria-label="Mission progress map"
      data-testid="mission-flow-map"
    >
      <svg className="mission-flow-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {stepLabels.map((_, i) => {
          if (i >= n - 1) return null;
          const d = pathD(i);
          if (!d) return null;
          const done = segComplete(i);
          const active = segActive(i);
          const from = stepLabels[i] ?? `Step ${i + 1}`;
          const to = stepLabels[i + 1] ?? `Step ${i + 2}`;
          const segHint =
            done ? `Completed: ${from} → ${to}` : active ? `Current leg: ${from} → ${to}` : `Upcoming: ${from} → ${to}`;
          return (
            <g key={`seg-g-${i}`} className="mission-flow-segment">
              <title>{segHint}</title>
              <path
                d={d}
                className="mission-flow-path-track"
                fill="none"
                stroke="rgba(52, 68, 108, 0.95)"
                strokeWidth={6}
                strokeLinecap="round"
              />
              <path
                d={d}
                className={`mission-flow-path ${done ? "mission-flow-path--done" : ""} ${active ? "mission-flow-path--active" : ""}`}
                fill="none"
                stroke={segStroke(done, active)}
                strokeWidth={active ? 4.1 : done ? 3.5 : 3.1}
                strokeLinecap="round"
                strokeLinejoin="round"
                filter={active ? `url(#${glowId})` : undefined}
              />
            </g>
          );
        })}
        {forkBranchD ? (
          <g className="mission-flow-fork-wrap">
            <title>
              Junior add-on branch on the leg between {stepLabels[forkSeg] ?? "Build"} and{" "}
              {stepLabels[forkSeg + 1] ?? "Review"}: optional parallel track for younger players.
            </title>
            <path
              d={forkBranchD}
              className={`mission-flow-fork ${forkSeg >= 0 && activeIndex >= forkSeg ? "mission-flow-fork--live" : ""}`}
              fill="none"
              stroke="rgba(0,242,255,0.55)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeDasharray="6 5"
            />
          </g>
        ) : null}
        {stepLabels.map((label, i) => {
          const st = nodeState(i);
          const cx = xs[i] ?? 0;
          const nodeHint =
            st === "done"
              ? `${label}: completed`
              : st === "active"
                ? `${label}: you are here`
                : `${label}: not started yet`;
          return (
            <g key={`flow-node-${i}-${label}`} transform={`translate(${cx}, ${nodeY})`} className={`mission-flow-node mission-flow-node--${st}`}>
              <title>{nodeHint}</title>
              <circle r={nodeR + 3} className="mission-flow-node-halo" />
              <circle r={nodeR} className="mission-flow-node-ring" />
              <text y={nodeR + 22} textAnchor="middle" className="mission-flow-node-label">
                {label}
              </text>
            </g>
          );
        })}
      </svg>
      {useFork ? (
        <p className="muted mission-flow-fork-caption">
          Junior add-on: parallel branch on the Build → Review leg (adults + kids tracks).
        </p>
      ) : null}
    </div>
  );
}

function wizardStepLabel(step: string): string {
  switch (step) {
    case "saved":
      return "Saved";
    case "setup":
      return "Room";
    case "themes":
      return "Theme";
    case "themes-puzzles":
      return "Build";
    case "output-review":
      return "Review";
    case "output-export":
      return "Export";
    default:
      return step;
  }
}

function parseItemChips(raw: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of raw.split(",")) {
    const t = part.trim();
    if (!t) continue;
    const k = t.toLowerCase().replace(/\s+/g, " ");
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

/** Paid-room / ticketed contexts: players expect a clearly unique experience vs other venues. */
function corpusMentionsEscapeRoom(envRaw: string, eventRaw: string): boolean {
  const c = `${envRaw} ${eventRaw}`.toLowerCase();
  return /\b(escape|exit)\s*room\b|\bescape\s+game\b|\bpuzzle\s*room\b|\bimmersive\s+experience\b/.test(c);
}
function getStagingExampleParagraphs(envRaw: string, eventRaw: string): string[] {
  const env = envRaw.trim().toLowerCase();
  const event = eventRaw.trim().toLowerCase();
  if (!env) {
    return [
      "Choose an environment above to see examples for your space. Fiction can stretch, but props and zones still have to work where you actually host.",
    ];
  }

  const paragraphs: string[] = [];

  if (/\bliving\b|lounge|\bden\b/.test(env)) {
    paragraphs.push(
      "A “library” mystery in a living room means a defined corner with a small shelf, rug, and lamp that reads as stacks—not pretending the whole house is a different building.",
    );
  } else if (/\brec\b|rumpus|game room|family room/.test(env)) {
    paragraphs.push(
      "A “command center” beat in a rec room might use the TV input, game shelf, and a cleared coffee table as stations—keep cables taped and heavy trophies secured.",
    );
  } else if (/\bgarage\b/.test(env)) {
    paragraphs.push(
      "A “workshop vault” in a garage means a lockable toolbox or pegboard zone you control—not asking players to use real power tools or climb unsupervised.",
    );
  } else if (/\bbasement\b/.test(env)) {
    paragraphs.push(
      "Basement fiction works best on folding tables, labeled totes, and theater utility panels—avoid live furnace or water-heater puzzles unless they are clearly fake props.",
    );
  } else if (/\bkitchen\b/.test(env)) {
    paragraphs.push(
      "Kitchen beats should use cool props, timers, and dry goods—no hot burners, tasting, or sharp knives in player hands during the run.",
    );
  } else if (/\bdining\b/.test(env)) {
    paragraphs.push(
      "Dining-room staging can use placemat order, LED candles, and china-cabinet sight lines through glass—secure anything fragile before groups arrive.",
    );
  } else if (/\boffice\b|\bstudy\b/.test(env)) {
    paragraphs.push(
      "An “indoor vault” beat in an office / study means a locking file drawer, fire-safe box, or labeled supply cabinet—not a poured concrete bank room.",
    );
  } else if (/\bclassroom\b|\bschool\b/.test(env)) {
    paragraphs.push(
      "A “library” set in a classroom is a taped-off reading nook with cubbies and a globe—not the entire campus; keep egress paths clear.",
    );
  } else if (/\bconference\b/.test(env)) {
    paragraphs.push(
      "Conference-room fiction maps to whiteboard grids, name plates, and AV credenza props—respect venue AV policies and do not factory-reset displays.",
    );
  } else if (/\bretail\b|\bpop-?up\b|\bstorefront\b|\bmall\b/.test(env)) {
    paragraphs.push(
      "Retail pop-up staging uses shelf facings, a kiosk tablet in guided mode, and mannequin poses—nothing that triggers real loss-prevention alarms.",
    );
  } else if (/\bbackyard\b|\bpatio\b|\bdeck\b/.test(env)) {
    paragraphs.push(
      "Backyard “vault” beats mean a weatherproof lockbox, shed, or trailer that plays as secure storage—you are not pouring a bank vault outdoors.",
    );
  } else if (/\bwarehouse\b|\bstudio\b|\bindustrial\b/.test(env)) {
    paragraphs.push(
      "Warehouse fiction uses rolling racks, clip lights, and labeled bays—brake carts, tape cord runs, and keep players off live industrial equipment.",
    );
  } else if (/\bparty room\b|\bvenue\b|\bbanquet\b|\bballroom\b/.test(env)) {
    paragraphs.push(
      "Party-venue runs stage fiction on folding tables, coat racks, and a sign-in table—balloons air-filled only and speakers volume-capped.",
    );
  } else {
    paragraphs.push(
      "Match fiction to zones you can actually control in this space—one strong corner or prop island often reads clearer than pretending the whole venue transformed.",
    );
  }

  if (/\bhalloween\b/.test(event)) {
    paragraphs.push(
      "For Halloween, keep walkways lit and skip loose cobwebs on paths; spooky wording can live on one labeled prop zone instead of darkening the whole room.",
    );
  } else if (/\bchristmas\b|\bwinter holiday\b|\bholiday party\b/.test(event)) {
    paragraphs.push(
      "For a winter holiday party, reuse ornament counts and gift-wrap stations as puzzles—avoid open flames and keep tripping hazards off main routes.",
    );
  } else if (/\bcorporate\b|\bteam building\b/.test(event)) {
    paragraphs.push(
      "For corporate team building, favor clear roles per station and photo-friendly resets—avoid puzzles that require climbing furniture or embarrassing physical contact.",
    );
  } else if (/\bwedding\b/.test(event)) {
    paragraphs.push(
      "For a wedding reception activity, keep staging away from catering traffic and use quiet audio cues so the beat does not compete with speeches.",
    );
  } else if (/\bbirthday\b/.test(event)) {
    paragraphs.push(
      "For a birthday party, bias toward shorter chains and obvious win moments—stage props where parents can supervise younger guests easily.",
    );
  } else if (/\bschool\b|\bcamp\b/.test(event)) {
    paragraphs.push(
      "For school or camp programs, document egress, use blunt props only, and align fiction with the room you were assigned—not hallways you do not control.",
    );
  } else if (/\bcommercial\b|\bticketed\b|\bescape\b.*\broom\b|\bvenue\b/.test(event)) {
    paragraphs.push(
      "For a commercial escape venue, guests expect original flow—treat generator ideas as raw material and reset every prop pocket between paid groups.",
    );
  }

  return paragraphs;
}

const UNSAFE_UTILITY_ITEM =
  /\b(real\s+)?(furnace|furnaces|hot[-\s]?water\s*(heater|heaters|tank|tanks)|water\s*heater|water\s*heaters|boiler|boilers|gas\s*line|propane\s*tank)\b/i;

function isAllowedAvailableItemLabel(raw: string): boolean {
  const t = raw.trim();
  if (!t) return false;
  if (/^fake\s+/i.test(t)) return true;
  if (PROP_LABEL_BLOCKLIST.test(t)) return false;
  if (UNSAFE_UTILITY_ITEM.test(t) && !/^fake\s+/i.test(t)) return false;
  return true;
}

function itemKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function EnvironmentTypeField({
  value,
  onChange,
  invalid,
  id,
  onEnvironmentCleared,
}: {
  value: string;
  onChange: (next: string) => void;
  invalid?: boolean;
  id?: string;
  /** Called when the host clears environment (e.g. to reset optional prop picks). */
  onEnvironmentCleared?: () => void;
}): ReactNode {
  const matchedPreset = useMemo(
    () => ENVIRONMENT_PRESETS.find((p) => itemKey(p) === itemKey(value)),
    [value],
  );
  const selectValue = matchedPreset ?? (value.trim() ? ENVIRONMENT_CUSTOM_OPTION : "");

  return (
    <div className="environment-type-field">
      <select
        id={id}
        className={`blueprint-input environment-type-select ${invalid ? "invalid-field" : ""}`}
        value={selectValue}
        onChange={(event) => {
          const next = event.target.value;
          if (!next) {
            onChange("");
            onEnvironmentCleared?.();
          } else if (next === ENVIRONMENT_CUSTOM_OPTION) {
            if (matchedPreset) onChange("");
          } else {
            onChange(next);
          }
        }}
      >
        <option value="">Choose environment…</option>
        {ENVIRONMENT_PRESETS.map((entry) => (
          <option key={entry} value={entry}>
            {entry}
          </option>
        ))}
        <option value={ENVIRONMENT_CUSTOM_OPTION}>Custom location…</option>
      </select>
      {selectValue === ENVIRONMENT_CUSTOM_OPTION ? (
        <input
          className={`blueprint-input environment-type-custom-input ${invalid ? "invalid-field" : ""}`}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Describe your play space"
          aria-label="Custom environment description"
        />
      ) : null}
    </div>
  );
}

function AvailableItemsField({
  value,
  onChange,
  invalid,
  historyOptions,
  disabled,
  environmentType,
  eventType,
}: {
  value: string;
  onChange: (next: string) => void;
  invalid: boolean;
  historyOptions: string[];
  environmentType: string;
  eventType: string;
  /** When false, props stay empty until the host picks a physical environment. */
  disabled?: boolean;
}) {
  const chips = useMemo(() => parseItemChips(value), [value]);
  const presetLabels = useMemo(
    () => getSuggestedPropOptionsForPlanning(environmentType, eventType).map((o) => o.label),
    [environmentType, eventType],
  );
  const presetKeys = useMemo(() => new Set(presetLabels.map((p) => itemKey(p))), [presetLabels]);
  const customOnlyChips = useMemo(() => chips.filter((c) => !presetKeys.has(itemKey(c))), [chips, presetKeys]);
  const [customDraft, setCustomDraft] = useState("");
  const [customHint, setCustomHint] = useState("");

  const selectRef = useRef<HTMLSelectElement | null>(null);

  const syncSelectDom = useCallback((): void => {
    const el = selectRef.current;
    if (!el) return;
    const selectedKeys = new Set(chips.map((c) => itemKey(c)));
    for (let i = 0; i < el.options.length; i += 1) {
      const opt = el.options[i]!;
      opt.selected = selectedKeys.has(itemKey(opt.value));
    }
  }, [chips]);

  useLayoutEffect(() => {
    syncSelectDom();
  }, [syncSelectDom, value, presetLabels]);

  const onMultiChange = (): void => {
    if (disabled) return;
    const el = selectRef.current;
    if (!el) return;
    const fromPresets = [...el.selectedOptions].map((o) => o.value);
    onChange([...fromPresets, ...customOnlyChips].join(", "));
  };

  const addCustom = (): void => {
    if (disabled) return;
    const t = customDraft.trim();
    if (!t) return;
    if (!isAllowedAvailableItemLabel(t)) {
      setCustomHint(
        "Use only safe props. Real furnaces, hot water heaters, boilers, gas lines, and propane tanks are blocked—prefix with “Fake …” for a theater prop.",
      );
      return;
    }
    setCustomHint("");
    const k = itemKey(t);
    if (chips.some((c) => itemKey(c) === k)) {
      setCustomDraft("");
      return;
    }
    onChange([...chips, t].join(", "));
    setCustomDraft("");
  };

  const removeChip = (index: number): void => {
    if (disabled) return;
    onChange(chips.filter((_, j) => j !== index).join(", "));
  };

  return (
    <div
      className={`basement-items-field ${invalid ? "basement-items-field--invalid" : ""}${
        disabled ? " basement-items-field--disabled" : ""
      }`}
    >
      {disabled ? (
        <p className="muted basement-items-gate-hint">
          Choose <strong>Environment</strong> above first—then optional prop suggestions for that space appear here.
        </p>
      ) : presetLabels.length === 0 ? (
        <p className="muted basement-items-gate-hint">
          No preset list for this wording yet—use <strong>Add custom</strong> for props that may be in your space.
        </p>
      ) : null}
      <label className="muted basement-items-dropdown-label" htmlFor="available-items-multiselect">
        Suggested props for this environment (optional — hold <kbd>Ctrl</kbd> / <kbd>⌘</kbd> to pick several)
      </label>
      <select
        id="available-items-multiselect"
        ref={selectRef}
        className={`basement-items-dropdown ${invalid ? "invalid-field" : ""}`}
        multiple
        size={8}
        aria-label="Suggested props that may be available in your environment"
        disabled={disabled}
        onChange={onMultiChange}
      >
        {presetLabels.map((label) => (
          <option key={label} value={label}>
            {label}
          </option>
        ))}
      </select>
      <datalist id="items-history">
        {historyOptions.map((entry) => (
          <option key={entry} value={entry} />
        ))}
      </datalist>
      <div className="basement-items-custom-row">
        <input
          className="blueprint-input basement-items-custom-input"
          type="text"
          list="items-history"
          value={customDraft}
          placeholder='Other safe prop (e.g. "Fake boiler gauge board")'
          disabled={disabled}
          onChange={(e) => {
            setCustomDraft(e.target.value);
            setCustomHint("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
        />
        <button type="button" className="secondary-btn" onClick={addCustom} disabled={disabled}>
          Add custom
        </button>
      </div>
      {customHint ? <p className="muted basement-items-hint">{customHint}</p> : null}
      {chips.length > 0 ? (
        <div className="chip-field basement-items-chip-wrap" role="group" aria-label="Selected props">
          <p className="muted basement-items-selected-label">Selected</p>
          <div className="chip-field-inner">
            {chips.map((chip, i) => (
              <span key={`${chip}-${i}`} className="item-chip">
                <span className="item-chip-text">{chip}</span>
                <button
                  type="button"
                  className="item-chip-remove"
                  aria-label={`Remove ${chip}`}
                  disabled={disabled}
                  onClick={() => removeChip(i)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Runbook preview: allow server-authored SVG diagrams (no scripts / event handlers). */
function runbookSvgBlockFromFenceBody(raw: string): string {
  const s = raw.trim();
  if (!s.toLowerCase().startsWith("<svg")) {
    return `<p class="runbook-p muted">Wiring diagram block was not valid SVG markup.</p>`;
  }
  if (/<script/i.test(s) || /\bon\w+\s*=/i.test(s)) {
    return `<p class="runbook-p muted">Diagram omitted in preview (unsupported embedded script or handler).</p>`;
  }
  return `<div class="runbook-svg-host">${s}</div>`;
}

/** Read-only plain text view of an export (fenced blocks collapsed). */
function exportMarkdownToPlainText(md: string): string {
  let s = md.replace(/\r\n/g, "\n");
  s = s.replace(/```(\w*)\n([\s\S]*?)```/gm, (_block, lang: string) => {
    const l = String(lang ?? "").toLowerCase();
    if (l === "svg" || l === "xml") return "\n[SVG wiring diagram — open Markdown or HTML view to see graphics]\n";
    return "\n[Code block omitted in plain text]\n";
  });
  s = s.replace(/^#{1,6}\s+/gm, "");
  s = s.replace(/\*\*([^*]+)\*\*/g, "$1");
  s = s.replace(/`([^`]+)`/g, "$1");
  s = s.replace(/\[([^\]]+)]\([^)]+\)/g, "$1");
  return s.replace(/\n{3,}/g, "\n\n").trim();
}

function wrapExportAsHtmlDocument(runbookInnerHtml: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Escape Room Plan</title>
<style>
body{font-family:system-ui,Segoe UI,sans-serif;background:#fff;color:#111;margin:1rem 1.25rem 2rem;line-height:1.45;max-width:48rem;}
.runbook-h1{font-size:1.45rem;margin:0.5rem 0 0.35rem;page-break-after:avoid;}
.runbook-h2{font-size:1.12rem;margin:1.1rem 0 0.35rem;page-break-after:avoid;border-bottom:1px solid #cbd5e1;padding-bottom:0.2rem;}
.runbook-h3{font-size:1rem;margin:0.85rem 0 0.25rem;page-break-after:avoid;}
.runbook-h4{font-size:0.95rem;margin:0.75rem 0 0.2rem;}
.runbook-p{margin:0.35rem 0;}
.runbook-ul{margin:0.25rem 0 0.5rem;padding-left:1.2rem;}
.runbook-pre{white-space:pre-wrap;background:#f1f5f9;padding:0.75rem;border-radius:8px;overflow:auto;font-size:0.82rem;border:1px solid #e2e8f0;}
.runbook-svg-host{max-width:100%;margin:0.5rem 0;padding:0.5rem;border-radius:10px;border:1px solid #cbd5e1;background:#f8fafc;}
.runbook-svg-host svg{display:block;max-width:100%;height:auto;}
.runbook-table{width:100%;border-collapse:collapse;margin:0.65rem 0;font-size:0.88rem;}
.runbook-table th,.runbook-table td{border:1px solid #cbd5e1;padding:0.4rem 0.55rem;text-align:left;vertical-align:top;}
.runbook-table th{background:#f1f5f9;font-weight:600;}
.runbook-page-break{height:0;margin:0;border:0;page-break-before:always;}
a{color:#1d4ed8;}
@media print{
  body{margin:0.75in;max-width:none;}
  .runbook-page-break{page-break-before:always;}
  .runbook-h2{page-break-before:auto;}
}
</style></head><body>${runbookInnerHtml}</body></html>`;
}

/** Lightweight markdown → HTML for export runbook preview (content escaped; links kept for preview). */
function exportMarkdownToRunbookHtml(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let inFence = false;
  let fenceLang = "";
  const codeBuf: string[] = [];
  let listOpen = false;
  const closeList = (): void => {
    if (listOpen) {
      out.push("</ul>");
      listOpen = false;
    }
  };
  const inlineFmt = (t: string): string => {
    let s = escapeHtml(t);
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/\[([^\]]+)]\(([^)]+)\)/g, (_, label: string, href: string) => {
      const safe = escapeHtml(href).replace(/javascript:/gi, "");
      return `<a href="${safe}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`;
    });
    return s;
  };
  const flushFence = (): void => {
    if (codeBuf.length === 0) {
      inFence = false;
      fenceLang = "";
      return;
    }
    const body = codeBuf.join("\n");
    const lang = fenceLang.toLowerCase();
    if (lang === "svg" || lang === "xml") {
      out.push(runbookSvgBlockFromFenceBody(body));
    } else {
      out.push(`<pre class="runbook-pre">${escapeHtml(body)}</pre>`);
    }
    codeBuf.length = 0;
    inFence = false;
    fenceLang = "";
  };
  let tableRows: string[][] = [];
  const flushTable = (): void => {
    if (tableRows.length === 0) return;
    const [header, ...bodyRows] = tableRows;
    if (header?.length) {
      out.push('<table class="runbook-table"><thead><tr>');
      header.forEach((cell) => out.push(`<th>${inlineFmt(cell)}</th>`));
      out.push("</tr></thead><tbody>");
      bodyRows.forEach((row) => {
        out.push("<tr>");
        row.forEach((cell) => out.push(`<td>${inlineFmt(cell)}</td>`));
        out.push("</tr>");
      });
      out.push("</tbody></table>");
    }
    tableRows = [];
  };
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "<!-- pdf-page-break -->") {
      closeList();
      flushTable();
      out.push('<hr class="runbook-page-break" aria-hidden="true" />');
      continue;
    }
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      if (/^\|[\s\-:|]+\|$/.test(trimmed)) continue;
      closeList();
      const cells = trimmed
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());
      tableRows.push(cells);
      continue;
    }
    if (tableRows.length > 0) flushTable();
    if (trimmed.startsWith("```")) {
      if (!inFence) {
        closeList();
        inFence = true;
        fenceLang = trimmed.slice(3).trim();
        codeBuf.length = 0;
      } else {
        flushFence();
      }
      continue;
    }
    if (inFence) {
      codeBuf.push(line);
      continue;
    }
    const h4 = line.match(/^####\s+(.+)/);
    if (h4) {
      closeList();
      out.push(`<h4 class="runbook-h4">${inlineFmt(h4[1] ?? "")}</h4>`);
      continue;
    }
    const h3 = line.match(/^###\s+(.+)/);
    if (h3) {
      closeList();
      out.push(`<h3 class="runbook-h3">${inlineFmt(h3[1] ?? "")}</h3>`);
      continue;
    }
    const h2 = line.match(/^##\s+(.+)/);
    if (h2) {
      closeList();
      out.push(`<h2 class="runbook-h2">${inlineFmt(h2[1] ?? "")}</h2>`);
      continue;
    }
    const h1 = line.match(/^#\s+(.+)/);
    if (h1) {
      closeList();
      out.push(`<h1 class="runbook-h1">${inlineFmt(h1[1] ?? "")}</h1>`);
      continue;
    }
    const li = line.match(/^\s*-\s+(.+)/);
    if (li) {
      if (!listOpen) {
        out.push('<ul class="runbook-ul">');
        listOpen = true;
      }
      out.push(`<li>${inlineFmt(li[1] ?? "")}</li>`);
      continue;
    }
    closeList();
    if (line.trim() === "") {
      out.push("<br />");
    } else {
      out.push(`<p class="runbook-p">${inlineFmt(line)}</p>`);
    }
  }
  closeList();
  flushTable();
  if (inFence) flushFence();
  return out.join("");
}

function normalizeImportedTheme(theme: Theme): Theme {
  const existing = theme.tldr?.trim();
  if (existing) return { ...theme, tldr: existing };
  const c = collapseWs(theme.description);
  return {
    ...theme,
    tldr: c ? (c.length <= 150 ? c : `${c.slice(0, 147)}…`) : `${theme.name}: imported plan (see full brief below).`,
  };
}

function resolveThemeTldr(theme: Theme): string {
  const t = theme.tldr?.trim();
  if (t) return t;
  return normalizeImportedTheme(theme).tldr ?? theme.name;
}

const formatPuzzleCategory = (category: string): string => {
  if (category === "logic") return "Logic";
  if (category === "physical") return "Physical";
  if (category === "electronic") return "Electronic";
  return category;
};

const formatDifficultyLabel = (difficulty: string): string => {
  const d = difficulty.trim();
  if (!d) return "";
  return d.charAt(0).toUpperCase() + d.slice(1).toLowerCase();
};

const formatTargetInterfaceLabel = (kind: TargetInterface): string => {
  if (kind === "commercial_venue") return "Commercial Venue";
  if (kind === "home_party") return "Home Party";
  return "Not set";
};

function ThemeRecommendedPuzzles({
  puzzles,
  sectionTitle = "Suggested puzzles (matched to this theme)",
}: {
  puzzles: RecommendedPuzzleBrief[];
  sectionTitle?: string;
}) {
  if (!puzzles.length) return null;
  return (
    <div className="theme-rec-wrap">
      <h4 className="theme-rec-section-title">{sectionTitle}</h4>
      <ul className="theme-rec-list">
        {puzzles.map((puzzle) => (
          <li key={puzzle.id} className="theme-rec-item theme-rec-item--open">
            <div className="theme-rec-row">
              <span className="theme-rec-summary">
                <strong>{puzzle.title}</strong>
                <span className="theme-rec-cat">
                  {formatPuzzleCategory(puzzle.category)}
                  {puzzle.difficulty ? (
                    <>
                      {" "}
                      · <span className="theme-rec-diff">{formatDifficultyLabel(puzzle.difficulty)}</span>
                    </>
                  ) : null}
                </span>
              </span>
            </div>
            <div className="theme-rec-panel" role="region" aria-label={`Details for ${puzzle.title}`}>
              <p className="theme-rec-pop-obj">
                <strong>Objective:</strong> {puzzle.objective}
              </p>
              <p className="theme-rec-pop-how muted">
                <strong>How it works:</strong> {puzzle.howItWorks}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Strip markdown heading markers accidentally left inside body text. */
const stripMarkdownHeadingMarkers = (s: string): string =>
  s
    .split("\n")
    .map((line) => line.replace(/^#{1,6}\s+/, ""))
    .join("\n");

/** Paragraphs + line breaks for story-plan blobs (may contain pasted markdown). */
function OutputReviewProse({ text }: { text: string }): ReactNode {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return null;
  const paras = normalized.split(/\n\n+/).filter((p) => p.trim());
  return paras.map((para, i) => (
    <p key={i} className="output-review-prose">
      {para
        .trim()
        .split("\n")
        .map((line, j, arr) => (
          <Fragment key={j}>
            {stripMarkdownHeadingMarkers(line).trim() || "\u00a0"}
            {j < arr.length - 1 ? <br /> : null}
          </Fragment>
        ))}
    </p>
  ));
}

/** Renders staging diagram markdown (tables + text blocks) on a shared vertical grid. */
function OutputReviewStagingDiagram({ text }: { text: string }): ReactNode {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return null;
  const blocks = normalized.split(/\n\n+/).filter((b) => b.trim());
  return (
    <div className="output-review-markdown-stack">
      {blocks.map((block, blockIndex) => {
        const trimmed = block.trim();
        if (trimmed.startsWith("|")) {
          const rows = trimmed.split("\n").filter((line) => line.includes("|"));
          if (rows.length < 2) {
            return (
              <pre key={blockIndex} className="staging-diagram-block output-review-glass-surface">
                {trimmed}
              </pre>
            );
          }
          const parseRow = (line: string): string[] =>
            line
              .split("|")
              .map((cell) => cell.trim())
              .filter((cell, i, arr) => !(i === 0 && cell === "") && !(i === arr.length - 1 && cell === ""));
          const header = parseRow(rows[0]!);
          const bodyRows = rows.slice(2).map(parseRow);
          return (
            <div key={blockIndex} className="output-review-table-wrap output-review-glass-surface">
              <table className="output-review-table">
                <thead>
                  <tr>
                    {header.map((cell, i) => (
                      <th key={i}>{cell}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bodyRows.map((cells, ri) => (
                    <tr key={ri}>
                      {cells.map((cell, ci) => (
                        <td key={ci}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        if (trimmed.startsWith("```")) {
          const inner = trimmed.replace(/^```\w*\n?/, "").replace(/\n?```$/, "");
          return (
            <pre key={blockIndex} className="staging-diagram-block output-review-glass-surface">
              {inner}
            </pre>
          );
        }
        return (
          <p key={blockIndex} className="output-review-prose output-review-glass-surface">
            {trimmed.replace(/^_+|_+$/g, "")}
          </p>
        );
      })}
    </div>
  );
}

function OutputReviewNarrativeField({ label, text }: { label: string; text: string }): ReactNode {
  const raw = text?.trim() ?? "";
  if (!raw) return null;
  const [expanded, setExpanded] = useState(false);
  const collapseAt = 2000;
  const previewAt = 900;
  const long = raw.length > collapseAt;
  const display = long && !expanded ? `${raw.slice(0, previewAt).trim()}…` : raw;
  return (
    <article className="output-review-field">
      <h4 className="output-review-field-label">{label}</h4>
      <div className="output-review-field-body">
        <OutputReviewProse text={display} />
      </div>
      {long ? (
        <button type="button" className="secondary-btn output-review-expand" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Show less" : "Show full text"}
        </button>
      ) : null}
    </article>
  );
}

function splitProgressionUnlockLines(unlocks: string): string[] {
  const trimmed = unlocks.trim();
  if (!trimmed) return [];
  const segments = trimmed
    .split(/\s*(?:;|\u2192|->)\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  return segments.length > 0 ? segments : [trimmed];
}

function OutputReviewProgressionGuide({
  progressionRule,
  puzzleLinks,
}: {
  progressionRule: string;
  puzzleLinks?: StoryPlan["puzzleLinks"];
}): ReactNode {
  if (puzzleLinks && puzzleLinks.length > 0) {
    return (
      <div className="output-review-progression-guide output-review-glass-surface">
        <p className="output-review-progression-lead">
          Each puzzle pays off before the next lock opens — solve order and unlock outcomes:
        </p>
        <ol className="output-review-progression-list">
          {puzzleLinks.map((link) => (
            <li key={link.puzzleId} className="output-review-progression-item">
              <strong>{link.puzzleTitle}</strong>
              <p className="output-review-progression-role">{link.storyRole}</p>
              {splitProgressionUnlockLines(link.unlocks).map((line, idx) => (
                <p key={`${link.puzzleId}-unlock-${idx}`} className="output-review-progression-unlocks">
                  {line}
                </p>
              ))}
            </li>
          ))}
        </ol>
      </div>
    );
  }
  return (
    <div className="output-review-field-body">
      <OutputReviewProse text={progressionRule} />
    </div>
  );
}

function ThemeDescriptionBlocks({ text }: { text: string }) {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return null;

  const lines = normalized.split("\n");
  const blocks: ReactNode[] = [];
  let buf: string[] = [];
  let key = 0;

  const flushBuf = (): void => {
    const raw = buf.join("\n").trim();
    buf = [];
    if (!raw) return;
    raw.split(/\n\n+/).forEach((para) => {
      const t = stripMarkdownHeadingMarkers(para).trim();
      if (!t) return;
      blocks.push(
        <p className="theme-desc-para theme-desc-prose" key={`p-${key++}`}>
          {t}
        </p>,
      );
    });
  };

  const headingLine = (line: string) => line.match(/^(#{1,6})\s+(.*)$/);

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const hm = headingLine(line);
    if (hm) {
      const title = (hm[2] ?? "").trim();
      if (!title) {
        buf.push(line);
        i += 1;
        continue;
      }
      flushBuf();
      const level = hm[1].length;
      i += 1;
      const body: string[] = [];
      while (i < lines.length && !headingLine(lines[i])) {
        body.push(lines[i]);
        i += 1;
      }
      const bodyText = body.join("\n").trim();
      const tag = level <= 2 ? "h3" : level === 3 ? "h4" : "h5";
      const cls =
        level <= 2 ? "theme-desc-title theme-desc-title--major" : level === 3 ? "theme-desc-title theme-desc-title--sub" : "theme-desc-title theme-desc-title--minor";
      const technicalAdvisory = /studio build policy/i.test(title) || /copy qa/i.test(title);
      blocks.push(
        <section
          className={`theme-desc-section${technicalAdvisory ? " theme-desc-section--technical-advisory" : ""}`}
          key={`sec-${key++}`}
        >
          {technicalAdvisory ? (
            <p className="theme-desc-advisory-kicker" role="presentation">
              <span className="theme-desc-advisory-icon" aria-hidden>
                ◆
              </span>{" "}
              Technical advisory
            </p>
          ) : null}
          {createElement(tag, { className: cls }, title)}
          {bodyText
            ? bodyText.split(/\n\n+/).map((para) => {
                const t = stripMarkdownHeadingMarkers(para).trim();
                if (!t) return null;
                return (
                  <p className="theme-desc-para theme-desc-prose" key={`bp-${key++}`}>
                    {t}
                  </p>
                );
              })
            : null}
        </section>,
      );
      continue;
    }
    buf.push(line);
    i += 1;
  }
  flushBuf();

  if (blocks.length === 0) return null;
  return <div className="theme-desc-root">{blocks}</div>;
}

export default function App() {
  const inputHistory = useMemo(() => loadHistory(), []);
  const initialAuth = useMemo(() => {
    const stored = loadAuthSession();
    return {
      authToken: stored.authToken,
      refreshToken: stored.refreshToken,
      accessExpiresAt: stored.accessExpiresAt,
      refreshExpiresAt: stored.refreshExpiresAt,
      authUser: normalizeAuthUser(stored.authUser),
    };
  }, []);

  const deviceId = useMemo(() => getOrCreateDeviceId(), []);

  const [themes, setThemes] = useState<Theme[]>([]);
  const [themeIdeasLoading, setThemeIdeasLoading] = useState(false);
  const [puzzlesGenerating, setPuzzlesGenerating] = useState(false);
  const [generationTelemetry, setGenerationTelemetry] = useState<GenerationTelemetry | null>(null);
  const [lastRoomSkeleton, setLastRoomSkeleton] = useState<RoomSkeleton | null>(null);
  const [serverOpenAiConfigured, setServerOpenAiConfigured] = useState<boolean | null>(null);
  const [browserAiReady, setBrowserAiReady] = useState<boolean>(() => isBrowserAiAvailable());
  const [themesAiGenerated, setThemesAiGenerated] = useState<boolean | null>(null);
  const [themeSessionExpiredNotice, setThemeSessionExpiredNotice] = useState("");
  const [workspaceSessionExpired, setWorkspaceSessionExpired] = useState<{ open: boolean; message: string }>({
    open: false,
    message: "",
  });
  const [selectedThemeId, setSelectedThemeId] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [serviceHealth, setServiceHealth] = useState<ServiceHealth | null>(null);
  const [sessionId, setSessionId] = useState<string>("");
  const planningRef = useRef<PlanningContextValue | null>(null);
  const layoutPreviewKeyRef = useRef("");
  const [playersConcurrent, setPlayersConcurrent] = useState<string>("2");
  const [participantsTotal, setParticipantsTotal] = useState<string>("6");
  const [sessionDurationMinutes, setSessionDurationMinutes] = useState<string>("45");
  const [eventType, setEventType] = useState<string>("");
  const [roomDifficulty, setRoomDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [youthAddOnEnabled, setYouthAddOnEnabled] = useState<boolean>(false);
  const [youthAddOnGatesAdultFlow, setYouthAddOnGatesAdultFlow] = useState<boolean>(false);
  const [youthAddOnAgeNote, setYouthAddOnAgeNote] = useState<string>("");
  const [environmentType, setEnvironmentType] = useState<string>("");
  const [themeMustMatchEnvironment, setThemeMustMatchEnvironment] = useState<boolean>(false);
  const [venueBuildType, setVenueBuildType] = useState<VenueBuildType>("prebuilt_space");
  const [targetInterface, setTargetInterface] = useState<TargetInterface>("home_party");
  const targetInterfaceInitRef = useRef(false);
  const [propFabrication3dEnabled, setPropFabrication3dEnabled] = useState(false);
  const [propFabricationKinds, setPropFabricationKinds] = useState<PropFabricationKind[]>([]);
  const [availableItems, setAvailableItems] = useState<string>("");
  const [useCustomMainPuzzleCount, setUseCustomMainPuzzleCount] = useState(false);
  const [customMainPuzzleCountStr, setCustomMainPuzzleCountStr] = useState("");
  const [useCustomMix, setUseCustomMix] = useState(false);
  const [customMixLogic, setCustomMixLogic] = useState("");
  const [customMixPhysical, setCustomMixPhysical] = useState("");
  const [customMixElectronic, setCustomMixElectronic] = useState("");
  /** Default on: fewer fields until the host opens “All options” or picks a theme (full tools stay on later steps). */
  const [planningSyncing, setPlanningSyncing] = useState(false);
  const planningAutoSyncRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Theme step + puzzle step: hide long markdown brief and editor until “Full brief” (independent from room Simple / All options). */
  const [simpleThemeView, setSimpleThemeView] = useState<boolean>(true);
  const [existingPuzzles, setExistingPuzzles] = useState<Array<{ name: string; link: string; roomPart: string }>>([]);
  const [existingPuzzleName, setExistingPuzzleName] = useState<string>("");
  const [existingPuzzleLink, setExistingPuzzleLink] = useState<string>("");
  const [existingPuzzleRoomPart, setExistingPuzzleRoomPart] = useState<string>("");
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [refusedPuzzleSlots, setRefusedPuzzleSlots] = useState<RefusedPuzzleSlot[]>([]);
  const [puzzleWindowBusy, setPuzzleWindowBusy] = useState<PuzzleWindowBusy | null>(null);
  const [suggestedAdditions, setSuggestedAdditions] = useState<string[]>([]);
  const [suggestedAdditionsRequired, setSuggestedAdditionsRequired] = useState<string[]>([]);
  const [suggestedSafetyProtocols, setSuggestedSafetyProtocols] = useState<string[]>([]);
  const [storyPlan, setStoryPlan] = useState<StoryPlan | null>(null);
  const [compatibilityPassed, setCompatibilityPassed] = useState<boolean | null>(null);
  const [exportContent, setExportContent] = useState<string>("");
  const [exportPdfBase64, setExportPdfBase64] = useState<string | null>(null);
  const [exportWasRedacted, setExportWasRedacted] = useState<boolean>(false);
  type ExportReadFormat = "markdown" | "plaintext" | "html";
  const [exportReadFormat, setExportReadFormat] = useState<ExportReadFormat>("markdown");
  const [exportBusy, setExportBusy] = useState(false);
  const [planSavedSuccessfully, setPlanSavedSuccessfully] = useState(false);
  const [postExportOpen, setPostExportOpen] = useState(false);
  const [liveOperatingMode, setLiveOperatingMode] = useState<OperatingMode>("home");
  const [liveHasGmConsole, setLiveHasGmConsole] = useState(false);
  const [briefPolishBusy, setBriefPolishBusy] = useState<boolean>(false);
  const [arduinoPreviewPuzzleId, setArduinoPreviewPuzzleId] = useState<string | null>(null);
  const [inspirationOpen, setInspirationOpen] = useState<boolean>(false);
  useEffect(() => {
    if (!targetInterfaceInitRef.current) {
      targetInterfaceInitRef.current = true;
      return;
    }
    setSessionDurationMinutes(targetInterface === "commercial_venue" ? "60" : "30");
  }, [targetInterface]);
  const [customThemeName, setCustomThemeName] = useState<string>("");
  const [customThemeDescription, setCustomThemeDescription] = useState<string>("");
  const [customThemeCoachMessages, setCustomThemeCoachMessages] = useState<ThemeCoachUiMessage[]>([]);
  const [customThemeCoachBusy, setCustomThemeCoachBusy] = useState<boolean>(false);
  const [customThemeCoachError, setCustomThemeCoachError] = useState<string>("");
  const [customThemeSaving, setCustomThemeSaving] = useState<boolean>(false);
  const [coachBrowserAiReady, setCoachBrowserAiReady] = useState<boolean>(() => isBrowserAiAvailable());
  const coachBrowserAiReadyRef = useRef(coachBrowserAiReady);
  coachBrowserAiReadyRef.current = coachBrowserAiReady;
  const [authToken, setAuthToken] = useState<string>(initialAuth.authToken);
  const [refreshToken, setRefreshToken] = useState<string>(initialAuth.refreshToken);
  const [accessExpiresAt, setAccessExpiresAt] = useState<number>(initialAuth.accessExpiresAt);
  const [refreshExpiresAt, setRefreshExpiresAt] = useState<number>(initialAuth.refreshExpiresAt);
  const [authUser, setAuthUser] = useState<AuthUser | null>(initialAuth.authUser);
  const [authBootstrapReady, setAuthBootstrapReady] = useState<boolean>(() => !initialAuth.authToken.trim());
  const authSessionRef = useRef<StoredAuthSession>({
    authToken: initialAuth.authToken,
    refreshToken: initialAuth.refreshToken,
    authUser: initialAuth.authUser,
    accessExpiresAt: initialAuth.accessExpiresAt,
    refreshExpiresAt: initialAuth.refreshExpiresAt,
  });
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authName, setAuthName] = useState<string>("");
  const [authEmail, setAuthEmail] = useState<string>("");
  const [authPassword, setAuthPassword] = useState<string>("");
  const [authPasswordConfirm, setAuthPasswordConfirm] = useState<string>("");
  const [activationKey, setActivationKey] = useState<string>("");
  const [roomsToAddInput, setRoomsToAddInput] = useState<string>("10");
  const [exportCreditsToAddInput, setExportCreditsToAddInput] = useState<string>("10");
  const [orgPoolJson, setOrgPoolJson] = useState<string>("");
  const [billingNotice, setBillingNotice] = useState<string>("");
  const [billingPlans, setBillingPlans] = useState<BillingPlan[]>([]);
  const [squarePaymentsReady, setSquarePaymentsReady] = useState<boolean>(false);
  const [squareSetupHint, setSquareSetupHint] = useState<string | null>(null);
  const [squareWebConfig, setSquareWebConfig] = useState<{
    applicationId: string;
    locationId: string;
    environment: "sandbox" | "production";
  } | null>(null);
  const [socialAuthProvider, setSocialAuthProvider] = useState<"google" | "facebook" | "github" | null>(() =>
    restorePendingSocialOAuthProvider(),
  );
  const [authSubmitting, setAuthSubmitting] = useState(false);
  /** Non-empty string = verification-pending screen is active; value is the email address shown to user. */
  const [authVerificationPending, setAuthVerificationPending] = useState<string>("");
  /** Dev-only: verification URL returned from backend when no email provider is configured. */
  const [authVerificationDevUrl, setAuthVerificationDevUrl] = useState<string>("");
  const [authVerificationResending, setAuthVerificationResending] = useState(false);
  const [checkoutPlanId, setCheckoutPlanId] = useState<string | null>(null);
  const [selectedBillingPlanId, setSelectedBillingPlanId] = useState<string | null>(null);
  const initialEscapePlanRoomRef = useRef(createEscapePlanRoom(1));
  const [escapePlanRooms, setEscapePlanRooms] = useState<EscapePlanRoomProfile[]>([initialEscapePlanRoomRef.current]);
  const [activeEscapePlanRoomId, setActiveEscapePlanRoomId] = useState<string>(initialEscapePlanRoomRef.current.id);
  const [upgradePromptOpen, setUpgradePromptOpen] = useState(false);
  const [upgradePromptMessage, setUpgradePromptMessage] = useState("");
  const [auditEntries, setAuditEntries] = useState<Array<{ ts?: string; action?: string; detail?: unknown }>>([]);
  const [savedPlans, setSavedPlans] = useState<SavedPlanSummary[]>([]);
  const [approvedForBuild, setApprovedForBuild] = useState<boolean>(false);
  const [showPlanPicker, setShowPlanPicker] = useState<boolean>(Boolean(initialAuth.authUser?.canSaveRooms));
  const [activePanel, setActivePanel] = useState<"plan" | "themes" | "saved" | "output">(
    initialAuth.authUser?.canSaveRooms ? "saved" : "plan",
  );
  const [showExistingPuzzleForm, setShowExistingPuzzleForm] = useState<boolean>(false);
  const [validationFlags, setValidationFlags] = useState<Record<string, boolean>>({});
  const [appView, setAppView] = useState<"builder" | "account" | "admin">("builder");
  const [accountSection, setAccountSection] = useState<"overview" | "plans" | "profile">("overview");
  const [profileName, setProfileName] = useState<string>("");
  const [profileEmail, setProfileEmail] = useState<string>("");
  const [profileCurrentPassword, setProfileCurrentPassword] = useState<string>("");
  const [profileNewPassword, setProfileNewPassword] = useState<string>("");
  const [profileNewPasswordConfirm, setProfileNewPasswordConfirm] = useState<string>("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string>("");
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const lastPlanningAuthTokenRef = useRef(initialAuth.authToken);
  const pendingAuthSessionBootstrap = useRef(false);
  const planningSessionRecoveryInFlight = useRef(false);
  const oauthHydratingRef = useRef(false);
  const oauthReturnBootstrapRef = useRef(false);
  const recoverPlanningSessionRef = useRef<
    (options?: { seedThemes?: boolean }) => Promise<string | undefined>
  >(async () => undefined);
  const themesAutoFetchInFlight = useRef(false);
  /** Bumped to cancel in-flight theme generation (e.g. user chose custom theme). */
  const themeGenerationTokenRef = useRef(0);
  const startThemeGenerationRef = useRef<
    (
      activeSessionId: string,
      endpoint?: "/api/themes/generate" | "/api/themes/refresh",
      currentThemes?: Theme[],
    ) => Promise<void>
  >(async () => {});
  const puzzlesRequestInFlight = useRef(false);
  const wizardNavLastRef = useRef<{ at: number; index: number }>({ at: 0, index: -1 });
  const wizardNavigationBusyRef = useRef(false);
  const clearWizardBusyStateRef = useRef<() => void>(() => {});
  const idleLastActivityRef = useRef(0);
  const idleTimeoutSignOutStartedRef = useRef(false);
  const appViewRef = useRef(appView);
  appViewRef.current = appView;
  const persistentCanvasStepsRef = useRef(false);
  const workspaceSessionExpiredRef = useRef(workspaceSessionExpired);
  workspaceSessionExpiredRef.current = workspaceSessionExpired;
  const [idlePromptOpen, setIdlePromptOpen] = useState(false);
  const [idleDraftBusy, setIdleDraftBusy] = useState(false);
  const [snapshotSyncHint, setSnapshotSyncHint] = useState<string | null>(null);
  const [outputReviewBusy, setOutputReviewBusy] = useState(false);
  const wizardNavigationBusy =
    themeIdeasLoading ||
    puzzlesGenerating ||
    outputReviewBusy ||
    customThemeSaving ||
    customThemeCoachBusy ||
    Boolean(puzzleWindowBusy);
  const socialLoginBlocked = socialLoginBlockedMessage(serviceHealth);
  const persistenceWarning = ephemeralAuthStoreWarning(serviceHealth);
  const persistAuthRef = useRef<(token: string, user: AuthUser | null) => void>(() => {});
  const themeCoachHydratedForSessionRef = useRef<string>("");
  const builderShellRef = useRef<HTMLElement | null>(null);
  const topNavRef = useRef<HTMLElement | null>(null);
  const flowMapBarRef = useRef<HTMLDivElement | null>(null);
  const prevCustomThemeCoachPrereqsOkRef = useRef(false);
  const customThemeCoachMessagesRef = useRef<ThemeCoachUiMessage[]>([]);
  const hasSavedPlans = savedPlans.length > 0;
  const [themePath, setThemePath] = useState<"custom" | "generated" | null>(null);
  type WizardStep =
    | "saved"
    | "themes"
    | "themes-puzzles"
    | "setup"
    | "output-review"
    | "output-export";
  const [wizardStep, setWizardStep] = useState<WizardStep>("setup");
  /** Highest wizard step reached this draft session — enables map clicks back to completed steps. */
  const [furthestWizardIndex, setFurthestWizardIndex] = useState(0);
  const [hoverPreviewThemeId, setHoverPreviewThemeId] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const selectedTheme = useMemo(
    () => themes.find((theme) => theme.id === selectedThemeId),
    [themes, selectedThemeId],
  );
  const commercialVenueContext = useMemo(() => isCommercialVenueEventContext(eventType), [eventType]);

  useEffect(() => {
    if (!authUser) return;
    setTargetInterface(operatingModeToTargetInterface(authUser.operatingModeDefault));
  }, [authUser?.id, authUser?.operatingModeDefault]);

  useEffect(() => {
    setLiveOperatingMode(targetInterfaceToOperatingMode(targetInterface));
  }, [targetInterface]);

  useEffect(() => {
    setVenueBuildType(targetInterface === "commercial_venue" ? "professional_empty" : "prebuilt_space");
  }, [targetInterface]);

  useEffect(() => {
    void fetchServiceHealth(API_BASE).then((row) => {
      if (row) setServiceHealth(row);
    });
    void fetch("/version")
      .then((r) => r.json())
      .then((d: { openAiConfigured?: boolean }) => {
        if (typeof d.openAiConfigured === "boolean") setServerOpenAiConfigured(d.openAiConfigured);
      })
      .catch(() => {});
    void probeBrowserLanguageModel().then(setBrowserAiReady);
  }, []);

  useTopNavHeight(topNavRef, builderShellRef, flowMapBarRef, [appView, authUser?.id, authUser?.billingTier]);

  const propPresetLabels = useMemo(
    () => getSuggestedPropOptionsForPlanning(environmentType, eventType).map((o) => o.label),
    [environmentType, eventType],
  );
  const simpleRoomSetup = false;

  useEffect(() => {
    if (appView !== "builder" || !error.trim()) return;
    if (oauthHydratingRef.current || pendingAuthSessionBootstrap.current) return;
    toastErrorOnce(error);
  }, [error, appView]);

  useEffect(() => {
    if (!sessionId || appView !== "builder") return;
    if (!buildPlanningBody("draft")) return;
    if (planningAutoSyncRef.current) clearTimeout(planningAutoSyncRef.current);
    planningAutoSyncRef.current = setTimeout(() => {
      void (async () => {
        setPlanningSyncing(true);
        try {
          const mode = buildPlanningBody("strict") ? "strict" : "draft";
          await syncPlanningInputToServer(sessionId, mode);
        } finally {
          setPlanningSyncing(false);
        }
      })();
    }, 700);
    return () => {
      if (planningAutoSyncRef.current) clearTimeout(planningAutoSyncRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounced planning field sync
  }, [
    sessionId,
    appView,
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
    themeMustMatchEnvironment,
    venueBuildType,
    targetInterface,
    propFabrication3dEnabled,
    propFabricationKinds,
    useCustomMainPuzzleCount,
    customMainPuzzleCountStr,
    useCustomMix,
    customMixLogic,
    customMixPhysical,
    customMixElectronic,
  ]);

  customThemeCoachMessagesRef.current = customThemeCoachMessages;

  const themePlanningContextLine = useMemo(() => {
    const env = environmentType.trim() || "environment not set";
    return `${playersConcurrent} at once · ${participantsTotal} total · ${sessionDurationMinutes} min · ${env}`;
  }, [playersConcurrent, participantsTotal, sessionDurationMinutes, environmentType]);

  useEffect(() => {
    if (wizardStep !== "themes") setHoverPreviewThemeId(null);
  }, [wizardStep]);

  const rememberInput = (field: string, value: string): void => {
    const normalized = value.trim();
    if (!normalized) return;
    const current = loadHistory();
    const existing = current[field] ?? [];
    const next = [normalized, ...existing.filter((entry) => entry.toLowerCase() !== normalized.toLowerCase())].slice(
      0,
      12,
    );
    current[field] = next;
    saveHistory(current);
  };
  const cacheLocalPlanningInputs = (): void => {
    rememberInput("environmentType", environmentType);
    rememberInput("availableItems", availableItems);
    rememberInput("eventType", eventType);
    rememberInput("customThemeName", customThemeName);
    rememberInput("customThemeDescription", customThemeDescription);
  };

  type PlanningApiBody = {
    playersConcurrent: number;
    participantsTotal: number;
    sessionDurationMinutes: number;
    environmentType: string;
    availableItems: string[];
    roomDifficulty: "easy" | "medium" | "hard";
    youthAddOnEnabled: boolean;
    youthAddOnGatesAdultFlow: boolean;
    youthAddOnAgeNote: string;
    eventType: string;
    mainTrackPuzzleCountOverride: number | null;
    puzzleMixLogic: number | null;
    puzzleMixPhysical: number | null;
    puzzleMixElectronic: number | null;
    themeMustMatchEnvironment: boolean;
    venueBuildType: VenueBuildType;
    targetInterface: TargetInterface;
    propFabrication3dEnabled: boolean;
    propFabricationKinds: PropFabricationKind[];
  };

  const buildPlanningBody = (mode: "draft" | "strict"): PlanningApiBody | null => {
    if (planningRef.current) return planningRef.current.buildBody(mode);
    const parsedItems = availableItems
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const pc = Number(playersConcurrent);
    const pt = Number(participantsTotal);
    const sd = Number(sessionDurationMinutes);
    const env = environmentType.trim();
    const mainOverride = ((): number | null => {
      if (!useCustomMainPuzzleCount) return null;
      const n = Number.parseInt(customMainPuzzleCountStr.trim(), 10);
      if (!Number.isFinite(n)) return null;
      return Math.min(24, Math.max(1, Math.trunc(n)));
    })();
    const mixTriple = ((): { logic: number; physical: number; electronic: number } | null => {
      if (!useCustomMix) return null;
      const L = Number.parseInt(customMixLogic.trim(), 10);
      const P = Number.parseInt(customMixPhysical.trim(), 10);
      const E = Number.parseInt(customMixElectronic.trim(), 10);
      if (!Number.isFinite(L) || !Number.isFinite(P) || !Number.isFinite(E)) return null;
      if (L < 0 || P < 0 || E < 0 || L > 20 || P > 20 || E > 20) return null;
      if (L + P + E < 1) return null;
      return { logic: Math.trunc(L), physical: Math.trunc(P), electronic: Math.trunc(E) };
    })();
    if (mode === "strict") {
      if (!Number.isFinite(pc) || pc < 1 || pc > 99) return null;
      if (!Number.isFinite(pt) || pt < 1 || pt > 99) return null;
      if (pc > pt) return null;
      if (!Number.isFinite(sd) || sd < 10 || sd > 180) return null;
      if (!env) return null;
      if (useCustomMainPuzzleCount && mainOverride === null) return null;
      if (useCustomMix && mixTriple === null) return null;
      return {
        playersConcurrent: pc,
        participantsTotal: pt,
        sessionDurationMinutes: sd,
        environmentType: env,
        availableItems: parsedItems,
        roomDifficulty,
        youthAddOnEnabled,
        youthAddOnGatesAdultFlow,
        youthAddOnAgeNote: youthAddOnAgeNote.trim().slice(0, 400),
        eventType: eventType.trim().slice(0, 200),
        mainTrackPuzzleCountOverride: mainOverride,
        puzzleMixLogic: mixTriple?.logic ?? null,
        puzzleMixPhysical: mixTriple?.physical ?? null,
        puzzleMixElectronic: mixTriple?.electronic ?? null,
        themeMustMatchEnvironment,
        venueBuildType,
        targetInterface,
        propFabrication3dEnabled,
        propFabricationKinds,
      };
    }
    const players = Number.isFinite(pc) && pc > 0 ? Math.min(99, Math.max(1, Math.trunc(pc))) : 4;
    const participants = Number.isFinite(pt) && pt > 0 ? Math.min(99, Math.max(1, Math.trunc(pt))) : 6;
    const duration = Number.isFinite(sd) && sd >= 10 ? Math.min(180, Math.max(10, Math.trunc(sd))) : 45;
    return {
      playersConcurrent: players,
      participantsTotal: participants,
      sessionDurationMinutes: duration,
      environmentType: env || "Not specified yet",
      availableItems: parsedItems,
      roomDifficulty,
      youthAddOnEnabled,
      youthAddOnGatesAdultFlow,
      youthAddOnAgeNote: youthAddOnAgeNote.trim().slice(0, 400),
      eventType: eventType.trim().slice(0, 200),
      mainTrackPuzzleCountOverride: mainOverride,
      puzzleMixLogic: mixTriple?.logic ?? null,
      puzzleMixPhysical: mixTriple?.physical ?? null,
      puzzleMixElectronic: mixTriple?.electronic ?? null,
      themeMustMatchEnvironment,
      venueBuildType,
      targetInterface,
      propFabrication3dEnabled,
      propFabricationKinds,
    };
  };

  const selectedThemeName = selectedTheme?.name ?? "Selected Theme";
  const selectedThemeDescription = selectedTheme?.description ?? "";
  const builderSelectionSummary = useMemo(() => {
    const venue =
      targetInterface === "commercial_venue" || commercialVenueContext
        ? "Commercial Venue"
        : formatTargetInterfaceLabel(targetInterface);
    const duration = sessionDurationMinutes.trim() ? `${sessionDurationMinutes.trim()} min` : "—";
    const players = playersConcurrent.trim() ? `${playersConcurrent.trim()} players` : "—";
    const theme = selectedTheme?.name ?? (selectedThemeId ? "Theme selected" : "No theme yet");
    return { venue, duration, players, theme };
  }, [
    targetInterface,
    commercialVenueContext,
    sessionDurationMinutes,
    playersConcurrent,
    selectedTheme,
    selectedThemeId,
  ]);
  const coachCoverage = useMemo(() => getCoachCoverageStatus(customThemeCoachMessages), [customThemeCoachMessages]);
  const customThemeCoachPrereqsOk = useMemo(() => {
    if (!buildPlanningBody("strict")) return false;
    return Boolean(customThemeName.trim());
  }, [
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
    useCustomMainPuzzleCount,
    customMainPuzzleCountStr,
    useCustomMix,
    customMixLogic,
    customMixPhysical,
    customMixElectronic,
    customThemeName,
  ]);
  const wizardSteps = useMemo(
    () =>
      hasSavedPlans
        ? (["saved", "setup", "themes", "themes-puzzles", "output-review", "output-export"] as WizardStep[])
        : (["setup", "themes", "themes-puzzles", "output-review", "output-export"] as WizardStep[]),
    [hasSavedPlans],
  );
  const prevWizardStepsRef = useRef(wizardSteps);
  const flowWizardStep: WizardStep = wizardSteps.includes(wizardStep) ? wizardStep : (wizardSteps[0] ?? "setup");
  const persistentCanvasSteps =
    flowWizardStep === "setup" ||
    flowWizardStep === "themes" ||
    flowWizardStep === "themes-puzzles" ||
    flowWizardStep === "output-review" ||
    flowWizardStep === "output-export";
  persistentCanvasStepsRef.current = persistentCanvasSteps;
  const wizardIndex = wizardSteps.indexOf(flowWizardStep);
  const missionStepLabels = useMemo(() => wizardSteps.map(wizardStepLabel), [wizardSteps]);

  useEffect(() => {
    setFurthestWizardIndex((prev) => Math.max(prev, wizardIndex));
  }, [wizardIndex]);

  useEffect(() => {
    const prev = prevWizardStepsRef.current;
    if (prev !== wizardSteps) {
      setFurthestWizardIndex((furthest) => {
        const stepAtFurthest = prev[furthest];
        if (stepAtFurthest && wizardSteps.includes(stepAtFurthest)) {
          return wizardSteps.indexOf(stepAtFurthest);
        }
        return Math.min(furthest, Math.max(0, wizardSteps.length - 1));
      });
      prevWizardStepsRef.current = wizardSteps;
    }
  }, [wizardSteps]);

  const canNavigateToWizardIndex = (index: number): boolean => {
    if (index < 0 || index >= wizardSteps.length) return false;
    if (index <= furthestWizardIndex) return true;
    if (index <= wizardIndex) return true;
    if (index > wizardIndex) {
      if (index > wizardSteps.indexOf("setup") && !buildPlanningBody("strict")) return false;
      const step = wizardSteps[index];
      if (
        (step === "themes-puzzles" || step === "output-review" || step === "output-export") &&
        !selectedThemeId &&
        themePath !== "custom"
      ) {
        return false;
      }
      return true;
    }
    return false;
  };
  const juniorForkSegmentIndex = useMemo(() => {
    if (!youthAddOnEnabled) return null;
    const i = wizardSteps.indexOf("themes-puzzles");
    return i >= 0 && i < wizardSteps.length - 1 ? i : null;
  }, [youthAddOnEnabled, wizardSteps]);
  const livePuzzleEstimate = useMemo(() => {
    const pc = Number(playersConcurrent);
    const sd = Number(sessionDurationMinutes);
    if (!Number.isFinite(pc) || pc < 1 || !Number.isFinite(sd) || sd < 1) return 4;
    return estimateClientPuzzleCount(Math.floor(pc), Math.floor(sd));
  }, [playersConcurrent, sessionDurationMinutes]);
  const plannerMainPuzzleTarget = useMemo(() => {
    if (useCustomMainPuzzleCount) {
      const n = Number.parseInt(customMainPuzzleCountStr.trim(), 10);
      if (Number.isFinite(n)) return Math.min(24, Math.max(1, Math.trunc(n)));
    }
    return livePuzzleEstimate;
  }, [useCustomMainPuzzleCount, customMainPuzzleCountStr, livePuzzleEstimate]);
  const juniorAddOnPuzzleSlots = useMemo(() => {
    if (!youthAddOnEnabled) return 0;
    const sd = Number(sessionDurationMinutes);
    if (!Number.isFinite(sd) || sd < 1) return 2;
    return sd >= 25 ? 3 : 2;
  }, [youthAddOnEnabled, sessionDurationMinutes]);
  const estimatePulseKey = `${playersConcurrent}-${participantsTotal}-${sessionDurationMinutes}`;
  const mainTrackPuzzles = useMemo(() => puzzles.filter((p) => p.audienceTrack !== "youth_addon"), [puzzles]);
  const juniorTrackPuzzles = useMemo(() => puzzles.filter((p) => p.audienceTrack === "youth_addon"), [puzzles]);
  const juniorGatingPuzzles = useMemo(
    () => juniorTrackPuzzles.filter((p) => p.gatesAdultProgression),
    [juniorTrackPuzzles],
  );
  const mainRefusedSlots = useMemo(
    () => refusedPuzzleSlots.filter((slot) => slot.audienceTrack !== "youth_addon"),
    [refusedPuzzleSlots],
  );
  const juniorRefusedSlots = useMemo(
    () => refusedPuzzleSlots.filter((slot) => slot.audienceTrack === "youth_addon"),
    [refusedPuzzleSlots],
  );

  const runPolishCurrentBrief = async (): Promise<void> => {
    const env = environmentType.trim();
    const items = availableItems.trim();
    const run = async (themeName: string, description: string, apply: (next: string) => void): Promise<void> => {
      setBriefPolishBusy(true);
      setError("");
      try {
        const next = await polishThemeBriefInBrowser({
          themeName,
          description,
          environmentType: env,
          availableItems: items,
        });
        if (!next) {
          setError(
            "On-device AI is unavailable or the edit failed. Use a browser with the Prompt API (e.g. Chrome), or edit the brief manually.",
          );
          return;
        }
        apply(next);
      } finally {
        setBriefPolishBusy(false);
      }
    };

    if (wizardStep === "themes" && themePath === "generated" && selectedTheme?.description.trim()) {
      const t = selectedTheme;
      await run(t.name, t.description, (next) => {
        setThemes((prev) => prev.map((th) => (th.id === t.id ? { ...th, description: next } : th)));
      });
      return;
    }
    if (wizardStep === "themes" && themePath === "custom" && customThemeDescription.trim()) {
      await run(customThemeName.trim() || "Custom theme", customThemeDescription, (next) => setCustomThemeDescription(next));
      return;
    }
    if (wizardStep === "themes-puzzles" && selectedTheme && selectedTheme.description.trim()) {
      const t = selectedTheme;
      await run(t.name, t.description, (next) => {
        setThemes((prev) => prev.map((th) => (th.id === t.id ? { ...th, description: next } : th)));
      });
    }
  };

  const wizardLabel = (() => {
    if (flowWizardStep === "saved") return "Saved Plans";
    if (flowWizardStep === "setup") return "Room details";
    if (flowWizardStep === "themes") return "Choose a theme";
    if (flowWizardStep === "themes-puzzles") return "Build puzzle set";
    return "Output";
  })();

  const syncPlanningInputToServer = async (activeSessionId: string, mode: "draft" | "strict"): Promise<boolean> => {
    const body = buildPlanningBody(mode);
    if (!body) {
      if (mode === "strict") {
        setError(
          "Room details are incomplete or invalid (environment, session length 10–180 minutes, headcounts 1–99). Use ← Back to Room details and fix the highlighted fields.",
        );
      }
      return false;
    }
    try {
      const response = await apiFetch(`/api/planning/session/${activeSessionId}/planning-input`, {
        method: "PATCH",
        headers: hasAuthToken() ? undefined : anonJsonHeaders(),
        body: JSON.stringify(body),
      });
      const data = await parseApiJson<{ ok?: boolean; error?: { message?: string; code?: string } }>(response);
      if (!response.ok) {
        if (isInvalidPlanningSessionResponse(response, data)) {
          const freshId = await recoverPlanningSessionRef.current({ seedThemes: false });
          if (freshId && freshId !== activeSessionId) {
            return syncPlanningInputToServer(freshId, mode);
          }
          setError(planningSessionRecoveryNotice);
          return false;
        }
        const msg = data.error?.message ?? "Failed to update planning details.";
        setError(msg);
        return false;
      }
      return true;
    } catch (err) {
      setError(classifyApiCatchError(err));
      return false;
    }
  };

  const pushSnapshotPlanningToSession = async (): Promise<void> => {
    if (!sessionId) {
      setSnapshotSyncHint(null);
      setError("No planning session on the server yet—finish room details so the app can open one.");
      return;
    }
    const mode = buildPlanningBody("strict") ? "strict" : "draft";
    setSnapshotSyncHint(null);
    const ok = await syncPlanningInputToServer(sessionId, mode);
    if (ok) {
      setError("");
      setSnapshotSyncHint(
        mode === "strict" ? "Planning saved to this session." : "Draft planning synced (some fields still optional).",
      );
      window.setTimeout(() => setSnapshotSyncHint(null), 5000);
    }
  };

  const collectStrictPlanningMissing = (): string[] => {
    if (planningRef.current) return planningRef.current.collectMissing();
    const missing: string[] = [];
    const pc = Number(playersConcurrent);
    const pt = Number(participantsTotal);
    const sd = Number(sessionDurationMinutes);
    if (!Number.isFinite(pc) || pc < 1 || pc > 99) missing.push("playersConcurrent");
    if (!Number.isFinite(pt) || pt < 1 || pt > 99) missing.push("participantsTotal");
    if (Number.isFinite(pc) && Number.isFinite(pt) && pc > pt) {
      missing.push("headcountOrder");
      if (!missing.includes("playersConcurrent")) missing.push("playersConcurrent");
      if (!missing.includes("participantsTotal")) missing.push("participantsTotal");
    }
    if (!Number.isFinite(sd) || sd < 10 || sd > 180) missing.push("sessionDurationMinutes");
    if (!environmentType.trim()) missing.push("environmentType");
    return missing;
  };

  const applyPlayersConcurrentChange = (next: string): void => {
    if (planningRef.current) {
      planningRef.current.dispatch({ type: "SET_PLAYERS_CONCURRENT", value: next });
      return;
    }
    setPlayersConcurrent(next);
    setValidationFlags((current) => ({
      ...current,
      playersConcurrent: false,
      participantsTotal: false,
      headcountOrder: false,
    }));
  };

  const applyParticipantsTotalChange = (next: string): void => {
    if (planningRef.current) {
      planningRef.current.dispatch({ type: "SET_PARTICIPANTS_TOTAL", value: next });
      return;
    }
    setParticipantsTotal(next);
    setValidationFlags((current) => ({
      ...current,
      participantsTotal: false,
      playersConcurrent: false,
      headcountOrder: false,
    }));
    const pt = Number(next);
    const pc = Number(playersConcurrent);
    if (Number.isFinite(pt) && Number.isFinite(pc) && pt > 0 && pc > pt) {
      setPlayersConcurrent(String(Math.min(99, Math.max(1, Math.trunc(pt)))));
    }
  };

  const scrollFirstInvalidRoomFieldIntoView = (): void => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document
          .querySelector("#room-details-blueprint-form .border-destructive, #room-details-blueprint-form .invalid-field")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  };

  const navigateWizardToIndex = async (targetIndex: number): Promise<void> => {
    if (targetIndex < 0 || targetIndex >= wizardSteps.length || targetIndex === wizardIndex) return;
    const now = Date.now();
    if (wizardNavLastRef.current.index === targetIndex && now - wizardNavLastRef.current.at < 320) {
      return;
    }
    wizardNavLastRef.current = { at: now, index: targetIndex };
    if (wizardNavigationBusy) {
      toast.error("Wait for the current step to finish before switching steps.");
      return;
    }
    const targetStep = wizardSteps[targetIndex];
    const revisitingCompletedStep = targetIndex <= furthestWizardIndex;

    if (targetIndex > wizardIndex && !revisitingCompletedStep) {
      if (targetIndex > wizardSteps.indexOf("setup") && !buildPlanningBody("strict")) {
        flagMissingFields(collectStrictPlanningMissing());
        toast.error("Complete room details before advancing.");
        setWizardStep("setup");
        scrollFirstInvalidRoomFieldIntoView();
        return;
      }
      if (
        (targetStep === "themes-puzzles" || targetStep === "output-review" || targetStep === "output-export") &&
        !selectedThemeId &&
        themePath !== "custom"
      ) {
        toast.error("Choose a theme before opening this step.");
        return;
      }
    }
    if (!revisitingCompletedStep) {
      if (targetStep === "themes-puzzles" && wizardIndex < wizardSteps.indexOf("themes-puzzles")) {
        await proceedFromThemesToPuzzles();
        return;
      }
      if (targetStep === "output-review" && flowWizardStep !== "output-review") {
        await proceedToOutputReview();
        return;
      }
    }
    setWizardStep(targetStep);
    if (targetStep === "themes" || targetStep === "themes-puzzles") setActivePanel("themes");
    if (targetStep === "setup") setActivePanel("plan");
    if (targetStep === "output-review" || targetStep === "output-export") setActivePanel("output");
    if (targetStep === "saved") setActivePanel("saved");
  };

  const proceedFromSetupToThemes = async (): Promise<void> => {
    setError("");
    const missing = collectStrictPlanningMissing();
    if (!buildPlanningBody("strict")) {
      flagMissingFields(missing);
      setError(
        missing.includes("headcountOrder")
          ? "Players at one time cannot exceed total participants. Adjust the counters above, then continue."
          : "Complete room details on this step (players, duration, and environment) before continuing. Available items are optional suggestions.",
      );
      scrollFirstInvalidRoomFieldIntoView();
      return;
    }
    rememberInput("environmentType", environmentType);
    rememberInput("availableItems", availableItems);
    rememberInput("eventType", eventType);
    const activeSessionId = await ensureSession();
    if (!activeSessionId) return;
    const synced = await syncPlanningInputToServer(activeSessionId, "strict");
    if (!synced) return;
    if (themePath !== "custom") {
      setThemePath("generated");
      void startThemeGenerationRef.current(activeSessionId, "/api/themes/generate", []);
    }
    setWizardStep("themes");
  };

  const proceedFromThemesToPuzzles = async (): Promise<void> => {
    setError("");
    if (!buildPlanningBody("strict")) {
      flagMissingFields(collectStrictPlanningMissing());
      setError(
        "Complete room details (players, duration, and environment) before continuing to the puzzle builder.",
      );
      setWizardStep("setup");
      setActivePanel("plan");
      scrollFirstInvalidRoomFieldIntoView();
      return;
    }
    if (themePath === "custom") {
      if (!selectedThemeId.trim()) {
        setError('Use “Add and Select Custom Theme” to save your brief to this session, then continue.');
        return;
      }
    } else if (!selectedThemeId.trim()) {
      setValidationFlags((current) => ({ ...current, selectedThemeId: true }));
      setError("Choose one theme from the list before continuing.");
      return;
    }
    const activeSessionId = await ensureSession();
    if (!activeSessionId) return;
    const synced = await syncPlanningInputToServer(activeSessionId, "strict");
    if (!synced) return;
    setWizardStep("themes-puzzles");
    setActivePanel("themes");
    if (puzzles.length === 0) {
      const themeForEnhance = themes.find((theme) => theme.id === selectedThemeId) ?? null;
      await requestPuzzles(activeSessionId, selectedThemeId, themeForEnhance);
    }
  };

  const handleGenerateRoom = async (): Promise<void> => {
    if (workspaceSessionExpired.open || (Boolean(authUser) && !hasAuthToken() && persistentCanvasSteps)) {
      activateWorkspaceSessionExpired(THEME_SESSION_EXPIRED_MESSAGE);
      return;
    }
    setError("");
    const missing = collectStrictPlanningMissing();
    if (!buildPlanningBody("strict")) {
      flagMissingFields(missing);
      setError(
        missing.includes("headcountOrder")
          ? "Players at one time cannot exceed total participants. Adjust the counters, then generate."
          : "Complete room details (players, duration, and environment) before generating.",
      );
      scrollFirstInvalidRoomFieldIntoView();
      return;
    }
    if (themePath === "custom") {
      if (!selectedThemeId.trim()) {
        setError('Use “Add and Select Custom Theme” to save your brief to this session, then generate.');
        return;
      }
    } else if (!selectedThemeId.trim()) {
      setValidationFlags((current) => ({ ...current, selectedThemeId: true }));
      if (themes.length === 0 && canGenerateNewThemes) {
        const bootstrapSessionId = await ensureSession();
        if (bootstrapSessionId) {
          const synced = await syncPlanningInputToServer(bootstrapSessionId, "strict");
          if (synced) {
            void startThemeGenerationRef.current(bootstrapSessionId, "/api/themes/generate", []);
          }
        }
      }
      setError("Choose one theme in The Brief before generating.");
      return;
    }
    rememberInput("environmentType", environmentType);
    rememberInput("availableItems", availableItems);
    rememberInput("eventType", eventType);
    const activeSessionId = await ensureSession();
    if (!activeSessionId) return;
    const synced = await syncPlanningInputToServer(activeSessionId, "strict");
    if (!synced) return;
    setWizardStep("themes-puzzles");
    setActivePanel("themes");
    navigate("/builder/generating");
    if (puzzles.length === 0) {
      const themeForEnhance = themes.find((theme) => theme.id === selectedThemeId) ?? null;
      await requestPuzzles(activeSessionId, selectedThemeId, themeForEnhance);
    }
  };

  const canGenerateRoom = useMemo(() => {
    if (!buildPlanningBody("strict")) return false;
    if (!selectedThemeId.trim()) return false;
    return true;
  }, [
    playersConcurrent,
    participantsTotal,
    sessionDurationMinutes,
    environmentType,
    selectedThemeId,
    targetInterface,
  ]);

  const generateRoomDisabledReason = useMemo((): string | undefined => {
    if (!buildPlanningBody("strict")) {
      return "Complete room details (players, duration, environment)";
    }
    if (!selectedThemeId.trim()) {
      return "Choose a theme in The Brief";
    }
    return undefined;
  }, [
    playersConcurrent,
    participantsTotal,
    sessionDurationMinutes,
    environmentType,
    selectedThemeId,
    targetInterface,
  ]);

  const tryGenerateRoom = useCallback((): boolean => {
    if (!buildPlanningBody("strict")) {
      flagMissingFields(collectStrictPlanningMissing());
      return false;
    }
    return true;
  }, [
    playersConcurrent,
    participantsTotal,
    sessionDurationMinutes,
    environmentType,
    targetInterface,
  ]);

  const canReviewWorkspace = Boolean(selectedThemeId.trim() && puzzles.length > 0);

  const workspaceVenueSummary = useMemo(
    () =>
      `${builderSelectionSummary.venue} · ${builderSelectionSummary.duration} · ${builderSelectionSummary.players}`,
    [builderSelectionSummary],
  );

  const proceedToOutputReview = async (): Promise<void> => {
    setError("");
    if (!buildPlanningBody("strict")) {
      flagMissingFields(collectStrictPlanningMissing());
      setError(
        "Room details no longer pass validation (environment, session length 10–180 minutes, headcounts 1–99). Fix the highlighted required fields below, then try Continue again.",
      );
      if (wizardStep !== "setup") {
        setWizardStep("setup");
        setActivePanel("plan");
      }
      scrollFirstInvalidRoomFieldIntoView();
      return;
    }
    if (!selectedThemeId.trim()) {
      setError("Choose a theme first: go back to the Theme step, pick one option, then return to Build puzzle set.");
      return;
    }
    setOutputReviewBusy(true);
    try {
      rememberInput("environmentType", environmentType);
      rememberInput("availableItems", availableItems);
      rememberInput("eventType", eventType);
      const activeSessionId = await ensureSession();
      if (!activeSessionId) {
        setError("Could not open a planning session. Check that the backend is running, then try again.");
        return;
      }
      const synced = await syncPlanningInputToServer(activeSessionId, "strict");
      if (!synced) return;

      if (selectedThemeId && puzzles.length === 0) {
        const draftSynced = await syncPlanningInputToServer(activeSessionId, "draft");
        if (!draftSynced) return;
        const themeForEnhance = themes.find((theme) => theme.id === selectedThemeId) ?? null;
        const generated = await requestPuzzles(activeSessionId, selectedThemeId, themeForEnhance);
        if (!generated) return;
      }

      flushSync(() => {
        setWizardStep("output-review");
        setActivePanel("output");
      });
      if (persistentCanvasStepsRef.current) {
        navigate("/builder/review", { replace: true });
      }
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document.getElementById("builder-output-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });
    } finally {
      setOutputReviewBusy(false);
    }
  };

  const goWizardBack = (): void => {
    const idx = wizardSteps.indexOf(flowWizardStep);
    if (idx <= 0) return;
    setWizardStep(wizardSteps[idx - 1]);
  };

  const canGoWizardBack = wizardIndex > 0;

  const flagMissingFields = (keys: string[]): void => {
    if (planningRef.current) {
      planningRef.current.flagMissing(keys);
      return;
    }
    const next: Record<string, boolean> = {};
    keys.forEach((key) => {
      next[key] = true;
    });
    setValidationFlags((current) => ({ ...current, ...next }));
  };

  const planningStateSetters = useMemo(
    () => ({
      apply: (s: PlanningFormState) => {
        setPlayersConcurrent(s.playersConcurrent);
        setParticipantsTotal(s.participantsTotal);
        setSessionDurationMinutes(s.sessionDurationMinutes);
        setEventType(s.eventType);
        setRoomDifficulty(s.roomDifficulty);
        setYouthAddOnEnabled(s.youthAddOnEnabled);
        setYouthAddOnGatesAdultFlow(s.youthAddOnGatesAdultFlow);
        setYouthAddOnAgeNote(s.youthAddOnAgeNote);
        setEnvironmentType(s.environmentType);
        setThemeMustMatchEnvironment(s.themeMustMatchEnvironment);
        setVenueBuildType(s.venueBuildType);
        setTargetInterface(s.targetInterface);
        setPropFabrication3dEnabled(s.propFabrication3dEnabled);
        setPropFabricationKinds(s.propFabricationKinds);
        setAvailableItems(s.availableItems);
        setUseCustomMainPuzzleCount(s.useCustomMainPuzzleCount);
        setCustomMainPuzzleCountStr(s.customMainPuzzleCountStr);
        setUseCustomMix(s.useCustomMix);
        setCustomMixLogic(s.customMixLogic);
        setCustomMixPhysical(s.customMixPhysical);
        setCustomMixElectronic(s.customMixElectronic);
        setValidationFlags(s.validationFlags);
      },
    }),
    [],
  );

  const planningProviderInitial = useMemo(
    (): Partial<PlanningFormState> => ({
      playersConcurrent,
      participantsTotal,
      sessionDurationMinutes,
      eventType,
      roomDifficulty,
      youthAddOnEnabled,
      youthAddOnGatesAdultFlow,
      youthAddOnAgeNote,
      environmentType,
      themeMustMatchEnvironment,
      venueBuildType,
      targetInterface,
      propFabrication3dEnabled,
      propFabricationKinds,
      availableItems,
      useCustomMainPuzzleCount,
      customMainPuzzleCountStr,
      useCustomMix,
      customMixLogic,
      customMixPhysical,
      customMixElectronic,
      validationFlags,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed provider once per builder mount
    [],
  );

  const planningHydratePayload = useMemo(
    (): Partial<PlanningFormState> => ({
      playersConcurrent,
      participantsTotal,
      sessionDurationMinutes,
      eventType,
      roomDifficulty,
      youthAddOnEnabled,
      youthAddOnGatesAdultFlow,
      youthAddOnAgeNote,
      environmentType,
      themeMustMatchEnvironment,
      venueBuildType,
      targetInterface,
      propFabrication3dEnabled,
      propFabricationKinds,
      availableItems,
      useCustomMainPuzzleCount,
      customMainPuzzleCountStr,
      useCustomMix,
      customMixLogic,
      customMixPhysical,
      customMixElectronic,
      validationFlags,
    }),
    [
      playersConcurrent,
      participantsTotal,
      sessionDurationMinutes,
      eventType,
      roomDifficulty,
      youthAddOnEnabled,
      youthAddOnGatesAdultFlow,
      youthAddOnAgeNote,
      environmentType,
      themeMustMatchEnvironment,
      venueBuildType,
      targetInterface,
      propFabrication3dEnabled,
      propFabricationKinds,
      availableItems,
      useCustomMainPuzzleCount,
      customMainPuzzleCountStr,
      useCustomMix,
      customMixLogic,
      customMixPhysical,
      customMixElectronic,
      validationFlags,
    ],
  );

  const isAuthPlanningRestorePending = (): boolean =>
    oauthHydratingRef.current || pendingAuthSessionBootstrap.current;

  const waitForAuthPlanningBootstrap = async (): Promise<void> => {
    if (!isAuthPlanningRestorePending()) return;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      if (!isAuthPlanningRestorePending()) return;
      await new Promise((resolve) => window.setTimeout(resolve, 100));
    }
  };

  const buildOAuthReturnSnapshot = (): Omit<OAuthReturnSnapshot, "savedAt"> => ({
    sessionId: sessionId.trim(),
    deviceId,
    wizardStep,
    playersConcurrent,
    participantsTotal,
    sessionDurationMinutes,
    environmentType,
    availableItems,
    eventType,
    targetInterface,
    venueBuildType,
    roomDifficulty,
    themeMustMatchEnvironment,
    youthAddOnEnabled,
    youthAddOnGatesAdultFlow,
    youthAddOnAgeNote,
    themePath,
    selectedThemeId,
    themes,
    puzzles,
    existingPuzzles,
    suggestedAdditions,
    suggestedAdditionsRequired,
    storyPlan,
    compatibilityPassed,
    approvedForBuild,
    useCustomMainPuzzleCount,
    customMainPuzzleCountStr,
    useCustomMix,
    customMixLogic,
    customMixPhysical,
    customMixElectronic,
  });

  const applyOAuthReturnSnapshot = (snapshot: OAuthReturnSnapshot): void => {
    applyWorkspaceDraftFromOAuth(snapshot);
    if (snapshot.sessionId.trim()) setSessionId(snapshot.sessionId.trim());
    setThemePath(snapshot.themePath);
    setSelectedThemeId(snapshot.selectedThemeId ?? "");
    setThemes(Array.isArray(snapshot.themes) ? (snapshot.themes as Theme[]) : []);
    setPuzzles(Array.isArray(snapshot.puzzles) ? (snapshot.puzzles as Puzzle[]) : []);
    setExistingPuzzles(Array.isArray(snapshot.existingPuzzles) ? snapshot.existingPuzzles : []);
    setSuggestedAdditions(Array.isArray(snapshot.suggestedAdditions) ? snapshot.suggestedAdditions : []);
    setSuggestedAdditionsRequired(
      Array.isArray(snapshot.suggestedAdditionsRequired) ? snapshot.suggestedAdditionsRequired : [],
    );
    setStoryPlan((snapshot.storyPlan as StoryPlan | null) ?? null);
    setCompatibilityPassed(snapshot.compatibilityPassed ?? null);
    setApprovedForBuild(Boolean(snapshot.approvedForBuild));
    setUseCustomMainPuzzleCount(Boolean(snapshot.useCustomMainPuzzleCount));
    setCustomMainPuzzleCountStr(snapshot.customMainPuzzleCountStr ?? "");
    setUseCustomMix(Boolean(snapshot.useCustomMix));
    setCustomMixLogic(snapshot.customMixLogic ?? "");
    setCustomMixPhysical(snapshot.customMixPhysical ?? "");
    setCustomMixElectronic(snapshot.customMixElectronic ?? "");
    const restoredStep = snapshot.wizardStep as WizardStep;
    let restoredFurthest = wizardSteps.indexOf(restoredStep);
    if (restoredFurthest < 0) restoredFurthest = 0;
    const themesIdx = wizardSteps.indexOf("themes");
    const puzzlesIdx = wizardSteps.indexOf("themes-puzzles");
    const reviewIdx = wizardSteps.indexOf("output-review");
    const exportIdx = wizardSteps.indexOf("output-export");
    if (snapshot.selectedThemeId?.trim() && themesIdx >= 0) restoredFurthest = Math.max(restoredFurthest, themesIdx);
    if (snapshot.selectedThemeId?.trim() && snapshot.puzzles?.length && puzzlesIdx >= 0) {
      restoredFurthest = Math.max(restoredFurthest, puzzlesIdx);
    }
    if (snapshot.approvedForBuild && reviewIdx >= 0) restoredFurthest = Math.max(restoredFurthest, reviewIdx);
    if (restoredStep === "output-export" && exportIdx >= 0) restoredFurthest = Math.max(restoredFurthest, exportIdx);
    setFurthestWizardIndex(restoredFurthest);
  };

  const applyWorkspaceDraftFromOAuth = (draft: OAuthWorkspaceDraft): void => {
    setPlayersConcurrent(draft.playersConcurrent);
    setParticipantsTotal(draft.participantsTotal);
    setSessionDurationMinutes(draft.sessionDurationMinutes);
    setEnvironmentType(draft.environmentType);
    setAvailableItems(draft.availableItems);
    setEventType(draft.eventType);
    setTargetInterface(draft.targetInterface as TargetInterface);
    setVenueBuildType(draft.venueBuildType as VenueBuildType);
    setRoomDifficulty(draft.roomDifficulty as "easy" | "medium" | "hard");
    setThemeMustMatchEnvironment(draft.themeMustMatchEnvironment);
    setYouthAddOnEnabled(draft.youthAddOnEnabled);
    setYouthAddOnGatesAdultFlow(draft.youthAddOnGatesAdultFlow);
    setYouthAddOnAgeNote(draft.youthAddOnAgeNote);
    const step = draft.wizardStep as WizardStep;
    if (
      step === "setup" ||
      step === "themes" ||
      step === "themes-puzzles" ||
      step === "output-review" ||
      step === "output-export" ||
      step === "saved"
    ) {
      setWizardStep(step);
    }
  };

  const persistAuth = (
    token: string,
    user: AuthUser | null,
    sessionExtras?: { refreshToken?: string; accessExpiresAt?: number; refreshExpiresAt?: number },
  ): void => {
    const normalized = user ? normalizeAuthUser(user) : null;
    const oauthResumePending = Boolean(token && normalized && peekOAuthPlanningStash());
    const preservePlanningSession = Boolean(
      token &&
        normalized &&
        (oauthResumePending ||
          oauthReturnBootstrapRef.current ||
          Boolean(peekOAuthReturnSnapshot()) ||
          sessionId.trim()),
    );
    const nextRefreshToken = sessionExtras?.refreshToken ?? (token ? refreshToken : "");
    const nextAccessExpiresAt = sessionExtras?.accessExpiresAt ?? (token ? accessExpiresAt : 0);
    const nextRefreshExpiresAt = sessionExtras?.refreshExpiresAt ?? (token ? refreshExpiresAt : 0);
    const session: StoredAuthSession = {
      authToken: token,
      refreshToken: nextRefreshToken,
      authUser: normalized,
      accessExpiresAt: nextAccessExpiresAt,
      refreshExpiresAt: nextRefreshExpiresAt,
    };
    authSessionRef.current = session;
    if (token && normalized) {
      try {
        saveAuthSession(session);
      } catch {
        // Ignore storage errors; in-memory auth state still works for this session.
      }
    }
    setAuthToken(token);
    setRefreshToken(nextRefreshToken);
    setAccessExpiresAt(nextAccessExpiresAt);
    setRefreshExpiresAt(nextRefreshExpiresAt);
    setAuthUser(normalized);
    setShowPlanPicker(Boolean(user));
    setActivePanel(Boolean(user?.canSaveRooms) ? "saved" : "plan");
    if (!oauthResumePending && !preservePlanningSession) {
      setWizardStep("setup");
    }
    if (!user || !token) {
      setAppView("builder");
      setBillingNotice("");
      themeCoachHydratedForSessionRef.current = "";
      setCustomThemeCoachMessages([]);
      setCustomThemeCoachError("");
      setYouthAddOnEnabled(false);
      setYouthAddOnGatesAdultFlow(false);
      setYouthAddOnAgeNote("");
      setEventType("");
      setSessionId("");
      setThemes([]);
      setSelectedThemeId("");
      setPuzzles([]);
      setRefusedPuzzleSlots([]);
      setSuggestedAdditions([]);
      setSuggestedAdditionsRequired([]);
      setSuggestedSafetyProtocols([]);
      setStoryPlan(null);
      setCompatibilityPassed(null);
      setExportContent("");
      setApprovedForBuild(false);
      setPlanSavedSuccessfully(false);
    }
    try {
      if (!user || !token) {
        clearAuthSession();
        return;
      }
      if (normalized) {
        if (!preservePlanningSession) {
          setSessionId("");
        }
        pendingAuthSessionBootstrap.current = true;
      }
    } catch {
      // Ignore storage errors; in-memory auth state still works for this session.
    }
  };
  persistAuthRef.current = persistAuth;
  const signOut = (): void => {
    setError("");
    clearWizardBusyStateRef.current();
    try {
      window.localStorage.removeItem(IDLE_RESUME_PLAN_ID_KEY);
    } catch {
      // ignore
    }
    persistAuth("", null);
  };

  const handleProfileUpdate = async (): Promise<void> => {
    if (profileSaving || !authUser) return;
    setProfileSaving(true);
    setProfileSuccess("");
    setError("");
    try {
      const isLocal = authUser.provider === "local";
      const wantsPasswordChange = profileNewPassword.trim().length > 0;
      if (wantsPasswordChange) {
        if (profileNewPassword !== profileNewPasswordConfirm) {
          setError("New passwords do not match.");
          return;
        }
        if (profileNewPassword.length < 8 || !/[A-Z]/.test(profileNewPassword) || !/[0-9!@#$%^&*()\-_=+[\]{};':",.<>/?\\|`~]/.test(profileNewPassword)) {
          setError("New password must be at least 8 characters with one uppercase letter and one number or symbol.");
          return;
        }
      }
      const body: Record<string, string> = {};
      if (profileName.trim() && profileName.trim() !== authUser.name) body.name = profileName.trim();
      if (isLocal && profileEmail.trim() && profileEmail.trim().toLowerCase() !== authUser.email) body.email = profileEmail.trim();
      if (isLocal && wantsPasswordChange) body.newPassword = profileNewPassword;
      if (isLocal && (body.email !== undefined || body.newPassword !== undefined)) body.currentPassword = profileCurrentPassword;
      if (Object.keys(body).length === 0) {
        setProfileSuccess("No changes to save.");
        return;
      }
      const response = await apiFetch("/api/me", { method: "PATCH", body: JSON.stringify(body) });
      const data = (await response.json()) as { user?: AuthUser; error?: { message?: string } };
      if (!response.ok || !data.user) {
        setError(data.error?.message ?? "Could not save changes.");
        return;
      }
      const updated = normalizeAuthUser(data.user);
      if (updated) {
        persistAuth(currentAuthToken(), updated, { refreshToken: undefined, accessExpiresAt: undefined });
        setAuthUser(updated);
      }
      setProfileCurrentPassword("");
      setProfileNewPassword("");
      setProfileNewPasswordConfirm("");
      setProfileSuccess("Profile updated.");
    } catch {
      setError("Could not save changes. Check your connection and try again.");
    } finally {
      setProfileSaving(false);
    }
  };
  const currentAuthToken = (): string => {
    // Prefer the synchronously-updated ref so cross-tab token adoptions (and
    // proactive refreshes) are visible in the same call stack, before the React
    // state re-render propagates.
    if (authSessionRef.current.authToken.trim()) return authSessionRef.current.authToken.trim();
    if (authToken.trim()) return authToken.trim();
    try {
      const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) return "";
      const parsed = JSON.parse(raw) as { authToken?: unknown };
      return typeof parsed.authToken === "string" ? parsed.authToken.trim() : "";
    } catch {
      return "";
    }
  };
  const hasAuthToken = (): boolean => currentAuthToken().length > 0;
  const withAuthHeaders = (): HeadersInit => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${currentAuthToken()}`,
    "X-Device-Id": deviceId,
  });
  const withAuthGetHeaders = (): HeadersInit => ({
    Authorization: `Bearer ${currentAuthToken()}`,
    "X-Device-Id": deviceId,
  });
  const anonJsonHeaders = (): HeadersInit => ({
    "Content-Type": "application/json",
    "X-Device-Id": deviceId,
  });
  const apiFetch = (path: string, init?: RequestInit): Promise<Response> => {
    const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
    if (!currentAuthToken()) {
      return fetch(url, {
        ...init,
        headers: { ...anonJsonHeaders(), ...(init?.headers ?? {}) },
      });
    }
    return authFetch(url, init);
  };

  const openUpgradePrompt = (message?: string): void => {
    setUpgradePromptMessage(
      message ??
        "Your free trial is complete. Purchase a room pack to design more rooms, save plans, and export again.",
    );
    setAccountSection("plans");
    setAppView("account");
    setUpgradePromptOpen(true);
  };

  const handleBillingGate = (code?: string, message?: string): boolean => {
    if (
      code === "TRIAL_USED" ||
      code === "TRIAL_NO_SAVE" ||
      code === "EXPORT_CREDITS_EXHAUSTED" ||
      code === "ROOM_NOT_MANIFESTED"
    ) {
      openUpgradePrompt(
        message ??
          "You've used all your design exports. Purchase an additional export credit or upgrade to an Operator Subscription for live operational access.",
      );
      return true;
    }
    if (code === "SUBSCRIPTION_INACTIVE" || code === "ACCOUNT_CANCELED" || code === "SUBSCRIPTION_REQUIRED") {
      openUpgradePrompt(
        message ??
          (code === "SUBSCRIPTION_INACTIVE"
            ? "Subscription inactive. Reactivate your operator tier to resume live facility operations."
            : "Purchase a plan to continue."),
      );
      return true;
    }
    if (code === "FORBIDDEN" || code === "GENERATION_BLOCKED") {
      openUpgradePrompt(message ?? "You do not have access to run this step on your current plan.");
      return true;
    }
    return false;
  };

  useEffect(() => {
    const state = location.state as { wizardStep?: WizardStep; openUpgrade?: boolean } | null;
    if (!state?.wizardStep && !state?.openUpgrade) return;
    if (state.wizardStep) {
      setWizardStep(state.wizardStep);
      setAppView("builder");
      setActivePanel(
        state.wizardStep === "output-review" || state.wizardStep === "output-export" ? "output" : "themes",
      );
    }
    if (state.openUpgrade) openUpgradePrompt();
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  const refreshProfile = async (opts?: {
    retryOnStaleToken?: boolean;
    tokenOverride?: string;
  }): Promise<boolean> => {
    const token = (opts?.tokenOverride ?? currentAuthToken()).trim();
    if (!token) return false;
    try {
      const response = await authFetch(`${API_BASE}/api/me`, {
        method: "GET",
        headers: opts?.tokenOverride
          ? { Authorization: `Bearer ${token}`, "X-Device-Id": deviceId }
          : { "X-Device-Id": deviceId },
      });
      const data = (await response.json()) as {
        user?: AuthUser;
        accessExpiresAt?: number;
        error?: { code?: string; message?: string };
      };
      if (response.status === 401) {
        const code = parseAuthErrorCode(data);
        if (isRecoverableAuthError(code) && opts?.retryOnStaleToken !== false) {
          await new Promise((resolve) => window.setTimeout(resolve, 450));
          return refreshProfile({ retryOnStaleToken: false, tokenOverride: token });
        }
        if (
          !oauthHydratingRef.current &&
          (isFatalAuthError(code) || code === "UNAUTHORIZED" || code === "TOKEN_MISSING")
        ) {
          handleAuthExpired(data.error?.message);
        }
        return false;
      }
      if (data.user) {
        const normalized = normalizeAuthUser(data.user);
        if (normalized) {
          const session = authSessionRef.current;
          persistAuth(token, normalized, {
            refreshToken: session.refreshToken || refreshToken,
            accessExpiresAt:
              typeof data.accessExpiresAt === "number" ? data.accessExpiresAt : session.accessExpiresAt,
            refreshExpiresAt: session.refreshExpiresAt || refreshExpiresAt,
          });
        }
      }
      return true;
    } catch {
      // offline: keep cached user
      return true;
    }
  };

  const hasFullCatalogAccess = Boolean(authUser?.hasFullCatalog);
  const workspaceAuthBlocked =
    workspaceSessionExpired.open || (Boolean(authUser) && !hasAuthToken() && persistentCanvasSteps);
  const canGenerateNewThemes =
    !workspaceAuthBlocked &&
    (hasFullCatalogAccess ||
    serverOpenAiConfigured === true ||
    browserAiReady ||
    coachBrowserAiReady ||
    (Boolean(authUser) && isMobileLikeDevice()));
  const handleGenerateNewThemes = (): void => {
    void loadThemes(themes.length > 0 ? "/api/themes/refresh" : "/api/themes/generate");
  };
  const themeGenerateDisabledTitle = canGenerateNewThemes
    ? undefined
    : hasFullCatalogAccess
      ? undefined
      : isMobileLikeDevice()
        ? "Sign in to generate themes for your room"
        : "Use Chrome on-device AI or upgrade to a room pack for rotating theme ideas";


  useEffect(() => {
    if (appView !== "builder" || !persistentCanvasSteps) return;
    document.documentElement.classList.add("builder-route--fullpage");
    if (location.pathname.startsWith("/coordinator/experience-designer")) {
      navigate("/builder/compose", { replace: true });
      return;
    }
    if (!location.pathname.startsWith("/builder")) {
      navigate("/builder/compose", { replace: true });
    }
    return () => {
      document.documentElement.classList.remove("builder-route--fullpage");
    };
  }, [appView, persistentCanvasSteps, location.pathname, navigate]);

  const handleGenerateArchitecturalSkeleton = useCallback((): void => {
    const planning = planningRef.current;
    if (!planning) return;
    const themeName =
      customThemeName.trim() ||
      selectedTheme?.name ||
      themes.find((t) => t.id === selectedThemeId)?.name ||
      "Your escape room";
    const commercial = planning.state.targetInterface === "commercial_venue";
    const skeleton = buildHeuristicRoomSkeleton(themeName, commercial);
    setLastRoomSkeleton(skeleton);
    const nextLayout = applyRoomSkeletonToLayout(planning.state.roomLayout, skeleton);
    planning.dispatch({ type: "SET_ROOM_LAYOUT", layout: nextLayout });
    planning.dispatch({
      type: "LAYOUT_ANNOUNCE",
      message: `Plotted ${skeleton.zones.length} flow zones on the blueprint canvas.`,
    });
  }, [customThemeName, selectedTheme, themes, selectedThemeId]);

  const puzzleInspectorSlices = useMemo(
    () =>
      puzzles.map((p) => ({
        id: p.id,
        title: p.title,
        category: p.category,
        objective: p.objective,
        electronicDetails: p.electronicDetails,
      })),
    [puzzles],
  );
  const canNavigateToOutputReview = Boolean(selectedThemeId.trim());

  const planCompletionPercent = useMemo(
    () =>
      computePlanCompletionPercent({
        hasSession: Boolean(sessionId.trim()),
        hasTheme: Boolean(selectedThemeId.trim()),
        puzzleCount: puzzles.length,
        refusedSlots: refusedPuzzleSlots.length,
        hasStoryPlan: Boolean(storyPlan),
        approvedForBuild,
        planSaved: planSavedSuccessfully,
      }),
    [
      sessionId,
      selectedThemeId,
      puzzles.length,
      refusedPuzzleSlots.length,
      storyPlan,
      approvedForBuild,
      planSavedSuccessfully,
    ],
  );

  const trialEvalExportAllowed = Boolean(
    authUser?.billingTier === "trial" && authUser.trialRemaining && authUser.canExportRunbook,
  );



  const isGenerationAuthExpired = (
    response: Response,
    data?: { error?: { code?: string; message?: string } },
  ): boolean => {
    const code = parseAuthErrorCode(data);
    if (response.status !== 401) return false;
    return isFatalAuthError(code) || code === "UNAUTHORIZED" || code === "TOKEN_MISSING";
  };

  const activateWorkspaceSessionExpired = useCallback((message: string): void => {
    themesAutoFetchInFlight.current = false;
    setThemeIdeasLoading(false);
    setThemeSessionExpiredNotice("");
    setWorkspaceSessionExpired({
      open: true,
      message: message.trim() || THEME_SESSION_EXPIRED_MESSAGE,
    });
  }, []);

  const handleThemeGenerationAuthExpired = (): void => {
    cacheLocalPlanningInputs();
    activateWorkspaceSessionExpired(THEME_SESSION_EXPIRED_MESSAGE);
    setError("");
    setSessionId("");
    setSelectedThemeId("");
    setPuzzles([]);
    setRefusedPuzzleSlots([]);
    setSuggestedAdditions([]);
    setSuggestedAdditionsRequired([]);
    setSuggestedSafetyProtocols([]);
    setStoryPlan(null);
    setCompatibilityPassed(null);
    setExportContent("");
    setApprovedForBuild(false);
    const staleToken = currentAuthToken();
    setAuthToken("");
    try {
      clearAuthSession();
      if (staleToken) void clearPersistedPlanningSession(staleToken);
    } catch {
      // Keep in-memory planning inputs even if storage cleanup fails.
    }
  };

  const showSlotUtilizationWarning = Boolean(
    authUser &&
      !authUser.isAdmin &&
      authUser.roomAllowance > 0 &&
      authUser.savedRoomCount / authUser.roomAllowance >= 0.8,
  );

  useEffect(() => {
    if (!authToken || !authUser || appView !== "account") return;
    void (async () => {
      try {
        const response = await apiFetch("/api/billing/audit-log");
        if (response.status === 401) {
          handleAuthExpired();
          return;
        }
        const data = (await response.json()) as { entries?: Array<{ ts?: string; action?: string; detail?: unknown }> };
        setAuditEntries(Array.isArray(data.entries) ? data.entries : []);
      } catch {
        setAuditEntries([]);
      }
    })();
  }, [authToken, authUser, appView]);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch(`${API_BASE}/api/billing/plans`);
        if (!response.ok) return;
        const data = (await response.json()) as {
          plans?: BillingPlan[];
          square?: {
            configured?: boolean;
            environment?: string;
            applicationId?: string | null;
            locationId?: string | null;
            setupHint?: string | null;
          };
        };
        const plans = Array.isArray(data.plans) ? data.plans : [];
        setBillingPlans(plans.filter((plan) => plan.tierLane !== "enterprise"));
        setSquarePaymentsReady(Boolean(data.square?.configured));
        setSquareSetupHint(
          data.square?.configured ? null : String(data.square?.setupHint ?? "").trim() || null,
        );
        const appId = String(data.square?.applicationId ?? "").trim();
        const locationId = String(data.square?.locationId ?? "").trim();
        setSquareWebConfig(
          appId && locationId
            ? {
                applicationId: appId,
                locationId,
                environment: resolveSquareWebEnvironment(appId, data.square?.environment),
              }
            : null,
        );
      } catch {
        setBillingPlans([]);
        setSquarePaymentsReady(false);
        setSquareSetupHint(null);
        setSquareWebConfig(null);
      }
    })();
  }, []);

  useEffect(() => {
    if (billingPlans.length === 0) return;
    setSelectedBillingPlanId((current) => {
      if (current && billingPlans.some((plan) => plan.id === current)) return current;
      return (
        billingPlans.find((plan) => plan.purchasable && plan.highlight)?.id ??
        billingPlans.find((plan) => plan.purchasable)?.id ??
        null
      );
    });
  }, [billingPlans]);

  const selectedBillingPlan = useMemo(
    () => billingPlans.find((plan) => plan.id === selectedBillingPlanId) ?? null,
    [billingPlans, selectedBillingPlanId],
  );

  const operatorPlanQuote = useMemo(() => {
    if (!selectedBillingPlan?.scalableRoomPricing) return null;
    return calculateEscapePlanPrice(escapePlanRooms.length, {
      basePriceCents: selectedBillingPlan.priceCents,
      includedLayoutRooms: selectedBillingPlan.scalableRoomPricing.includedLayoutRooms,
      perAdditionalRoomCents: selectedBillingPlan.scalableRoomPricing.perAdditionalRoomCents,
      exportCreditsPerRoom: selectedBillingPlan.scalableRoomPricing.exportCreditsPerRoom,
    });
  }, [selectedBillingPlan, escapePlanRooms.length]);

  const showEscapePlanBuilder = selectedBillingPlanId === SCALABLE_OPERATOR_PLAN_ID;

  useEffect(() => {
    if (!authToken) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("checkout") !== "success") return;
    const ref = url.searchParams.get("ref")?.trim();
    if (!ref) return;
    void (async () => {
      setAppView("account");
      try {
        const response = await apiFetch("/api/billing/checkout/confirm", {
          method: "POST",
          body: JSON.stringify({ ref }),
        });
        const data = (await response.json()) as {
          user?: AuthUser;
          fulfilled?: boolean;
          alreadyFulfilled?: boolean;
          roomsAdded?: number;
          exportCreditsAdded?: number;
          error?: { message?: string };
        };
        url.searchParams.delete("checkout");
        url.searchParams.delete("ref");
        window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
        if (!response.ok) {
          setError(data.error?.message ?? "Could not confirm your purchase yet. If you were charged, contact support.");
          return;
        }
        const normalized = data.user ? normalizeAuthUser(data.user) : null;
        if (normalized) {
          persistAuth(authToken, normalized);
        }
        if (data.alreadyFulfilled) {
          setBillingNotice("Your room pack is already active on this account.");
        } else if (data.fulfilled) {
          setBillingNotice(
            `Purchase complete — added ${data.roomsAdded ?? 0} save slot(s) and ${data.exportCreditsAdded ?? 0} full export credit(s).`,
          );
        } else {
          setBillingNotice("Payment received. Your account will update shortly once Square confirms the charge.");
        }
      } catch {
        setError("Could not confirm checkout. Refresh Account in a moment or contact support if you were charged.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per return URL
  }, [authToken]);

  useEffect(() => {
    if (authUser?.trialUsed && !authUser.isAdmin && authUser.roomAllowance < 1) {
      openUpgradePrompt();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- prompt when trial consumed
  }, [authUser?.trialUsed, authUser?.roomAllowance, authUser?.isAdmin]);

  const handlePurchasePlan = async (planId: string): Promise<void> => {
    setError("");
    setBillingNotice("");
    setCheckoutPlanId(planId);
    const plan = billingPlans.find((entry) => entry.id === planId);
    const layoutRoomCount =
      plan?.scalableRoomPricing && planId === SCALABLE_OPERATOR_PLAN_ID ? escapePlanRooms.length : undefined;
    try {
      const response = await apiFetch("/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({
          planId,
          ...(layoutRoomCount ? { layoutRoomCount } : {}),
        }),
      });
      const data = (await response.json()) as { checkoutUrl?: string; error?: { message?: string } };
      if (!response.ok || !data.checkoutUrl) {
        setError(data.error?.message ?? "Could not start Square checkout.");
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      setError("Checkout request failed. Is the backend running?");
    } finally {
      setCheckoutPlanId(null);
    }
  };

  const handleActivateSubscription = async (): Promise<void> => {
    setError("");
    setBillingNotice("");
    try {
      const parsedRooms = Number.parseInt(roomsToAddInput.trim(), 10);
      const roomsToAdd = Number.isFinite(parsedRooms) && parsedRooms > 0 ? Math.min(parsedRooms, 5000) : 10;
      const parsedExports = Number.parseInt(exportCreditsToAddInput.trim(), 10);
      const exportCreditsToAdd = Number.isFinite(parsedExports) && parsedExports >= 0 ? Math.min(parsedExports, 50000) : roomsToAdd;
      let organizationPool: unknown;
      if (orgPoolJson.trim()) {
        try {
          organizationPool = JSON.parse(orgPoolJson) as unknown;
        } catch {
          setError("Organization pool JSON is invalid.");
          return;
        }
      }
      const response = await apiFetch("/api/billing/activate-test", {
        method: "POST",
        body: JSON.stringify({
          activationKey: activationKey.trim(),
          roomsToAdd,
          exportCreditsToAdd,
          ...(organizationPool !== undefined ? { organizationPool } : {}),
        }),
      });
      const data = (await response.json()) as {
        user?: AuthUser;
        roomsAdded?: number;
        exportCreditsAdded?: number;
        error?: { message?: string };
      };
      if (!response.ok || !data.user) {
        setError(data.error?.message ?? "Activation failed.");
        return;
      }
      const normalized = normalizeAuthUser(data.user);
      if (normalized) {
        setAuthUser(normalized);
        try {
          window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ authToken, authUser: normalized }));
        } catch {
          // ignore
        }
        setBillingNotice(
          `Added ${data.roomsAdded ?? roomsToAdd} save slot(s) and ${data.exportCreditsAdded ?? exportCreditsToAdd} full export credit(s). Effective save cap is now ${normalized.roomAllowance} (includes org pool bonus). Export credits: ${normalized.isAdmin ? "unlimited" : normalized.exportCreditsRemaining}.`,
        );
      } else {
        setError("Could not read account after activation.");
      }
      setActivationKey("");
    } catch {
      setError("Activation request failed. Is the backend running?");
    }
  };
  const handleAuthExpired = (message?: string): void => {
    if (oauthHydratingRef.current) return;
    if (planningAutoSyncRef.current) {
      clearTimeout(planningAutoSyncRef.current);
      planningAutoSyncRef.current = null;
    }
    planningSessionRecoveryInFlight.current = false;
    pendingAuthSessionBootstrap.current = false;
    lastPlanningAuthTokenRef.current = "";
    const expiredMessage = message?.trim() || THEME_SESSION_EXPIRED_MESSAGE;
    if (appViewRef.current === "builder" && persistentCanvasStepsRef.current) {
      activateWorkspaceSessionExpired(expiredMessage);
      setAuthToken("");
      try {
        clearAuthSession();
      } catch {
        // ignore storage errors
      }
      return;
    }
    persistAuth("", null);
    setError(expiredMessage);
  };
  const handleAuthExpiredRef = useRef(handleAuthExpired);
  handleAuthExpiredRef.current = handleAuthExpired;

  useEffect(() => {
    configureAuthApi({
      apiBase: API_BASE,
      deviceId,
      getSession: () => ({
        authToken: currentAuthToken(),
        refreshToken: authSessionRef.current.refreshToken || refreshToken,
        authUser: authSessionRef.current.authUser ?? authUser,
        accessExpiresAt: authSessionRef.current.accessExpiresAt || accessExpiresAt,
        refreshExpiresAt: authSessionRef.current.refreshExpiresAt || refreshExpiresAt,
      }),
      persistSession: (session) => {
        const normalized = normalizeAuthUser(session.authUser);
        authSessionRef.current = { ...session, authUser: normalized };
        setAuthToken(session.authToken);
        setRefreshToken(session.refreshToken);
        setAccessExpiresAt(session.accessExpiresAt);
        setRefreshExpiresAt(session.refreshExpiresAt);
        if (normalized) setAuthUser(normalized);
        if (session.authToken.trim()) {
          saveAuthSession({ ...session, authUser: normalized });
        }
      },
      onSessionExpired: (message) => handleAuthExpiredRef.current(message),
    });
  }, [deviceId, refreshToken, accessExpiresAt, refreshExpiresAt, authUser]);

  // Cross-tab auth sync: when another tab refreshes or writes a token to
  // localStorage, adopt it here so this tab doesn't fail with a stale token.
  useEffect(() => {
    const unsubscribe = subscribeCrossTabAuth((newSession) => {
      if (!newSession?.authToken.trim()) {
        if (
          appViewRef.current === "builder" &&
          persistentCanvasStepsRef.current &&
          authSessionRef.current.authUser &&
          !workspaceSessionExpiredRef.current.open
        ) {
          activateWorkspaceSessionExpired(THEME_SESSION_EXPIRED_MESSAGE);
          setAuthToken("");
          try {
            clearAuthSession();
          } catch {
            // ignore
          }
          return;
        }
        clearWizardBusyStateRef.current();
        persistAuthRef.current("", null);
        return;
      }
      if (newSession.authToken === authSessionRef.current.authToken) return;
      // Adopt the refreshed token synchronously so the next API call uses it.
      authSessionRef.current = {
        authToken: newSession.authToken,
        refreshToken: newSession.refreshToken,
        authUser: newSession.authUser,
        accessExpiresAt: newSession.accessExpiresAt,
        refreshExpiresAt: newSession.refreshExpiresAt,
      };
      setAuthToken(newSession.authToken);
      setRefreshToken(newSession.refreshToken);
      setAccessExpiresAt(newSession.accessExpiresAt);
      setRefreshExpiresAt(newSession.refreshExpiresAt);
      const normalized = normalizeAuthUser(newSession.authUser);
      if (normalized) setAuthUser(normalized);
    });
    return unsubscribe;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- authSessionRef is a stable ref
  }, []);

  useEffect(() => {
    if (authBootstrapReady) return;
    void (async () => {
      if (!initialAuth.authToken.trim()) {
        setAuthBootstrapReady(true);
        return;
      }
      const status = await ensureAuthBootstrap();
      if (status === "authenticated") {
        await refreshProfile({ retryOnStaleToken: false });
      } else {
        const stored = loadAuthSession();
        if (!stored.refreshToken.trim()) {
          persistAuth("", null);
        }
      }
      setAuthBootstrapReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time bootstrap
  }, []);

  useEffect(() => {
    if (!authBootstrapReady || !authToken || oauthHydratingRef.current) return;
    void refreshProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh on token only
  }, [authToken, authBootstrapReady]);

  const handleSignup = async (): Promise<void> => {
    setAuthSubmitting(true);
    try {
      setError("");
      if (!termsAccepted) {
        setError("Please read and accept the Terms of Service to create an account.");
        setAuthSubmitting(false);
        return;
      }
      if (authPassword.length < 8) {
        setError("Password must be at least 8 characters.");
        setAuthSubmitting(false);
        return;
      }
      if (!/[A-Z]/.test(authPassword)) {
        setError("Password must contain at least one uppercase letter.");
        setAuthSubmitting(false);
        return;
      }
      if (!/[0-9!@#$%^&*()\-_=+[\]{};':",.<>/?\\|`~]/.test(authPassword)) {
        setError("Password must contain at least one number or special character.");
        setAuthSubmitting(false);
        return;
      }
      if (authPassword !== authPasswordConfirm) {
        setError("Passwords do not match.");
        setAuthSubmitting(false);
        return;
      }
      const response = await fetch(`${API_BASE}/api/auth/signup`, {
        method: "POST",
        headers: anonJsonHeaders(),
        body: JSON.stringify({
          name: authName,
          email: authEmail,
          password: authPassword,
          acceptedTerms: true,
        }),
      });
      const data = (await response.json()) as {
        authToken?: string;
        refreshToken?: string;
        accessExpiresAt?: number;
        refreshExpiresAt?: number;
        user?: AuthUser;
        error?: { message?: string };
        emailVerificationRequired?: boolean;
        devVerificationUrl?: string;
      };
      // Email verification required — show "check your inbox" screen
      if (response.ok && data.emailVerificationRequired) {
        setAuthVerificationPending(authEmail.trim());
        if (data.devVerificationUrl) setAuthVerificationDevUrl(data.devVerificationUrl);
        setError("");
        return;
      }
      if (!response.ok || !data.authToken || !data.user) {
        setError(data.error?.message ?? "Sign up failed.");
        return;
      }
      const signedUp = normalizeAuthUser(data.user);
      if (!signedUp) {
        setError("Sign up response was incomplete.");
        return;
      }
      persistAuth(data.authToken, signedUp, {
        refreshToken: data.refreshToken,
        accessExpiresAt: data.accessExpiresAt,
        refreshExpiresAt: data.refreshExpiresAt,
      });
      setError("");
      await refreshProfile({ retryOnStaleToken: true });
    } catch {
      setError("Sign up failed. Check backend and try again.");
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogin = async (): Promise<void> => {
    setAuthSubmitting(true);
    try {
      setError("");
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: anonJsonHeaders(),
        body: JSON.stringify({ login: authEmail.trim(), password: authPassword }),
      });
      const data = (await response.json()) as {
        authToken?: string;
        refreshToken?: string;
        accessExpiresAt?: number;
        refreshExpiresAt?: number;
        user?: AuthUser;
        error?: { message?: string; code?: string };
      };
      // Unverified local user — redirect to "check your inbox" notice
      if (!response.ok && data.error?.code === "EMAIL_NOT_VERIFIED") {
        setAuthVerificationPending(authEmail.trim());
        setError("");
        return;
      }
      if (!response.ok || !data.authToken || !data.user) {
        setError(data.error?.message ?? "Log in failed.");
        return;
      }
      const loggedIn = normalizeAuthUser(data.user);
      if (!loggedIn) {
        setError("Log in response was incomplete.");
        return;
      }
      persistAuth(data.authToken, loggedIn, {
        refreshToken: data.refreshToken,
        accessExpiresAt: data.accessExpiresAt,
        refreshExpiresAt: data.refreshExpiresAt,
      });
      setError("");
      await refreshProfile({ retryOnStaleToken: true });
    } catch {
      setError("Log in failed. Check backend and try again.");
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleResendVerification = async (): Promise<void> => {
    if (!authVerificationPending || authVerificationResending) return;
    setAuthVerificationResending(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authVerificationPending }),
      });
      const data = (await res.json()) as { ok?: boolean; devVerificationUrl?: string; error?: { message?: string; code?: string } };
      if (!res.ok) {
        if (data.error?.code === "RATE_LIMITED") {
          setError("Please wait a moment before requesting another email.");
        } else {
          setError(data.error?.message ?? "Could not resend email. Try again.");
        }
      } else {
        if (data.devVerificationUrl) setAuthVerificationDevUrl(data.devVerificationUrl);
        setError("Verification email sent — check your inbox.");
      }
    } catch {
      setError("Could not send email. Check your connection and try again.");
    } finally {
      setAuthVerificationResending(false);
    }
  };

  const handleSocialAuth = (provider: "google" | "facebook" | "github"): void => {
    setError("");
    if (socialLoginBlocked) {
      setSocialAuthProvider(null);
      setError(socialLoginBlocked);
      return;
    }
    setSocialAuthProvider(provider);

    try {
      cacheLocalPlanningInputs();
      stashOAuthReturnSnapshot(buildOAuthReturnSnapshot());
      stashWorkspaceDraftForOAuth({
        wizardStep,
        playersConcurrent,
        participantsTotal,
        sessionDurationMinutes,
        environmentType,
        availableItems,
        eventType,
        targetInterface,
        venueBuildType,
        roomDifficulty,
        themeMustMatchEnvironment,
        youthAddOnEnabled,
        youthAddOnGatesAdultFlow,
        youthAddOnAgeNote,
      });
      if (sessionId.trim()) {
        stashPlanningSessionForOAuth(sessionId, deviceId);
      }
      setOAuthReturnMarker();
      const returnTo = resolveOAuthReturnTo();
      launchSocialOAuthRedirect({
        provider,
        startUrl: `${API_BASE}/api/auth/oauth/${provider}/start?returnTo=${encodeURIComponent(returnTo)}`,
        onTimeout: () => {
          setSocialAuthProvider(null);
          setError("Sign-in server did not respond. Wait a moment and try again, or use email sign-in.");
        },
        onLaunchError: (message) => {
          setSocialAuthProvider(null);
          setError(message);
        },
      });
    } catch (err) {
      clearPendingSocialOAuth();
      setSocialAuthProvider(null);
      // eslint-disable-next-line no-console
      console.error("[social-auth] launch failed:", provider, err);
      setError(`Could not start ${provider} sign-in — please try again.`);
    }
  };

  useEffect(() => {
    const url = new URL(window.location.href);
    const oauthErr = url.searchParams.get("oauth_error");
    const oauthMsg = url.searchParams.get("oauth_message");
    if (oauthErr) {
      clearPendingSocialOAuth();
      setSocialAuthProvider(null);
      setError(oauthMsg?.trim() || `Sign-in could not complete (${oauthErr}).`);
      url.searchParams.delete("oauth_error");
      url.searchParams.delete("oauth_message");
      window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
    }

    // Email verification error (expired / invalid link)
    const emailError = url.searchParams.get("email_error");
    if (emailError) {
      const emailHint = url.searchParams.get("email") ?? "";
      if (emailError === "token_expired") {
        setError("This verification link has expired. Please request a new one below.");
        if (emailHint) setAuthVerificationPending(emailHint);
      } else {
        setError("This verification link is invalid. Please sign up again or request a new link.");
      }
      url.searchParams.delete("email_error");
      url.searchParams.delete("email");
      window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
    }

    const oauthExchangeCode = url.searchParams.get("oauth_code");
    const emailVerified = url.searchParams.get("email_verified");

    if (oauthExchangeCode) {
      oauthHydratingRef.current = true;
      oauthReturnBootstrapRef.current = hasOAuthReturnMarker();
      void (async () => {
        try {
          const health = (await fetchServiceHealth(API_BASE)) ?? serviceHealth;
          if (health) setServiceHealth(health);
          const result = await completeOAuthExchange(API_BASE, oauthExchangeCode, deviceId, health);
          const normalized = normalizeAuthUser(result.user);
          persistAuth(result.authToken, normalized, {
            refreshToken: result.refreshToken ?? "",
            accessExpiresAt: typeof result.accessExpiresAt === "number" ? result.accessExpiresAt : 0,
          });
          const profileOk = await refreshProfile({ retryOnStaleToken: true, tokenOverride: result.authToken });
          if (profileOk) {
            setError("");
            if (emailVerified === "1") {
              setAuthVerificationPending("");
              setAuthVerificationDevUrl("");
            }
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Sign-in could not be completed. Please try again.");
        } finally {
          oauthHydratingRef.current = false;
          clearPendingSocialOAuth();
          setSocialAuthProvider(null);
          clearOAuthReturnMarker();
          url.searchParams.delete("oauth_code");
          url.searchParams.delete("email_verified");
          window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
        }
      })();
      return;
    }

    // Legacy token-in-URL handoff (deprecated — strip without persisting).
    const legacyCallbackToken = url.searchParams.get("auth_token");
    if (legacyCallbackToken) {
      url.searchParams.delete("auth_token");
      url.searchParams.delete("refresh_token");
      url.searchParams.delete("access_expires_at");
      url.searchParams.delete("refresh_expires_at");
      url.searchParams.delete("auth_user");
      url.searchParams.delete("email_verified");
      window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
      setError("Sign-in link format is outdated. Please sign in again.");
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time OAuth return handler
  }, []);

  useEffect(() => {
    return subscribeOAuthPendingRecovery(() => {
      setSocialAuthProvider(null);
    });
  }, []);

  const requestThemes = async (
    activeSessionId: string,
    endpoint: "/api/themes/generate" | "/api/themes/refresh",
    currentThemes: Theme[],
    generationToken?: number,
  ): Promise<Theme[] | undefined> => {
    const themeGenerationStale = (): boolean =>
      generationToken !== undefined && generationToken !== themeGenerationTokenRef.current;

    if (authUser && !hasAuthToken()) {
      handleThemeGenerationAuthExpired();
      return undefined;
    }

    const importBrowserThemes = async (): Promise<Theme[] | undefined> => {
      if (themeGenerationStale()) return undefined;
      const ready = await probeBrowserLanguageModel();
      if (!ready || themeGenerationStale()) return undefined;
      const drafts = await generateThemesInBrowser({
        playersConcurrent: String(playersConcurrent),
        participantsTotal: String(participantsTotal),
        sessionDurationMinutes: String(sessionDurationMinutes),
        environmentType: environmentType.trim(),
        availableItems: availableItems.trim(),
        roomDifficulty,
        eventType: eventType.trim() || undefined,
        themeMustMatchEnvironment,
        targetInterface,
        excludeNames:
          endpoint === "/api/themes/refresh" ? currentThemes.map((theme) => theme.name).filter(Boolean) : undefined,
      });
      if (!drafts?.length) return undefined;
      if (themeGenerationStale()) return undefined;
      const browserResponse = await apiFetch("/api/themes/browser-import", {
        method: "POST",
        headers: hasAuthToken() ? withAuthHeaders() : anonJsonHeaders(),
        body: JSON.stringify({ sessionId: activeSessionId, themes: drafts }),
      });
      const browserData = (await browserResponse.json()) as {
        themes?: Theme[];
        aiGenerated?: boolean;
        openAiConfigured?: boolean;
        error?: { message?: string; code?: string };
      };
      if (!browserResponse.ok || !browserData.themes) {
        if (handleBillingGate(browserData.error?.code, browserData.error?.message)) return undefined;
        return undefined;
      }
      if (themeGenerationStale()) return undefined;
      const nextThemes = browserData.themes;
      if (typeof browserData.openAiConfigured === "boolean") {
        setServerOpenAiConfigured(browserData.openAiConfigured);
      }
      setThemesAiGenerated(true);
      flushSync(() => {
        setThemes(nextThemes);
        setSelectedThemeId((prev) => {
          if (prev && nextThemes.some((theme) => theme.id === prev)) return prev;
          return "";
        });
        setThemeSessionExpiredNotice("");
      });
      toastMessageOnce("Original themes drafted on-device in Chrome.", TOAST_ID.browserThemes);
      return nextThemes;
    };

    if (serverOpenAiConfigured !== true) {
      const tryBrowserThemes =
        !isMobileLikeDevice() || browserAiReady || coachBrowserAiReady || isBrowserAiAvailable();
      if (tryBrowserThemes) {
        try {
          const browserThemes = await importBrowserThemes();
          if (browserThemes) return browserThemes;
        } catch {
          // fall through to server catalog
        }
      }
    }
    if (themeGenerationStale()) return undefined;

    const response = await apiFetch(endpoint, {
      method: "POST",
      headers: hasAuthToken() ? undefined : anonJsonHeaders(),
      body:
        endpoint === "/api/themes/refresh"
          ? JSON.stringify({ sessionId: activeSessionId, excludeThemeIds: currentThemes.map((theme) => theme.id) })
          : JSON.stringify({ sessionId: activeSessionId }),
    });
    const data = (await response.json()) as {
      themes?: Theme[];
      aiGenerated?: boolean;
      openAiConfigured?: boolean;
      error?: { message?: string; code?: string };
    };
    if (!response.ok || !data.themes) {
      if (themeGenerationStale()) return undefined;
      if (isGenerationAuthExpired(response, data)) {
        handleThemeGenerationAuthExpired();
        return undefined;
      }
      if (handleBillingGate(data.error?.code, data.error?.message)) return undefined;
      const themeErrMsg = data.error?.message ?? "Failed to load themes.";
      if (isSignInForPuzzlesMessage(themeErrMsg) && isAuthPlanningRestorePending()) return undefined;
      if (isInvalidPlanningSessionResponse(response, data)) {
        if (isAuthPlanningRestorePending()) return undefined;
        const freshId = await recoverPlanningSessionRef.current({ seedThemes: true });
        if (freshId && freshId !== activeSessionId) {
          return requestThemes(freshId, endpoint, currentThemes, generationToken);
        }
        setError(planningSessionRecoveryNotice);
        return undefined;
      }
      setError(themeErrMsg);
      return undefined;
    }
    const nextThemes = data.themes;
    if (typeof data.openAiConfigured === "boolean") {
      setServerOpenAiConfigured(data.openAiConfigured);
    }
    if (!data.aiGenerated && data.openAiConfigured === false) {
      try {
        const browserThemes = await importBrowserThemes();
        if (browserThemes) return browserThemes;
      } catch {
        // keep static catalog themes
      }
    }
    if (themeGenerationStale()) return undefined;
    setThemesAiGenerated(Boolean(data.aiGenerated));
    flushSync(() => {
      setThemes(nextThemes);
      setSelectedThemeId((prev) => {
        if (prev && nextThemes.some((theme) => theme.id === prev)) return prev;
        return "";
      });
      setThemeSessionExpiredNotice("");
    });
    return nextThemes;
  };

  const cancelThemeGeneration = (): void => {
    themeGenerationTokenRef.current += 1;
    themesAutoFetchInFlight.current = false;
    setThemeIdeasLoading(false);
  };

  const startThemeGeneration = async (
    activeSessionId: string,
    endpoint: "/api/themes/generate" | "/api/themes/refresh" = "/api/themes/generate",
    currentThemes: Theme[] = [],
  ): Promise<void> => {
    const token = ++themeGenerationTokenRef.current;
    themesAutoFetchInFlight.current = true;
    setThemeIdeasLoading(true);
    setError("");
    setThemeSessionExpiredNotice("");
    try {
      await requestThemes(activeSessionId, endpoint, currentThemes, token);
    } catch (err) {
      if (token === themeGenerationTokenRef.current) {
        setError(classifyApiCatchError(err));
      }
    } finally {
      if (token === themeGenerationTokenRef.current) {
        themesAutoFetchInFlight.current = false;
        setThemeIdeasLoading(false);
      }
    }
  };
  startThemeGenerationRef.current = startThemeGeneration;

  const requestPuzzles = async (activeSessionId: string, themeId: string, themeForEnhance?: Theme | null): Promise<boolean> => {
    if (puzzlesRequestInFlight.current) return false;
    puzzlesRequestInFlight.current = true;
    setPuzzlesGenerating(true);
    try {
      return await requestPuzzlesCore(activeSessionId, themeId, themeForEnhance);
    } finally {
      puzzlesRequestInFlight.current = false;
      setPuzzlesGenerating(false);
    }
  };

  const requestPuzzlesCore = async (activeSessionId: string, themeId: string, themeForEnhance?: Theme | null): Promise<boolean> => {
    try {
      if (authUser && !hasAuthToken()) {
        handleThemeGenerationAuthExpired();
        return false;
      }
      const response = await apiFetch("/api/puzzles/generate", {
        method: "POST",
        headers: hasAuthToken() ? withAuthHeaders() : anonJsonHeaders(),
        body: JSON.stringify({ sessionId: activeSessionId, themeId }),
      });
      const data = (await response.json()) as {
        puzzles?: Puzzle[];
        puzzleAccess?: "full" | "preview";
        compatibilityPassed?: boolean;
        storyPlan?: StoryPlan;
        suggestedAdditions?: string[];
        suggestedAdditionsRequired?: string[];
        suggestedSafetyProtocols?: string[];
        generationEngine?: GenerationTelemetry["engine"];
        masterGeneratorAttempted?: boolean;
        councilReport?: GenerationTelemetry["councilReport"];
        generationDiagnostics?: GenerationTelemetry["diagnostics"];
        openAiConfigured?: boolean;
        roomSkeleton?: RoomSkeleton;
        user?: unknown;
        error?: { message?: string; code?: string };
      };
      if (!response.ok || !data.puzzles) {
        if (isGenerationAuthExpired(response, data)) {
          handleThemeGenerationAuthExpired();
          return false;
        }
        if (handleBillingGate(data.error?.code, data.error?.message)) return false;
        const puzzleErrMsg = data.error?.message ?? "Failed to generate puzzles.";
        if (isSignInForPuzzlesMessage(puzzleErrMsg) && isAuthPlanningRestorePending()) return false;
        if (isInvalidPlanningSessionResponse(response, data)) {
          if (isAuthPlanningRestorePending()) return false;
          const freshId = await recoverPlanningSessionRef.current({ seedThemes: false });
          if (freshId && freshId !== activeSessionId) {
            return requestPuzzlesCore(freshId, themeId, themeForEnhance);
          }
          setError(planningSessionRecoveryNotice);
          return false;
        }
        setError(puzzleErrMsg);
        return false;
      }

      let puzzlePayload = data;
      if (
        (data.generationEngine === "static_catalog" || data.generationEngine === "static_fallback") &&
        data.openAiConfigured === false
      ) {
        const activeThemeForBrowser = themeForEnhance ?? themes.find((theme) => theme.id === themeId);
        try {
          const ready = await probeBrowserLanguageModel();
          if (ready && activeThemeForBrowser) {
            const customMix =
              useCustomMix &&
              Number.isFinite(Number.parseInt(customMixLogic.trim(), 10)) &&
              Number.isFinite(Number.parseInt(customMixPhysical.trim(), 10)) &&
              Number.isFinite(Number.parseInt(customMixElectronic.trim(), 10))
                ? {
                    logic: Math.trunc(Number.parseInt(customMixLogic.trim(), 10)),
                    physical: Math.trunc(Number.parseInt(customMixPhysical.trim(), 10)),
                    electronic: Math.trunc(Number.parseInt(customMixElectronic.trim(), 10)),
                  }
                : null;
            const counts = estimateBrowserCategoryCounts({
              mainPuzzleTarget: plannerMainPuzzleTarget,
              existingPuzzleCount: existingPuzzles.length,
              sessionDurationMinutes: Number(sessionDurationMinutes) || 45,
              targetInterface,
              customMix,
            });
            if (counts.logic + counts.physical + counts.electronic > 0) {
              const drafts = await generatePuzzlesInBrowser({
                themeName: activeThemeForBrowser.name,
                themeTldr: activeThemeForBrowser.tldr ?? activeThemeForBrowser.name,
                themeDescription: activeThemeForBrowser.description,
                environmentType: environmentType.trim(),
                availableItems: availableItems.trim(),
                roomDifficulty,
                logicCount: counts.logic,
                physicalCount: counts.physical,
                electronicCount: counts.electronic,
                targetInterface,
              });
              if (drafts?.length) {
                const impResp = await apiFetch("/api/puzzles/browser-import", {
                  method: "POST",
                  headers: hasAuthToken() ? withAuthHeaders() : anonJsonHeaders(),
                  body: JSON.stringify({ sessionId: activeSessionId, themeId, puzzles: drafts }),
                });
                const impData = (await impResp.json()) as typeof data;
                if (impResp.ok && impData.puzzles) {
                  puzzlePayload = impData;
                  toastMessageOnce("Original puzzle set drafted on-device in Chrome.", TOAST_ID.browserPuzzles);
                }
              }
            }
          }
        } catch {
          // keep static catalog payload
        }
      }

      if (puzzlePayload.user) {
        const refreshed = normalizeAuthUser(puzzlePayload.user);
        if (refreshed) {
          setAuthUser(refreshed);
          try {
            window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ authToken, authUser: refreshed }));
          } catch {
            // ignore
          }
        }
      }
      if (!puzzlePayload.puzzles) {
        setError("Failed to generate puzzles.");
        return false;
      }
      const basePuzzles = puzzlePayload.puzzles;
      const previewOnly = puzzlePayload.puzzleAccess === "preview";
      const baseSuggestedAdditions = previewOnly ? [] : (puzzlePayload.suggestedAdditions ?? []);
      const baseSuggestedRequired = previewOnly ? [] : (puzzlePayload.suggestedAdditionsRequired ?? []);
      const baseSafetyProtocols = previewOnly ? [] : (puzzlePayload.suggestedSafetyProtocols ?? []);
      const activeTheme = themeForEnhance ?? themes.find((theme) => theme.id === themeId);
      let aiEnhancement: Awaited<ReturnType<typeof enhancePlanInBrowser>> = null;
      if (!previewOnly) {
      try {
        aiEnhancement = await enhancePlanInBrowser({
          theme: activeTheme,
          environment: environmentType,
          availableItems,
          existingPuzzles,
          puzzles: basePuzzles,
          suggestedAdditions: baseSuggestedAdditions,
        });
      } catch {
        aiEnhancement = null;
      }
      }

      const enhancedPuzzles = aiEnhancement
        ? basePuzzles.map((puzzle) => {
            const match = aiEnhancement.puzzles.find((candidate) => candidate.id === puzzle.id);
            return match
              ? {
                  ...puzzle,
                  howItWorks: match.howItWorks || puzzle.howItWorks,
                  themeFitReason: match.themeFitReason || puzzle.themeFitReason,
                }
              : puzzle;
          })
        : basePuzzles;

      const enhancedStoryPlan =
        aiEnhancement?.stages && puzzlePayload.storyPlan
          ? {
              ...puzzlePayload.storyPlan,
              stages: puzzlePayload.storyPlan.stages.map((stage) => {
                const match = aiEnhancement.stages?.find((candidate) => candidate.stage === stage.stage);
                return match
                  ? {
                      ...stage,
                      whyThisStageExists: match.whyThisStageExists || stage.whyThisStageExists,
                    }
                  : stage;
              }),
            }
          : puzzlePayload.storyPlan ?? null;

      setPuzzles(enhancedPuzzles);
      setRefusedPuzzleSlots([]);
      setCompatibilityPassed(Boolean(puzzlePayload.compatibilityPassed));
      setStoryPlan(enhancedStoryPlan);
      setSuggestedAdditionsRequired(baseSuggestedRequired);
      setSuggestedAdditions(aiEnhancement?.suggestedAdditions?.length ? aiEnhancement.suggestedAdditions : baseSuggestedAdditions);
      setSuggestedSafetyProtocols(baseSafetyProtocols);
      setGenerationTelemetry({
        engine: puzzlePayload.generationEngine ?? "static_catalog",
        masterAttempted: Boolean(puzzlePayload.masterGeneratorAttempted),
        generatedAt: new Date().toISOString(),
        councilReport: puzzlePayload.councilReport,
        diagnostics: puzzlePayload.generationDiagnostics,
      });
      if (typeof puzzlePayload.openAiConfigured === "boolean") {
        setServerOpenAiConfigured(puzzlePayload.openAiConfigured);
      }
      if (planningRef.current) {
        const commercialVenue = planningRef.current.state.targetInterface === "commercial_venue";
        const themeName = selectedTheme?.name ?? "your theme";
        let skeletonToPlot: RoomSkeleton | undefined = puzzlePayload.roomSkeleton?.zones?.length
          ? puzzlePayload.roomSkeleton
          : undefined;
        if (!skeletonToPlot && layoutHasOnlyPresetShell(planningRef.current.state.roomLayout)) {
          skeletonToPlot = buildHeuristicRoomSkeleton(themeName, commercialVenue);
        }
        if (skeletonToPlot?.zones?.length) {
          setLastRoomSkeleton(skeletonToPlot);
          const nextLayout = applyRoomSkeletonToLayout(planningRef.current.state.roomLayout, skeletonToPlot);
          planningRef.current.dispatch({ type: "SET_ROOM_LAYOUT", layout: nextLayout });
          planningRef.current.dispatch({
            type: "LAYOUT_ANNOUNCE",
            message: `Plotted ${skeletonToPlot.zones.length} zones on the blueprint (${puzzlePayload.roomSkeleton ? "AI skeleton" : "estimated layout"}).`,
          });
          toastMessageOnce(
            `Blueprint updated — ${skeletonToPlot.zones.length} zones plotted.`,
            TOAST_ID.blueprintSkeleton,
          );
        }
      }
      return true;
    } catch (err) {
      setError(classifyApiCatchError(err));
      return false;
    }
  };

  const syncExistingPuzzles = async (
    activeSessionId: string,
    nextExistingPuzzles: Array<{ name: string; link: string; roomPart: string }>,
  ): Promise<void> => {
    await apiFetch(`/api/planning/session/${activeSessionId}/existing-puzzles`, {
      method: "POST",
      headers: hasAuthToken() ? withAuthHeaders() : anonJsonHeaders(),
      body: JSON.stringify({ existingPuzzles: nextExistingPuzzles }),
    });
  };

  const createSession = async (
    overrides?: { existingPuzzles?: Array<{ name: string; link: string; roomPart: string }> },
    options?: { seedThemes?: boolean },
  ): Promise<string | undefined> => {
    // Start a new planning session. Uses draft defaults for missing room fields so theme work can start first.
    const seedThemes = options?.seedThemes !== false;
    setError("");
    const draft = buildPlanningBody("draft");
    if (!draft) return undefined;
    const payload = {
      ...draft,
      existingPuzzles: overrides?.existingPuzzles ?? existingPuzzles,
    };

    try {
      const response = await apiFetch("/api/planning/session", {
        method: "POST",
        headers: hasAuthToken() ? withAuthHeaders() : anonJsonHeaders(),
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as {
        sessionId?: string;
        leaseExpiresAt?: number;
        error?: { message?: string };
      };
      if (!response.ok || !data.sessionId) {
        setError(data.error?.message ?? "Failed to create session.");
        return undefined;
      }
      setSessionId(data.sessionId);
      const tokenForPlanning = currentAuthToken();
      if (tokenForPlanning) {
        void persistPlanningSessionId(tokenForPlanning, data.sessionId, data.leaseExpiresAt);
      }
      themeCoachHydratedForSessionRef.current = "";
      setCustomThemeCoachMessages([]);
      setCustomThemeCoachError("");
      setYouthAddOnEnabled(false);
      setYouthAddOnGatesAdultFlow(false);
      setYouthAddOnAgeNote("");
      setUseCustomMainPuzzleCount(false);
      setCustomMainPuzzleCountStr("");
      setUseCustomMix(false);
      setCustomMixLogic("");
      setCustomMixPhysical("");
      setCustomMixElectronic("");
      rememberInput("environmentType", environmentType);
      rememberInput("availableItems", availableItems);
      rememberInput("eventType", eventType);
      setThemes([]);
      setSelectedThemeId("");
      setPuzzles([]);
      setRefusedPuzzleSlots([]);
      setSuggestedAdditions([]);
      setSuggestedAdditionsRequired([]);
      setSuggestedSafetyProtocols([]);
      setStoryPlan(null);
      setCompatibilityPassed(null);
      setExportContent("");
      setApprovedForBuild(false);
      setPlanSavedSuccessfully(false);
      if (seedThemes && !isAuthPlanningRestorePending()) {
        await requestThemes(data.sessionId, "/api/themes/generate", []);
      }
      return data.sessionId;
    } catch (err) {
      setError(classifyApiCatchError(err));
      return undefined;
    }
  };

  recoverPlanningSessionRef.current = async (options?: { seedThemes?: boolean }) => {
    if (planningSessionRecoveryInFlight.current) return sessionId || undefined;
    planningSessionRecoveryInFlight.current = true;
    try {
      setSessionId("");
      const tokenForPlanning = currentAuthToken();
      if (tokenForPlanning) await clearPersistedPlanningSession(tokenForPlanning);
      const freshId = await createSession(undefined, { seedThemes: options?.seedThemes ?? false });
      if (freshId && !oauthReturnBootstrapRef.current && !isAuthPlanningRestorePending()) {
        toastMessageOnce(planningSessionRecoveryNotice, TOAST_ID.planningRecovery, 4000);
      }
      oauthReturnBootstrapRef.current = false;
      return freshId;
    } finally {
      planningSessionRecoveryInFlight.current = false;
    }
  };

  const ensureSession = async (): Promise<string | undefined> => {
    await waitForAuthPlanningBootstrap();
    if (sessionId) return sessionId;
    return createSession(undefined, { seedThemes: true });
  };

  /** Restore persisted sessionId when possible; renew lease in background (no full reload). */
  useEffect(() => {
    if (!authUser || !authToken) {
      lastPlanningAuthTokenRef.current = "";
      pendingAuthSessionBootstrap.current = false;
      return;
    }
    const headers = withAuthHeaders();
    const tryRestore = async (preferredSessionId?: string): Promise<boolean> => {
      const oauthStash = peekOAuthPlanningStash();
      const persisted = await loadPersistedPlanningSession(authToken);
      const candidates = [
        preferredSessionId?.trim(),
        sessionId.trim(),
        oauthStash?.sessionId,
        persisted?.sessionId,
      ].filter((id): id is string => Boolean(id));
      const uniqueIds = [...new Set(candidates)];
      if (oauthStash) consumeOAuthPlanningStash();

      for (const sid of uniqueIds) {
        if (oauthStash?.sessionId === sid && oauthStash.deviceId !== deviceId) continue;
        const health = await fetchPlanningSessionHealth(sid, headers, API_BASE);
        if (!health?.ok) continue;
        setSessionId(sid);
        void persistPlanningSessionId(authToken, sid, health.leaseExpiresAt);
        await renewPlanningSessionLease(sid, headers, API_BASE);
        return true;
      }
      if (persisted?.sessionId && !uniqueIds.includes(persisted.sessionId)) {
        await clearPersistedPlanningSession(authToken);
      }
      return false;
    };
    const isNewToken = lastPlanningAuthTokenRef.current !== authToken;
    if (isNewToken) {
      lastPlanningAuthTokenRef.current = authToken;
      pendingAuthSessionBootstrap.current = true;
      const preservePlanningOnBootstrap =
        oauthReturnBootstrapRef.current ||
        Boolean(peekOAuthPlanningStash()) ||
        Boolean(peekOAuthReturnSnapshot()) ||
        wizardNavigationBusyRef.current ||
        Boolean(sessionId.trim());
      if (!preservePlanningOnBootstrap) {
        setSessionId("");
        setThemes([]);
        setSelectedThemeId("");
        setPuzzles([]);
        setRefusedPuzzleSlots([]);
        setSuggestedAdditions([]);
        setSuggestedAdditionsRequired([]);
        setSuggestedSafetyProtocols([]);
        setStoryPlan(null);
        setCompatibilityPassed(null);
        setExportContent("");
        setApprovedForBuild(false);
        setPlanSavedSuccessfully(false);
        setThemePath(null);
        setExistingPuzzles([]);
      }
      void (async () => {
        clearWizardBusyStateRef.current();
        const snapshot = consumeOAuthReturnSnapshot();
        if (snapshot) {
          applyOAuthReturnSnapshot(snapshot);
        } else {
          const workspaceDraft = consumeWorkspaceDraftForOAuth();
          if (workspaceDraft) applyWorkspaceDraftFromOAuth(workspaceDraft);
        }
        const restored = await tryRestore(snapshot?.sessionId);
        if (!restored) {
          const snapshotHasDraft =
            Boolean(snapshot?.themes?.length) ||
            Boolean(snapshot?.puzzles?.length) ||
            Boolean(snapshot?.selectedThemeId?.trim());
          if (snapshot?.sessionId?.trim()) {
            setSessionId(snapshot.sessionId.trim());
          }
          if (!snapshotHasDraft) {
            await createSession(
              { existingPuzzles: snapshot?.existingPuzzles ?? [] },
              { seedThemes: !snapshot },
            );
          }
        } else {
          const sid = sessionId.trim() || snapshot?.sessionId?.trim();
          if (sid) await syncPlanningInputToServer(sid, "draft");
        }
        oauthReturnBootstrapRef.current = false;
        clearOAuthReturnMarker();
      })().finally(() => {
        pendingAuthSessionBootstrap.current = false;
      });
      return;
    }
    if (!sessionId && !pendingAuthSessionBootstrap.current) {
      void (async () => {
        const restored = await tryRestore();
        if (!restored) await createSession(undefined, { seedThemes: true });
      })();
    }
  }, [authUser, authToken, sessionId]);

  useEffect(() => {
    if (!authToken || !sessionId || appView !== "builder") return;
    const headers = withAuthHeaders();
    const renew = async () => {
      const result = await renewPlanningSessionLease(sessionId, headers);
      if (result.ok && result.leaseExpiresAt) {
        void persistPlanningSessionId(authToken, sessionId, result.leaseExpiresAt);
      }
    };
    void renew();
    const id = window.setInterval(() => void renew(), 4 * 60 * 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounced lease renew
  }, [authToken, sessionId, appView]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("enterprise") === "onboarding") {
      toast.message(
        "Multi-room fleet sync is now managed through Creative Studio layout-room pricing. Open Account → Plans to add rooms.",
        { duration: 8000 },
      );
    }
  }, [location.search]);

  const addExistingPuzzle = async () => {
    // Add user-provided puzzle metadata to the planning payload.
    setError("");
    const name = existingPuzzleName.trim();
    const link = existingPuzzleLink.trim();
    const roomPart = existingPuzzleRoomPart.trim();
    if (!name || !link || !roomPart) {
      setActivePanel("plan");
      setWizardStep("themes-puzzles");
      setShowExistingPuzzleForm(true);
      const missing: string[] = [];
      if (!name) missing.push("existingPuzzleName");
      if (!link) missing.push("existingPuzzleLink");
      if (!roomPart) missing.push("existingPuzzleRoomPart");
      flagMissingFields(missing);
      return;
    }
    const nextExistingPuzzles = [...existingPuzzles, { name, link, roomPart }];
    setExistingPuzzles(nextExistingPuzzles);
    rememberInput("existingPuzzleName", name);
    rememberInput("existingPuzzleLink", link);
    rememberInput("existingPuzzleRoomPart", roomPart);
    setExistingPuzzleName("");
    setExistingPuzzleLink("");
    setExistingPuzzleRoomPart("");
    // Any interaction should initialize a planning session.
    let activeSessionId: string | undefined = sessionId;
    if (!activeSessionId) {
      activeSessionId = await createSession({ existingPuzzles: nextExistingPuzzles });
    }
    if (!activeSessionId) return;
    await syncExistingPuzzles(activeSessionId, nextExistingPuzzles);
    if (selectedThemeId) {
      const themeForEnhance = themes.find((theme) => theme.id === selectedThemeId) ?? null;
      await requestPuzzles(activeSessionId, selectedThemeId, themeForEnhance);
    }
  };

  const removeExistingPuzzle = async (index: number) => {
    const nextExistingPuzzles = existingPuzzles.filter((_, i) => i !== index);
    setExistingPuzzles(nextExistingPuzzles);
    const activeSessionId = await ensureSession();
    if (!activeSessionId) return;
    await syncExistingPuzzles(activeSessionId, nextExistingPuzzles);
    if (selectedThemeId) {
      const themeForEnhance = themes.find((theme) => theme.id === selectedThemeId) ?? null;
      await requestPuzzles(activeSessionId, selectedThemeId, themeForEnhance);
    }
  };

  const loadThemes = async (endpoint: "/api/themes/generate" | "/api/themes/refresh") => {
    if (workspaceAuthBlocked) return;
    const activeSessionId = await ensureSession();
    if (!activeSessionId) return;
    await startThemeGeneration(activeSessionId, endpoint, themes);
  };

  useEffect(() => {
    const onBriefOrThemes =
      wizardStep === "themes" || (persistentCanvasSteps && wizardStep === "setup");
    if (!onBriefOrThemes || themePath === "custom" || workspaceAuthBlocked) {
      return;
    }
    if (themes.length > 0) {
      themesAutoFetchInFlight.current = false;
      if (themePath === null) setThemePath("generated");
      return;
    }
    if (themesAutoFetchInFlight.current || themeIdeasLoading) {
      return;
    }
    if (isAuthPlanningRestorePending()) return;
    if (themePath === null) {
      setThemePath("generated");
    }
    let cancelled = false;
    void (async () => {
      const activeSessionId = sessionId || (await createSession(undefined, { seedThemes: false }));
      if (cancelled || !activeSessionId) return;
      await startThemeGeneration(activeSessionId, "/api/themes/generate", []);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap when themes step opens without duplicating in-flight work
  }, [wizardStep, sessionId, themes.length, themePath, themeIdeasLoading, authBootstrapReady]);

  /** Live preview: replace default architectural shell with named flow zones once duration is set. */
  useEffect(() => {
    let cancelled = false;
    const applyPreview = () => {
      if (cancelled) return;
      const planning = planningRef.current;
      if (!planning) {
        requestAnimationFrame(applyPreview);
        return;
      }
      if (generationTelemetry?.engine === "ai_generated") return;

      const duration = planning.state.sessionDurationMinutes.trim();
      const durationN = Number(duration);
      if (!duration || !Number.isFinite(durationN) || durationN < 10) return;

      const theme =
        themes.find((t) => t.id === selectedThemeId) ??
        (customThemeName.trim() ? { name: customThemeName.trim() } : null);
      const themeName = theme?.name ?? "Your escape room";
      const commercial = planning.state.targetInterface === "commercial_venue";
      const previewKey = `${themeName}|${commercial}|${duration}|${planning.state.playersConcurrent}`;

      const layout = planning.state.roomLayout;
      const hasManualEdits = layout.elements.some(
        (e) => !e.id.startsWith("shell_") && !e.id.startsWith("skel_"),
      );
      if (hasManualEdits) return;

      if (layoutPreviewKeyRef.current === previewKey && layout.elements.some((e) => e.id.startsWith("skel_"))) {
        return;
      }
      layoutPreviewKeyRef.current = previewKey;

      const skeleton = buildHeuristicRoomSkeleton(themeName, commercial);
      setLastRoomSkeleton(skeleton);
      const baseLayout = layoutHasOnlyPresetShell(layout)
        ? layout
        : { ...layout, elements: layout.elements.filter((e) => !e.id.startsWith("skel_")) };
      const next = applyRoomSkeletonToLayout(baseLayout, skeleton);
      planning.dispatch({ type: "SET_ROOM_LAYOUT", layout: next });
    };
    applyPreview();
    return () => {
      cancelled = true;
    };
  }, [
    sessionDurationMinutes,
    playersConcurrent,
    targetInterface,
    selectedThemeId,
    themes,
    customThemeName,
    generationTelemetry?.engine,
  ]);

  /** Auto-generate a theme-fit puzzle set when entering Build with a selected theme. */
  useEffect(() => {
    if (wizardStep !== "themes-puzzles" || !selectedThemeId || puzzles.length > 0) {
      return;
    }
    if (isAuthPlanningRestorePending()) return;
    let cancelled = false;
    void (async () => {
      setError("");
      try {
        const activeSessionId = await ensureSession();
        if (cancelled || !activeSessionId) return;
        const synced = await syncPlanningInputToServer(activeSessionId, "draft");
        if (!synced || cancelled) return;
        const themeForEnhance = themes.find((theme) => theme.id === selectedThemeId) ?? null;
        await requestPuzzles(activeSessionId, selectedThemeId, themeForEnhance);
      } catch (err) {
        if (!cancelled) {
          setError(classifyApiCatchError(err));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap when trial user lands on builder with empty puzzles (session may attach after mount)
  }, [wizardStep, selectedThemeId, puzzles.length, sessionId]);

  const generatePuzzles = async () => {
    // Generate puzzle set for selected theme.
    setError("");
    if (!hasFullCatalogAccess) {
      setError(
        "Manual regenerate is part of the full catalog (paid pack). On the trial, a puzzle set generates automatically when you open Build puzzle set.",
      );
      return;
    }
    if (!selectedThemeId) {
      setActivePanel("themes");
      setWizardStep("themes");
      setThemePath("generated");
      flagMissingFields(["selectedThemeId"]);
      return;
    }
    const activeSessionId = await ensureSession();
    if (!activeSessionId) return;
    const synced = await syncPlanningInputToServer(activeSessionId, "draft");
    if (!synced) return;
    const themeForEnhance = themes.find((theme) => theme.id === selectedThemeId) ?? null;
    try {
      await requestPuzzles(activeSessionId, selectedThemeId, themeForEnhance);
    } catch (err) {
      setError(classifyApiCatchError(err));
    }
  };

  const handleThemeSelect = (themeId: string): void => {
    setSelectedThemeId(themeId);
    setValidationFlags((current) => ({ ...current, selectedThemeId: false }));
  };

  const addCustomTheme = async () => {
    // Persist a custom theme, select it, and open the puzzle builder (with generation).
    setError("");
    if (!hasFullCatalogAccess) {
      setError(
        "Custom themes need a room pack (full catalog). On the trial, the same three curated themes load automatically when you open theme selection; purchase a pack under Account to unlock custom themes and the full catalog.",
      );
      return;
    }
    if (!customThemeName.trim()) {
      setActivePanel("plan");
      setWizardStep("themes");
      setThemePath("custom");
      flagMissingFields(["customThemeName"]);
      return;
    }
    if (!buildPlanningBody("strict")) {
      flagMissingFields(collectStrictPlanningMissing());
      setError("Complete room details (players, duration, and environment) before saving your custom theme.");
      setWizardStep("setup");
      setActivePanel("plan");
      scrollFirstInvalidRoomFieldIntoView();
      return;
    }
    setCustomThemeSaving(true);
    try {
      const activeSessionId = await ensureSession();
      if (!activeSessionId) {
        setError("Could not start a planning session. Check that the backend is running and try again.");
        return;
      }
      const synced = await syncPlanningInputToServer(activeSessionId, "strict");
      if (!synced) return;

      let response: Response;
      try {
        response = await apiFetch("/api/themes/custom", {
          method: "POST",
          headers: hasAuthToken() ? withAuthHeaders() : anonJsonHeaders(),
          body: JSON.stringify({
            sessionId: activeSessionId,
            name: customThemeName,
            description: customThemeDescription,
          }),
        });
      } catch (err) {
        setError(classifyApiCatchError(err));
        return;
      }
      let data: { theme?: Theme; error?: { message?: string; code?: string } };
      try {
        data = (await response.json()) as { theme?: Theme; error?: { message?: string; code?: string } };
      } catch {
        setError(unexpectedApiResponseMessage(response.status));
        return;
      }
      if (!response.ok || !data.theme) {
        if (handleBillingGate(data.error?.code, data.error?.message)) return;
        if (isInvalidPlanningSessionResponse(response, data)) {
          const freshId = await recoverPlanningSessionRef.current({ seedThemes: false });
          if (freshId) {
            await syncPlanningInputToServer(freshId, "strict");
            const retry = await apiFetch("/api/themes/custom", {
              method: "POST",
              headers: hasAuthToken() ? withAuthHeaders() : anonJsonHeaders(),
              body: JSON.stringify({
                sessionId: freshId,
                name: customThemeName,
                description: customThemeDescription,
              }),
            });
            data = (await retry.json()) as { theme?: Theme; error?: { message?: string; code?: string } };
            if (!retry.ok || !data.theme) {
              setError(data.error?.message ?? planningSessionRecoveryNotice);
              return;
            }
            response = retry;
          } else {
            setError(planningSessionRecoveryNotice);
            return;
          }
        } else {
          setError(data.error?.message ?? `Failed to add custom theme (${response.status}).`);
          return;
        }
      }

      const savedTheme = data.theme!;
      setThemes((current) => [savedTheme, ...current.filter((theme) => theme.id !== savedTheme.id)]);
      setSelectedThemeId(savedTheme.id);
      setValidationFlags((current) => ({ ...current, selectedThemeId: false, customThemeName: false }));
      rememberInput("customThemeName", customThemeName);
      rememberInput("customThemeDescription", customThemeDescription);

      setActivePanel("themes");
      setWizardStep("themes-puzzles");
      if (puzzles.length === 0) {
        const generated = await requestPuzzles(activeSessionId, savedTheme.id, savedTheme);
        if (!generated) {
          setError("Theme saved, but puzzle generation did not finish. Try Continue to puzzle builder below or open Output review.");
        }
      }
    } finally {
      setCustomThemeSaving(false);
    }
  };

  const getCustomThemeCoachContext = (): CustomThemeCoachContext => {
    const strict = buildPlanningBody("strict");
    if (strict) {
      return {
        themeName: customThemeName.trim() || "(untitled theme)",
        themeDescriptionDraft: customThemeDescription.trim(),
        environmentType: strict.environmentType,
        availableItems: strict.availableItems.join(", "),
        sessionDurationMinutes: String(strict.sessionDurationMinutes),
        playersConcurrent: String(strict.playersConcurrent),
        participantsTotal: String(strict.participantsTotal),
        roomDifficulty: strict.roomDifficulty,
        youthAddOnEnabled: strict.youthAddOnEnabled,
        youthAddOnGatesAdultFlow: strict.youthAddOnGatesAdultFlow,
        youthAddOnAgeNote: strict.youthAddOnAgeNote,
        existingPuzzles: existingPuzzles.map((p) => ({ name: p.name, link: p.link, roomPart: p.roomPart })),
      };
    }
    return {
      themeName: customThemeName.trim() || "(untitled theme)",
      themeDescriptionDraft: customThemeDescription.trim(),
      environmentType: environmentType.trim() || "Not specified",
      availableItems: availableItems.trim() || "Not specified",
      sessionDurationMinutes,
      playersConcurrent,
      participantsTotal,
      roomDifficulty,
      youthAddOnEnabled,
      youthAddOnGatesAdultFlow,
      youthAddOnAgeNote: youthAddOnAgeNote.trim(),
      existingPuzzles: existingPuzzles.map((p) => ({ name: p.name, link: p.link, roomPart: p.roomPart })),
    };
  };

  const toCoachHistory = (list: ThemeCoachUiMessage[]): CustomThemeCoachMessage[] =>
    list.map((m) => ({ role: m.role, content: m.content }));

  const ensureCoachBrowserAi = useCallback(async (): Promise<boolean> => {
    if (isBrowserAiAvailable() || coachBrowserAiReadyRef.current) {
      setCoachBrowserAiReady(true);
      return true;
    }
    const ready = await probeBrowserLanguageModel();
    if (ready) setCoachBrowserAiReady(true);
    return ready;
  }, []);

  const applyCoachBriefFromMessages = useCallback(
    async (messages: ThemeCoachUiMessage[], options?: { manageBusy?: boolean }): Promise<boolean> => {
      if (!customThemeCoachPrereqsOk) {
        setCustomThemeCoachError("Complete room details and a theme name before applying.");
        return false;
      }
      if (!messages.some((m) => m.role === "user")) {
        setCustomThemeCoachError("Send at least one answer to the coach before applying.");
        return false;
      }
      if (!(await ensureCoachBrowserAi())) {
        setCustomThemeCoachError("Built-in AI is not available—cannot apply answers.");
        return false;
      }
      const manageBusy = options?.manageBusy !== false;
      setCustomThemeCoachError("");
      if (manageBusy) setCustomThemeCoachBusy(true);
      try {
        const ctx = getCustomThemeCoachContext();
        const { customThemeCoachSynthesize } = await import("./browserAiCoach.ts");
        const desc = await customThemeCoachSynthesize(ctx, toCoachHistory(messages));
        if (!desc) {
          setCustomThemeCoachError("Could not build a description from the chat. Try again or edit manually.");
          return false;
        }
        setCustomThemeDescription(desc);
        toastMessageOnce("Theme description updated from your coach answers.", TOAST_ID.coachBriefApplied);
        return true;
      } finally {
        if (manageBusy) setCustomThemeCoachBusy(false);
      }
    },
    [customThemeCoachPrereqsOk, ensureCoachBrowserAi],
  );

  const maybeAutoApplyCoachBrief = useCallback(
    async (messages: ThemeCoachUiMessage[]): Promise<void> => {
      if (!isCoachReadyToSynthesize(messages)) return;
      await applyCoachBriefFromMessages(messages, { manageBusy: false });
    },
    [applyCoachBriefFromMessages],
  );

  const resetCustomThemeCoach = (): void => {
    setCustomThemeCoachMessages([]);
    setCustomThemeCoachError("");
  };

  const handleStartCustomThemeCoach = async (): Promise<void> => {
    if (!customThemeCoachPrereqsOk) return;
    if (!(await ensureCoachBrowserAi())) {
      setCustomThemeCoachError(
        "Built-in AI is not available in this browser session yet. In Chrome, enable the Prompt API flags, wait for the on-device model if needed, then refresh this page and try again.",
      );
      return;
    }
    setCustomThemeCoachError("");
    setCustomThemeCoachBusy(true);
    try {
      const ctx = getCustomThemeCoachContext();
      const { customThemeCoachTurn } = await import("./browserAiCoach.ts");
      const reply = await customThemeCoachTurn(ctx, toCoachHistory(customThemeCoachMessages), null);
      if (!reply) {
        setCustomThemeCoachError("The coach did not return a reply. Try again or check browser AI settings.");
        return;
      }
      const assistantMsg = buildAssistantCoachMessage(reply, newCoachMessageId());
      const nextMessages = [...customThemeCoachMessages, assistantMsg];
      setCustomThemeCoachMessages(nextMessages);
      await maybeAutoApplyCoachBrief(nextMessages);
    } finally {
      setCustomThemeCoachBusy(false);
    }
  };

  const handleSelectCoachOption = async (option: string): Promise<void> => {
    if (!customThemeCoachPrereqsOk) return;
    const allowed = getLatestPendingCoachOptions(customThemeCoachMessages);
    if (!allowed.length || !isAllowedCoachUserReply(option, allowed)) {
      setCustomThemeCoachError("That option is not allowed. Choose one of the coach buttons.");
      return;
    }
    if (customThemeCoachBusy) return;
    if (!(await ensureCoachBrowserAi())) {
      setCustomThemeCoachError("Built-in AI is not available—cannot send to the coach.");
      return;
    }
    if (!customThemeCoachMessages.some((m) => m.role === "assistant")) {
      setCustomThemeCoachError("Start the conversation first.");
      return;
    }
    setCustomThemeCoachError("");
    const userMsg: ThemeCoachUiMessage = { id: newCoachMessageId(), role: "user", content: option.trim() };
    const messagesWithUser = [...customThemeCoachMessages, userMsg];
    setCustomThemeCoachMessages(messagesWithUser);
    setCustomThemeCoachBusy(true);
    try {
      if (isCoachReadyToSynthesize(messagesWithUser)) {
        await applyCoachBriefFromMessages(messagesWithUser, { manageBusy: false });
        return;
      }
      const ctx = getCustomThemeCoachContext();
      const { customThemeCoachTurn } = await import("./browserAiCoach.ts");
      const reply = await customThemeCoachTurn(ctx, toCoachHistory(customThemeCoachMessages), option.trim());
      if (!reply) {
        setCustomThemeCoachError("No reply from the coach. Try again.");
        return;
      }
      const assistantMsg = buildAssistantCoachMessage(reply, newCoachMessageId());
      const nextMessages = [...messagesWithUser, assistantMsg];
      setCustomThemeCoachMessages(nextMessages);
      await maybeAutoApplyCoachBrief(nextMessages);
    } finally {
      setCustomThemeCoachBusy(false);
    }
  };

  const handleSynthesizeCustomThemeCoach = async (): Promise<void> => {
    await applyCoachBriefFromMessages(customThemeCoachMessages);
  };

  useEffect(() => {
    themeCoachHydratedForSessionRef.current = "";
  }, [sessionId]);

  useEffect(() => {
    themeCoachHydratedForSessionRef.current = "";
  }, [authToken]);

  useEffect(() => {
    if (!authToken || !sessionId || themePath !== "custom") return;
    if (themeCoachHydratedForSessionRef.current === sessionId) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await apiFetch(`/api/planning/session/${sessionId}/theme-coach`, {
          headers: withAuthGetHeaders(),
        });
        if (cancelled) return;
        if (!res.ok) {
          themeCoachHydratedForSessionRef.current = sessionId;
          return;
        }
        const data = (await res.json()) as { messages?: ThemeCoachUiMessage[] };
        themeCoachHydratedForSessionRef.current = sessionId;
        setCustomThemeCoachMessages((prev) => {
          if (prev.length > 0) return prev;
          if (Array.isArray(data.messages) && data.messages.length > 0) return data.messages;
          return prev;
        });
      } catch {
        if (!cancelled) themeCoachHydratedForSessionRef.current = sessionId;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authToken, sessionId, themePath]);

  useEffect(() => {
    if (wizardStep !== "themes" || themePath !== "custom") return;
    let cancelled = false;
    void probeBrowserLanguageModel().then((ready) => {
      if (cancelled) return;
      setCoachBrowserAiReady((prev) => prev || ready || isBrowserAiAvailable());
    });
    return () => {
      cancelled = true;
    };
  }, [wizardStep, themePath]);

  // When room details + theme name become ready on the custom path, open with an assessment + first questions (once per edge).
  useEffect(() => {
    if (wizardStep !== "themes" || themePath !== "custom") {
      prevCustomThemeCoachPrereqsOkRef.current = false;
      return;
    }
    const ok = customThemeCoachPrereqsOk;
    const rose = ok && !prevCustomThemeCoachPrereqsOkRef.current;
    prevCustomThemeCoachPrereqsOkRef.current = ok;
    if (!rose) return;
    if (customThemeCoachMessagesRef.current.length > 0) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      if (customThemeCoachMessagesRef.current.length > 0) return;
      void (async () => {
        const ready = await ensureCoachBrowserAi();
        if (cancelled || !ready) return;
        if (customThemeCoachMessagesRef.current.length > 0) return;
        setCustomThemeCoachBusy(true);
        setCustomThemeCoachError("");
        try {
          const ctx = getCustomThemeCoachContext();
          const { customThemeCoachTurn } = await import("./browserAiCoach.ts");
          const reply = await customThemeCoachTurn(ctx, [], null);
          if (cancelled) return;
          if (!reply) {
            setCustomThemeCoachError("The coach did not return a reply. Try “Start conversation” or check browser AI settings.");
            return;
          }
          const assistantMsg = buildAssistantCoachMessage(reply, newCoachMessageId());
          setCustomThemeCoachMessages((prev) => {
            if (prev.length > 0) return prev;
            return [...prev, assistantMsg];
          });
          if (customThemeCoachMessagesRef.current.length === 0) {
            await maybeAutoApplyCoachBrief([assistantMsg]);
          }
        } finally {
          if (!cancelled) setCustomThemeCoachBusy(false);
        }
      })();
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [wizardStep, themePath, customThemeCoachPrereqsOk, sessionId, ensureCoachBrowserAi, maybeAutoApplyCoachBrief]);

  useEffect(() => {
    if (!authToken || !sessionId || themePath !== "custom") return;
    const handle = window.setTimeout(() => {
      void apiFetch(`/api/planning/session/${sessionId}/theme-coach`, {
        method: "PUT",
        headers: withAuthHeaders(),
        body: JSON.stringify({
          messages: customThemeCoachMessages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            ...(m.options?.length ? { options: m.options } : {}),
            ...(m.coachComplete ? { coachComplete: true } : {}),
          })),
        }),
      }).catch(() => {
        /* offline */
      });
    }, 700);
    return () => window.clearTimeout(handle);
  }, [authToken, sessionId, themePath, customThemeCoachMessages]);

  const applyPuzzleSetFromServer = async (
    nextPuzzles: Puzzle[],
    data: {
      compatibilityPassed?: boolean;
      storyPlan?: StoryPlan | null;
      suggestedAdditions?: string[];
      suggestedAdditionsRequired?: string[];
      suggestedSafetyProtocols?: string[];
    },
  ) => {
    const activeTheme = themes.find((theme) => theme.id === selectedThemeId);
    const baseSuggestedAdditions = data.suggestedAdditions ?? suggestedAdditions;
    const baseSuggestedRequired = data.suggestedAdditionsRequired ?? suggestedAdditionsRequired;
    const baseSafetyProtocols = data.suggestedSafetyProtocols ?? suggestedSafetyProtocols;
    let aiEnhancement: Awaited<ReturnType<typeof enhancePlanInBrowser>> = null;
    try {
      aiEnhancement = await enhancePlanInBrowser({
        theme: activeTheme,
        environment: environmentType,
        availableItems,
        existingPuzzles,
        puzzles: nextPuzzles,
        suggestedAdditions: baseSuggestedAdditions,
      });
    } catch {
      aiEnhancement = null;
    }
    const enhancedPuzzles = aiEnhancement
      ? nextPuzzles.map((puzzle) => {
          const match = aiEnhancement.puzzles.find((candidate) => candidate.id === puzzle.id);
          return match
            ? {
                ...puzzle,
                howItWorks: match.howItWorks || puzzle.howItWorks,
                themeFitReason: match.themeFitReason || puzzle.themeFitReason,
              }
            : puzzle;
        })
      : nextPuzzles;
    const enhancedStoryPlan =
      aiEnhancement?.stages && data.storyPlan
        ? {
            ...data.storyPlan,
            stages: data.storyPlan.stages.map((stage) => {
              const match = aiEnhancement.stages?.find((candidate) => candidate.stage === stage.stage);
              return match
                ? {
                    ...stage,
                    whyThisStageExists: match.whyThisStageExists || stage.whyThisStageExists,
                  }
                : stage;
            }),
          }
        : data.storyPlan ?? null;
    setPuzzles(enhancedPuzzles);
    setCompatibilityPassed(Boolean(data.compatibilityPassed));
    setStoryPlan(enhancedStoryPlan);
    setSuggestedAdditionsRequired(baseSuggestedRequired);
    setSuggestedAdditions(aiEnhancement?.suggestedAdditions?.length ? aiEnhancement.suggestedAdditions : baseSuggestedAdditions);
    setSuggestedSafetyProtocols(baseSafetyProtocols);
  };

  const replacePuzzle = async (puzzleId: string) => {
    // Replace one puzzle while preserving the rest of the set.
    setError("");
    setPuzzleWindowBusy({ target: puzzleId, action: "replace" });
    const activeSessionId = await ensureSession();
    if (!activeSessionId) {
      setPuzzleWindowBusy(null);
      return;
    }
    try {
      const response = await apiFetch(`/api/puzzles/${encodeURIComponent(puzzleId)}/replace`, {
        method: "POST",
        headers: hasAuthToken() ? withAuthHeaders() : anonJsonHeaders(),
        body: JSON.stringify({ sessionId: activeSessionId, themeId: selectedThemeId }),
      });
      const data = (await response.json()) as {
        replacedPuzzleId?: string;
        newPuzzle?: Puzzle;
        compatibilityPassed?: boolean;
        storyPlan?: StoryPlan;
        suggestedAdditions?: string[];
        suggestedAdditionsRequired?: string[];
        error?: { message?: string; code?: string };
      };
      if (!response.ok) {
        if (handleBillingGate(data.error?.code, data.error?.message)) return;
        setError(data.error?.message ?? "No replacement available for that puzzle yet.");
        return;
      }
      if (!data.replacedPuzzleId || !data.newPuzzle) {
        setError("Replacement response was incomplete.");
        return;
      }
      const replacementPuzzle: Puzzle = data.newPuzzle;
      const nextPuzzles = puzzles.map((puzzle) =>
        puzzle.id === data.replacedPuzzleId ? replacementPuzzle : puzzle,
      );
      await applyPuzzleSetFromServer(nextPuzzles, data);
    } catch (err) {
      setError(classifyApiCatchError(err));
    } finally {
      setPuzzleWindowBusy(null);
    }
  };

  const rejectPuzzle = async (puzzleId: string) => {
    setError("");
    setPuzzleWindowBusy({ target: puzzleId, action: "reject" });
    const activeSessionId = await ensureSession();
    if (!activeSessionId) {
      setPuzzleWindowBusy(null);
      return;
    }
    try {
      const response = await apiFetch(`/api/puzzles/${encodeURIComponent(puzzleId)}/reject`, {
        method: "POST",
        headers: hasAuthToken() ? withAuthHeaders() : anonJsonHeaders(),
        body: JSON.stringify({ sessionId: activeSessionId }),
      });
      const data = (await response.json()) as {
        rejectedPuzzleId?: string;
        refusedSlot?: {
          category: Puzzle["category"];
          audienceTrack?: Puzzle["audienceTrack"];
          gatesAdultProgression?: boolean;
        };
        puzzles?: Puzzle[];
        compatibilityPassed?: boolean;
        storyPlan?: StoryPlan;
        suggestedAdditions?: string[];
        suggestedAdditionsRequired?: string[];
        error?: { message?: string; code?: string };
      };
      if (!response.ok || !data.puzzles) {
        if (handleBillingGate(data.error?.code, data.error?.message)) return;
        setError(data.error?.message ?? "Could not remove that puzzle.");
        return;
      }
      if (data.refusedSlot) {
        setRefusedPuzzleSlots((prev) => [
          ...prev,
          {
            slotId: `refused-${puzzleId}`,
            category: data.refusedSlot!.category,
            audienceTrack: data.refusedSlot!.audienceTrack,
            gatesAdultProgression: data.refusedSlot!.gatesAdultProgression,
          },
        ]);
      }
      await applyPuzzleSetFromServer(data.puzzles, data);
    } catch (err) {
      setError(classifyApiCatchError(err));
    } finally {
      setPuzzleWindowBusy(null);
    }
  };

  const fillPuzzleSlot = async (slotId: string) => {
    const slot = refusedPuzzleSlots.find((candidate) => candidate.slotId === slotId);
    if (!slot) return;
    setError("");
    setPuzzleWindowBusy({ target: slotId, action: "fill" });
    const activeSessionId = await ensureSession();
    if (!activeSessionId) {
      setPuzzleWindowBusy(null);
      return;
    }
    try {
      const response = await apiFetch("/api/puzzles/fill-slot", {
        method: "POST",
        headers: hasAuthToken() ? withAuthHeaders() : anonJsonHeaders(),
        body: JSON.stringify({
          sessionId: activeSessionId,
          category: slot.category,
          audienceTrack: slot.audienceTrack,
          gatesAdultProgression: slot.gatesAdultProgression,
        }),
      });
      const data = (await response.json()) as {
        puzzles?: Puzzle[];
        compatibilityPassed?: boolean;
        storyPlan?: StoryPlan;
        suggestedAdditions?: string[];
        suggestedAdditionsRequired?: string[];
        error?: { message?: string; code?: string };
      };
      if (!response.ok || !data.puzzles) {
        if (handleBillingGate(data.error?.code, data.error?.message)) return;
        setError(data.error?.message ?? "No replacement available for this slot yet.");
        return;
      }
      setRefusedPuzzleSlots((prev) => prev.filter((candidate) => candidate.slotId !== slotId));
      await applyPuzzleSetFromServer(data.puzzles, data);
    } catch (err) {
      setError(classifyApiCatchError(err));
    } finally {
      setPuzzleWindowBusy(null);
    }
  };

  const exportPlan = async () => {
    setError("");
    if (!approvedForBuild) {
      setError("Mark the plan as approved for build before exporting.");
      return;
    }
    if (!planSavedSuccessfully && !trialEvalExportAllowed) {
      setError("Save the plan successfully before exporting (step 2 in the export flow).");
      return;
    }
    setBillingNotice("");
    setExportBusy(true);
    setExportPdfBase64(null);
    try {
      const activeSessionId = await ensureSession();
      if (!activeSessionId) return;
      const synced = await syncPlanningInputToServer(activeSessionId, "strict");
      if (!synced) return;
      const response = await apiFetch(`/api/plans/${activeSessionId}/export`, {
        method: "POST",
        headers: hasAuthToken() ? withAuthHeaders() : anonJsonHeaders(),
        body: JSON.stringify({ format: "both" }),
      });
      const data = (await response.json()) as {
        content?: string;
        pdfBase64?: string;
        exportRedacted?: boolean;
        exportCreditConsumed?: boolean;
        trialConsumed?: boolean;
        operatingMode?: OperatingMode;
        hasGmConsole?: boolean;
        user?: AuthUser;
        error?: { message?: string; code?: string };
      };
      if (!response.ok) {
        if (handleBillingGate(data.error?.code, data.error?.message)) return;
        setError(data.error?.message ?? "Export failed.");
        return;
      }
      if (!data.content && !data.pdfBase64) {
        setError("Export response was incomplete.");
        return;
      }
      setExportContent(data.content ?? "");
      setExportPdfBase64(data.pdfBase64 ?? null);
      setExportWasRedacted(Boolean(data.exportRedacted));
      setExportReadFormat("markdown");
      if (data.exportCreditConsumed || data.trialConsumed) {
        if (data.user) {
          const normalized = normalizeAuthUser(data.user);
          if (normalized) {
            setAuthUser(normalized);
            try {
              window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ authToken, authUser: normalized }));
            } catch {
              // ignore
            }
          }
        } else {
          void refreshProfile();
        }
      }
      if (data.trialConsumed) {
        setBillingNotice(
          "Trial complete — your export is ready. Purchase a room pack to start another room, save plans, and export again.",
        );
        openUpgradePrompt();
      }
      if (data.exportRedacted && authUser?.hasFullCatalog) {
        setBillingNotice(
          "This export omitted full electronic build packs because consumable export credits are at zero. Add credits via activation or webhook.",
        );
      }
      const exportMode: OperatingMode =
        data.operatingMode === "venue" || data.operatingMode === "home"
          ? data.operatingMode
          : targetInterfaceToOperatingMode(targetInterface);
      const gmAccess =
        exportMode === "venue" || Boolean(data.hasGmConsole ?? authUser?.hasGmConsole);
      setLiveOperatingMode(exportMode);
      setLiveHasGmConsole(gmAccess);
      try {
        await initLiveSession(activeSessionId, exportMode);
      } catch {
        /* live init is best-effort */
      }
      setPostExportOpen(true);
    } catch (err) {
      setError(classifyApiCatchError(err));
    } finally {
      setExportBusy(false);
    }
  };

  const exportRunbookHtml = useMemo(
    () => (exportContent ? exportMarkdownToRunbookHtml(exportContent) : ""),
    [exportContent],
  );
  const exportPlainBody = useMemo(
    () => (exportContent ? exportMarkdownToPlainText(exportContent) : ""),
    [exportContent],
  );
  const exportHtmlDoc = useMemo(
    () => (exportRunbookHtml ? wrapExportAsHtmlDocument(exportRunbookHtml) : ""),
    [exportRunbookHtml],
  );

  const downloadExportFile = (ext: "md" | "txt" | "html" | "pdf"): void => {
    const idPart = (sessionId || "session").replace(/[^\w-]+/g, "").slice(-14) || "session";
    const base = `escape-room-plan-${idPart}`;
    if (ext === "pdf") {
      if (!exportPdfBase64) return;
      try {
        const binary = atob(exportPdfBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${base}.pdf`;
        a.rel = "noopener";
        a.click();
        URL.revokeObjectURL(url);
      } catch {
        setError("Could not download the PDF export.");
      }
      return;
    }
    if (!exportContent) return;
    const payloads: Record<"md" | "txt" | "html", { mime: string; body: string; name: string }> = {
      md: { mime: "text/markdown;charset=utf-8", body: exportContent, name: `${base}.md` },
      txt: { mime: "text/plain;charset=utf-8", body: exportPlainBody, name: `${base}.txt` },
      html: { mime: "text/html;charset=utf-8", body: exportHtmlDoc, name: `${base}.html` },
    };
    const p = payloads[ext];
    try {
      const blob = new Blob([p.body], { type: p.mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = p.name;
      a.rel = "noopener";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Could not start download—the browser blocked the file prompt.");
    }
  };

  const refreshSavedPlans = async (): Promise<void> => {
    if (!authToken) return;
    const response = await apiFetch("/api/plans/saved", {
      headers: withAuthGetHeaders(),
    });
    if (response.status === 401) {
      handleAuthExpired();
      return;
    }
    const data = (await response.json()) as { plans?: SavedPlanSummary[]; error?: { message?: string } };
    if (!response.ok || !data.plans) {
      setError(data.error?.message ?? "Could not load saved plans.");
      return;
    }
    setSavedPlans(data.plans);
  };

  const saveCurrentPlan = async (): Promise<void> => {
    setError("");
    if (authUser && !authUser.canSaveRooms) {
      openUpgradePrompt();
      return;
    }
    const activeSessionId = await ensureSession();
    if (!activeSessionId) return;
    if (!approvedForBuild) {
      setError("Approve this plan for build before saving it.");
      return;
    }
    try {
      const response = await apiFetch(`/api/plans/${activeSessionId}/save`, {
        method: "POST",
        headers: withAuthHeaders(),
        body: JSON.stringify({
          name: `${selectedTheme?.name ?? "Untitled"} - ${new Date().toLocaleString()}`,
          approvedForBuild: true,
        }),
      });
      if (response.status === 401) {
        handleAuthExpired();
        return;
      }
      const data = (await response.json()) as {
        savedPlan?: SavedPlanSummary;
        error?: { message?: string; code?: string };
      };
      if (!response.ok || !data.savedPlan) {
        const code = data.error?.code;
        if (handleBillingGate(code, data.error?.message)) {
          void refreshProfile();
          return;
        }
        if (code === "TRIAL_DEVICE_LIMIT" || code === "TRIAL_NETWORK_LIMIT") {
          setError(data.error?.message ?? "You need more room slots to save another plan.");
          void refreshProfile();
        } else {
          setError(data.error?.message ?? "Failed to save plan.");
        }
        return;
      }
      await refreshSavedPlans();
      void refreshProfile();
      setPlanSavedSuccessfully(true);
      if (flowWizardStep !== "output-export") {
        setActivePanel("saved");
        setWizardStep("saved");
      }
    } catch {
      setError("Could not save plan. Check backend and try again.");
    }
  };

  const saveDraftPlan = async (opts?: { idleSignOut?: boolean }): Promise<string | null> => {
    if (!opts?.idleSignOut) {
      setError("");
    }
    if (authUser && !authUser.canSaveRooms) {
      if (!opts?.idleSignOut) openUpgradePrompt();
      return null;
    }
    if (!authToken || !authUser) {
      if (!opts?.idleSignOut) {
        setError("Sign in to save a draft to your account.");
      }
      return null;
    }
    const activeSessionId = await ensureSession();
    if (!activeSessionId) {
      if (!opts?.idleSignOut) {
        setError("Could not open a planning session to save.");
      }
      return null;
    }
    try {
      const response = await apiFetch(`/api/plans/${activeSessionId}/save`, {
        method: "POST",
        headers: withAuthHeaders(),
        body: JSON.stringify({
          draft: true,
          approvedForBuild: false,
          name: `[Draft] ${selectedTheme?.name ?? (customThemeName.trim() || "Work in progress")} — ${new Date().toLocaleString()}`,
        }),
      });
      if (response.status === 401) {
        if (!opts?.idleSignOut) {
          handleAuthExpired();
        }
        return null;
      }
      const data = (await response.json()) as {
        savedPlan?: SavedPlanSummary;
        error?: { message?: string; code?: string };
      };
      if (!response.ok || !data.savedPlan) {
        if (!opts?.idleSignOut) {
          const code = data.error?.code;
          if (handleBillingGate(code, data.error?.message)) {
            void refreshProfile();
          } else if (code === "TRIAL_DEVICE_LIMIT" || code === "TRIAL_NETWORK_LIMIT") {
            setError(data.error?.message ?? "You need more room slots to save another plan.");
            void refreshProfile();
          } else {
            setError(data.error?.message ?? "Failed to save draft.");
          }
        }
        return null;
      }
      await refreshSavedPlans();
      void refreshProfile();
      return data.savedPlan.planId;
    } catch {
      if (!opts?.idleSignOut) {
        setError("Could not save draft. Check backend and try again.");
      }
      return null;
    }
  };

  const loadSavedPlan = async (planId: string): Promise<boolean> => {
    setError("");
    try {
      const response = await apiFetch(`/api/plans/saved/${planId}`, {
        headers: withAuthGetHeaders(),
      });
      if (response.status === 401) {
        handleAuthExpired();
        return false;
      }
      const data = (await response.json()) as {
        savedPlan?: { sessionId: string; data: SavedPlanPayload; approvedForBuild?: boolean };
        error?: { message?: string };
      };
      if (!response.ok || !data.savedPlan) {
        setError(data.error?.message ?? "Failed to load saved plan.");
        return false;
      }
      const payload = data.savedPlan.data;
      setSessionId(data.savedPlan.sessionId);
      setPlayersConcurrent(String(payload.planningInput.playersConcurrent));
      setParticipantsTotal(String(payload.planningInput.participantsTotal));
      setSessionDurationMinutes(String(payload.planningInput.sessionDurationMinutes));
      setEventType(typeof payload.planningInput.eventType === "string" ? payload.planningInput.eventType : "");
      const rd = payload.planningInput.roomDifficulty;
      setRoomDifficulty(rd === "easy" || rd === "hard" ? rd : "medium");
      setYouthAddOnEnabled(Boolean(payload.planningInput.youthAddOnEnabled));
      setYouthAddOnGatesAdultFlow(Boolean(payload.planningInput.youthAddOnGatesAdultFlow));
      setYouthAddOnAgeNote(
        typeof payload.planningInput.youthAddOnAgeNote === "string" ? payload.planningInput.youthAddOnAgeNote : "",
      );
      setEnvironmentType(payload.planningInput.environmentType);
      setThemeMustMatchEnvironment(Boolean(payload.planningInput.themeMustMatchEnvironment));
      const vbt = payload.planningInput.venueBuildType;
      setVenueBuildType(vbt === "professional_empty" ? "professional_empty" : "prebuilt_space");
      const ti = payload.planningInput.targetInterface;
      setTargetInterface(ti === "commercial_venue" ? "commercial_venue" : "home_party");
      setPropFabrication3dEnabled(Boolean(payload.planningInput.propFabrication3dEnabled));
      const pfKinds = payload.planningInput.propFabricationKinds;
      setPropFabricationKinds(
        Array.isArray(pfKinds)
          ? pfKinds.filter((k): k is PropFabricationKind => k === "mechanical" || k === "decorative")
          : [],
      );
      setAvailableItems(payload.planningInput.availableItems.join(", "));
      const mo = payload.planningInput.mainTrackPuzzleCountOverride;
      setUseCustomMainPuzzleCount(typeof mo === "number" && Number.isFinite(mo));
      setCustomMainPuzzleCountStr(typeof mo === "number" && Number.isFinite(mo) ? String(mo) : "");
      const ml = payload.planningInput.puzzleMixLogic;
      const mp = payload.planningInput.puzzleMixPhysical;
      const me = payload.planningInput.puzzleMixElectronic;
      const hasMix =
        typeof ml === "number" &&
        Number.isFinite(ml) &&
        typeof mp === "number" &&
        Number.isFinite(mp) &&
        typeof me === "number" &&
        Number.isFinite(me);
      setUseCustomMix(hasMix);
      if (hasMix) {
        setCustomMixLogic(String(ml));
        setCustomMixPhysical(String(mp));
        setCustomMixElectronic(String(me));
      } else {
        setCustomMixLogic("");
        setCustomMixPhysical("");
        setCustomMixElectronic("");
      }
      setExistingPuzzles(payload.planningInput.existingPuzzles);
      const rawCoach = Array.isArray(payload.themeCoachChat) ? payload.themeCoachChat : [];
      const restoredCoach = rawCoach.filter(
        (m): m is ThemeCoachUiMessage =>
          Boolean(m) &&
          typeof m === "object" &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          typeof m.id === "string",
      );
      setCustomThemeCoachMessages(restoredCoach);
      themeCoachHydratedForSessionRef.current = data.savedPlan.sessionId;
      if (authToken && restoredCoach.length > 0) {
        void apiFetch(`/api/planning/session/${data.savedPlan.sessionId}/theme-coach`, {
          method: "PUT",
          headers: withAuthHeaders(),
          body: JSON.stringify({ messages: restoredCoach }),
        }).catch(() => {
          /* session may not exist server-side; ignore */
        });
      }
      setThemes(payload.themes.map(normalizeImportedTheme));
      setSelectedThemeId(payload.selectedThemeId);
      setPuzzles(payload.puzzles);
      setRefusedPuzzleSlots([]);
      setSuggestedAdditions(payload.suggestedAdditions);
      setSuggestedAdditionsRequired(payload.suggestedAdditionsRequired ?? []);
      setSuggestedSafetyProtocols(payload.suggestedSafetyProtocols ?? []);
      setStoryPlan(payload.storyPlan);
      setCompatibilityPassed(payload.compatibilityPassed);
      setExportContent(payload.exportContent ?? "");
      setApprovedForBuild(Boolean(data.savedPlan.approvedForBuild));
      setShowPlanPicker(false);
      setActivePanel("output");
      setWizardStep("output-review");
      {
        const themesIdx = wizardSteps.indexOf("themes");
        const puzzlesIdx = wizardSteps.indexOf("themes-puzzles");
        const reviewIdx = wizardSteps.indexOf("output-review");
        const exportIdx = wizardSteps.indexOf("output-export");
        let loadedFurthest = reviewIdx >= 0 ? reviewIdx : 0;
        if (themesIdx >= 0 && payload.selectedThemeId?.trim()) {
          loadedFurthest = Math.max(loadedFurthest, themesIdx);
        }
        if (puzzlesIdx >= 0 && payload.puzzles.length > 0) {
          loadedFurthest = Math.max(loadedFurthest, puzzlesIdx);
        }
        if (data.savedPlan.approvedForBuild && exportIdx >= 0) {
          loadedFurthest = Math.max(loadedFurthest, exportIdx);
        }
        setFurthestWizardIndex(loadedFurthest);
      }
      setAppView("builder");
      return true;
    } catch {
      setError("Could not load saved plan. Check backend and try again.");
      return false;
    }
  };

  const deleteSavedPlan = async (planId: string): Promise<void> => {
    if (!window.confirm("Delete this saved plan? This action cannot be undone.")) {
      return;
    }
    setError("");
    try {
      const response = await apiFetch(`/api/plans/saved/${planId}`, {
        method: "DELETE",
        headers: withAuthGetHeaders(),
      });
      if (response.status === 401) {
        handleAuthExpired();
        return;
      }
      const data = (await response.json()) as { deletedPlanId?: string; error?: { message?: string } };
      if (!response.ok || !data.deletedPlanId) {
        setError(data.error?.message ?? "Failed to delete saved plan.");
        return;
      }
      setSavedPlans((current) => current.filter((plan) => plan.planId !== planId));
    } catch {
      setError("Could not delete saved plan. Check backend and try again.");
    }
  };

  useEffect(() => {
    if (!authToken || !authUser) {
      setSavedPlans([]);
      return;
    }
    void refreshSavedPlans();
  }, [authToken, authUser]);

  useEffect(() => {
    if (!authToken || !authUser) {
      return;
    }
    let planId: string | null = null;
    try {
      planId = window.localStorage.getItem(IDLE_RESUME_PLAN_ID_KEY);
      if (planId?.trim()) {
        window.localStorage.removeItem(IDLE_RESUME_PLAN_ID_KEY);
      }
    } catch {
      return;
    }
    const trimmed = planId?.trim();
    if (!trimmed) return;
    let cancelled = false;
    void (async () => {
      await loadSavedPlan(trimmed);
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [authToken, authUser]);

  useEffect(() => {
    if (!wizardSteps.includes(wizardStep)) {
      const setupIdx = wizardSteps.indexOf("setup");
      setWizardStep(setupIdx >= 0 ? "setup" : (wizardSteps[0] ?? "setup"));
    }
  }, [wizardSteps, wizardStep]);

  useEffect(() => {
    wizardNavigationBusyRef.current = wizardNavigationBusy;
  }, [wizardNavigationBusy]);

  clearWizardBusyStateRef.current = (): void => {
    setThemeIdeasLoading(false);
    setPuzzlesGenerating(false);
    setOutputReviewBusy(false);
    setCustomThemeSaving(false);
    setCustomThemeCoachBusy(false);
    setPuzzleWindowBusy(null);
    puzzlesRequestInFlight.current = false;
    themesAutoFetchInFlight.current = false;
  };

  useEffect(() => {
    if (!authUser) return;
    if (savedPlans.length > 0) {
      setShowPlanPicker(true);
      return;
    }
    setShowPlanPicker(false);
    if (wizardStep === "saved") {
      setWizardStep("setup");
    }
    if (activePanel === "saved") {
      setActivePanel("plan");
    }
  }, [savedPlans, authUser, activePanel, wizardStep]);

  useEffect(() => {
    if (!authToken || !authUser) {
      setIdlePromptOpen(false);
      idleTimeoutSignOutStartedRef.current = false;
      return;
    }
    idleLastActivityRef.current = Date.now();
    const markActive = (): void => {
      idleLastActivityRef.current = Date.now();
      setIdlePromptOpen(false);
    };
    const scrollOpts: AddEventListenerOptions = { passive: true };
    window.addEventListener("keydown", markActive);
    window.addEventListener("pointerdown", markActive);
    window.addEventListener("scroll", markActive, scrollOpts);
    window.addEventListener("touchstart", markActive, scrollOpts);
    const intervalMs = 15_000;
    const tick = (): void => {
      if (wizardNavigationBusyRef.current) {
        idleLastActivityRef.current = Date.now();
        setIdlePromptOpen(false);
        return;
      }
      const inactiveMs = Date.now() - idleLastActivityRef.current;
      if (inactiveMs >= AUTH_IDLE_SIGNOUT_MS) {
        if (idleTimeoutSignOutStartedRef.current) return;
        idleTimeoutSignOutStartedRef.current = true;
        setIdlePromptOpen(false);
        void (async () => {
          let resumePlanId: string | null = null;
          try {
            resumePlanId = await saveDraftPlan({ idleSignOut: true });
          } catch {
            // ignore
          }
          clearWizardBusyStateRef.current();
          if (resumePlanId) {
            try {
              window.localStorage.setItem(IDLE_RESUME_PLAN_ID_KEY, resumePlanId);
            } catch {
              // ignore
            }
          }
          const expiredMessage = resumePlanId
            ? "You were signed out after 30 minutes without activity. Your plan was saved as a draft and will reopen automatically when you sign back in."
            : authUser?.canSaveRooms
              ? "You were signed out after 30 minutes without activity. Sign in again to continue. If you saw the inactivity prompt, use Save draft there to keep work in Saved room plans."
              : "You were signed out after 30 minutes without activity. Sign in again to continue. Trial accounts cannot save drafts—purchase a room pack to save plans to your account.";
          const inPersistentWorkspace =
            appViewRef.current === "builder" && persistentCanvasStepsRef.current;
          if (inPersistentWorkspace) {
            activateWorkspaceSessionExpired(expiredMessage);
            setAuthToken("");
            try {
              clearAuthSession();
            } catch {
              // ignore
            }
          } else {
            setError(expiredMessage);
            persistAuthRef.current("", null);
          }
          idleTimeoutSignOutStartedRef.current = false;
        })();
        return;
      }
      if (inactiveMs >= AUTH_IDLE_SIGNOUT_MS - AUTH_IDLE_PROMPT_LEAD_MS) {
        setIdlePromptOpen(true);
      }
    };
    const id = window.setInterval(tick, intervalMs);
    tick();
    return () => {
      window.removeEventListener("keydown", markActive);
      window.removeEventListener("pointerdown", markActive);
      window.removeEventListener("scroll", markActive, scrollOpts);
      window.removeEventListener("touchstart", markActive, scrollOpts);
      window.clearInterval(id);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- idle watchdog only needs token/user identity
  }, [authToken, authUser, activateWorkspaceSessionExpired]);

  useEffect(() => {
    if (
      authUser &&
      !hasAuthToken() &&
      appView === "builder" &&
      persistentCanvasSteps &&
      !workspaceSessionExpired.open
    ) {
      activateWorkspaceSessionExpired(THEME_SESSION_EXPIRED_MESSAGE);
    }
  }, [
    authUser,
    authToken,
    appView,
    persistentCanvasSteps,
    workspaceSessionExpired.open,
    activateWorkspaceSessionExpired,
  ]);

  useEffect(() => {
    if (authToken.trim() && authUser?.id && workspaceSessionExpired.open) {
      setWorkspaceSessionExpired({ open: false, message: "" });
    }
  }, [authToken, authUser?.id, workspaceSessionExpired.open]);

  useLayoutEffect(() => {
    if (wizardStep !== "output-review" && wizardStep !== "output-export") return;
    const id = window.setTimeout(() => {
      const el =
        wizardStep === "output-export"
          ? document.getElementById("builder-export-anchor")
          : document.getElementById("builder-output-anchor");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
    return () => window.clearTimeout(id);
  }, [wizardStep]);

  useEffect(() => {
    if (!error.trim()) return;
    if (wizardStep !== "themes-puzzles") return;
    const id = window.requestAnimationFrame(() => {
      document.getElementById("flow-shell-error-anchor")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    return () => window.cancelAnimationFrame(id);
  }, [error, wizardStep]);

  const flowMutedHelper =
    flowWizardStep === "setup"
      ? "Pick your target interface first, then session timing and space details. The estimated puzzle node count updates live from duration and head count. Commercial venue install checklists unlock in Review after your theme and puzzle set are generated."
      : flowWizardStep === "themes-puzzles"
        ? selectedTheme
          ? `Build or refresh puzzles for: ${selectedTheme.name}. Add any **premade** puzzles you already own on this step before generating; count follows room timing and difficulty from Room details. Treat generator output and web references as starting points—adapt into **original** venue-specific puzzles (including any Arduino builds) and **QA** electronics before opening.`
          : "Choose a theme first, then add any premade puzzles you already own and generate when you are ready."
        : flowWizardStep === "themes" && selectedTheme
          ? simpleRoomSetup
            ? `Theme selected: ${selectedTheme.name}. The full brief and loadout are above—continue when you’re ready.`
            : `Theme selected: ${selectedTheme.name}`
          : flowWizardStep === "themes"
            ? simpleRoomSetup && !selectedThemeId
              ? "Curated theme cards load automatically. Use **Use My Own Theme** at the top of this step if you want a custom brief—pick one radio, then continue."
              : "Room timing is locked in from the previous step; pick or author a theme next."
            : flowWizardStep === "output-review"
              ? "Review the puzzle list and storyline below this header, then continue to export when you are ready."
              : flowWizardStep === "output-export"
                ? "Export markdown, mark approval if you want, and save the plan to your account."
                : null;

  const showBackInFlowHeader = !(flowWizardStep === "themes" && themePath !== "custom");

  const themeHeaderActions =
    flowWizardStep === "themes" && themePath !== "custom" ? (
      <div className="theme-header-actions" role="group" aria-label="Theme navigation">
        {canGoWizardBack ? (
          <button type="button" className="secondary-btn flow-back-btn" onClick={goWizardBack}>
            ← Back
          </button>
        ) : null}
        <ThemeGenerateButton
          className="theme-generate-new-btn--header"
          themesCount={themes.length}
          loading={themeIdeasLoading}
          disabled={!canGenerateNewThemes}
          disabledTitle={themeGenerateDisabledTitle}
          onGenerate={handleGenerateNewThemes}
        />
      </div>
    ) : null;

  const savedPlansManageList: ReactNode =
    authUser && !authUser.canSaveRooms ? (
      <p className="muted">
        Saving plans is not included in the free trial. Open <strong>Account → Plans &amp; billing</strong> to purchase a room pack.
      </p>
    ) : savedPlans.length === 0 ? (
      <p className="muted">No saved plans yet. Approve and save a plan from the builder export step.</p>
    ) : (
      <ul className="list-compact">
        {savedPlans.map((plan) => (
          <li key={`acct-${plan.planId}`}>
            <strong>{plan.name}</strong> — {plan.themeName} ({plan.puzzleCount} puzzles){" "}
            {!plan.approvedForBuild ? <span className="muted">Draft</span> : null}{" "}
            {plan.approvedForBuild ? <span className="status-pass">Approved</span> : <span className="muted">Not approved</span>}{" "}
            <button type="button" className="secondary-btn" onClick={() => void loadSavedPlan(plan.planId)}>
              Load in builder
            </button>
            <button type="button" className="secondary-btn" onClick={() => void deleteSavedPlan(plan.planId)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    );

  const experienceComposeTheme = useMemo(
    () => (
      <ExperienceThemeSection
        serverOpenAiConfigured={serverOpenAiConfigured}
        browserAiReady={browserAiReady}
        themePath={themePath}
        themes={themes}
        themeIdeasLoading={themeIdeasLoading}
        themeSessionExpiredNotice={themeSessionExpiredNotice}
        workspaceSessionExpiredOpen={workspaceSessionExpired.open}
        canGenerateNewThemes={canGenerateNewThemes}
        themeGenerateDisabledTitle={themeGenerateDisabledTitle}
        onGenerateThemes={handleGenerateNewThemes}
        selectedThemeId={selectedThemeId}
        simpleThemeView={simpleThemeView}
        simpleRoomSetup={simpleRoomSetup}
        hasFullCatalogAccess={hasFullCatalogAccess}
        validationFlagsSelectedTheme={validationFlags.selectedThemeId}
        hoverPreviewThemeId={hoverPreviewThemeId}
        themePlanningContextLine={themePlanningContextLine}
        resolveThemeTldr={(theme) => resolveThemeTldr(theme as Theme)}
        onThemeSelect={handleThemeSelect}
        onHoverTheme={setHoverPreviewThemeId}
        onUseCustomTheme={() => {
          cancelThemeGeneration();
          setThemePath("custom");
          setThemes([]);
          setSelectedThemeId("");
          resetCustomThemeCoach();
        }}
        onBrowseGenerated={() => {
          setThemePath("generated");
          resetCustomThemeCoach();
          void loadThemes("/api/themes/generate");
        }}
        customThemeName={customThemeName}
        customThemeDescription={customThemeDescription}
        customThemeSaving={customThemeSaving}
        onCustomThemeNameChange={(v) => {
          setCustomThemeName(v);
          setValidationFlags((c) => ({ ...c, customThemeName: false }));
        }}
        onCustomThemeDescriptionChange={setCustomThemeDescription}
        onAddCustomTheme={() => void addCustomTheme()}
        customThemeCoachMessages={customThemeCoachMessages}
        customThemeCoachBusy={customThemeCoachBusy}
        customThemeCoachError={customThemeCoachError}
        coachBrowserAiReady={coachBrowserAiReady}
        authToken={authToken}
        customThemeCoachPrereqsOk={customThemeCoachPrereqsOk}
        coachCoverage={coachCoverage}
        onStartCoach={() => void handleStartCustomThemeCoach()}
        onSelectCoachOption={(option) => void handleSelectCoachOption(option)}
        onSynthesizeCoach={() => void handleSynthesizeCustomThemeCoach()}
        onClearCoach={resetCustomThemeCoach}
        briefPolishBusy={briefPolishBusy}
        onRunPolishBrief={() => void runPolishCurrentBrief()}
        ThemeDescriptionBlocks={ThemeDescriptionBlocks}
        inputHistoryCustomThemeNames={inputHistory.customThemeName ?? []}
      />
    ),
    [
      serverOpenAiConfigured,
      browserAiReady,
      themePath,
      themes,
      themeIdeasLoading,
      themeSessionExpiredNotice,
      workspaceSessionExpired.open,
      canGenerateNewThemes,
      themeGenerateDisabledTitle,
      selectedThemeId,
      simpleThemeView,
      simpleRoomSetup,
      hasFullCatalogAccess,
      validationFlags.selectedThemeId,
      hoverPreviewThemeId,
      themePlanningContextLine,
      customThemeName,
      customThemeDescription,
      customThemeSaving,
      customThemeCoachMessages,
      customThemeCoachBusy,
      customThemeCoachError,
      coachBrowserAiReady,
      authToken,
      customThemeCoachPrereqsOk,
      coachCoverage,
      briefPolishBusy,
      inputHistory.customThemeName,
    ],
  );

  const experienceCurateContent = useMemo(
    () =>
      puzzles.length > 0 || refusedPuzzleSlots.length > 0 ? (
        <PuzzleWindowsTrack
          puzzles={puzzles}
          refusedSlots={refusedPuzzleSlots}
          numberOffset={0}
          selectedThemeName={selectedThemeName}
          selectedThemeDescription={selectedThemeDescription}
          authUser={authUser}
          arduinoPreviewPuzzleId={arduinoPreviewPuzzleId}
          puzzleWindowBusy={puzzleWindowBusy}
          onToggleArduinoPreview={(id) => setArduinoPreviewPuzzleId((cur) => (cur === id ? null : id))}
          onReplace={(id) => void replacePuzzle(id)}
          onReject={(id) => void rejectPuzzle(id)}
          onFillSlot={(slotId) => void fillPuzzleSlot(slotId)}
        />
      ) : (
        <p className="muted">Generate a room first to curate puzzles.</p>
      ),
    [
      puzzles,
      refusedPuzzleSlots,
      selectedThemeName,
      selectedThemeDescription,
      authUser,
      arduinoPreviewPuzzleId,
      puzzleWindowBusy,
    ],
  );


  const outputReviewBodyElement = useMemo(
    () => (
      <>

              {puzzles.length > 0 || refusedPuzzleSlots.length > 0 ? (
                <>
                  <h3 className="output-review-section-title">Puzzle set</h3>
                  <p className={compatibilityPassed ? "status-pass" : "status-fail"}>
                    Theme compatibility checks passed: {compatibilityPassed ? "Yes" : "No"}
                  </p>
                  <JuniorGateIntegrationCallout
                    youthAddOnEnabled={youthAddOnEnabled}
                    youthAddOnGatesAdultFlow={youthAddOnGatesAdultFlow}
                    juniorGatingPuzzles={juniorGatingPuzzles}
                    juniorTrackPuzzles={juniorTrackPuzzles}
                  />
                  {youthAddOnEnabled && (juniorTrackPuzzles.length > 0 || juniorRefusedSlots.length > 0) ? (
                    <>
                      <h4 className="puzzle-track-heading">Main crew</h4>
                      <PuzzleWindowsTrack
                        puzzles={mainTrackPuzzles}
                        refusedSlots={mainRefusedSlots}
                        numberOffset={0}
                        selectedThemeName={selectedThemeName}
                        selectedThemeDescription={selectedThemeDescription}
                        authUser={authUser}
                        arduinoPreviewPuzzleId={arduinoPreviewPuzzleId}
                        puzzleWindowBusy={puzzleWindowBusy}
                        onToggleArduinoPreview={(id) =>
                          setArduinoPreviewPuzzleId((cur) => (cur === id ? null : id))
                        }
                        onReplace={(id) => void replacePuzzle(id)}
                        onReject={(id) => void rejectPuzzle(id)}
                        onFillSlot={(slotId) => void fillPuzzleSlot(slotId)}
                      />
                      <h4 className="puzzle-track-heading puzzle-track-heading--junior">Junior add-on track</h4>
                      <p className="muted puzzle-track-lead">
                        Easy–medium beats in the same fiction as your theme.
                        {youthAddOnGatesAdultFlow ? (
                          <>
                            {" "}
                            Cards marked <span className="puzzle-gate-pill junior-gate-pill-inline">Gates adult flow</span> may be
                            required before the main crew advances a linked beat.
                          </>
                        ) : (
                          <>
                            {" "}
                            Parallel play without a mandatory hard gate on adults—still debrief together so the story stays coherent.
                          </>
                        )}
                      </p>
                      <PuzzleWindowsTrack
                        puzzles={juniorTrackPuzzles}
                        refusedSlots={juniorRefusedSlots}
                        numberOffset={mainTrackPuzzles.length + mainRefusedSlots.length}
                        selectedThemeName={selectedThemeName}
                        selectedThemeDescription={selectedThemeDescription}
                        authUser={authUser}
                        arduinoPreviewPuzzleId={arduinoPreviewPuzzleId}
                        puzzleWindowBusy={puzzleWindowBusy}
                        onToggleArduinoPreview={(id) =>
                          setArduinoPreviewPuzzleId((cur) => (cur === id ? null : id))
                        }
                        onReplace={(id) => void replacePuzzle(id)}
                        onReject={(id) => void rejectPuzzle(id)}
                        onFillSlot={(slotId) => void fillPuzzleSlot(slotId)}
                      />
                      <JuniorTrackEnvironmentIdeas
                        themeName={selectedThemeName}
                        environmentType={environmentType}
                        availableItems={availableItems}
                      />
                    </>
                  ) : (
                    <PuzzleWindowsTrack
                      puzzles={puzzles}
                      refusedSlots={refusedPuzzleSlots}
                      numberOffset={0}
                      selectedThemeName={selectedThemeName}
                      selectedThemeDescription={selectedThemeDescription}
                      authUser={authUser}
                      arduinoPreviewPuzzleId={arduinoPreviewPuzzleId}
                      puzzleWindowBusy={puzzleWindowBusy}
                      onToggleArduinoPreview={(id) =>
                        setArduinoPreviewPuzzleId((cur) => (cur === id ? null : id))
                      }
                      onReplace={(id) => void replacePuzzle(id)}
                      onReject={(id) => void rejectPuzzle(id)}
                      onFillSlot={(slotId) => void fillPuzzleSlot(slotId)}
                    />
                  )}
                </>
              ) : (
                <p className="muted">
                  No puzzle output yet. Finish room details and theme selection — a theme-fit set generates automatically when you open{" "}
                  <strong>Build puzzle set</strong> or continue to this review step.
                </p>
              )}
              {suggestedAdditionsRequired.length > 0 || suggestedAdditions.length > 0 ? (
                <div className="suggested-additions-panel">
                  {suggestedAdditionsRequired.length > 0 ? (
                    <div className="suggested-additions-block suggested-additions-block--required">
                      <h3>Required staging / props</h3>
                      <p className="muted suggested-additions-lead">
                        Address these gaps before you treat the room as ready to rehearse—usually missing lock surfaces, clue boards, or
                        electronics bench items called out from your inventory and puzzle mix.
                      </p>
                      <ul className="suggested-additions-list">
                        {suggestedAdditionsRequired.map((item) => (
                          <StagingPropListItem key={`req-${item}`} item={item} />
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {suggestedAdditions.length > 0 ? (
                    <div className="suggested-additions-block suggested-additions-block--optional">
                      <h3>Suggested elements to add</h3>
                      <ul className="suggested-additions-list">
                        {suggestedAdditions.map((item) => (
                          <StagingPropListItem key={`opt-${item}`} item={item} />
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {suggestedSafetyProtocols.length > 0 ? (
                <div className="safety-protocols-panel suggested-additions-panel suggested-additions-panel--safety">
                  <div className="suggested-additions-block suggested-additions-block--safety">
                    <h3 className="safety-protocols-panel__title">Safety Protocols &amp; Guidelines</h3>
                    <p className="muted suggested-additions-lead">
                      Construction hazards, space constraints, and operational precautions — isolated from general staging copy.
                    </p>
                    <ul className="suggested-additions-list suggested-additions-list--safety">
                      {suggestedSafetyProtocols.map((item) => (
                        <li key={`safety-${item}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}
              {storyPlan ? (
                <>
                <div className="output-review-story output-review-glass-surface">
                  <h3 className="output-review-section-title">Storyline and progression</h3>
                  <div className="output-review-narrative-grid">
                    <OutputReviewNarrativeField label="Situation" text={storyPlan.situation} />
                    <OutputReviewNarrativeField label="Premise" text={storyPlan.premise} />
                    <OutputReviewNarrativeField label="Mission objective" text={storyPlan.missionObjective} />
                    <article className="output-review-field output-review-field--wide">
                      <h4 className="output-review-field-label">Progression rule</h4>
                      <OutputReviewProgressionGuide
                        progressionRule={storyPlan.progressionRule}
                        puzzleLinks={storyPlan.puzzleLinks}
                      />
                    </article>
                  </div>
                </div>
                  {storyPlan.stages && storyPlan.stages.length > 0 ? (
                    <>
                      <h3 className="output-review-section-title">Stage flow</h3>
                      <ol className="output-review-stage-list output-review-glass-surface">
                        {storyPlan.stages.map((st) => (
                          <li key={st.stage} className="output-review-stage-card">
                            <div className="output-review-stage-head">
                              <span className="output-review-stage-badge">Stage {st.stage}</span>
                              <strong className="output-review-stage-title">{st.title}</strong>
                            </div>
                            <dl className="output-review-stage-dl">
                              <div>
                                <dt>Story beat</dt>
                                <dd>{st.storyBeat}</dd>
                              </div>
                              <div>
                                <dt>Why this stage exists</dt>
                                <dd>{st.whyThisStageExists}</dd>
                              </div>
                              <div>
                                <dt>Objective</dt>
                                <dd>
                                  <OutputReviewProse text={st.objective} />
                                </dd>
                              </div>
                              {st.whatPlayersMustDo?.length ? (
                                <div>
                                  <dt>What players must do</dt>
                                  <dd>
                                    <ul className="output-review-stage-ul">
                                      {st.whatPlayersMustDo.map((line, idx) => (
                                        <li key={idx}>{line}</li>
                                      ))}
                                    </ul>
                                  </dd>
                                </div>
                              ) : null}
                              {st.requiredPuzzleTitles?.length ? (
                                <div>
                                  <dt>Required puzzles</dt>
                                  <dd>{st.requiredPuzzleTitles.join(", ")}</dd>
                                </div>
                              ) : null}
                              {st.reveals ? (
                                <div>
                                  <dt>Reveal</dt>
                                  <dd>
                                    <OutputReviewProse text={st.reveals} />
                                  </dd>
                                </div>
                              ) : null}
                            </dl>
                          </li>
                        ))}
                      </ol>
                    </>
                  ) : null}
                  {storyPlan.stagingDiagram ? (
                    <>
                      <h3 className="output-review-section-title">Room layout sketch</h3>
                      <OutputReviewStagingDiagram text={storyPlan.stagingDiagram} />
                    </>
                  ) : null}
                  {targetInterface === "commercial_venue" && selectedTheme && puzzles.length > 0 ? (
                    <EmptyRoomInstallChecklist environmentType={environmentType} themeName={selectedTheme.name} />
                  ) : null}
                  {puzzles.length > 0 ? (
                    <div className="output-review-flow-block">
                      <h3 className="output-review-section-title">Room flowchart</h3>
                      <p className="muted room-flowchart-lead">
                        Click the chart to enlarge and pan. Download SVG, PNG, or Mermaid source for runbooks.
                      </p>
                      <Suspense fallback={<p className="muted">Loading flowchart…</p>}>
                        <RoomFlowchartPanel
                          storyPlan={storyPlan}
                          puzzles={puzzles}
                          themeName={selectedTheme?.name}
                          fileBase="room-flow-review"
                        />
                      </Suspense>
                      <NarrativeFlowGuide storyPlan={storyPlan} />
                    </div>
                  ) : null}
                  {isCreativeEnginesEnabled() && puzzles.length > 0 ? (
                    <Suspense fallback={<p className="muted">Loading creative engines…</p>}>
                      <CreativeEnginesWorkspace
                        sessionId={sessionId}
                        puzzles={puzzles.map((p) => ({
                          id: p.id,
                          title: p.title,
                          audienceTrack: p.audienceTrack,
                        }))}
                        storyStages={
                          storyPlan?.stages?.map((st) => ({
                            stage: st.stage,
                            title: st.title,
                            storyBeat: st.storyBeat,
                            requiredPuzzleIds: st.requiredPuzzleIds,
                          })) ?? []
                        }
                        progressionGraph={storyPlan?.progressionGraph ?? null}
                        youthAddOnEnabled={youthAddOnEnabled}
                      />
                    </Suspense>
                  ) : null}
                </>
              ) : null}
      </>
    ),
    [
      puzzles,
      refusedPuzzleSlots,
      compatibilityPassed,
      youthAddOnEnabled,
      youthAddOnGatesAdultFlow,
      juniorGatingPuzzles,
      juniorTrackPuzzles,
      mainTrackPuzzles,
      mainRefusedSlots,
      juniorRefusedSlots,
      selectedThemeName,
      selectedThemeDescription,
      authUser,
      arduinoPreviewPuzzleId,
      puzzleWindowBusy,
      suggestedAdditionsRequired,
      suggestedAdditions,
      suggestedSafetyProtocols,
      storyPlan,
      targetInterface,
      selectedTheme,
      environmentType,
      availableItems,
      sessionId,
    ],
  );

  const outputExportActionsElement = useMemo(
    () => (
              <div className="export-action-flow" role="group" aria-label="Approve, save, then export">
                <div className="export-action-flow__row">
                  <div className={`export-action-flow__node${approvedForBuild ? " export-action-flow__node--done" : ""}`}>
                    <span className="export-action-flow__step-num" aria-hidden>
                      1
                    </span>
                    <button
                      type="button"
                      className={approvedForBuild ? "primary-btn export-action-flow__btn" : "secondary-btn export-action-flow__btn"}
                      onClick={() => {
                        setApprovedForBuild((current) => {
                          const next = !current;
                          if (!next) setPlanSavedSuccessfully(false);
                          return next;
                        });
                      }}
                    >
                      {approvedForBuild ? "Approved for build" : "Mark approved for build"}
                    </button>
                  </div>
                  <div className="export-action-flow__rail" aria-hidden />
                  <div className="export-action-flow__node">
                    <span className="export-action-flow__step-num" aria-hidden>
                      2
                    </span>
                    <button
                      type="button"
                      className="secondary-btn export-action-flow__btn save-plan-btn"
                      disabled={!authUser?.canSaveRooms}
                      title={authUser?.canSaveRooms ? undefined : "Purchase a room pack to save plans"}
                      onClick={() => (authUser?.canSaveRooms ? void saveCurrentPlan() : openUpgradePrompt())}
                    >
                      {authUser?.canSaveRooms ? (
                        <>
                          <span
                            className="save-plan-btn__meter"
                            style={{ ["--save-pct" as string]: `${planCompletionPercent}%` }}
                            aria-hidden
                          />
                          Save plan ({planCompletionPercent}% complete)
                        </>
                      ) : (
                        "Save plan (paid)"
                      )}
                    </button>
                  </div>
                  <div className="export-action-flow__rail export-action-flow__rail--accent" aria-hidden />
                  <div className="export-action-flow__node">
                    <span className="export-action-flow__step-num" aria-hidden>
                      3
                    </span>
                    <button
                      type="button"
                      className="primary-btn export-action-flow__btn"
                      disabled={
                        exportBusy ||
                        !authUser?.canExportRunbook ||
                        !approvedForBuild ||
                        (!planSavedSuccessfully && !trialEvalExportAllowed)
                      }
                      aria-busy={exportBusy}
                      title={
                        !authUser?.canExportRunbook
                          ? "Purchase an export credit or upgrade to export a full runbook."
                          : !approvedForBuild
                            ? "Approve the plan for build first."
                            : !planSavedSuccessfully && !trialEvalExportAllowed
                              ? "Save the plan successfully before exporting."
                              : trialEvalExportAllowed && !planSavedSuccessfully
                                ? "Trial evaluation export — save is optional for your first export."
                                : undefined
                      }
                      onClick={() =>
                        authUser?.canExportRunbook ? void exportPlan() : openUpgradePrompt()
                      }
                    >
                      {exportBusy ? "Exporting…" : authUser?.canExportRunbook ? "Export plan" : "Export plan (locked)"}
                    </button>
                  </div>
                </div>
                <p className="muted export-action-flow__hint">
                  Complete all three steps in order: approve, save without errors, then export. Planning syncs with strict validation when
                  you export (markdown + PDF).
                  {trialEvalExportAllowed && !planSavedSuccessfully ? (
                    <>
                      {" "}
                      On trial, you may export once after approval to evaluate the PDF without saving first.
                    </>
                  ) : null}
                </p>
              </div>
    ),
    [
      approvedForBuild,
      authUser,
      planCompletionPercent,
      exportBusy,
      planSavedSuccessfully,
      trialEvalExportAllowed,
    ],
  );

  const experienceReviewContent = useMemo(
    () => (
      <>
        <h2 className="text-xl font-bold text-slate-50">Review your room</h2>
        <p className="muted mb-4 text-sm">
          Story, puzzles, staging props, and flow — then approve and export when you are ready.
        </p>
        <div className="output-review-body">{outputReviewBodyElement}</div>
        <BuilderLegalDisclaimer compact />
        <section id="builder-export-anchor" className="output-review-glass-surface mt-6 rounded-lg p-4">
          <h3 className="output-review-section-title">Export &amp; save</h3>
          {outputExportActionsElement}
        </section>
        {generationTelemetry ? (
          <Accordion type="single" collapsible className="mt-6">
            <AccordionItem value="generation-telemetry">
              <AccordionTrigger className="text-sm text-slate-300">Generation details</AccordionTrigger>
              <AccordionContent>
                <CouncilTelemetryPanel telemetry={generationTelemetry} compact serverOpenAiConfigured={serverOpenAiConfigured} browserAiReady={browserAiReady} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ) : null}
      </>
    ),
    [
      outputReviewBodyElement,
      outputExportActionsElement,
      generationTelemetry,
      serverOpenAiConfigured,
      browserAiReady,
    ],
  );

  if (!authBootstrapReady && initialAuth.authToken.trim()) {
    return (
      <>
        <AppAtmosphere />
        <main className="page-shell page-shell--layered">
          <section className="auth-unified-panel auth-clear-glass">
            <p className="muted auth-hero-para">Checking sign-in…</p>
          </section>
        </main>
      </>
    );
  }

  if (!authUser) {
    return (
      <>
        <AppAtmosphere />
        <main className="page-shell page-shell--layered">
        {error ? <p className="error-banner auth-page-error">{error}</p> : null}
        <section id="auth-unified-panel" className="hero auth-hero auth-hero--planning auth-unified-panel auth-clear-glass">
          <div className="auth-unified-grid">
            <aside className="auth-unified-form" aria-labelledby="auth-panel-title">
          {authVerificationPending ? (
            <div className="auth-verify-pending">
              <div className="auth-verify-icon" aria-hidden="true">✉</div>
              <h2 className="auth-panel-title">Check your email</h2>
              <p className="auth-verify-body">
                We sent a verification link to{" "}
                <strong className="auth-verify-email">{authVerificationPending}</strong>.
                Click the link in the email to activate your account.
              </p>
              {authVerificationDevUrl ? (
                <div className="auth-verify-devurl">
                  <p className="auth-verify-devlabel">Dev mode — no email service configured. Use this link:</p>
                  <a href={authVerificationDevUrl} className="auth-verify-devlink" target="_blank" rel="noreferrer">
                    Verify my email &rarr;
                  </a>
                </div>
              ) : null}
              <div className="auth-verify-actions">
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => void handleResendVerification()}
                  disabled={authVerificationResending}
                  aria-busy={authVerificationResending}
                >
                  {authVerificationResending ? "Sending…" : "Resend verification email"}
                </button>
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => {
                    setAuthVerificationPending("");
                    setAuthVerificationDevUrl("");
                    setError("");
                  }}
                >
                  Back to sign in
                </button>
              </div>
            </div>
          ) : (
          <>
          <header className="auth-panel-head">
            <h2 id="auth-panel-title" className="auth-panel-title">{authMode === "signup" ? "Create account" : "Log in"}</h2>
            <p className="muted auth-mode-switch">
              {authMode === "signup" ? (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => {
                      setTermsAccepted(false);
                      setAuthPasswordConfirm("");
                      setAuthMode("login");
                    }}
                  >
                    Log in
                  </button>
                </>
              ) : (
                <>
                  New here?{" "}
                  <button type="button" className="link-btn" onClick={() => { setAuthPasswordConfirm(""); setAuthMode("signup"); }}>
                    Create account
                  </button>
                </>
              )}
            </p>
          </header>
          <div className="form-grid">
            {authMode === "signup" ? (
              <label className="field-row">
                Name
                <input type="text" value={authName} onChange={(event) => setAuthName(event.target.value)} />
              </label>
            ) : null}
            <label className="field-row">
              Email or username
              <input
                type="text"
                autoComplete="username"
                value={authEmail}
                onChange={(event) => setAuthEmail(event.target.value)}
              />
            </label>
            <label className="field-row">
              Password
              <input type="password" autoComplete={authMode === "signup" ? "new-password" : "current-password"} value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} />
            </label>
            {authMode === "signup" && authPassword.length > 0 ? (
              <ul className="pw-requirements" aria-label="Password requirements">
                <li className={authPassword.length >= 8 ? "pw-req--met" : "pw-req--unmet"}>At least 8 characters</li>
                <li className={/[A-Z]/.test(authPassword) ? "pw-req--met" : "pw-req--unmet"}>One uppercase letter</li>
                <li className={/[0-9!@#$%^&*()\-_=+[\]{};':",.<>/?\\|`~]/.test(authPassword) ? "pw-req--met" : "pw-req--unmet"}>One number or symbol</li>
              </ul>
            ) : null}
            {authMode === "signup" ? (
              <label className="field-row">
                Confirm password
                <input
                  type="password"
                  autoComplete="new-password"
                  value={authPasswordConfirm}
                  onChange={(event) => setAuthPasswordConfirm(event.target.value)}
                  className={authPasswordConfirm.length > 0 && authPasswordConfirm !== authPassword ? "input--error" : ""}
                />
                {authPasswordConfirm.length > 0 && authPasswordConfirm !== authPassword ? (
                  <span className="field-error">Passwords do not match</span>
                ) : null}
              </label>
            ) : null}
            {authMode === "signup" ? (
              <div className="auth-terms-block">
                <label className="field-row field-row--checkbox auth-terms-checkbox">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                  />
                  <span>
                    I agree to the{" "}
                    <a href="/terms-of-service.html" target="_blank" rel="noreferrer">
                      Terms of Service
                    </a>{" "}
                    (including the intellectual property section).
                  </span>
                </label>
                <p className="muted auth-terms-note">
                  The Terms describe how you may use generated plans, how we protect our software and curated content, and how your
                  submissions are licensed so we can run the service.
                </p>
              </div>
            ) : null}
            <button
              type="button"
              className="primary-btn"
              disabled={authSubmitting || !!socialAuthProvider}
              aria-busy={authSubmitting}
              onClick={authMode === "signup" ? handleSignup : handleLogin}
            >
              {authSubmitting ? "Please wait…" : authMode === "signup" ? "Create Account" : "Log In"}
            </button>
          </div>
          <p className="muted">
            Or continue with social sign-in:
          </p>
          {persistenceWarning ? (
            <p className="service-health-banner" role="status">
              {persistenceWarning}
            </p>
          ) : null}
          <nav className="social-auth-grid" aria-label="Social sign-in">
            <button
              type="button"
              className="social-btn social-google"
              disabled={!!socialAuthProvider || authSubmitting || Boolean(socialLoginBlocked)}
              aria-busy={socialAuthProvider === "google"}
              title={socialLoginBlocked ?? undefined}
              onClick={() => handleSocialAuth("google")}
            >
              {socialAuthProvider === "google" ? "Redirecting…" : "Google"}
            </button>
            <button
              type="button"
              className="social-btn social-facebook"
              disabled={!!socialAuthProvider || authSubmitting || Boolean(socialLoginBlocked)}
              aria-busy={socialAuthProvider === "facebook"}
              title={socialLoginBlocked ?? undefined}
              onClick={() => handleSocialAuth("facebook")}
            >
              {socialAuthProvider === "facebook" ? "Redirecting…" : "Facebook"}
            </button>
            <button
              type="button"
              className="social-btn social-github"
              disabled={!!socialAuthProvider || authSubmitting || Boolean(socialLoginBlocked)}
              aria-busy={socialAuthProvider === "github"}
              title={socialLoginBlocked ?? undefined}
              onClick={() => handleSocialAuth("github")}
            >
              {socialAuthProvider === "github" ? "Redirecting…" : "GitHub"}
            </button>
          </nav>
          </>
          )}
            </aside>
            <div className="auth-unified-copy">
              <p className="hero-chip hero-chip--planning-studio">Escape Planning Studio</p>
              <h1 className="brand-title">{BRAND_NAME}</h1>
              <p className="auth-hero-para">{BRAND_INTRO}</p>
              <p className="auth-hero-para muted">
                Sign up for a <strong>free trial</strong>: three curated themes, narrative story-beat alignment, and a host runbook
                preview—no maker electronics pack until you upgrade.
              </p>
              <ul className="auth-bullets auth-hero-para">
                <li>Quick cinematic room generation from your space and guest count</li>
                <li>Narrative story beats aligned to every puzzle in your run</li>
                <li>Easy host run sheets you can print for game night</li>
                <li>Paid plans unlock saves, full theme library, and maker wiring packs</li>
              </ul>
              <p className="muted promo-footnote auth-hero-para">
                Plans and checkout live inside your account after sign-in—start designing first, upgrade when you need saves or Arduino detail.
              </p>
            </div>
          </div>
        </section>
        <GlobalFooter buildStamp={APP_BUILD_STAMP} />
      </main>
      </>
    );
  }

  return (
    <>
      <AppAtmosphere />
      {/* Main application layout and interactive sections. */}
      <main
        ref={builderShellRef}
        className={`page-shell page-shell--layered page-shell--cols${
          appView === "builder" && persistentCanvasSteps ? " page-shell--room-cad-setup" : ""
        }`}
      >
      <div className="app-main-col">
      {authUser.billingTier === "trial" && appView === "builder" && !persistentCanvasSteps ? (
        <div className="slot-utilization-warning trial-active-banner" role="status">
          <strong>Free trial:</strong> the same three curated themes load every time. You get one host runbook export (no maker
          electronics pack). Saving requires a paid plan—see <strong>Account → Plans &amp; billing</strong>.
        </div>
      ) : null}
      {authUser.trialUsed && !authUser.canSaveRooms && appView === "builder" && !persistentCanvasSteps ? (
        <div className="slot-utilization-warning" role="status">
          Your trial is complete. Open <strong>Account</strong> to purchase a room pack and start your next room.
        </div>
      ) : null}
      {authUser.subscriptionInactive && appView === "builder" && !persistentCanvasSteps ? (
        <div className="subscription-inactive-banner" role="alert">
          Subscription inactive. Reactivate your operator tier to resume live facility operations. Saved rooms remain in
          read-only mode until billing is restored.
        </div>
      ) : null}
      {showSlotUtilizationWarning && appView === "builder" && !persistentCanvasSteps ? (
        <div className="slot-utilization-warning" role="status">
          You are near your saved-room limit ({Math.round((authUser.savedRoomCount / Math.max(1, authUser.roomAllowance)) * 100)}%
          used). Open <strong>Account</strong> to add slots or free space.
        </div>
      ) : null}
      {targetInterface === "commercial_venue" && sessionId && puzzles.length > 0 && appView === "builder" && !persistentCanvasSteps ? (
        <div className="slot-utilization-warning venue-live-banner" role="status">
          <strong>Retail venue mode:</strong> after export, open the{" "}
          {authUser.hasGmConsole && !authUser.subscriptionInactive ? (
            <Link to={`/gm/${sessionId}`} className="venue-live-banner__link">
              Gamemaster Live Console
            </Link>
          ) : (
            <span className="venue-live-banner__link venue-live-banner__link--disabled">Gamemaster Live Console (frozen)</span>
          )}{" "}
          and pair the{" "}
          {authUser.subscriptionInactive ? (
            <span className="venue-live-banner__link venue-live-banner__link--disabled">player display (frozen)</span>
          ) : (
            <Link to={`/room/${sessionId}/player-display`} className="venue-live-banner__link">
              player display
            </Link>
          )}
          . Room packs and checkout live under <strong>Account &amp; pricing</strong>.
        </div>
      ) : null}
      <PlanningSnapshotSheet
        open={snapshotOpen}
        onOpenChange={setSnapshotOpen}
        playersConcurrent={playersConcurrent}
        participantsTotal={participantsTotal}
        sessionDurationMinutes={sessionDurationMinutes}
        environmentType={environmentType}
        eventType={eventType}
        availableItems={availableItems}
        roomDifficulty={roomDifficulty}
        themeMustMatchEnvironment={themeMustMatchEnvironment}
        venueBuildType={venueBuildType}
        youthAddOnEnabled={youthAddOnEnabled}
        themeLabel={
          themePath === "custom"
            ? customThemeName.trim() || "Custom theme"
            : selectedTheme?.name ?? (selectedThemeId ? "Theme selected" : "Not selected")
        }
        mainPuzzleCount={mainTrackPuzzles.length}
        plannerTarget={plannerMainPuzzleTarget}
        sessionSyncing={planningSyncing}
        setPlayersConcurrent={setPlayersConcurrent}
        setParticipantsTotal={setParticipantsTotal}
        setSessionDurationMinutes={setSessionDurationMinutes}
        setEnvironmentType={setEnvironmentType}
        setEventType={setEventType}
        setAvailableItems={setAvailableItems}
        setThemeMustMatchEnvironment={setThemeMustMatchEnvironment}
        setVenueBuildType={setVenueBuildType}
        setRoomDifficulty={setRoomDifficulty}
        setYouthAddOnEnabled={setYouthAddOnEnabled}
        setYouthAddOnGatesAdultFlow={setYouthAddOnGatesAdultFlow}
        setYouthAddOnAgeNote={setYouthAddOnAgeNote}
        youthAddOnGatesAdultFlow={youthAddOnGatesAdultFlow}
        youthAddOnAgeNote={youthAddOnAgeNote}
        validationFlags={validationFlags}
        clearValidation={(key) => setValidationFlags((current) => ({ ...current, [key]: false }))}
        commercialVenueContext={commercialVenueContext}
        eventSuggestions={dedupeStringsPreserveOrder([...EVENT_CONTEXT_PRESETS, ...(inputHistory.eventType ?? [])])}
        itemHistory={inputHistory.availableItems ?? []}
        propPresetLabels={propPresetLabels}
      />
      {appView === "account" ? (
        <div className="account-view-wrap">
          <nav className="account-section-tabs" aria-label="Account sections">
            <button
              type="button"
              className={accountSection === "overview" ? "primary-btn" : "secondary-btn"}
              onClick={() => setAccountSection("overview")}
            >
              Overview
            </button>
            <button
              type="button"
              className={accountSection === "profile" ? "primary-btn" : "secondary-btn"}
              onClick={() => {
                setProfileName(authUser.name);
                setProfileEmail(authUser.email);
                setProfileCurrentPassword("");
                setProfileNewPassword("");
                setProfileNewPasswordConfirm("");
                setProfileSuccess("");
                setError("");
                setAccountSection("profile");
              }}
            >
              Profile
            </button>
            <button
              type="button"
              className={accountSection === "plans" ? "primary-btn" : "secondary-btn"}
              onClick={() => setAccountSection("plans")}
            >
              Plans &amp; billing
            </button>
          </nav>
          {accountSection === "profile" ? (
            <section className="card mission-panel profile-edit-section">
              <h2 className="subscription-title">Profile</h2>
              {profileSuccess ? <p className="profile-success-msg">{profileSuccess}</p> : null}
              <div className="profile-edit-grid">
                <label className="field-row">
                  Name
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => { setProfileName(e.target.value); setProfileSuccess(""); }}
                  />
                </label>
                <label className={`field-row${authUser.provider !== "local" ? " field-row--disabled" : ""}`}>
                  Email
                  <input
                    type="email"
                    value={profileEmail}
                    disabled={authUser.provider !== "local"}
                    onChange={(e) => { setProfileEmail(e.target.value); setProfileSuccess(""); }}
                  />
                  {authUser.provider !== "local" ? (
                    <span className="field-hint">Email is managed by {AUTH_PROVIDER_LABELS[authUser.provider]}.</span>
                  ) : null}
                </label>
                {authUser.provider === "local" ? (
                  <>
                    <hr className="profile-divider" />
                    <p className="profile-section-label">Change password <span className="muted">(leave blank to keep current)</span></p>
                    <label className="field-row">
                      New password
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={profileNewPassword}
                        onChange={(e) => { setProfileNewPassword(e.target.value); setProfileSuccess(""); }}
                      />
                    </label>
                    {profileNewPassword.length > 0 ? (
                      <>
                        <label className="field-row">
                          Confirm new password
                          <input
                            type="password"
                            autoComplete="new-password"
                            value={profileNewPasswordConfirm}
                            onChange={(e) => { setProfileNewPasswordConfirm(e.target.value); setProfileSuccess(""); }}
                            className={profileNewPasswordConfirm.length > 0 && profileNewPasswordConfirm !== profileNewPassword ? "input--error" : ""}
                          />
                          {profileNewPasswordConfirm.length > 0 && profileNewPasswordConfirm !== profileNewPassword ? (
                            <span className="field-error">Passwords do not match</span>
                          ) : null}
                        </label>
                        <ul className="pw-requirements" aria-label="Password requirements">
                          <li className={profileNewPassword.length >= 8 ? "pw-req--met" : "pw-req--unmet"}>At least 8 characters</li>
                          <li className={/[A-Z]/.test(profileNewPassword) ? "pw-req--met" : "pw-req--unmet"}>One uppercase letter</li>
                          <li className={/[0-9!@#$%^&*()\-_=+[\]{};':",.<>/?\\|`~]/.test(profileNewPassword) ? "pw-req--met" : "pw-req--unmet"}>One number or symbol</li>
                        </ul>
                      </>
                    ) : null}
                    <hr className="profile-divider" />
                    <label className="field-row">
                      Current password <span className="muted">(required to save email or password changes)</span>
                      <input
                        type="password"
                        autoComplete="current-password"
                        value={profileCurrentPassword}
                        onChange={(e) => { setProfileCurrentPassword(e.target.value); setProfileSuccess(""); }}
                      />
                    </label>
                  </>
                ) : null}
                <button
                  type="button"
                  className="primary-btn profile-save-btn"
                  onClick={() => void handleProfileUpdate()}
                  disabled={profileSaving}
                  aria-busy={profileSaving}
                >
                  {profileSaving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </section>
          ) : null}
          {accountSection === "plans" && !authUser.isAdmin && billingPlans.length > 0 ? (
            <Suspense fallback={<section className="card mission-panel"><p className="muted">Loading plans & billing…</p></section>}>
            <PlansAndBillingSection
              authUser={authUser}
              billingPlans={billingPlans}
              selectedBillingPlanId={selectedBillingPlanId ?? ""}
              selectedBillingPlan={selectedBillingPlan}
              onSelectPlan={setSelectedBillingPlanId}
              squarePaymentsReady={squarePaymentsReady}
              squareSetupHint={squareSetupHint}
              authToken={authToken}
              squareWebConfig={squareWebConfig}
              billingNotice={billingNotice}
              onBillingNotice={(message) => {
                setBillingNotice(message);
                setError("");
              }}
              onBillingError={(message) => setError(message)}
              checkoutPlanId={checkoutPlanId}
              onPurchasePlan={(planId) => void handlePurchasePlan(planId)}
              escapePlanRooms={escapePlanRooms}
              activeEscapePlanRoomId={activeEscapePlanRoomId}
              onEscapePlanRoomsChange={setEscapePlanRooms}
              onActiveEscapePlanRoomChange={setActiveEscapePlanRoomId}
              operatorPlanQuote={operatorPlanQuote}
            />
            </Suspense>
          ) : null}
          {accountSection === "overview" ? (
          <>
          <section className="card mission-panel">
            <h2 className="subscription-title">Account</h2>
            <p className="muted">
              Signed in as {authUser.name} ({authUser.email}) via {AUTH_PROVIDER_LABELS[authUser.provider]}.
            </p>
            <p className="muted">
              Review your room-slot subscription, consumable full-export credits, team pool bonus (if configured), billing
              audit trail, and saved plans.
            </p>
            <p className="muted account-session-note">
              For your security, you are signed out automatically after 30 minutes without keyboard, mouse, scroll, or touch
              activity. About 90 seconds before that, you can save a draft to your account and keep working, or sign out manually. If you
              reach the hard timeout, the app attempts to save your plan as a draft and reopen it automatically the next time you sign in
              on this browser.
            </p>
            <div className="account-session-actions">
              <button type="button" className="secondary-btn" onClick={signOut}>
                Sign out
              </button>
            </div>
          </section>
          {showSlotUtilizationWarning ? (
            <div className="slot-utilization-warning" role="status">
              You are using about{" "}
              <strong>{Math.round((authUser.savedRoomCount / Math.max(1, authUser.roomAllowance)) * 100)}%</strong> of your
              saved-room capacity. Consider adding slots or deleting drafts you no longer need.
            </div>
          ) : null}
          <p className="muted account-plans-hint">
            Room packs and checkout are on the <button type="button" className="link-btn" onClick={() => setAccountSection("plans")}>Plans &amp; billing</button> tab.
          </p>
          {authUser.isAdmin ? (
            <section className="card mission-panel" aria-label="Admin tier">
              <h2 className="subscription-title">Admin tier</h2>
              <p className="muted">
                Unlimited saved rooms, full catalog, custom themes, and full electronic exports without consumable credits.
                Device-limited first-free-save rules do not apply. Default admin list includes{" "}
                <strong>bradmulders@gmail.com</strong>; merge more via <code>ADMIN_EMAILS</code> on the server.
              </p>
            </section>
          ) : null}
          <section className="card subscription-card" aria-label="Room plan billing">
            <div className={authUser.isAdmin ? "subscription-card-grid" : "subscription-card-grid subscription-card-grid--single"}>
              <div>
                <h2 className="subscription-title">Plan capacity</h2>
                <p className="muted">
                  You have <strong>{authUser.savedRoomCount}</strong> saved room{authUser.savedRoomCount === 1 ? "" : "s"} and{" "}
                  <strong>{authUser.roomsRemaining}</strong> slot{authUser.roomsRemaining === 1 ? "" : "s"} remaining out of{" "}
                  <strong>{authUser.roomAllowance}</strong> total (your plan plus any org pool bonus).
                </p>
                {authUser.orgPoolBonusSlots > 0 ? (
                  <p className="muted">
                    Team / org pool bonus on your account: <strong>+{authUser.orgPoolBonusSlots}</strong> save slots.
                  </p>
                ) : null}
                {authUser.hasFullCatalog ? (
                  <p className="muted">
                    Full-detail exports for <strong>additional</strong> saved rooms (electronics section):{" "}
                    <strong>{authUser.exportCreditsRemaining}</strong> consumable credit
                    {authUser.exportCreditsRemaining === 1 ? "" : "s"} remaining. Each full export uses one credit; at zero,
                    those exports omit wiring diagrams and code until you top up.
                  </p>
                ) : (
                  <p className="muted">
                    Trial: one host runbook export without maker electronics. Paid plans add save slots, catalog access, and
                    export credits. <strong>Home Host Enthusiast</strong> unlocks wiring diagrams and Arduino packs.
                  </p>
                )}
                <p className="muted">
                  Status:{" "}
                  <strong>
                    {authUser.billingTier === "pack"
                      ? "Paid plan — catalog, saves, and exports per your tier"
                      : authUser.isAdmin
                        ? "Admin — unlimited catalog and exports"
                        : authUser.trialUsed
                          ? "Trial used — choose a plan under Plans & billing"
                          : "Trial — 3 curated themes, one host export (no maker pack), no saved rooms"}
                  </strong>
                </p>
                <p className="muted anti-abuse-note">
                  Your free trial is tied to this account. After your one export, upgrade to a home pass or operator subscription to
                  design, save, and export more rooms.
                </p>
              </div>
              {authUser.isAdmin ? (
                <div className="subscription-activate">
                  <h3 className="subscription-tools-heading">Billing tools (admin only)</h3>
                  <p className="muted subscription-tools-lead">
                    Test top-up and org-pool edits for development. Production: configure <code>BILLING_WEBHOOK_SECRET</code> and
                    POST <code>/api/billing/webhook</code> with header <code>X-Billing-Webhook-Secret</code> and JSON{" "}
                    <code>{"{ email, roomsToAdd, exportCreditsToAdd, organizationPool? }"}</code>.
                  </p>
                  <label className="field-row">
                    Activation key (dev / invoice fulfillment)
                    <input
                      type="password"
                      autoComplete="off"
                      value={activationKey}
                      onChange={(event) => setActivationKey(event.target.value)}
                      placeholder="Set SUBSCRIPTION_ACTIVATION_KEY on the server"
                    />
                  </label>
                  <label className="field-row">
                    Rooms to add (test)
                    <input
                      type="number"
                      min={1}
                      max={5000}
                      value={roomsToAddInput}
                      onChange={(event) => setRoomsToAddInput(event.target.value)}
                    />
                  </label>
                  <label className="field-row">
                    Export credits to add (full electronic exports; defaults to rooms added if blank)
                    <input
                      type="number"
                      min={0}
                      max={50000}
                      value={exportCreditsToAddInput}
                      onChange={(event) => setExportCreditsToAddInput(event.target.value)}
                    />
                  </label>
                  <label className="field-row">
                    Organization pool (optional JSON)
                    <textarea
                      className="org-pool-json-input"
                      rows={4}
                      value={orgPoolJson}
                      onChange={(event) => setOrgPoolJson(event.target.value)}
                      placeholder='{"id":"studio","name":"Studio","bonusSlots":25,"memberEmails":["you@example.com"]}'
                    />
                  </label>
                  <button type="button" className="primary-btn" onClick={() => void handleActivateSubscription()}>
                    Apply activation (slots + credits + optional pool)
                  </button>
                  {billingNotice ? <p className="success-inline">{billingNotice}</p> : null}
                </div>
              ) : null}
            </div>
          </section>
          <section className="card mission-panel" aria-label="Saved room plans">
            <h2>Saved room plans</h2>
            {savedPlansManageList}
          </section>
          <section className="card mission-panel" aria-label="Billing audit log">
            <h2>Billing audit</h2>
            <p className="muted">
              {authUser.isAdmin ? "Recent entries across all accounts (latest first, capped)." : "Entries for your account only."}
            </p>
            {auditEntries.length === 0 ? (
              <p className="muted">No audit entries yet.</p>
            ) : (
              <ul className="list-compact audit-log-list">
                {auditEntries.map((row, i) => (
                  <li key={`${row.ts ?? i}-${row.action ?? ""}`}>
                    <strong>{row.action ?? "event"}</strong> <span className="muted">{row.ts}</span>
                    {row.detail !== undefined ? (
                      <pre className="audit-detail-snippet">{JSON.stringify(row.detail, null, 2)}</pre>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <div className="button-row">
            <button type="button" className="primary-btn" onClick={() => setAppView("builder")}>
              Open room builder
            </button>
          </div>
          </>
          ) : null}
        </div>
      ) : null}
      {appView === "builder" ? (
      <>
      <PlanningProvider initialOverrides={planningProviderInitial}>
      <PlanningBridge outRef={planningRef} />
      <PlanningAppHydrate hydrateKey={sessionId.trim() || "draft"} payload={planningHydratePayload} />
      <PlanningStateSync setters={planningStateSetters} />
      <BuilderErrorBoundary>
      <div className={`builder-workspace${persistentCanvasSteps ? " builder-workspace--persistent" : ""}`}>
        <section className="stage-main">
          <section
            className={
              persistentCanvasSteps
                ? "builder-workspace-shell builder-workspace-shell--persistent"
                : "card mission-panel flow-shell builder-workspace-shell"
            }
          >
            {!persistentCanvasSteps ? (
            <div
              id="flow-shell-error-anchor"
              ref={flowMapBarRef}
              className={`flow-shell-map-bar workspace-stepper${youthAddOnEnabled && juniorForkSegmentIndex !== null ? " flow-shell-map-bar--fork" : ""}`}
              aria-live="polite"
            >
              <MissionFlowMap
                stepLabels={missionStepLabels}
                activeIndex={wizardIndex}
                youthAddOnEnabled={youthAddOnEnabled}
                forkSegmentIndex={juniorForkSegmentIndex}
                onStepClick={(index) => void navigateWizardToIndex(index)}
                canNavigateToStep={canNavigateToWizardIndex}
                navigationDisabled={wizardNavigationBusy}
              />
            </div>
            ) : null}
            <div className={`flow-shell-scroll-region flow-shell-scroll-region--body${persistentCanvasSteps ? " flow-shell-scroll-region--persistent" : ""}`}>
            {!persistentCanvasSteps ? (
            <div className="flow-controls flow-controls--step-intro">
              <FlowStepIntro
                  stepIndex={wizardIndex}
                  stepTotal={wizardSteps.length}
                  title={wizardLabel}
                  helper={flowMutedHelper}
                  actions={
                    themeHeaderActions ?? (showBackInFlowHeader && canGoWizardBack ? (
                      <button type="button" className="secondary-btn flow-back-btn" onClick={goWizardBack}>
                        ← Back
                      </button>
                    ) : undefined)
                  }
                />
            </div>
            ) : null}
            {persistentCanvasSteps && location.pathname.startsWith("/builder") ? (
                    <BuilderPersistentWorkspace
                      flowWizardStep={flowWizardStep}
                      roomSkeleton={lastRoomSkeleton}
                      generationTelemetry={generationTelemetry}
                      puzzlesGenerating={puzzlesGenerating}
                      puzzles={puzzleInspectorSlices}
                      eventSuggestions={dedupeStringsPreserveOrder([...EVENT_CONTEXT_PRESETS, ...(inputHistory.eventType ?? [])])}
                      canGenerateRoom={canGenerateRoom}
                      generateRoomDisabledReason={generateRoomDisabledReason}
                      canReview={canReviewWorkspace}
                      simpleThemeView={simpleThemeView}
                      setSimpleThemeView={setSimpleThemeView}
                      onGenerateRoom={() => void handleGenerateRoom()}
                      onGenerateThemes={handleGenerateNewThemes}
                      onOpenReview={() => void proceedToOutputReview()}
                      onReplacePuzzle={(id) => void replacePuzzle(id)}
                      onTryGenerateRoom={tryGenerateRoom}
                      composeThemeContent={experienceComposeTheme}
                      curateContent={experienceCurateContent}
                      reviewContent={experienceReviewContent}
                      workspaceSessionExpired={workspaceSessionExpired.open}
                      workspaceSessionExpiredMessage={workspaceSessionExpired.message}
                      onWorkspaceReauth={() => {
                        const msg = workspaceSessionExpired.message;
                        setWorkspaceSessionExpired({ open: false, message: "" });
                        persistAuth("", null);
                        setError(msg);
                        setAppView("account");
                      }}
                      navMenu={{
                        brandName: BRAND_NAME,
                        authName: authUser.name,
                        billingTierLabel: formatBillingTierLabel(authUser.billingTier),
                        planStatusDetail: `${authUser.roomsRemaining} of ${authUser.roomAllowance} save slots · ${authUser.exportCreditsRemaining} export credits`,
                        appView,
                        showAdminTab: authUser.role === "admin" || authUser.isAdmin,
                        onAppViewChange: (view) => {
                          if (view === "admin") {
                            navigate("/admin/dashboard");
                            return;
                          }
                          setAppView(view);
                        },
                        onSignOut: signOut,
                        onOpenSnapshot: () => setSnapshotOpen(true),
                        themeName: selectedTheme?.name,
                        puzzleCount: puzzles.length,
                      }}
                    />
            ) : null}
          {flowWizardStep === "saved" && hasSavedPlans && showPlanPicker ? (
        <section className="card mission-panel">
          <h2>Welcome back</h2>
          <p className="muted">Load a saved plan to continue where you left off, or start a new plan.</p>
          {savedPlans.length === 0 ? <p className="muted">No saved plans found for this account yet.</p> : null}
          {savedPlans.length > 0 ? (
            <ul className="list-compact">
              {savedPlans.map((plan) => (
                <li key={`picker-${plan.planId}`}>
                  <strong>{plan.name}</strong> - {plan.themeName} ({plan.puzzleCount} puzzles){" "}
                  {!plan.approvedForBuild ? <span className="muted">Draft</span> : null}{" "}
                  {plan.approvedForBuild ? <span className="status-pass">Approved</span> : <span className="muted">Not approved</span>}{" "}
                  <button type="button" className="secondary-btn" onClick={() => loadSavedPlan(plan.planId)}>
                    Load This Plan
                  </button>
                  <button type="button" className="secondary-btn" onClick={() => deleteSavedPlan(plan.planId)}>
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="button-row">
            <button
              type="button"
              onClick={() => {
                setShowPlanPicker(false);
                setActivePanel("plan");
                setWizardStep("setup");
                setFurthestWizardIndex(0);
              }}
            >
              Start New Plan
            </button>
          </div>
        </section>
          ) : null}

            </div>
          </section>
        </section>
        {flowWizardStep === "setup" ? (
          <button type="button" className="mobile-continue-fab" onClick={() => void proceedFromSetupToThemes()}>
            Continue → Themes
          </button>
        ) : flowWizardStep === "themes" && (selectedThemeId || (themePath === "custom" && customThemeName.trim())) ? (
          <button
            type="button"
            className="mobile-continue-fab"
            onClick={() => void (selectedThemeId ? proceedFromThemesToPuzzles() : addCustomTheme())}
          >
            {selectedThemeId ? "Continue → Build puzzles" : "Save theme → Build puzzles"}
          </button>
        ) : flowWizardStep === "themes-puzzles" ? (
          <button
            type="button"
            className="mobile-continue-fab"
            disabled={!canNavigateToOutputReview || outputReviewBusy || puzzlesGenerating}
            aria-busy={outputReviewBusy || puzzlesGenerating}
            data-testid="continue-output-review-mobile"
            title={
              outputReviewBusy
                ? "Working…"
                : puzzlesGenerating
                  ? "Wait for puzzle generation to finish."
                  : !canNavigateToOutputReview
                  ? "Choose a theme first (Theme step)."
                  : puzzles.length === 0
                    ? "Syncs planning, generates a puzzle set if the list is empty, then opens Output: Review."
                    : "Opens Output: Review with your current puzzle list."
            }
            onClick={() => void proceedToOutputReview()}
          >
            {outputReviewBusy ? "Opening…" : "Continue → Output review"}
          </button>
        ) : null}
        {inspirationOpen ? (
          <Suspense fallback={null}>
            <InspirationDrawerPanel
              open={inspirationOpen}
              onClose={() => setInspirationOpen(false)}
              plannerMainPuzzleTarget={plannerMainPuzzleTarget}
              themeMustMatchEnvironment={themeMustMatchEnvironment}
              environmentType={environmentType}
              availableItems={availableItems}
              eventType={eventType}
              themeName={selectedTheme?.name ?? customThemeName.trim()}
              themeTldr={selectedTheme ? resolveThemeTldr(selectedTheme) : ""}
              themeDescriptionExcerpt={collapseWs(
                selectedTheme?.description ?? customThemeDescription ?? "",
              ).slice(0, 900)}
              commercialVenueContext={commercialVenueContext}
              coachBrowserAiReady={coachBrowserAiReady}
            />
          </Suspense>
        ) : null}
      </div>
      {upgradePromptOpen && authUser ? (
        <Suspense fallback={null}>
          <UpgradePromptDialog
            message={upgradePromptMessage}
            billingPlans={billingPlans}
            selectedBillingPlanId={selectedBillingPlanId}
            squarePaymentsReady={squarePaymentsReady}
            checkoutPlanId={checkoutPlanId}
            scalableOperatorPlanId={SCALABLE_OPERATOR_PLAN_ID}
            operatorPlanQuoteTotalCents={
              selectedBillingPlan?.id === SCALABLE_OPERATOR_PLAN_ID ? operatorPlanQuote?.totalCents : undefined
            }
            onSelectPlan={setSelectedBillingPlanId}
            onPurchasePlan={(planId) => void handlePurchasePlan(planId)}
            onViewAllPlans={() => {
              setUpgradePromptOpen(false);
              setAccountSection("plans");
              setAppView("account");
            }}
            onClose={() => setUpgradePromptOpen(false)}
          />
        </Suspense>
      ) : null}
      {workspaceSessionExpired.open && authUser && appView === "builder" && !persistentCanvasSteps ? (
        <WorkspaceSessionExpiredOverlay
          open
          message={workspaceSessionExpired.message}
          userName={authUser.name}
          onSignIn={() => {
            const msg = workspaceSessionExpired.message;
            setWorkspaceSessionExpired({ open: false, message: "" });
            persistAuth("", null);
            setError(msg);
          }}
        />
      ) : null}
      {idlePromptOpen && authUser ? (
        <div className="idle-session-overlay" role="dialog" aria-modal="true" aria-labelledby="idle-session-title">
          <div className="idle-session-dialog glass-panel">
            <h2 id="idle-session-title">Still there?</h2>
            <p className="muted">
              {authUser.canSaveRooms ? (
                <>
                  You have been inactive for a while. Save a draft so you can open it from{" "}
                  <strong>Account → Saved room plans</strong> on your next visit, or stay signed in to keep working. If you do not respond
                  in time, we will try to save a draft automatically and reopen it after your next sign-in.
                </>
              ) : (
                <>
                  You have been inactive for a while. Trial accounts cannot save drafts—stay signed in to keep working, or sign out.
                  Purchase a room pack under <strong>Account</strong> to save plans.
                </>
              )}
            </p>
            <div className="idle-session-actions">
              {authUser.canSaveRooms ? (
                <button
                  type="button"
                  className="primary-btn"
                  disabled={idleDraftBusy}
                  onClick={async () => {
                    setIdleDraftBusy(true);
                    try {
                      const planId = await saveDraftPlan();
                      if (planId) {
                        idleLastActivityRef.current = Date.now();
                        setIdlePromptOpen(false);
                      }
                    } finally {
                      setIdleDraftBusy(false);
                    }
                  }}
                >
                  {idleDraftBusy ? "Saving draft…" : "Save draft & keep session"}
                </button>
              ) : (
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => {
                    setIdlePromptOpen(false);
                    setAppView("account");
                  }}
                >
                  View room packs
                </button>
              )}
              <button
                type="button"
                className={authUser.canSaveRooms ? "secondary-btn" : "primary-btn"}
                onClick={() => {
                  idleLastActivityRef.current = Date.now();
                  setIdlePromptOpen(false);
                }}
              >
                I&apos;m still working
              </button>
              <button type="button" className="secondary-btn" onClick={() => signOut()}>
                Sign out
              </button>
            </div>
          </div>
        </div>
      ) : null}
      </BuilderErrorBoundary>
      </PlanningProvider>
      </>
      ) : null}
      {sessionId && postExportOpen ? (
        <Suspense fallback={null}>
          <HomePostExportModal
            open={postExportOpen}
            onClose={() => setPostExportOpen(false)}
            sessionId={sessionId}
            operatingMode={liveOperatingMode}
            hasGmConsole={liveHasGmConsole}
            planName={selectedTheme?.name ?? ""}
            onDownloadRunbook={() => downloadExportFile("md")}
          />
        </Suspense>
      ) : null}
      <GlobalFooter buildStamp={APP_BUILD_STAMP} />
      </div>
      {!(appView === "builder" && persistentCanvasSteps) ? (
      <aside className="app-sidebar-col">
        <TopNavBar
          ref={topNavRef}
          brandName={BRAND_NAME}
          authName={authUser.name}
          authEmail={authUser.email}
          authProviderLabel={AUTH_PROVIDER_LABELS[authUser.provider]}
          billingTierLabel={formatBillingTierLabel(authUser.billingTier)}
          planStatusDetail={`${authUser.roomsRemaining} of ${authUser.roomAllowance} save slots · ${authUser.exportCreditsRemaining} export credits`}
          appView={appView}
          showAdminTab={authUser.role === "admin" || authUser.isAdmin}
          onAppViewChange={(view) => {
            if (view === "admin") {
              navigate("/admin/dashboard");
              return;
            }
            setAppView(view);
          }}
          onSignOut={signOut}
          onOpenSnapshot={appView === "builder" ? () => setSnapshotOpen(true) : undefined}
          themeName={selectedTheme?.name}
          puzzleCount={puzzles.length}
        />
      </aside>
      ) : null}
      </main>
    </>
  );
}


