import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import Stripe from "stripe";
import { getLead } from "@/lib/leads";

export const runtime = "nodejs";

const UNLOCK_PRICE_USD = 29_00; // $29.00, in cents

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not configured.");
  return new Stripe(secretKey);
}

export async function POST(request: NextRequest) {
  const { leadId } = await request.json().catch(() => ({ leadId: undefined }));

  if (!leadId || typeof leadId !== "string") {
    return NextResponse.json({ error: "leadId is required." }, { status: 400 });
  }

  const lead = getLead(leadId);
  if (!lead) {
    return NextResponse.json({ error: "Unknown leadId." }, { status: 404 });
  }

  const origin = request.nextUrl.origin;

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: UNLOCK_PRICE_USD,
            product_data: {
              name: "Onyxo Desk — Appeal Unlock",
              description: `Full AI-drafted appeal for lead ${lead.id}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: { leadId: lead.id },
      success_url: `${origin}/?leadId=${lead.id}&checkout=success`,
      cancel_url: `${origin}/?leadId=${lead.id}&checkout=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[/api/checkout] Stripe session creation failed:", error);
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 502 }
    );
  }
}
