import Link from "next/link";
import { format } from "date-fns";
import { type VariantProps } from "class-variance-authority";

import { mockEvents } from "@/app/api/events/mockData";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import Glow from "@/components/ui/glow";
import { Mockup, MockupFrame } from "@/components/ui/mockup";
import { Section } from "@/components/ui/section";

interface HeroButtonProps {
  href: string;
  text: string;
  variant?: VariantProps<typeof buttonVariants>["variant"];
}

interface HeroProps {
  title?: string;
  description?: string;
  buttons?: HeroButtonProps[] | false;
  className?: string;
}

const stats = [
  {
    label: "Active incidents",
    value: String(mockEvents.filter((event) => !event.finished).length),
  },
  {
    label: "Critical signals",
    value: String(mockEvents.filter((event) => event.priority === "Critical").length),
  },
  {
    label: "Tools covered",
    value: String(new Set(mockEvents.map((event) => event.sourceTool)).size),
  },
];

const workflow = [
  {
    title: "Ingest every signal",
    text: "Bring together alerts from network, host, and cloud tooling in one place.",
  },
  {
    title: "Triage with context",
    text: "See priority, frequency, and raw payloads without bouncing between tools.",
  },
  {
    title: "Document the response",
    text: "Generate reports and keep analysis state attached to the incident timeline.",
  },
];

export default function Hero({
  title = "Bannin gives security teams one calm place to watch, analyze, and respond.",
  description = "A dark incident operations dashboard that keeps alerts, analysis, and reporting connected from first signal to final resolution.",
  buttons = [
    {
      href: siteConfig.getStartedUrl,
      text: "Open incidents",
      variant: "default",
    },
    {
      href: "/about",
      text: "Meet the team",
      variant: "outline",
    },
  ],
  className,
}: HeroProps) {
  const liveFeed = [...mockEvents]
    .sort((left, right) => Number(right.finished) - Number(left.finished))
    .slice(0, 4);

  return (
    <Section
      className={cn(
        "overflow-hidden pb-10 pt-12 sm:pt-16 md:pt-20",
        className,
      )}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-14">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <div className="relative space-y-8">
            <Badge variant="outline" className="w-fit border-cyan-400/20 bg-cyan-400/10 text-cyan-100">
              Dark incident operations
            </Badge>
            <div className="space-y-5">
              <h1 className="animate-appear relative z-10 max-w-3xl text-balance text-4xl font-semibold leading-tight text-white sm:text-6xl lg:text-7xl">
                {title}
              </h1>
              <p className="animate-appear relative z-10 max-w-2xl text-balance text-base font-medium leading-8 text-slate-300 opacity-0 delay-100 sm:text-lg">
                {description}
              </p>
            </div>
            {buttons !== false && buttons.length > 0 && (
              <div className="animate-appear flex flex-wrap gap-4 opacity-0 delay-300">
                {buttons.map((button, index) => (
                  <Button
                    key={index}
                    variant={button.variant || "default"}
                    size="lg"
                    asChild
                  >
                    <Link href={button.href}>{button.text}</Link>
                  </Button>
                ))}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-black/20 backdrop-blur-xl"
                >
                  <p className="text-sm text-slate-400">{stat.label}</p>
                  <p className="mt-2 text-3xl font-semibold text-white">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <Glow variant="center" className="left-0 top-14 opacity-50" />
            <MockupFrame
              className="animate-appear relative overflow-hidden border-white/10 bg-slate-950/90 opacity-0 delay-300"
              size="base"
            >
              <Mockup type="responsive" className="bg-slate-950">
                <div className="border-b border-white/10 px-5 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.32em] text-slate-400">
                        Live queue
                      </p>
                      <h2 className="mt-1 text-lg font-semibold text-white">
                        Bannin incident feed
                      </h2>
                    </div>
                    <Badge className="border-emerald-400/20 bg-emerald-400/10 text-emerald-100">
                      {liveFeed.filter((event) => event.finished).length} resolved
                    </Badge>
                  </div>
                </div>
                <div className="grid gap-3 p-5">
                  {liveFeed.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">
                          {event.description}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {event.sourceTool} • {format(new Date(event.timestamp), "MMM dd, HH:mm")}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          event.priority === "Critical"
                            ? "border-rose-400/20 bg-rose-400/10 text-rose-100"
                            : event.priority === "Medium"
                              ? "border-amber-400/20 bg-amber-400/10 text-amber-100"
                              : "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
                        )}
                      >
                        {event.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Mockup>
            </MockupFrame>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {workflow.map((item, index) => (
            <div
              key={item.title}
              className="animate-appear rounded-3xl border border-white/10 bg-white/5 p-6 opacity-0 shadow-lg shadow-black/20 backdrop-blur-xl"
              style={{ animationDelay: `${index * 120 + 100}ms` }}
            >
              <p className="text-xs uppercase tracking-[0.32em] text-sky-200/70">
                0{index + 1}
              </p>
              <h3 className="mt-3 text-lg font-semibold text-white">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
