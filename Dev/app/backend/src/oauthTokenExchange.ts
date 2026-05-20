export type OAuthProvider = "google" | "facebook" | "github";

export type SocialProfile = { email: string; name: string };

const providerLabel = (provider: OAuthProvider): string =>
  provider === "google" ? "Google" : provider === "facebook" ? "Facebook" : "GitHub";

/** Fetch with a hard deadline. Throws with a clear timeout message if the provider stalls. */
const fetchWithTimeout = (url: string, opts: RequestInit = {}, timeoutMs = 10_000): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(timer));
};

const readJsonBody = async <T>(response: Response, label: string): Promise<T> => {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    const snippet = text.replace(/\s+/g, " ").trim().slice(0, 240);
    throw new Error(
      `${label} returned non-JSON (${response.status}${response.statusText ? ` ${response.statusText}` : ""}): ${snippet || "(empty body)"}`,
    );
  }
};

const oauthErrorFromPayload = (payload: Record<string, unknown>, label: string): string | null => {
  const err = String(payload.error ?? "").trim();
  if (!err) return null;
  const desc = String(payload.error_description ?? payload.error_reason ?? "").trim();
  return desc ? `${label}: ${err} — ${desc}` : `${label}: ${err}`;
};

/** Exchange authorization code for profile email/name. Surfaces provider error payloads in thrown messages. */
export const exchangeOAuthCode = async (
  provider: OAuthProvider,
  code: string,
  clientId: string,
  clientSecret: string,
  callbackUri: string,
): Promise<SocialProfile> => {
  const label = providerLabel(provider);

  if (provider === "google") {
    const tokenResponse = await fetchWithTimeout("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUri,
        grant_type: "authorization_code",
      }),
    });
    const tokenData = await readJsonBody<{
      access_token?: string;
      id_token?: string;
      error?: string;
      error_description?: string;
    }>(tokenResponse, label);
    const tokenErr = oauthErrorFromPayload(tokenData, label);
    if (tokenErr) throw new Error(tokenErr);
    if (!tokenResponse.ok) throw new Error(`${label} token exchange failed (${tokenResponse.status}).`);
    const tokenToVerify = tokenData.id_token || tokenData.access_token;
    if (!tokenToVerify) throw new Error(`${label} token payload missing id_token/access_token.`);
    const verifyResponse = await fetchWithTimeout(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenToVerify)}`,
    );
    const verifyData = await readJsonBody<{ email?: string; name?: string; error?: string }>(verifyResponse, label);
    const verifyErr = oauthErrorFromPayload(verifyData, label);
    if (verifyErr) throw new Error(verifyErr);
    if (!verifyResponse.ok) throw new Error(`${label} token verification failed (${verifyResponse.status}).`);
    const email = String(verifyData.email ?? "").trim().toLowerCase();
    const name = String(verifyData.name ?? "Google User").trim();
    return { email, name };
  }

  if (provider === "facebook") {
    const tokenResponse = await fetchWithTimeout(
      `https://graph.facebook.com/v20.0/oauth/access_token?${new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUri,
        code,
      }).toString()}`,
    );
    const tokenData = await readJsonBody<{
      access_token?: string;
      error?: { message?: string; type?: string; code?: number };
    }>(tokenResponse, label);
    if (tokenData.error?.message) {
      throw new Error(`${label}: ${tokenData.error.message}`);
    }
    if (!tokenResponse.ok) throw new Error(`${label} token exchange failed (${tokenResponse.status}).`);
    if (!tokenData.access_token) throw new Error(`${label} token payload missing access_token.`);
    const profileResponse = await fetchWithTimeout(
      `https://graph.facebook.com/me?${new URLSearchParams({
        fields: "id,name,email",
        access_token: tokenData.access_token,
      }).toString()}`,
    );
    const profileData = await readJsonBody<{ email?: string; name?: string; id?: string; error?: { message?: string } }>(
      profileResponse,
      label,
    );
    if (profileData.error?.message) throw new Error(`${label} profile: ${profileData.error.message}`);
    if (!profileResponse.ok) throw new Error(`${label} profile lookup failed (${profileResponse.status}).`);
    const email = String(profileData.email ?? `${profileData.id}@facebook.local`).trim().toLowerCase();
    const name = String(profileData.name ?? "Facebook User").trim();
    return { email, name };
  }

  const tokenResponse = await fetchWithTimeout("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: callbackUri,
    }),
  });
  const tokenData = await readJsonBody<{
    access_token?: string;
    error?: string;
    error_description?: string;
    error_uri?: string;
  }>(tokenResponse, label);
  const tokenErr = oauthErrorFromPayload(tokenData, label);
  if (tokenErr) throw new Error(tokenErr);
  if (!tokenResponse.ok) throw new Error(`${label} token exchange failed (${tokenResponse.status}).`);
  if (!tokenData.access_token) throw new Error(`${label} token payload missing access_token.`);

  const profileResponse = await fetchWithTimeout("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: "application/vnd.github+json" },
  });
  if (!profileResponse.ok) throw new Error(`${label} profile lookup failed (${profileResponse.status}).`);
  const profileData = (await profileResponse.json()) as { email?: string; name?: string; login?: string };
  let email = "";
  if (profileData.email) {
    email = String(profileData.email).trim().toLowerCase();
  } else {
    const emailsResponse = await fetchWithTimeout("https://api.github.com/user/emails", {
      headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: "application/vnd.github+json" },
    });
    if (!emailsResponse.ok) throw new Error(`${label} email lookup failed (${emailsResponse.status}).`);
    const emailsData = (await emailsResponse.json()) as Array<{ email: string; primary?: boolean; verified?: boolean }>;
    const primary = emailsData.find((entry) => entry.primary && entry.verified) ?? emailsData[0];
    email = String(primary?.email ?? "").trim().toLowerCase();
  }
  const name = String(profileData.name ?? profileData.login ?? "GitHub User").trim();
  return { email, name };
};
