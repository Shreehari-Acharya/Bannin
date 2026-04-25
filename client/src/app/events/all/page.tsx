"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { endOfDay, format, startOfDay } from "date-fns";
import { CalendarIcon } from "lucide-react";
import {
  Brush,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Header } from "@/components/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type SortOrder = "lf" | "of";
type EventsApiError = { error?: unknown };

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

interface AlertTrendPoint {
  sampledAt: number;
  sampledAtLabel: string;
  events: number;
  alerts: number;
  rawEvents: number;
  rawAlerts: number;
}

const DEFAULT_ROWS = 25;
const MAX_ROWS = 500;
const REFRESH_INTERVAL_MS = 5_000;
const MAX_TREND_POINTS = 36;
const IDLE_DECAY_RATIO = 0.18;
const CHART_MIN_WIDTH_PX = 680;
const CHART_POINT_WIDTH_PX = 44;

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
    return "border-sky-500/30 bg-sky-500/10 text-sky-200";
  }

  if (normalized === "medium" || normalized === "warning") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  }

  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
}

function decayValue(value: number): number {
  if (value <= 0) return 0;
  const drop = Math.max(1, Math.round(value * IDLE_DECAY_RATIO));
  return Math.max(0, value - drop);
}

async function fetchEvents(
  queryString: string,
  signal?: AbortSignal,
): Promise<EventSummary[]> {
  const endpoint = queryString ? `/api/events/all?${queryString}` : "/api/events/all";
  const res = await fetch(endpoint, { signal });

  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof (payload as EventsApiError).error === "string"
        ? (payload as EventsApiError).error
        : `Request failed (${res.status})`;

    throw new Error(message);
  }

  return Array.isArray(payload) ? (payload as EventSummary[]) : [];
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
  const [timeZone] = useState<string>(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [trendHistory, setTrendHistory] = useState<AlertTrendPoint[]>([]);

  const queryString = searchParams.toString();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStartDate(parseDate(searchParams.get("start")) ?? undefined);
    setEndDate(parseDate(searchParams.get("end")) ?? undefined);
    setRows(parseRows(searchParams.get("rows")));
    setSortOrder(parseSortOrder(searchParams));
  }, [queryString, searchParams]);

  const eventsQuery = useQuery({
    queryKey: ["events", "all", queryString],
    queryFn: ({ signal }) => fetchEvents(queryString, signal),
    refetchInterval: REFRESH_INTERVAL_MS,
    refetchIntervalInBackground: true,
  });

  const events = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);
  const loading = eventsQuery.isPending && !eventsQuery.data;
  const error = eventsQuery.error instanceof Error ? eventsQuery.error.message : null;
  const lastUpdated = eventsQuery.dataUpdatedAt ? new Date(eventsQuery.dataUpdatedAt) : null;
  const isRefreshing = eventsQuery.isFetching && !loading;

  const stats = useMemo(() => {
    const total = events.length;
    const reports = events.filter((event) => event.reportUrl).length;

    return { total, reports };
  }, [events]);

  const totalAlertCount = useMemo(
    () =>
      events.reduce((sum, event) => {
        const next = Number.isFinite(event.count) ? event.count : 0;
        return sum + next;
      }, 0),
    [events],
  );

  useEffect(() => {
    if (!eventsQuery.dataUpdatedAt) return;

    const sampledAt = eventsQuery.dataUpdatedAt;
    const sampledAtLabel = format(sampledAt, "HH:mm:ss");

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTrendHistory((previous) => {
      const last = previous[previous.length - 1];
      if (last && last.sampledAt === sampledAt) {
        return previous;
      }

      const hasSignals = stats.total > 0 || totalAlertCount > 0;
      const noRawGrowth =
        !!last &&
        totalAlertCount <= last.rawAlerts &&
        stats.total <= last.rawEvents;

      const shouldDecay = !!last && (!hasSignals || noRawGrowth);

      const events = shouldDecay && last ? decayValue(last.events) : stats.total;
      const alerts = totalAlertCount <= 0 ? 0 : shouldDecay && last ? decayValue(last.alerts) : totalAlertCount;

      const point: AlertTrendPoint = {
        sampledAt,
        sampledAtLabel,
        events,
        alerts,
        rawEvents: stats.total,
        rawAlerts: totalAlertCount,
      };

      return [...previous, point].slice(-MAX_TREND_POINTS);
    });
  }, [
    eventsQuery.dataUpdatedAt,
    stats.total,
    totalAlertCount,
  ]);

  const chartWidth = useMemo(
    () => Math.max(CHART_MIN_WIDTH_PX, trendHistory.length * CHART_POINT_WIDTH_PX),
    [trendHistory.length],
  );

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
      <Header fullWidth />
      <main className="relative w-full grow pb-14">
        <section className="flex flex-col gap-5 px-2 py-8 md:px-4 md:py-10 lg:px-8 xl:px-10">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-balance text-2xl text-foreground md:text-3xl">
                Incident Dashboard
              </h1>
              <Badge variant="secondary" className="border-border bg-card/70 text-foreground">
                {lastUpdated
                  ? `${isRefreshing ? "Syncing" : "Updated"} ${format(lastUpdated, "p")}`
                  : "Awaiting data"}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm tracking-wide md:text-base">
              Live event stream with analysis status and report readiness.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
            {[
              { label: "Total events", value: stats.total },
              { label: "Reports ready", value: stats.reports },
            ].map((item) => (
              <article
                key={item.label}
                className="rounded-sm border border-border/80 bg-card/70 px-4 py-3 shadow-sm backdrop-blur"
              >
                <p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">
                  {item.label}
                </p>
                <p className="mt-2 text-3xl text-foreground">{item.value}</p>
              </article>
            ))}
          </div>

          <div className="rounded-sm border border-border/80 bg-card/70 p-4 shadow-sm backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-medium text-foreground">Alert Activity (Live)</h2>
                <p className="text-muted-foreground text-xs">
                  Refreshes every {REFRESH_INTERVAL_MS / 1000} seconds from{" "}
                  <span className="font-mono">/api/events/all</span>.
                </p>
              </div>
              <Badge variant="outline" className="border-border/80">
                {trendHistory.length} samples
              </Badge>
            </div>

            <div className="mt-4 h-72 w-full overflow-x-auto overflow-y-hidden">
              {trendHistory.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Waiting for live alert samples...
                </div>
              ) : (
                <div className="h-full min-w-full" style={{ width: `${chartWidth}px` }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendHistory} margin={{ top: 8, right: 8, left: 0, bottom: 12 }}>
                      <CartesianGrid stroke="hsl(var(--border) / 0.45)" strokeDasharray="4 4" />
                      <XAxis
                        dataKey="sampledAtLabel"
                        minTickGap={20}
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                        tickMargin={8}
                      />
                      <YAxis
                        allowDecimals={false}
                        domain={[0, "auto"]}
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                        tickCount={6}
                        width={44}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "6px",
                        }}
                        formatter={(value: number) => [value.toLocaleString(), "Alerts"]}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                      />
                      <Line
                        dataKey="alerts"
                        dot={{ fill: "#60a5fa", r: 2 }}
                        name="Alerts"
                        stroke="#60a5fa"
                        strokeWidth={2}
                        type="monotone"
                      />
                      <Brush
                        dataKey="sampledAtLabel"
                        endIndex={trendHistory.length - 1}
                        height={20}
                        stroke="#60a5fa"
                        travellerWidth={10}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-sm border border-border/80 bg-card/70 p-4 shadow-sm backdrop-blur">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-12">
              <div className="flex flex-col gap-1.5 xl:col-span-3">
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

              <div className="flex flex-col gap-1.5 xl:col-span-3">
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

              <div className="flex flex-col gap-1.5 xl:col-span-2">
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

              <div className="flex flex-col gap-1.5 xl:col-span-2">
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

              <div className="grid grid-cols-2 items-end gap-2 md:col-span-2 xl:col-span-2">
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
            <div className="rounded-sm border border-sky-500/40 bg-sky-500/10 px-4 py-3 text-sky-200 text-sm">
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
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatTimestamp(event.timestamp)}
                        </td>
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
