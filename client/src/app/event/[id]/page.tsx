"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Prism from "prismjs";
import "prismjs/components/prism-json";
import "prism-themes/themes/prism-atom-dark.css";
import { ArrowLeft, FileText } from "lucide-react";

import { Header } from "@/components/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface EventDetail {
  id: string;
  sourceTool: string;
  timestamp: string;
  priority: string;
  description: string;
  rawPayload: Record<string, unknown>;
  reportUrl: string;
  count: number;
  askedAnalysis: boolean;
  finished: boolean;
}

function priorityColor(priority: string) {
  const normalized = priority.trim().toLowerCase();

  if (normalized === "critical" || normalized === "high") {
    return "border-red-500/30 bg-red-500/10 text-red-200";
  }

  if (normalized === "medium" || normalized === "warning") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  }

  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysing, setAnalysing] = useState(false);

  const codeRef = useRef<HTMLElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const pollStatus = useCallback(() => {
    stopPolling();
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/events/status/${id}`);
        if (!res.ok) return;

        const data: {
          askedAnalysis: boolean;
          finished: boolean;
          reportUrl: string;
        } = await res.json();

        if (data.finished) {
          stopPolling();
          setAnalysing(false);
          setEvent((prev) =>
            prev
              ? {
                  ...prev,
                  askedAnalysis: true,
                  finished: true,
                  reportUrl: data.reportUrl,
                }
              : prev,
          );
        }
      } catch {
        /* keep polling on transient errors */
      }
    }, 5000);
  }, [id, stopPolling]);

  const startAnalysis = useCallback(async () => {
    setAnalysing(true);
    setError(null);

    try {
      const res = await fetch(`/api/events/analyse/${id}`);
      if (!res.ok) throw new Error(`Analysis failed (${res.status})`);

      setEvent((prev) => (prev ? { ...prev, askedAnalysis: true } : prev));
      pollStatus();
    } catch (requestError) {
      setAnalysing(false);
      setError(requestError instanceof Error ? requestError.message : "Analysis request failed");
    }
  }, [id, pollStatus]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/events/${id}`);
        if (!res.ok) throw new Error(`Event not found (${res.status})`);

        const data: EventDetail = await res.json();
        setEvent(data);

        if (data.askedAnalysis && !data.finished) {
          setAnalysing(true);
          pollingRef.current = setInterval(async () => {
            try {
              const statusRes = await fetch(`/api/events/status/${id}`);
              if (!statusRes.ok) return;

              const status: {
                askedAnalysis: boolean;
                finished: boolean;
                reportUrl: string;
              } = await statusRes.json();

              if (status.finished) {
                stopPolling();
                setAnalysing(false);
                setEvent((prev) =>
                  prev
                    ? {
                        ...prev,
                        finished: true,
                        reportUrl: status.reportUrl,
                      }
                    : prev,
                );
              }
            } catch {
              /* keep polling */
            }
          }, 5000);
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load event");
      } finally {
        setLoading(false);
      }
    }

    void load();
    return () => stopPolling();
  }, [id, stopPolling]);

  useEffect(() => {
    if (event && codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [event]);

  const isPending = event ? event.askedAnalysis && !event.finished : false;

  if (loading) {
    return (
      <div className="relative flex min-h-screen flex-col overflow-hidden px-4 supports-[overflow:clip]:overflow-clip">
        <Header />
        <main className="relative mx-auto flex w-full max-w-4xl grow items-center justify-center pb-14">
          <div className="rounded-sm border border-border/80 bg-card/70 px-6 py-4 text-muted-foreground text-sm shadow-sm backdrop-blur">
            Loading incident...
          </div>
        </main>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="relative flex min-h-screen flex-col overflow-hidden px-4 supports-[overflow:clip]:overflow-clip">
        <Header />
        <main className="relative mx-auto flex w-full max-w-4xl grow flex-col items-center justify-center gap-4 pb-14 text-center">
          <p className="text-destructive text-sm">{error ?? "Event not found"}</p>
          <Button asChild variant="outline">
            <Link href="/events/all">
              <ArrowLeft data-icon="inline-start" />
              Back to incidents
            </Link>
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden px-4 supports-[overflow:clip]:overflow-clip">
      <Header />
      <main
        className={cn(
          "relative mx-auto w-full max-w-4xl grow pb-14",
          "before:absolute before:-inset-y-14 before:-left-px before:w-px before:bg-border",
          "after:absolute after:-inset-y-14 after:-right-px after:w-px after:bg-border",
        )}
      >
        <section className="flex flex-col gap-5 px-4 py-8 md:px-6 md:py-10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <Button asChild size="sm" variant="outline">
                <Link href="/events/all">
                  <ArrowLeft data-icon="inline-start" />
                  Back to incidents
                </Link>
              </Button>
              <div>
                <Badge className={priorityColor(event.priority)}>{event.priority}</Badge>
                <h1 className="mt-2 text-balance text-2xl text-foreground md:text-3xl">{event.sourceTool}</h1>
                <p className="mt-1 text-muted-foreground text-xs">{event.id}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!event.askedAnalysis && !event.finished && !analysing ? (
                <Button onClick={startAnalysis}>Analyze incident</Button>
              ) : analysing ? (
                <div className="inline-flex items-center gap-2 rounded-sm border border-border bg-card/70 px-3 py-2 text-muted-foreground text-sm">
                  <Spinner />
                  <span>Analysis queued...</span>
                </div>
              ) : (
                <Badge
                  className={
                    event.finished
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-200"
                  }
                >
                  {event.finished ? "Analyzed" : "Awaiting analysis"}
                </Badge>
              )}

              {event.reportUrl ? (
                <Button asChild variant="outline">
                  <a href={event.reportUrl} rel="noreferrer" target="_blank">
                    <FileText data-icon="inline-start" />
                    View report
                  </a>
                </Button>
              ) : null}
            </div>
          </div>

          {error ? (
            <div className="rounded-sm border border-destructive/40 bg-destructive/10 px-4 py-3 text-destructive text-sm">
              {error}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Timestamp", value: new Date(event.timestamp).toLocaleString() },
              { label: "Occurrences", value: String(event.count) },
              { label: "Analysis", value: event.askedAnalysis ? (event.finished ? "Completed" : "Queued") : "Idle" },
              { label: "Report", value: event.reportUrl ? "Available" : "Not available" },
            ].map((item) => (
              <article
                key={item.label}
                className="rounded-sm border border-border/80 bg-card/70 px-4 py-3 shadow-sm backdrop-blur"
              >
                <p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">{item.label}</p>
                <p className="mt-2 text-foreground text-sm leading-6">{item.value}</p>
              </article>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-4">
              <article className="rounded-sm border border-border/80 bg-card/70 p-5 shadow-sm backdrop-blur">
                <p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">Description</p>
                <p className="mt-3 text-foreground text-sm leading-7">{event.description}</p>
              </article>

              <article className="rounded-sm border border-border/80 bg-card/70 p-5 shadow-sm backdrop-blur">
                <p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">Status</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className={
                      isPending
                        ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                        : "border-border bg-muted text-muted-foreground"
                    }
                  >
                    {isPending ? "Analysis pending" : "No pending job"}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={
                      event.finished
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                        : "border-border bg-muted text-muted-foreground"
                    }
                  >
                    {event.finished ? "Report ready" : "Report not ready"}
                  </Badge>
                </div>
              </article>
            </div>

            <article className="overflow-hidden rounded-sm border border-border/80 bg-card/70 shadow-sm backdrop-blur">
              <div className="border-b border-border/80 px-4 py-3">
                <p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">Raw payload</p>
                <p className="mt-1 text-muted-foreground text-sm">Structured event data</p>
              </div>
              <pre className="max-h-144 overflow-auto p-4 text-xs leading-6 text-slate-200">
                <code ref={codeRef} className="language-json">
                  {JSON.stringify(event.rawPayload, null, 2)}
                </code>
              </pre>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}
