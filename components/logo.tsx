import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("h-7 w-7", className)}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" className="fill-zinc-950" />
      <rect
        width="31"
        height="31"
        x="0.5"
        y="0.5"
        rx="7.5"
        className="fill-none stroke-zinc-800"
      />
      <circle
        cx="16"
        cy="16"
        r="9.5"
        className="fill-none stroke-emerald-500"
        strokeWidth="3"
      />
      <path
        d="M11.5 16.2 L14.6 19.3 L20.8 12.8"
        className="fill-none stroke-emerald-500"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="text-lg font-semibold tracking-tight text-zinc-50">
        Onyxo <span className="text-emerald-500">Desk</span>
      </span>
    </span>
  );
}
