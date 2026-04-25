import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryProvider } from "@/components/query-provider";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Bannin",
  description: "A dark incident operations dashboard for monitoring, triage, and reporting.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("dark", "font-sans", inter.variable)}
      data-scroll-behavior="smooth"
    >
      <body
        className={`${spaceGrotesk.variable} ${plexMono.variable} bg-background font-sans antialiased`}
        suppressHydrationWarning
      >
        <QueryProvider>
          <TooltipProvider>
            <main>{children}</main>
          </TooltipProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
