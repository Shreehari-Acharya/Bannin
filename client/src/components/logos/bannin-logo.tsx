import { cn } from "@/lib/utils";
import Image from "next/image";

export default function BanninLogo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-lg shadow-cyan-500/10 backdrop-blur-sm">
        <Image
          src="/bannin-logo-clean.png"
          alt="Bannin logo"
          width={36}
          height={36}
          className="h-9 w-auto object-contain"
          priority
        />
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