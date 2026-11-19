import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const REQUEST_TIMEOUT_MS = 8000;

export type AdminClientResult =
  | { status: "available"; client: SupabaseClient }
  | {
      status: "unavailable";
      reason: "not_configured" | "invalid_configuration";
    };

export function getThreatIntelAdminClient(): AdminClientResult {
  const projectUrl = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!projectUrl || !serviceRoleKey) {
    return { status: "unavailable", reason: "not_configured" };
  }

  let url: URL;
  try {
    url = new URL(projectUrl);
  } catch {
    return { status: "unavailable", reason: "invalid_configuration" };
  }

  const localDevelopmentUrl =
    process.env.NODE_ENV !== "production" &&
    ["localhost", "127.0.0.1"].includes(url.hostname);
  if (url.protocol !== "https:" && !localDevelopmentUrl) {
    return { status: "unavailable", reason: "invalid_configuration" };
  }

  try {
    const client = createClient(projectUrl, serviceRoleKey, {
      global: { fetch: fetchWithTimeout },
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
    return { status: "available", client };
  } catch {
    return { status: "unavailable", reason: "invalid_configuration" };
  }
}

function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const externalSignal = init?.signal;
  const abortFromCaller = () => controller.abort(externalSignal?.reason);
  if (externalSignal?.aborted) abortFromCaller();
  else externalSignal?.addEventListener("abort", abortFromCaller, { once: true });

  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => {
    clearTimeout(timeout);
    externalSignal?.removeEventListener("abort", abortFromCaller);
  });
}
