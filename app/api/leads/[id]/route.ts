import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getLead } from "@/lib/leads";

export const runtime = "nodejs";

/**
 * Returns the full unlocked analysis (including appeal_text) for a lead —
 * but only once Stripe's webhook has confirmed payment. This is what the
 * success page polls after returning from Checkout.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const lead = getLead(id);

  if (!lead) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (lead.status !== "paid") {
    return NextResponse.json({ error: "Not unlocked yet." }, { status: 402 });
  }

  return NextResponse.json({ analysis: lead.analysis });
}
