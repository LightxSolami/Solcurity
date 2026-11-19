type ApiResponse = Pick<Response, "ok" | "status" | "json">;

export async function readApiResponse<T extends object>(
  response: ApiResponse,
  fallbackMessage: string
): Promise<T> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }

  const errorMessage =
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof body.error === "string"
      ? body.error
      : undefined;

  if (!response.ok) {
    throw new Error(errorMessage || `${fallbackMessage} (HTTP ${response.status}).`);
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new Error(`${fallbackMessage} The server returned an invalid response.`);
  }

  return body as T;
}
