import { NextRequest, NextResponse } from "next/server";
import { getClientIp } from "@/lib/rate-limit";
import { CommunitySubmissionSchema } from "@/lib/threat-intel/submission-schema";
import { submitCommunityReport } from "@/lib/threat-intel/submission-service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = CommunitySubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid submission.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await submitCommunityReport(parsed.data, getClientIp(request.headers));
    if (result.status === "created") {
      return NextResponse.json({
        status: "pending",
        message: "Report received for review. It is not an active threat finding.",
        submissionId: result.id,
      }, { status: 202 });
    }
    if (result.status === "duplicate") {
      return NextResponse.json(
        { error: "A report with this identifier and evidence has already been submitted." },
        { status: 409 }
      );
    }
    if (result.status === "rate_limited") {
      return NextResponse.json(
        { error: "Submission limit reached. Try again later." },
        { status: 429, headers: { "Retry-After": "3600" } }
      );
    }
    return NextResponse.json(
      { error: "Threat-report storage is unavailable; no report was accepted." },
      { status: 503 }
    );
  } catch (error) {
    console.error(
      "Threat intelligence submission request failed:",
      error instanceof Error ? error.name : "unknown"
    );
    return NextResponse.json(
      { error: "Threat-report storage is unavailable; no report was accepted." },
      { status: 503 }
    );
  }
}
