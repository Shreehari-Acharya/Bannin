"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col gap-4 sm:flex-row sm:gap-6",
        month: "space-y-4",
        caption: "relative flex items-center justify-center pt-1",
        caption_label: "text-sm font-medium",
        nav: "flex items-center gap-1",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100",
        ),
        month_caption: "text-sm font-medium",
        button_previous: "absolute left-1",
        button_next: "absolute right-1",
        table: "w-full border-collapse",
        weekdays: "flex",
        weekday:
          "w-9 text-[0.8rem] font-normal text-zinc-500 dark:text-zinc-400",
        week: "mt-2 flex w-full",
        day: cn(
          "relative h-9 w-9 p-0 text-center text-sm",
          "[&:has([aria-selected].day-range-end)]:rounded-r-md",
          "[&:has([aria-selected].day-outside)]:bg-white/5",
          "[&:has([aria-selected])]:bg-white/8",
          "first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
          "focus-within:relative focus-within:z-20",
        ),
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
        ),
        range_start: "day-range-start",
        range_end: "day-range-end",
        selected:
          "bg-cyan-400 text-slate-950 hover:bg-cyan-300 hover:text-slate-950 focus:bg-cyan-400 focus:text-slate-950",
        today: "bg-white/10 text-white",
        outside:
          "day-outside text-slate-500 opacity-60 aria-selected:bg-white/5 aria-selected:text-slate-500 aria-selected:opacity-30",
        disabled: "text-slate-500 opacity-50",
        range_middle:
          "aria-selected:bg-white/8 aria-selected:text-white",
        hidden: "invisible",
        ...classNames,
      }}
      {...props}
    />
  );
}

export { Calendar };
