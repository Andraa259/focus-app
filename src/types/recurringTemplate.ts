import type { ActivityKind } from "./activity";

export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface RecurringTemplate {
  id: string;
  title: string;
  kind: ActivityKind;
  weekday: Weekday;
  startHour: number;
  durationHours: number;
  activeFrom: string;
  activeUntil?: string;
}