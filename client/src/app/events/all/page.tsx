"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { endOfDay, format, startOfDay } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { Header } from "@/components/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type SortOrder = "lf" | "of";

interface EventSummary {
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

const DEFAULT_ROWS = 25;
const MAX_ROWS = 500;

function parseRows(value: string | null): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed) || parsed <= 0) return DEFAULT_ROWS;
  return Math.min(parsed, MAX_ROWS);
}

function parseSortOrder(searchParams: Pick<URLSearchParams, "has">): SortOrder {
  return searchParams.has("of") ? "of" : "lf";
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatTimestamp(value: string): string {
  const parsed = parseDate(value);
  if (!parsed) return value;
  return format(parsed, "PPP p");
}

function getPriorityTone(priority: string): string {
  const normalized = priority.trim().toLowerCase();

  if (normalized === "critical" || normalized === "high") {
    return "border-red-500/30 bg-red-500/10 text-red-200";
  }

  if (normalized === "medium" || normalized === "warning") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  }

  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
}

function isHighPriority(priority: string): boolean {
  const normalized = priority.trim().toLowerCase();
  return normalized === "critical" || normalized === "high";
}

export default function EventsAllPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [startDate, setStartDate] = useState<Date | undefined>(() => {
    const parsed = parseDate(searchParams.get("start"));
    return parsed ?? undefined;
  });
  const [endDate, setEndDate] = useState<Date | undefined>(() => {
    const parsed = parseDate(searchParams.get("end"));
    return parsed ?? undefined;
  });
  const [rows, setRows] = useState<number>(() => parseRows(searchParams.get("rows")));
  const [sortOrder, setSortOrder] = useState<SortOrder>(() => parseSortOrder(searchParams));
  const [timeZone, setTimeZone] = useState<string | undefined>(undefined);

  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const queryString = searchParams.toString();

  useEffect(() => {
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  useEffect(() => {
    setStartDate(parseDate(searchParams.get("start")) ?? undefined);
    setEndDate(parseDate(searchParams.get("end")) ?? undefined);
    setRows(parseRows(searchParams.get("rows")));
    setSortOrder(parseSortOrder(searchParams));
  }, [queryString, searchParams]);

  const stopPolling = useCallback(() => {
    if (!pollingRef.current) return;
    clearInterval(pollingRef.current);
    pollingRef.current = null;
  }, []);

  const fetchEvents = useCallback(
    async (showLoading = true) => {
      if (showLoading) {
        setLoading(true);
        setError(null);
      }

      const endpoint = queryString ? `/api/events/all?${queryString}` : "/api/events/all";

      try {
        const res = await fetch(endpoint);
        if (!res.ok) throw new Error(`Request failed (${res.status})`);

        const payload = await res.json();
        if (Array.isArray(payload)) {
          setEvents(payload as EventSummary[]);
        } else {
          setEvents([]);
        }
        setLastUpdated(new Date());
      } catch (fetchError) {
        if (showLoading) {
          setError(fetchError instanceof Error ? fetchError.message : "Failed to fetch events");
        }
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [queryString],
  );

  useEffect(() => {
    void fetchEvents(true);
  }, [fetchEvents]);

  useEffect(() => {
    if (loading) return;

    const hasPendingAnalysis = events.some((event) => event.askedAnalysis && !event.finished);
    if (!hasPendingAnalysis) {
      stopPolling();
      return;
    }

    if (pollingRef.current) return;

    pollingRef.current = setInterval(() => {
      void fetchEvents(false);
    }, 5000);

    return stopPolling;
  }, [events, loading, fetchEvents, stopPolling]);

  useEffect(() => stopPolling, [stopPolling]);

  const stats = useMemo(() => {
    const total = events.length;
    const critical = events.filter((event) => isHighPriority(event.priority)).length;
    const pending = events.filter((event) => event.askedAnalysis && !event.finished).length;
    const reports = events.filter((event) => event.reportUrl).length;

    return { total, critical, pending, reports };
  }, [events]);

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();

    if (startDate) {
      params.set("start", format(startOfDay(startDate), "yyyy-MM-dd'T'HH:mm"));
    }

    if (endDate) {
      params.set("end", format(endOfDay(endDate), "yyyy-MM-dd'T'HH:mm"));
    }

    params.set("rows", String(Math.min(Math.max(rows || DEFAULT_ROWS, 1), MAX_ROWS)));
    params.set(sortOrder, "true");

    const next = params.toString();
    router.push(next ? `/events/all?${next}` : "/events/all");
  }, [endDate, rows, router, sortOrder, startDate]);

  const clearFilters = useCallback(() => {
    setStartDate(undefined);
    setEndDate(undefined);
    setRows(DEFAULT_ROWS);
    setSortOrder("lf");
    router.push("/events/all");
  }, [router]);

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
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-balance text-2xl text-foreground md:text-3xl">Incident Dashboard</h1>
              <Badge variant="secondary" className="border-border bg-card/70 text-foreground">
                {lastUpdated ? `Updated ${format(lastUpdated, "p")}` : "Awaiting data"}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm tracking-wide md:text-base">
              Live event stream with analysis status and report readiness.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Total events", value: stats.total },
              { label: "High/Critical", value: stats.critical },
              { label: "Pending analysis", value: stats.pending },
              { label: "Reports ready", value: stats.reports },
            ].map((item) => (
              <article
                key={item.label}
                className="rounded-sm border border-border/80 bg-card/70 px-4 py-3 shadow-sm backdrop-blur"
              >
                <p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">{item.label}</p>
                <p className="mt-2 text-3xl text-foreground">{item.value}</p>
              </article>
            ))}
          </div>

          <div className="rounded-sm border border-border/80 bg-card/70 p-4 shadow-sm backdrop-blur">
            <div className="grid gap-3 lg:grid-cols-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-muted-foreground text-xs tracking-wide" htmlFor="start-at">
                  Start
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="start-at"
                      variant="outline"
                      className={cn(
                        "h-9 w-full min-w-0 justify-start border-input bg-background/75 px-3 text-left font-normal",
                        !startDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon data-icon="inline-start" />
                      <span className="truncate">
                        {startDate ? format(startDate, "PPP") : "Start date"}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => {
                        setStartDate(date);
                        if (date && endDate && date > endDate) {
                          setEndDate(undefined);
                        }
                      }}
                      disabled={(date) => (endDate ? date > endDate : false)}
                      timeZone={timeZone}
                      initialFocus
                      className="rounded-sm border border-border/80 bg-card/90"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-muted-foreground text-xs tracking-wide" htmlFor="end-at">
                  End
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="end-at"
                      variant="outline"
                      className={cn(
                        "h-9 w-full min-w-0 justify-start border-input bg-background/75 px-3 text-left font-normal",
                        !endDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon data-icon="inline-start" />
                      <span className="truncate">
                        {endDate ? format(endDate, "PPP") : "End date"}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      disabled={(date) => (startDate ? date < startDate : false)}
                      timeZone={timeZone}
                      initialFocus
                      className="rounded-sm border border-border/80 bg-card/90"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-muted-foreground text-xs tracking-wide" htmlFor="row-limit">
                  Rows (max 500)
                </label>
                <Input
                  id="row-limit"
                  type="number"
                  min={1}
                  max={MAX_ROWS}
                  value={rows}
                  onChange={(event) => setRows(parseRows(event.target.value))}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-muted-foreground text-xs tracking-wide">Sort</span>
                <div className="flex h-9 min-w-0 rounded-sm border border-input bg-background/75 p-1">
                  <button
                    type="button"
                    className={cn(
                      "min-w-0 flex-1 truncate rounded-xs px-2 text-xs transition-colors",
                      sortOrder === "lf"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    onClick={() => setSortOrder("lf")}
                  >
                    Latest
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "min-w-0 flex-1 truncate rounded-xs px-2 text-xs transition-colors",
                      sortOrder === "of"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    onClick={() => setSortOrder("of")}
                  >
                    Oldest
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 items-end gap-2">
                <Button className="min-w-0 w-full" onClick={applyFilters}>
                  Apply
                </Button>
                <Button className="min-w-0 w-full" variant="outline" onClick={clearFilters}>
                  Reset
                </Button>
              </div>
            </div>
          </div>

          {error ? (
            <div className="rounded-sm border border-destructive/40 bg-destructive/10 px-4 py-3 text-destructive text-sm">
              {error}
            </div>
          ) : null}

          <div className="overflow-hidden rounded-sm border border-border/80 bg-card/70 shadow-sm backdrop-blur">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/20 text-left text-muted-foreground text-xs">
                    <th className="px-4 py-3 font-medium">Source</th>
                    <th className="px-4 py-3 font-medium">Timestamp</th>
                    <th className="px-4 py-3 font-medium">Priority</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3 text-center font-medium">Count</th>
                    <th className="px-4 py-3 text-center font-medium">Analysis</th>
                    <th className="px-4 py-3 text-center font-medium">Report</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td className="px-4 py-8 text-center text-muted-foreground" colSpan={7}>
                        Loading incidents...
                      </td>
                    </tr>
                  ) : events.length === 0 ? (
                    <tr>
                      <td className="px-4 py-8 text-center text-muted-foreground" colSpan={7}>
                        No incidents found for the current filters.
                      </td>
                    </tr>
                  ) : (
                    events.map((event) => (
                      <tr
                        key={event.id}
                        className="cursor-pointer border-b border-border/70 transition-colors hover:bg-muted/15"
                        onClick={() => router.push(`/event/${event.id}`)}
                      >
                        <td className="px-4 py-3">
                          <div className="text-foreground font-medium">{event.sourceTool}</div>
                          <div className="text-muted-foreground text-xs">{event.id}</div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{formatTimestamp(event.timestamp)}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={cn("border", getPriorityTone(event.priority))}>
                            {event.priority}
                          </Badge>
                        </td>
                        <td className="max-w-[34rem] px-4 py-3 text-muted-foreground">
                          <p className="line-clamp-2">{event.description}</p>
                        </td>
                        <td className="px-4 py-3 text-center text-foreground">{event.count}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              "border",
                              event.askedAnalysis
                                ? event.finished
                                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                                  : "border-amber-500/30 bg-amber-500/10 text-amber-200"
                                : "border-border bg-muted text-muted-foreground",
                            )}
                          >
                            {event.askedAnalysis ? (event.finished ? "Completed" : "In Progress") : "Idle"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {event.reportUrl ? (
                            <Button
                              asChild
                              onClick={(eventClick) => eventClick.stopPropagation()}
                              size="sm"
                              variant="outline"
                            >
                              <a href={event.reportUrl} rel="noreferrer" target="_blank">
                                View
                              </a>
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-xs">Unavailable</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
