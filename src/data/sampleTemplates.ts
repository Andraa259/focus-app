import type { RecurringTemplate } from "../types/recurringTemplate";

export const sampleTemplates: RecurringTemplate[] = [
  {
    id: "monday-study",
    title: "Belajar rutin",
    kind: "deep_focus",
    weekday: 1,
    startHour: 9,
    durationHours: 1,
    activeFrom: "2026-01-01",
  },
  {
    id: "wednesday-class",
    title: "Kelas rutin",
    kind: "event",
    weekday: 3,
    startHour: 13,
    durationHours: 2,
    activeFrom: "2026-01-01",
  },
];