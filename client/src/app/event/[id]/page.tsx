"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Prism from "prismjs";
import "prismjs/components/prism-json";
import "prism-themes/themes/prism-atom-dark.css";
import { ArrowLeft, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

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
    try {
      const res = await fetch(`/api/events/analyse/${id}`);
      if (!res.ok) throw new Error(`Analysis failed (${res.status})`);
      setEvent((prev) => (prev ? { ...prev, askedAnalysis: true } : prev));
      pollStatus();
    } catch (err) {
      setAnalysing(false);
      setError(err instanceof Error ? err.message : "Analysis request failed");
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
                    ? { ...prev, finished: true, reportUrl: status.reportUrl }
                    : prev,
                );
              }
            } catch {
              /* keep polling */
            }
          }, 5000);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load event");
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => stopPolling();
  }, [id, stopPolling]);

  useEffect(() => {
    if (event && codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [event]);

  function priorityColor(priority: string) {
    if (priority === "Critical") return "border-rose-400/20 bg-rose-400/10 text-rose-100";
    if (priority === "Medium") return "border-amber-400/20 bg-amber-400/10 text-amber-100";
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-100";
  }

  const isPending = event ? event.askedAnalysis && !event.finished : false;

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-4 text-sm text-slate-300 shadow-2xl shadow-black/20 backdrop-blur-xl">
          Loading incident…
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-5 px-4 text-center">
        <p className="text-sm text-rose-300">{error ?? "Event not found"}</p>
        <Button variant="outline" asChild>
          <Link href="/events/all">
            <ArrowLeft className="size-4" />
            Back to incidents
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/events/all">
              <ArrowLeft className="size-4" />
              Back to incidents
            </Link>
          </Button>
          <div className="space-y-2">
            <Badge className={priorityColor(event.priority)}>{event.priority}</Badge>
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">
              {event.sourceTool}
            </h1>
            <p className="max-w-3xl text-sm text-slate-400">{event.id}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!event.askedAnalysis && !event.finished && !analysing ? (
            <Button onClick={startAnalysis} className="min-w-44">
              Analyse incident
            </Button>
          ) : analysing ? (
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
              <Spinner />
              <span>Analysis queued…</span>
            </div>
          ) : (
            <Badge className={event.finished ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100" : "border-amber-400/20 bg-amber-400/10 text-amber-100"}>
              {event.finished ? "Analyzed" : "Awaiting analysis"}
            </Badge>
          )}
          {event.reportUrl ? (
            <Button variant="outline" asChild>
              <a href={event.reportUrl} target="_blank" rel="noreferrer">
                <FileText className="size-4" />
                View report
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="mb-6 rounded-3xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Timestamp", value: new Date(event.timestamp).toLocaleString() },
          { label: "Occurrences", value: String(event.count) },
          { label: "Analysis", value: event.askedAnalysis ? (event.finished ? "Completed" : "Queued") : "Idle" },
          { label: "Report", value: event.reportUrl ? "Available" : "Not available" },
        ].map((item) => (
          <div key={item.label} className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{item.label}</p>
            <p className="mt-3 text-sm leading-7 text-white">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Description</p>
            <p className="mt-4 text-sm leading-8 text-slate-200">{event.description}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Status</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Badge variant="outline" className={isPending ? "border-amber-400/20 bg-amber-400/10 text-amber-100" : "border-white/10 bg-white/5 text-slate-300"}>
                {isPending ? "Analysis pending" : "No pending job"}
              </Badge>
              <Badge variant="outline" className={event.finished ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100" : "border-white/10 bg-white/5 text-slate-300"}>
                {event.finished ? "Report ready" : "Report not ready"}
              </Badge>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/80 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Raw payload</p>
              <p className="mt-1 text-sm text-slate-300">Structured event data</p>
            </div>
          </div>
          <pre className="max-h-144 overflow-auto p-5 text-xs leading-7 text-slate-200">
            <code ref={codeRef} className="language-json">
              {JSON.stringify(event.rawPayload, null, 2)}
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
}
