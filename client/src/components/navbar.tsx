"use client";

import { Github, Menu } from "lucide-react";
import Link from "next/link";

import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

import BanninLogo from "@/components/logos/bannin-logo";
import { Button } from "@/components/ui/button";
import {
  Navbar as NavbarComponent,
  NavbarLeft,
  NavbarRight,
} from "@/components/ui/navbar";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface NavbarLink {
  text: string;
  href: string;
}

interface NavbarProps {
  name?: string;
  homeUrl?: string;
  mobileLinks?: NavbarLink[];
  className?: string;
}

export default function Navbar({
  name = siteConfig.name,
  homeUrl = siteConfig.url,
  mobileLinks = [
    { text: "Home", href: "/" },
    { text: "Incidents", href: "/events/all" },
    { text: "About", href: "/about" },
  ],
  className,
}: NavbarProps) {
  return (
    <header className={cn("sticky top-0 z-50 px-4 pt-4", className)}>
      <div className="relative mx-auto max-w-7xl">
        <NavbarComponent className="rounded-full border border-white/10 bg-slate-950/75 px-4 py-3 shadow-2xl shadow-black/20 backdrop-blur-2xl">
          <NavbarLeft>
            <Link
              href={homeUrl}
              className="flex items-center gap-3"
              aria-label={name}
            >
              <BanninLogo />
            </Link>
            <nav className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 md:flex">
              {mobileLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/8 hover:text-white"
                >
                  {link.text}
                </Link>
              ))}
            </nav>
          </NavbarLeft>
          <NavbarRight>
            <Button variant="outline" size="sm" asChild className="hidden md:inline-flex">
              <Link href={siteConfig.getStartedUrl}>Open Incidents</Link>
            </Button>
            <Button variant="outline" size="icon" asChild>
              <a
                href={siteConfig.links.github}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="size-4" />
                <span className="sr-only">GitHub</span>
              </a>
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 md:hidden"
                >
                  <Menu className="size-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <nav className="grid gap-5 text-base font-medium">
                  <Link href={homeUrl} className="flex items-center gap-3">
                    <BanninLogo />
                  </Link>
                  <div className="grid gap-2 pt-4">
                    {mobileLinks.map((link) => (
                      <SheetClose asChild key={link.href}>
                        <Link
                          href={link.href}
                          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
                        >
                          {link.text}
                        </Link>
                      </SheetClose>
                    ))}
                  </div>
                  <SheetClose asChild>
                    <Button asChild className="mt-2 w-full">
                      <Link href={siteConfig.getStartedUrl}>Open Incidents</Link>
                    </Button>
                  </SheetClose>
                </nav>
              </SheetContent>
            </Sheet>
          </NavbarRight>
        </NavbarComponent>
      </div>
    </header>
  );
}
