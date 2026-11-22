import type { ActivityKind } from "./activity";

interface DateOverrideBase {
  id: string;
  templateId: string;
  date: string;
}

export type DateOverride =
  | (DateOverrideBase & {
      action: "cancel";
    })
  | (DateOverrideBase & {
      action: "replace";
      replacement: {
        title: string;
        kind: ActivityKind;
        startHour: number;
        durationHours: number;
      };
    });