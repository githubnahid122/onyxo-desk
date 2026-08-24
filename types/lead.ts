export type ViolationCategory =
  | "Community Standards"
  | "Intellectual Property"
  | "Impersonation"
  | "Spam / Inauthentic Behavior"
  | "Hate Speech / Bullying"
  | "Other Policy Violation";

/** Structured result returned by the Gemini analysis route. */
export interface AppealAnalysis {
  probability: number; // 0-100
  violation_name: ViolationCategory | string;
  appeal_text: string;
}

/** A captured lead, persisted after a user runs the intake analysis. */
export interface Lead {
  id: string;
  createdAt: string;
  banReason: string;
  hasScreenshot: boolean;
  analysis: AppealAnalysis;
  status: "new" | "unlocked" | "paid";
}
