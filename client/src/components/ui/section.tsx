import { cn } from "@/lib/utils";

export function Section({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("relative px-4 py-16 sm:px-6 lg:px-8", className)}>
      {children}
    </section>
  );
}
