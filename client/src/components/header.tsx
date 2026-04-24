"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { useScroll } from "@/hooks/use-scroll";
import { Button } from "@/components/ui/button";
import { MobileNav } from "@/components/mobile-nav";

export const navLinks = [
  {
    label: "Home",
    href: "/",
  },
  {
    label: "Incidents",
    href: "/events/all",
  },
  {
    label: "About",
    href: "/about",
  },
];

export function Header() {
  const pathname = usePathname();
  const scrolled = useScroll(10);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 mx-auto w-full max-w-4xl border-transparent border-b md:rounded-md md:border md:transition-all md:ease-out",
        {
          "border-border bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/50 md:top-2 md:max-w-3xl md:shadow":
            scrolled,
        },
      )}
    >
      <nav
        className={cn(
          "flex h-14 w-full items-center justify-between px-4 md:h-12 md:transition-all md:ease-out",
          {
            "md:px-2": scrolled,
          },
        )}
      >
        <Link
          className="flex h-10 items-center rounded-md px-2 hover:bg-muted dark:hover:bg-muted/50"
          href="/"
        >
          <Logo />
        </Link>
        <div className="hidden items-center gap-2 md:flex">
          <div className="flex items-center gap-1">
            {navLinks.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname === link.href || pathname.startsWith(`${link.href}/`);

              return (
                <Button
                  asChild
                  key={link.label}
                  size="sm"
                  variant={active ? "secondary" : "ghost"}
                >
                  <Link href={link.href}>{link.label}</Link>
                </Button>
              );
            })}
          </div>
        </div>
        <MobileNav />
      </nav>
    </header>
  );
}
