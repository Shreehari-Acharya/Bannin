import { cn } from "@/lib/utils";

export default function BanninLogo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-lg shadow-cyan-500/10 backdrop-blur-sm">
        <svg viewBox="0 0 32 32" className="size-7" aria-hidden="true">
          <path
            d="M16 3.5 25.5 8v10.2c0 5.1-3.4 9.7-9.5 10.8-6.1-1.1-9.5-5.7-9.5-10.8V8L16 3.5Z"
            fill="none"
            stroke="url(#bannin-gradient)"
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
          <path
            d="M10.8 15.6c1.8-3 4.4-4.7 7.2-4.7 2.3 0 4.1.9 5.2 2.4"
            fill="none"
            stroke="#f8fbff"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M12.7 12.1c.8-2.7 2.1-4.6 3.6-5.8 1.6 1.3 2.8 3.1 3.6 5.8"
            fill="none"
            stroke="#22d3ee"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="bannin-gradient" x1="5" y1="4" x2="27" y2="28" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ffffff" />
              <stop offset="1" stopColor="#22d3ee" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="leading-none">
        <span className="block text-lg font-semibold tracking-[0.2em] text-white">
          Bannin
        </span>
        <span className="block text-[0.65rem] uppercase tracking-[0.35em] text-sky-200/70">
          Security command center
        </span>
      </div>
    </div>
  );
}