import "server-only";
import { GoogleGenerativeAI, SchemaType, type ObjectSchema } from "@google/generative-ai";
import type { AppealAnalysis } from "@/types/lead";

const apiKey = process.env.GEMINI_API_KEY;

// Response schema forces Gemini to return exactly the shape the frontend
// (and the lead store) depend on — no ad-hoc JSON parsing / regex scraping.
const responseSchema: ObjectSchema = {
  type: SchemaType.OBJECT,
  properties: {
    probability: {
      type: SchemaType.NUMBER,
      description: "Estimated recovery probability, an integer from 0-100.",
    },
    violation_name: {
      type: SchemaType.STRING,
      description: "Short label for the most likely policy violation category.",
    },
    appeal_text: {
      type: SchemaType.STRING,
      description:
        "A complete, first-person draft appeal message the account owner can submit, written to be specific, factual and non-inflammatory.",
    },
  },
  required: ["probability", "violation_name", "appeal_text"],
};

const SYSTEM_PROMPT = `You are an AI Policy Appeals Analyst embedded in Onyxo Desk, a paid tool that helps
people draft appeals for banned or restricted social-media accounts.

You are NOT a lawyer, you do NOT provide legal advice, and you have no affiliation with
Meta, Google, TikTok, or any platform. Never claim otherwise, and never claim the appeal
is guaranteed to succeed.

Given a user's description of why their account was banned (and optionally a screenshot
of the ban notice), you must:
1. Identify the single most likely policy-violation category the platform cited.
2. Estimate a realistic recovery probability (0-100) based on how specific, contestable,
   and evidence-backed the user's situation sounds. Be conservative — do not inflate
   numbers to make the user feel better. Ambiguous or clearly-valid bans should score low.
3. Draft a concise, factual, first-person appeal the user could submit as-is. It should
   reference the platform's own review process, avoid hostile or threatening language,
   and avoid asserting facts the user did not provide.

Respond ONLY with JSON matching the provided schema. Do not include markdown fences or
any commentary outside the JSON object.`;

interface AnalyzeInput {
  banReason: string;
  imageBase64?: string;
  imageMimeType?: string;
}

export async function analyzeBanAppeal({
  banReason,
  imageBase64,
  imageMimeType,
}: AnalyzeInput): Promise<AppealAnalysis> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    // gemini-1.5-flash has been retired by Google. gemini-2.5-flash is also
    // retired for new API keys, and the gemini-flash-latest alias was
    // observed routing to an overloaded/unstable backend (503s, 5min+
    // hangs) for this key. gemini-3.6-flash is what Google's own API
    // currently recommends and is confirmed fast/stable — revisit this
    // if Google deprecates it too.
    model: "gemini-3.6-flash",
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  const parts: Array<
    { text: string } | { inlineData: { data: string; mimeType: string } }
  > = [{ text: `Ban reason provided by the user:\n"""\n${banReason}\n"""` }];

  if (imageBase64 && imageMimeType) {
    parts.push({ inlineData: { data: imageBase64, mimeType: imageMimeType } });
  }

  const result = await model.generateContent(parts);
  const text = result.response.text();

  let parsed: AppealAnalysis;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Gemini returned a non-JSON response.");
  }

  return {
    probability: Math.max(0, Math.min(100, Math.round(parsed.probability))),
    violation_name: parsed.violation_name,
    appeal_text: parsed.appeal_text,
  };
}
