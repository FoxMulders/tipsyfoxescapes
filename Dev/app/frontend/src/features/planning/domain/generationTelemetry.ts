/** Client-facing generation telemetry from POST /api/puzzles/generate */
export type GenerationEngine = "ai_generated" | "static_fallback" | "static_catalog";

export type CouncilVerdictClient = {
  personaId: string;
  title: string;
  score: number;
  wow_factor: boolean;
  critical_feedback: string;
};

export type CouncilReportClient = {
  passed: boolean;
  averageScore: number;
  wowCount: number;
  iterations: number;
  revisionNotes?: string;
  verdicts?: CouncilVerdictClient[];
};

export type GenerationDiagnostics = {
  openAiConfigured: boolean;
  fullCatalogAccess: boolean;
  masterAttempted: boolean;
  councilEligible: boolean;
  staticReason?: string;
  opsHint?: string;
};

export type GenerationTelemetry = {
  engine: GenerationEngine;
  masterAttempted: boolean;
  generatedAt: string;
  councilReport?: CouncilReportClient;
  diagnostics?: GenerationDiagnostics;
};

export const generationEngineLabel = (engine: GenerationEngine): string => {
  switch (engine) {
    case "ai_generated":
      return "AI Generated";
    case "static_fallback":
      return "Static Fallback";
    default:
      return "Static Catalog";
  }
};
