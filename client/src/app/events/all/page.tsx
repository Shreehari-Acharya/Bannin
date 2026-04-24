"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { cn } from "@/lib/utils";

interface Event {
  id: string;
  sourceTool: string;
  timestamp: string;
  priority: string;
  description: string;
  reportUrl: string;
  count: number;
  askedAnalysis: boolean;
  finished: boolean;
}

function parseQueryDate(value: string | null): Date | undefined {
  if (!value) return undefined;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export default function EventsAllPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [range, setRange] = useState<DateRange | undefined>({
    from: parseQueryDate(searchParams.get("start")),
    to: parseQueryDate(searchParams.get("end")),
  });
  const [rows, setRows] = useState(Number(searchParams.get("rows")) || 10);
  const [sortOrder, setSortOrder] = useState<"lf" | "of">(
    searchParams.has("of") ? "of" : "lf",
  );

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const doFetch = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await fetch(`/api/events/all?${searchParams.toString()}`);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      setEvents(await res.json());
    } catch (err) {
      if (showLoading) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    void doFetch(true);
  }, [doFetch, searchParams]);

  useEffect(() => {
    if (loading) return;

    const hasPendingAnalysis = events.some((event) => event.askedAnalysis && !event.finished);
    if (!hasPendingAnalysis) {
      stopPolling();
      return;
    }

    if (pollingRef.current) return;

    pollingRef.current = setInterval(() => {
      void doFetch(false);
    }, 5000);

    return stopPolling;
  }, [events, loading, doFetch, stopPolling]);

  useEffect(() => stopPolling, [stopPolling]);

  function applyFilters() {
    if (!range?.from || !range?.to) {
      setError("Please select a start and end date.");
      return;
    }

    const startDate = new Date(range.from);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(range.to);
    endDate.setHours(23, 59, 0, 0);

    const params = new URLSearchParams();
    params.set("start", format(startDate, "yyyy-MM-dd'T'HH:mm"));
    params.set("end", format(endDate, "yyyy-MM-dd'T'HH:mm"));
    params.set("rows", String(rows));
    params.set(sortOrder, "true");
    router.push(`/events/all?${params.toString()}`);
  }

  function priorityColor(priority: string) {
    if (priority === "Critical") return "border-rose-400/20 bg-rose-400/10 text-rose-100";
    if (priority === "Medium") return "border-amber-400/20 bg-amber-400/10 text-amber-100";
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-100";
  }

  const summaries = {
    total: events.length,
    critical: events.filter((event) => event.priority === "Critical").length,
    pending: events.filter((event) => event.askedAnalysis && !event.finished).length,
    ready: events.filter((event) => event.reportUrl).length,
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-4 text-sm text-slate-300 shadow-2xl shadow-black/20 backdrop-blur-xl">
          Loading incident feed…
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-4">
          <Badge variant="outline" className="w-fit border-cyan-400/20 bg-cyan-400/10 text-cyan-100">
            Incident feed
          </Badge>
          <h1 className="text-balance text-4xl font-semibold text-white sm:text-5xl">
            Scan, filter, and open every incident without leaving the dashboard.
          </h1>
          <p className="max-w-2xl text-base leading-8 text-slate-300">
            The same event API still powers the app, but the surface is now laid out
            like an operations console with clearer filters, status states, and
            faster scanability.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[28rem]">
          {[
            { label: "Total", value: summaries.total },
            { label: "Critical", value: summaries.critical },
            { label: "Pending analysis", value: summaries.pending },
            { label: "Reports ready", value: summaries.ready },
          ].map((item) => (
            <div key={item.label} className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-black/20 backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.32em] text-slate-400">{item.label}</p>
              <p className="mt-2 text-3xl font-semibold text-white">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
        {error && (
          <div className="mb-5 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}
        <div className="grid gap-4 xl:grid-cols-[1.2fr_auto_auto_auto_auto] xl:items-end">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium uppercase tracking-[0.28em] text-slate-400">
              Range calendar
            </label>
            <DateRangePicker
              value={range}
              onChange={(nextRange) => {
                setRange(nextRange);
                if (error) setError(null);
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium uppercase tracking-[0.28em] text-slate-400">
              Rows
            </label>
            <input
              type="number"
              min={1}
              value={rows}
              onChange={(e) => setRows(Number(e.target.value))}
              className="h-12 w-28 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium uppercase tracking-[0.28em] text-slate-400">
              Sort order
            </label>
            <div className="inline-flex h-12 rounded-2xl border border-white/10 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setSortOrder("lf")}
                aria-pressed={sortOrder === "lf"}
                className={cn(
                  "rounded-[0.85rem] px-4 text-sm font-medium transition-colors",
                  sortOrder === "lf"
                    ? "bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20"
                    : "text-slate-300 hover:bg-white/8 hover:text-white",
                )}
              >
                Latest first
              </button>
              <button
                type="button"
                onClick={() => setSortOrder("of")}
                aria-pressed={sortOrder === "of"}
                className={cn(
                  "rounded-[0.85rem] px-4 text-sm font-medium transition-colors",
                  sortOrder === "of"
                    ? "bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20"
                    : "text-slate-300 hover:bg-white/8 hover:text-white",
                )}
              >
                Oldest first
              </button>
            </div>
          </div>
          <Button onClick={applyFilters} className="h-12 px-6">
            Fetch events
          </Button>
        </div>
      </div>

      {events.length > 0 ? (
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/75 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-[0.22em] text-slate-400">
                <tr>
                  <th className="px-5 py-4">Source</th>
                  <th className="px-5 py-4">Timestamp</th>
                  <th className="px-5 py-4">Priority</th>
                  <th className="px-5 py-4">Description</th>
                  <th className="px-5 py-4 text-center">Occurrences</th>
                  <th className="px-5 py-4 text-center">Analysis</th>
                  <th className="px-5 py-4 text-center">Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/8">
                {events.map((event) => (
                  <tr
                    key={event.id}
                    onClick={() => router.push(`/event/${event.id}`)}
                    className="cursor-pointer bg-transparent transition-colors hover:bg-white/5"
                  >
                    <td className="whitespace-nowrap px-5 py-4 font-medium text-white">
                      {event.sourceTool}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-400">
                      {new Date(event.timestamp).toLocaleString()}
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn("inline-flex rounded-full border px-3 py-1 text-xs font-medium", priorityColor(event.priority))}>
                        {event.priority}
                      </span>
                    </td>
                    <td className="max-w-[28rem] px-5 py-4 text-slate-300">
                      <span className="line-clamp-2">{event.description}</span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-center text-slate-300">
                      {event.count}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-center">
                      <span className={cn("inline-flex rounded-full border px-3 py-1 text-xs font-medium", event.askedAnalysis ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-100" : "border-white/10 bg-white/5 text-slate-400")}>
                        {event.askedAnalysis ? "Requested" : "Idle"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-center">
                      {event.reportUrl ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          onClick={(e) => e.stopPropagation()}
                        >
                          <a href={event.reportUrl} target="_blank" rel="noreferrer">
                            View
                          </a>
                        </Button>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        !error && (
          <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-14 text-center text-sm text-slate-400 shadow-2xl shadow-black/20 backdrop-blur-xl">
            No incidents match the selected filters.
          </div>
        )
      )}
    </div>
  );
}
