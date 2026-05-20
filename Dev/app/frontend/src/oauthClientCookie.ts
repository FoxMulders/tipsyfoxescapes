/** Short-lived marker cookie for OAuth return (auth itself uses bearer tokens in localStorage). */

const OAUTH_RETURN_COOKIE = "erb_oauth_return";

export const setOAuthReturnMarker = (): void => {
  if (typeof document === "undefined") return;
  const secure = typeof window !== "undefined" && window.location.protocol === "https:";
  const secureFlag = secure ? "; Secure" : "";
  document.cookie = `${OAUTH_RETURN_COOKIE}=1; Path=/; Max-Age=900; SameSite=Lax${secureFlag}`;
};

export const clearOAuthReturnMarker = (): void => {
  if (typeof document === "undefined") return;
  const secure = typeof window !== "undefined" && window.location.protocol === "https:";
  const secureFlag = secure ? "; Secure" : "";
  document.cookie = `${OAUTH_RETURN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secureFlag}`;
};

export const hasOAuthReturnMarker = (): boolean => {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((part) => part.trim().startsWith(`${OAUTH_RETURN_COOKIE}=1`));
};
