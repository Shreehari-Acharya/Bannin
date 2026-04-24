import Image from "next/image";
import { cn } from "@/lib/utils";

type LogoIconProps = React.ComponentProps<"span">;
type LogoProps = React.ComponentProps<"span"> & {
  compact?: boolean;
};

export function LogoIcon({ className, ...props }: LogoIconProps) {
  return (
    <span
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-lg border border-white/15 bg-white/8 shadow-md shadow-cyan-900/20",
        className,
      )}
      {...props}
    >
      <Image
        src="/bannin-logo-clean.png"
        alt="Bannin"
        width={22}
        height={22}
        className="size-5 object-contain"
        priority
      />
    </span>
  );
}

export function Logo({ className, compact = false, ...props }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)} {...props}>
      <LogoIcon />
      {!compact ? (
        <span className="font-semibold text-base tracking-[0.14em] text-foreground">BANNIN</span>
      ) : null}
    </span>
  );
}
