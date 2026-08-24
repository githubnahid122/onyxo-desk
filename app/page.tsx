import { Suspense } from "react";
import { ShieldCheck, Sparkles, TimerReset } from "lucide-react";
import { IntakeForm } from "@/components/intake-form";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-black">
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center gap-16 px-6 py-20 lg:flex-row lg:items-start lg:py-28">
        <div className="flex max-w-xl flex-col gap-6">
          <Badge className="w-fit">AI-assisted account recovery</Badge>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-50 sm:text-5xl">
            Get your banned account back in front of the platform, faster.
          </h1>
          <p className="text-lg leading-relaxed text-zinc-400">
            Onyxo Desk analyzes your ban notice against known policy categories and
            drafts a specific, evidence-based appeal — instead of the generic template
            everyone else submits.
          </p>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:gap-8">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
              <div>
                <p className="text-sm font-medium text-zinc-100">AI-drafted appeal</p>
                <p className="text-sm text-zinc-500">Tailored to your specific case</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <TimerReset className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
              <div>
                <p className="text-sm font-medium text-zinc-100">Minutes, not days</p>
                <p className="text-sm text-zinc-500">Analysis runs in under a minute</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
              <div>
                <p className="text-sm font-medium text-zinc-100">Your data, private</p>
                <p className="text-sm text-zinc-500">Screenshots analyzed, not shared</p>
              </div>
            </div>
          </div>

          <p className="mt-2 text-xs text-zinc-600">
            Onyxo Desk is an independent tool and is not affiliated with, endorsed by,
            or operated by Meta, Google, TikTok, or any other platform. Reports are
            AI-generated and do not constitute legal advice or a guarantee of outcome.
          </p>
        </div>

        <div className="flex w-full flex-1 justify-center lg:justify-end">
          <Suspense fallback={null}>
            <IntakeForm />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
