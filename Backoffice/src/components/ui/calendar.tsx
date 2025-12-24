"use client";

import * as React from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { Locale } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "./utils";
import { buttonVariants } from "./button";

type CalendarMode = "single" | "range";

interface DateRangeValue {
  from?: Date;
  to?: Date;
}

type DivProps = Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect">;

interface CalendarProps extends DivProps {
  mode?: CalendarMode;
  selected?: Date | DateRangeValue;
  onSelect?: (value: Date | DateRangeValue | undefined) => void;
  numberOfMonths?: number;
  showOutsideDays?: boolean;
  locale?: Locale;
  monthLabels?: string[];
  onDayPick?: (day: Date) => void;
}

const weekStartsOn = 1; // Monday

const normalizeRange = (range?: DateRangeValue | null) => {
  if (!range?.from) return undefined;
  if (range.to && isBefore(range.to, range.from)) {
    return { from: range.to, to: range.from };
  }
  return range;
};

const getWeekdayLabels = (locale: Locale) =>
  Array.from({ length: 7 }, (_, index) => {
    const dayIndex = ((index + weekStartsOn) % 7) as
      | 0
      | 1
      | 2
      | 3
      | 4
      | 5
      | 6;
    return (
      locale.localize?.day(dayIndex, { width: "short" }) ??
      ["Di", "Lu", "Ma", "Me", "Je", "Ve", "Sa"][dayIndex]
    );
  });

const buildMonthDays = ({
  month,
  locale,
}: {
  month: Date;
  locale: Locale;
}) => {
  const start = startOfWeek(startOfMonth(month), { locale, weekStartsOn });
  const end = endOfWeek(endOfMonth(month), { locale, weekStartsOn });
  return eachDayOfInterval({ start, end });
};

export function Calendar({
  className,
  mode = "single",
  selected,
  onSelect,
  numberOfMonths = 1,
  showOutsideDays = true,
  locale = fr,
  monthLabels,
  onDayPick,
  ...rest
}: CalendarProps) {
  const today = React.useMemo(() => new Date(), []);

  const initialMonth = React.useMemo(() => {
    if (mode === "range") {
      const range = selected as DateRangeValue | undefined;
      if (range?.from) return startOfMonth(range.from);
    } else if (selected instanceof Date) {
      return startOfMonth(selected);
    }
    return startOfMonth(new Date());
  }, [mode, selected]);

  const [currentMonth, setCurrentMonth] = React.useState(initialMonth);

  React.useEffect(() => {
    if (mode === "range") {
      const range = selected as DateRangeValue | undefined;
      if (range?.from) {
        setCurrentMonth((prev) =>
          isSameMonth(prev, range.from!) ? prev : startOfMonth(range.from!),
        );
      }
    } else if (selected instanceof Date) {
      setCurrentMonth((prev) =>
        isSameMonth(prev, selected) ? prev : startOfMonth(selected),
      );
    }
  }, [mode, selected]);

  const monthsToDisplay = React.useMemo(
    () =>
      Array.from({ length: numberOfMonths }, (_, index) =>
        addMonths(currentMonth, index),
      ),
    [currentMonth, numberOfMonths],
  );

  const handleDayClick = (day: Date) => {
    if (onDayPick) {
      onDayPick(day);
      return;
    }
    if (mode === "range") {
      const current = (selected as DateRangeValue) ?? {};
      if (!current.from || current.to) {
        onSelect?.({ from: day, to: undefined });
        return;
      }
      if (isBefore(day, current.from)) {
        onSelect?.({ from: day, to: current.from });
        return;
      }
      if (isSameDay(day, current.from)) {
        onSelect?.({ from: day, to: day });
        return;
      }
      onSelect?.({ from: current.from, to: day });
      return;
    }
    onSelect?.(day);
  };

  const renderDay = (day: Date, month: Date) => {
    const isOutside = !isSameMonth(day, month);
    if (isOutside && !showOutsideDays) {
      return <span key={day.toISOString()} />;
    }

    const isToday = isSameDay(day, today);
    const range = normalizeRange(
      mode === "range" ? (selected as DateRangeValue) : undefined,
    );
    const isRangeStart = !!range?.from && isSameDay(day, range.from);
    const isRangeEnd = !!range?.to && isSameDay(day, range.to);
    const isRangeMiddle =
      !!range?.from &&
      !!range?.to &&
      isWithinInterval(day, { start: range.from, end: range.to }) &&
      !isRangeStart &&
      !isRangeEnd;

    const isSingleSelected =
      mode === "single" &&
      selected instanceof Date &&
      isSameDay(day, selected as Date);

    const dayClasses = cn(
      "mx-auto flex size-10 items-center justify-center rounded-full text-sm font-semibold transition-colors",
      buttonVariants({ variant: "ghost" }),
      {
        "text-gray-300": isOutside,
        "text-gray-900": !isOutside,
        "bg-emerald-600 text-white hover:bg-emerald-600":
          isRangeStart || isRangeEnd || isSingleSelected,
        "bg-emerald-50 text-emerald-700":
          isRangeMiddle || (isToday && !isRangeStart && !isRangeEnd && !isSingleSelected),
      },
    );

    return (
      <button
        type="button"
        key={day.toISOString()}
        onClick={() => handleDayClick(day)}
        className={dayClasses}
      >
        {format(day, "d", { locale })}
      </button>
    );
  };

  const weekdayLabels = getWeekdayLabels(locale);

  return (
    <div
      className={cn(
        "rounded-3xl border border-gray-100 bg-white p-4",
        className,
      )}
      {...rest}
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setCurrentMonth((prev) => addMonths(prev, -1))}
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "size-9 rounded-full p-0 text-gray-500 hover:text-gray-900",
          )}
          aria-label="Mois précédent"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="text-center text-base font-semibold text-gray-900">
          {format(currentMonth, "MMMM yyyy", { locale })}
        </div>
        <button
          type="button"
          onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "size-9 rounded-full p-0 text-gray-500 hover:text-gray-900",
          )}
          aria-label="Mois suivant"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      <div
        className={cn(
          "grid gap-6",
          numberOfMonths > 1 ? "md:grid-cols-2" : "grid-cols-1",
        )}
      >
        {monthsToDisplay.map((month, index) => {
          const days = buildMonthDays({ month, locale });
          const contextualLabel = monthLabels?.[index];
          return (
            <div key={month.toISOString()} className="space-y-3">
              <div className="text-center space-y-1">
                {contextualLabel ? (
                  <p className="text-[0.65rem] uppercase tracking-[0.3em] text-gray-400">
                    {contextualLabel}
                  </p>
                ) : null}
                {(numberOfMonths > 1 || !contextualLabel) && (
                  <p className="text-sm font-semibold text-gray-800">
                    {format(month, "MMMM yyyy", { locale })}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-7 text-center text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-gray-500">
                {weekdayLabels.map((label, index) => (
                  <span key={`${month.toISOString()}-weekday-${index}`}>
                    {label}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-1 text-sm">
                {days.map((day) => renderDay(day, month))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
