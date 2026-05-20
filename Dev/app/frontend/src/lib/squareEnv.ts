/** Match backend `inferSquareEnvironmentFromApplicationId` — Web Payments SDK must align with app id. */
export const inferSquareEnvironmentFromApplicationId = (
  applicationId: string,
): "sandbox" | "production" | null => {
  const id = applicationId.trim().toLowerCase();
  if (!id) return null;
  if (id.startsWith("sandbox-")) return "sandbox";
  if (/^sq0id[bp]-/.test(id)) return "production";
  return null;
};

export const resolveSquareWebEnvironment = (
  applicationId: string,
  serverEnvironment?: string,
): "sandbox" | "production" => {
  const fromAppId = inferSquareEnvironmentFromApplicationId(applicationId);
  if (fromAppId) return fromAppId;
  return serverEnvironment === "production" ? "production" : "sandbox";
};
