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

interface HeaderProps {
  fullWidth?: boolean;
}

export function Header({ fullWidth = false }: HeaderProps) {
  const pathname = usePathname();
  const scrolled = useScroll(10);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-transparent border-b md:transition-all md:ease-out",
        !fullWidth && "mx-auto max-w-4xl md:rounded-md md:border",
        {
          "border-border bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/50":
            scrolled || fullWidth,
          "md:top-2 md:max-w-3xl md:shadow": scrolled && !fullWidth,
          "md:shadow": scrolled && fullWidth,
        },
      )}
    >
      <nav
        className={cn(
          "flex h-14 w-full items-center justify-between px-4 md:h-12 md:transition-all md:ease-out",
          fullWidth && "md:px-8 lg:px-12",
          {
            "md:px-2": scrolled && !fullWidth,
            "md:px-8 lg:px-12": scrolled && fullWidth,
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
