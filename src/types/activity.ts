export type ActivityKind = "task" | "activity" | "event" | "deep_focus";

export interface ActivityEntry {
    title: string;
    kind: ActivityKind;
    completed?: boolean;
}