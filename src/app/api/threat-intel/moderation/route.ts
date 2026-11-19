import { NextRequest, NextResponse } from "next/server";
import { verifyModeratorAuthorization } from "@/lib/threat-intel/moderation-auth";
import { ModeratorDecisionSchema } from "@/lib/threat-intel/submission-schema";
import {
  getModerationQueue,
  moderateCommunityReport,
} from "@/lib/threat-intel/submission-service";

export const runtime = "nodejs";

function authFailure(authorizationHeader: string | null) {
  const result = verifyModeratorAuthorization(authorizationHeader);
  if (result === "authorized") return null;
  return NextResponse.json(
    { error: result === "unconfigured" ? "Moderation is not configured." : "Unauthorized." },
    { status: result === "unconfigured" ? 503 : 401 }
  );
}

export async function GET(request: NextRequest) {
  const failure = authFailure(request.headers.get("authorization"));
  if (failure) return failure;

  try {
    const result = await getModerationQueue();
    if (result.status === "unavailable") {
      return NextResponse.json(
        { error: "Moderation queue is unavailable.", reason: result.reason },
        { status: 503 }
      );
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "Threat intelligence moderation queue request failed:",
      error instanceof Error ? error.name : "unknown"
    );
    return NextResponse.json({ error: "Moderation queue is unavailable." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const failure = authFailure(request.headers.get("authorization"));
  if (failure) return failure;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = ModeratorDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid moderation decision.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await moderateCommunityReport(parsed.data);
    if (result.status === "conflict") {
      return NextResponse.json(
        { error: "Submission is no longer pending or the decision is invalid." },
        { status: 409 }
      );
    }
    if (result.status === "unavailable") {
      return NextResponse.json(
        { error: "Moderation storage is unavailable; no decision was recorded." },
        { status: 503 }
      );
    }
    return NextResponse.json({
      status: "completed",
      recordId: result.recordId,
      message: parsed.data.action === "approved"
        ? "Report was reviewed and entered into the intelligence database."
        : "Report was reviewed and closed without adding an intelligence record.",
    });
  } catch (error) {
    console.error(
      "Threat intelligence moderation request failed:",
      error instanceof Error ? error.name : "unknown"
    );
    return NextResponse.json(
      { error: "Moderation storage is unavailable; no decision was recorded." },
      { status: 503 }
    );
  }
}
