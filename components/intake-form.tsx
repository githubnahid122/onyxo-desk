"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { UploadCloud, ImageIcon, Lock, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AppealAnalysis } from "@/types/lead";

const ANALYSIS_STEPS = [
  "Scanning platform policy database...",
  "Cross-referencing your ban reason against known appeal outcomes...",
  "Evaluating evidence and screenshot metadata...",
  "Drafting appeal narrative...",
  "Finalizing report...",
];

const STEP_DURATION_MS = 2000; // 5 steps * 2s = ~10s total

type Stage = "idle" | "analyzing" | "report" | "unlocked";

interface TeaserResult {
  leadId: string;
  probability: number;
  violation_name: string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // strip the "data:image/png;base64," prefix
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function IntakeForm() {
  const searchParams = useSearchParams();

  // If we bounced back from Stripe Checkout, resume in the report/unlocking
  // stage for that lead — computed once from the URL, not via a setState
  // call inside an effect.
  const returningLeadId =
    searchParams.get("checkout") === "success" ? searchParams.get("leadId") : null;

  const [stage, setStage] = useState<Stage>(returningLeadId ? "report" : "idle");
  const [banReason, setBanReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [teaser, setTeaser] = useState<TeaserResult | null>(
    returningLeadId
      ? { leadId: returningLeadId, probability: 0, violation_name: "" }
      : null
  );
  const [fullAnalysis, setFullAnalysis] = useState<AppealAnalysis | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Poll for the webhook-confirmed unlock after returning from Checkout.
  useEffect(() => {
    if (!returningLeadId) return;

    let cancelled = false;
    const poll = async () => {
      for (let attempt = 0; attempt < 10 && !cancelled; attempt++) {
        const res = await fetch(`/api/leads/${returningLeadId}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setFullAnalysis(data.analysis);
            setStage("unlocked");
          }
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, [returningLeadId]);

  const handleFile = useCallback((selected: File | null) => {
    if (!selected) return;
    if (!selected.type.startsWith("image/")) {
      setError("Please upload an image file (PNG, JPEG, or WebP).");
      return;
    }
    setError(null);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      handleFile(e.dataTransfer.files?.[0] ?? null);
    },
    [handleFile]
  );

  const runAnalysis = useCallback(async () => {
    if (banReason.trim().length < 10) {
      setError("Describe the ban reason in at least a sentence or two.");
      return;
    }
    setError(null);
    setStage("analyzing");
    setStepIndex(0);

    // Kick off the real request immediately in the background...
    const analyzePromise = (async () => {
      const payload: Record<string, unknown> = { banReason };
      if (file) {
        const base64 = await fileToBase64(file);
        payload.image = { base64, mimeType: file.type };
      }
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Analysis failed.");
      }
      return (await res.json()) as TeaserResult;
    })();

    // ...while the step animation plays out over ~10s so the wait feels
    // purposeful instead of a raw spinner. If the real request finishes
    // first we still let the animation play through so users can see what
    // was actually checked.
    const animation = (async () => {
      for (let i = 0; i < ANALYSIS_STEPS.length; i++) {
        setStepIndex(i);
        await new Promise((resolve) => setTimeout(resolve, STEP_DURATION_MS));
      }
    })();

    try {
      const [result] = await Promise.all([analyzePromise, animation]);
      setTeaser(result);
      setStage("report");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStage("idle");
    }
  }, [banReason, file]);

  const startCheckout = useCallback(async () => {
    if (!teaser) return;
    setCheckoutLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: teaser.leadId }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "Checkout failed.");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
      setCheckoutLoading(false);
    }
  }, [teaser]);

  return (
    <Card className="w-full max-w-xl">
      <CardContent className="flex flex-col gap-6 p-6 sm:p-8">
        {stage === "idle" && (
          <>
            <div>
              <h2 className="text-xl font-semibold text-zinc-50">
                Start your appeal analysis
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                Upload a screenshot of your ban notice and describe what happened.
                An AI-generated draft, not legal advice.
              </p>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
                isDragging
                  ? "border-emerald-500 bg-emerald-500/5"
                  : "border-zinc-700 hover:border-zinc-600"
              )}
            >
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="Ban notice preview"
                  className="max-h-40 rounded-md object-contain"
                />
              ) : (
                <>
                  <UploadCloud className="h-8 w-8 text-zinc-500" />
                  <p className="text-sm text-zinc-400">
                    Drag & drop a screenshot, or click to browse
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
            </div>
            {file && (
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <ImageIcon className="h-3.5 w-3.5" />
                {file.name}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="banReason" className="text-sm font-medium text-zinc-300">
                What reason did the platform give?
              </label>
              <Textarea
                id="banReason"
                placeholder="e.g. 'Account disabled for violating Community Standards on impersonation, but this is genuinely my identity...'"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                rows={4}
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <Button size="lg" onClick={runAnalysis}>
              Analyze My Case
            </Button>
          </>
        )}

        {stage === "analyzing" && (
          <div className="flex flex-col items-center gap-6 py-6 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
            <div className="w-full">
              <Progress
                value={((stepIndex + 1) / ANALYSIS_STEPS.length) * 100}
                className="mb-3"
              />
              <p className="text-sm font-medium text-zinc-200">
                {ANALYSIS_STEPS[stepIndex]}
              </p>
            </div>
          </div>
        )}

        {stage === "report" && teaser && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-zinc-50">Teaser Report</h2>
              <Badge>Analysis complete</Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-zinc-800 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  Recovery Probability
                </p>
                <p className="mt-1 text-3xl font-bold text-emerald-400">
                  {teaser.probability}%
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  Violation Type
                </p>
                <p className="mt-1 text-lg font-semibold text-zinc-100">
                  {teaser.violation_name}
                </p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-lg border border-zinc-800">
              <div
                aria-hidden
                className="pointer-events-none select-none space-y-2 p-4 blur-sm"
              >
                <p className="h-3 w-full rounded bg-zinc-700" />
                <p className="h-3 w-11/12 rounded bg-zinc-700" />
                <p className="h-3 w-full rounded bg-zinc-700" />
                <p className="h-3 w-4/5 rounded bg-zinc-700" />
                <p className="h-3 w-full rounded bg-zinc-700" />
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 p-4 text-center">
                <Lock className="h-6 w-6 text-zinc-300" />
                <p className="text-sm text-zinc-300">
                  Your full AI-drafted appeal is ready. Unlock it to copy and submit.
                </p>
                <Button onClick={startCheckout} disabled={checkoutLoading}>
                  {checkoutLoading ? "Redirecting..." : "$29 — Unlock Appeal"}
                </Button>
              </div>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <p className="text-xs text-zinc-500">
              AI-generated draft for informational purposes only — not legal advice,
              and not affiliated with Meta or any platform. Actual outcomes vary.
            </p>
          </div>
        )}

        {stage === "unlocked" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
              <h2 className="text-xl font-semibold text-zinc-50">Appeal unlocked</h2>
            </div>
            {fullAnalysis ? (
              <>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-sm leading-relaxed text-zinc-200 whitespace-pre-wrap">
                  {fullAnalysis.appeal_text}
                </div>
                <Button
                  variant="outline"
                  onClick={() => navigator.clipboard.writeText(fullAnalysis.appeal_text)}
                >
                  Copy appeal text
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Confirming payment...
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
