import type { DateOverride } from "../types/dateOverride";
import type { RecurringTemplate } from "../types/recurringTemplate";

export type ResolvedOccurrence =
  | {
      status: "scheduled";
      source: "template";
      title: string;
      kind: RecurringTemplate["kind"];
      startHour: number;
      durationHours: number;
    }
  | {
      status: "cancelled";
      templateId: string;
      date: string;
    }
  | {
      status: "scheduled";
      source: "override";
      title: string;
      kind: RecurringTemplate["kind"];
      startHour: number;
      durationHours: number;
    };

function getWeekday(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  const javascriptDay = date.getDay();

  return javascriptDay === 0 ? 7 : javascriptDay;
}

export function resolveOccurrence(
  template: RecurringTemplate,
  date: string,
  overrides: DateOverride[],
): ResolvedOccurrence | null {
  const weekday = getWeekday(date);

  const isCorrectWeekday = template.weekday === weekday;
  const isAfterStart = date >= template.activeFrom;
  const isBeforeEnd =
    template.activeUntil === undefined || date <= template.activeUntil;

  if (!isCorrectWeekday || !isAfterStart || !isBeforeEnd) {
    return null;
  }

  const override = overrides.find(
    (item) => item.templateId === template.id && item.date === date,
  );

  if (!override) {
    return {
      status: "scheduled",
      source: "template",
      title: template.title,
      kind: template.kind,
      startHour: template.startHour,
      durationHours: template.durationHours,
    };
  }

  if (override.action === "cancel") {
    return {
      status: "cancelled",
      templateId: template.id,
      date,
    };
  }

  return {
    status: "scheduled",
    source: "override",
    title: override.replacement.title,
    kind: override.replacement.kind,
    startHour: override.replacement.startHour,
    durationHours: override.replacement.durationHours,
  };
}