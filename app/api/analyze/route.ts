import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { analyzeBanAppeal } from "@/lib/gemini";
import { createLead } from "@/lib/leads";
import type { Lead } from "@/types/lead";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB, matches Gemini inline-data guidance
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

interface AnalyzeRequestBody {
  banReason?: string;
  image?: {
    base64: string;
    mimeType: string;
  };
}

export async function POST(request: NextRequest) {
  let body: AnalyzeRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const banReason = body.banReason?.trim();
  if (!banReason || banReason.length < 10) {
    return NextResponse.json(
      { error: "Please describe the ban reason in at least 10 characters." },
      { status: 400 }
    );
  }
  if (banReason.length > 4000) {
    return NextResponse.json(
      { error: "Ban reason is too long (max 4000 characters)." },
      { status: 400 }
    );
  }

  let imageBase64: string | undefined;
  let imageMimeType: string | undefined;

  if (body.image) {
    const { base64, mimeType } = body.image;
    if (!base64 || !mimeType) {
      return NextResponse.json(
        { error: "image.base64 and image.mimeType are both required if image is set." },
        { status: 400 }
      );
    }
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: "Unsupported image type. Use PNG, JPEG, or WebP." },
        { status: 415 }
      );
    }
    // base64 is ~4/3 the size of the raw bytes
    if (base64.length * 0.75 > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "Image is too large (max 8MB)." },
        { status: 413 }
      );
    }
    imageBase64 = base64;
    imageMimeType = mimeType;
  }

  try {
    const analysis = await analyzeBanAppeal({
      banReason,
      imageBase64,
      imageMimeType,
    });

    const lead: Lead = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      banReason,
      hasScreenshot: Boolean(imageBase64),
      analysis,
      status: "new",
    };
    createLead(lead);

    return NextResponse.json({
      leadId: lead.id,
      probability: analysis.probability,
      violation_name: analysis.violation_name,
      // The full appeal_text is intentionally withheld here — it stays
      // server-side until the lead is unlocked (see /api/checkout), so the
      // paywall can't be bypassed by reading the network tab.
    });
  } catch (error) {
    console.error("[/api/analyze] Gemini analysis failed:", error);
    return NextResponse.json(
      { error: "Analysis failed. Please try again in a moment." },
      { status: 502 }
    );
  }
}
