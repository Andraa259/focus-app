import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
} from "react-native";
import FocusCard from "./src/components/FocusCard";
import { ActivityEntry, ActivityKind } from "./src/types/activity";
import { loadActivities, saveActivities } from "./src/storage/activityStorage";
import type { RecurringTemplate, Weekday } from "./src/types/recurringTemplate";
import { sampleTemplates } from "./src/data/sampleTemplates";
import type { DateOverride } from "./src/types/dateOverride";
import { resolveOccurrence } from "./src/utils/resolveOccurrence";

const weekdayLabels = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const hours = Array.from({ length: 17 }, (_, index) => index + 6);

const activityKinds: { value: ActivityKind; label: string }[] = [
  { value: "task", label: "Tugas" },
  { value: "activity", label: "Kegiatan" },
  { value: "event", label: "Acara" },
  { value: "deep_focus", label: "Fokus" },
];

function getDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

function cancelTemplateForDate(templateId: string) {
  const newOverride: DateOverride = {
    id: `${templateId}-${selectedDate}`,
    templateId,
    date: selectedDate,
    action: "cancel",
  };

  setDateOverrides((currentOverrides) => [
    ...currentOverrides.filter(
      (item) =>
        item.templateId !== templateId || item.date !== selectedDate,
    ),
    newOverride,
  ]);
}

export default function App() {
  const [selectedDate, setSelectedDate] = useState(() =>
    getDateKey(new Date()),
  );
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [activities, setActivities] = useState<Record<string, ActivityEntry>>({});
  const [isActivitiesLoaded, setIsActivitiesLoaded] = useState(false);
  const [activityDraft, setActivityDraft] = useState("");
  const [activityError, setActivityError] = useState("");
  const [activityKind, setActivityKind] = useState<ActivityKind>("task");
  const [dateOverrides, setDateOverrides] = useState<DateOverride[]>([]);

  const today = new Date();
  const daysSinceMonday = (today.getDay() + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysSinceMonday + weekOffset * 7);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const weekRangeLabel =
    monday.getMonth() === sunday.getMonth()
      ? `${monday.getDate()}–${sunday.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}`
      : `${monday.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
        })}–${sunday.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}`;
  const days = weekdayLabels.map((label, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);

    return {
      label,
      date,
      dateKey: getDateKey(date),
    };
  });

  const selectedDay = days.find((day) => day.dateKey === selectedDate);
  const selectedDateLabel = selectedDay
    ? selectedDay.date.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";
  const resolvedOccurrences = sampleTemplates
    .map((template) =>
      resolveOccurrence(template, selectedDate, dateOverrides),
    )
    .filter((occurrence) => occurrence !== null);

  const selectedDateActivities = Object.entries(activities)
      .filter(([key]) => key.startsWith(`${selectedDate}-`))
      .map(([, activity]) => activity);

  const taskCount = selectedDateActivities.filter(
      (activity) => activity.kind === "task",
    ).length;

    const completedTaskCount = selectedDateActivities.filter(
      (activity) => activity.kind === "task" && activity.completed === true,
    ).length;
    const taskProgressText =
      taskCount === 0
        ? "Belum ada tugas"
        : `${completedTaskCount} dari ${taskCount} tugas selesai`;
    const taskProgressPercent =
      taskCount === 0 ? 0 : Math.round((completedTaskCount / taskCount) * 100);

  useEffect(() => {
    async function loadSavedActivities() {
      try {
        const savedActivities = await loadActivities();
        setActivities(savedActivities);
      } catch (error) {
        console.error("Gagal memuat kegiatan:", error);
      } finally {
        setIsActivitiesLoaded(true);
      }
    }

    loadSavedActivities();
  }, []);

  useEffect(() => {
    if (!isActivitiesLoaded) {
      return;
    }

    saveActivities(activities).catch((error) => {
      console.error("Gagal menyimpan kegiatan:", error);
    });
  }, [activities, isActivitiesLoaded]);

  function saveActivity() {
    if (selectedHour === null) {
      return;
    }

    const title = activityDraft.trim();

    if (title.length === 0) {
      setActivityError("Nama kegiatan wajib diisi.");
      return;
    }

    const activityKey = `${selectedDate}-${selectedHour}`;

    setActivities((currentActivities) => ({
      ...currentActivities,
      [activityKey]: {
        title,
        kind: activityKind,
      },
    }));

    setActivityError("");
  }


  function deleteActivity() {
    if (selectedHour === null) {
      return;
    }

    const activityKey = `${selectedDate}-${selectedHour}`;

    setActivities((currentActivities) => {
      const updatedActivities = { ...currentActivities };
      delete updatedActivities[activityKey];
      return updatedActivities;
    });

    setActivityDraft("");
  }

  function toggleTaskCompleted(activityKey: string) {
    setActivities((currentActivities) => {
      const activity = currentActivities[activityKey];

      if (!activity || activity.kind !== "task") {
        return currentActivities;
      }

      return {
        ...currentActivities,
        [activityKey]: {
          ...activity,
          completed: !activity.completed,
        },
      };
    });
  }

  function changeWeek(direction: -1 | 1) {
    const nextWeekOffset = weekOffset + direction;
    const nextMonday = new Date(monday);
    nextMonday.setDate(monday.getDate() + direction * 7);

    setWeekOffset(nextWeekOffset);
    setSelectedDate(getDateKey(nextMonday));
    setSelectedHour(null);
    setActivityDraft("");
    setActivityError("");
  }

  function goToToday() {
    setWeekOffset(0);
    setSelectedDate(getDateKey(new Date()));
    setSelectedHour(null);
    setActivityDraft("");
    setActivityKind("task");
    setActivityError("");
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Jadwal</Text>

      <Text style={styles.description}>
        {selectedDateLabel}
      </Text>

      <View style={styles.progressCard}>
        <Text style={styles.progressTitle}>Progres tugas</Text>
        <Text style={styles.progressText}>{taskProgressText}</Text>
        <View
          style={styles.progressTrack}
          accessibilityRole="progressbar"
          accessibilityValue={{
            min: 0,
            max: 100,
            now: taskProgressPercent,
          }}
          accessibilityLabel="Progres penyelesaian tugas"
        >
          <View
            style={[
              styles.progressFill,
              { width: `${taskProgressPercent}%` },
            ]}
          />
        </View>

        <Text style={styles.progressPercent}>
          {taskProgressPercent}%
        </Text>
      </View>

      <View style={styles.weekNavigation}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Minggu sebelumnya"
          onPress={() => changeWeek(-1)}
          style={styles.weekButton}
        >
          <Text style={styles.weekButtonText}>‹</Text>
        </Pressable>

        <View style={styles.weekCenter}>
          <Pressable
            accessibilityRole="button"
            onPress={goToToday}
            style={styles.todayButton}
          >
            <Text style={styles.todayButtonText}>Hari ini</Text>
          </Pressable>

          <Text style={styles.weekRange}>{weekRangeLabel}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Minggu berikutnya"
          onPress={() => changeWeek(1)}
          style={styles.weekButton}
        >
          <Text style={styles.weekButtonText}>›</Text>
        </Pressable>
      </View>

      <View style={styles.daysRow}>
        {days.map((day) => {
          const isSelected = selectedDate === day.dateKey;

          return (
            <Pressable
              key={day.dateKey}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => {
                setSelectedDate(day.dateKey);
                setSelectedHour(null);
                setActivityDraft("");
                setActivityKind("task");
                setActivityError("");
              }}
              style={[
                styles.dayButton,
                isSelected && styles.selectedDayButton,
              ]}
            >
              <Text
                style={[
                  styles.dayLabel,
                  isSelected && styles.selectedDayText,
                ]}
              >
                {day.label}
              </Text>

              <Text
                style={[
                  styles.dayDate,
                  isSelected && styles.selectedDayText,
                ]}
              >
                {day.date.getDate()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FocusCard />

      <View style={styles.schedule}>
        <Text style={styles.sectionTitle}>Jadwal per jam</Text>

        {hours.map((hour) => (
          <View key={hour} style={styles.timeSlot}>
            <Text style={styles.timeLabel}>
              {formatHour(hour)}
            </Text>

            <View
              style={[
                styles.slotContent,
                selectedHour === hour && styles.selectedSlot,
              ]}
            >
              {(() => {
                const activityKey = `${selectedDate}-${hour}`;
                const activity = activities[activityKey];
                const occurrence = resolvedOccurrences.find(
                  (item) =>
                    item.status === "scheduled" &&
                    item.startHour === hour,
                );
                if (!activity && occurrence?.status === "scheduled") {
                  return (
                    <View style={styles.templateSlot}>
                      <Text style={styles.templateLabel}>
                        {occurrence.source === "override" ? "PENGGANTI" : "RUTIN"}
                      </Text>

                      <Text style={styles.templateTitle}>
                        {occurrence.title}
                      </Text>

                      {occurrence.source === "template" && (
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => cancelTemplateForDate(occurrence.templateId)}
                          style={styles.cancelRoutineButton}
                        >
                          <Text style={styles.cancelRoutineText}>
                            Batalkan rutin hari ini
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  );
                }
                if (!activity) {
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: selectedHour === hour }}
                      onPress={() => {
                        setSelectedHour(hour);
                        setActivityDraft("");
                        setActivityKind("task");
                        setActivityError("");
                      }}
                      style={styles.slotSelectButton}
                    >
                      <Text style={styles.emptySlot}>+ Pilih slot</Text>
                    </Pressable>
                  );
                }

                const kindLabel =
                  activityKinds.find((kind) => kind.value === activity.kind)?.label ??
                  "Kegiatan";

                return (
                  <View style={styles.activityRow}>
                    {activity.kind === "task" && (
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: Boolean(activity.completed) }}
                        accessibilityLabel={`Tandai ${activity.title} ${
                          activity.completed ? "belum selesai" : "selesai"
                        }`}
                        onPress={() => toggleTaskCompleted(activityKey)}
                        style={[
                          styles.checkbox,
                          activity.completed && styles.checkedCheckbox,
                        ]}
                      >
                        <Text style={styles.checkboxText}>
                          {activity.completed ? "✓" : ""}
                        </Text>
                      </Pressable>
                    )}

                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: selectedHour === hour }}
                      onPress={() => {
                        setSelectedHour(hour);
                        setActivityDraft(activity.title);
                        setActivityKind(activity.kind);
                        setActivityError("");
                      }}
                      style={styles.activitySelectButton}
                    >
                      <Text
                        style={[
                          styles.activityTitle,
                          activity.kind === "task" &&
                            activity.completed &&
                            styles.completedActivityTitle,
                          selectedHour === hour && styles.selectedActivityTitle,
                        ]}
                      >
                        {activity.title} · {kindLabel}
                      </Text>
                    </Pressable>
                  </View>
                );
              })()}
            </View>
          </View>
        ))}
        {selectedHour !== null && (
          <View style={styles.activityForm}>
            <Text style={styles.formTitle}>
              Kegiatan pukul {formatHour(selectedHour)}–{formatHour(selectedHour + 1)}
            </Text>

            <TextInput
              value={activityDraft}
              onChangeText={(text) => {
                setActivityDraft(text);
                setActivityError("");
              }}
              placeholder="Contoh: Belajar React Native"
              style={styles.activityInput}
              accessibilityLabel="Nama kegiatan"
            />
            {activityError !== "" && (
              <Text style={styles.errorText}>{activityError}</Text>
            )}
            <Text style={styles.kindLabel}>Jenis kegiatan</Text>

            <View style={styles.kindOptions}>
              {activityKinds.map((kind) => {
                const isSelected = activityKind === kind.value;

                return (
                  <Pressable
                    key={kind.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => setActivityKind(kind.value)}
                    style={[
                      styles.kindOption,
                      isSelected && styles.selectedKindOption,
                    ]}
                  >
                    <Text
                      style={[
                        styles.kindOptionText,
                        isSelected && styles.selectedKindOptionText,
                      ]}
                    >
                      {kind.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={saveActivity}
              style={styles.saveButton}
            >
              <Text style={styles.saveButtonText}>Simpan kegiatan</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={deleteActivity}
              style={styles.deleteButton}
            >
              <Text style={styles.deleteButtonText}>Hapus kegiatan</Text>
            </Pressable>
          </View>
        )}
      </View>

      <StatusBar style="auto" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 72,
    backgroundColor: "#F8FAFC",
  },
  heading: {
    color: "#0F172A",
    fontSize: 30,
    fontWeight: "700",
  },
  description: {
    marginTop: 6,
    marginBottom: 24,
    color: "#64748B",
    fontSize: 15,
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  dayButton: {
    width: 40,
    minHeight: 60,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },
  selectedDayButton: {
    backgroundColor: "#1D4ED8",
  },
  dayLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
  },
  dayDate: {
    marginTop: 5,
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "700",
  },
  selectedDayText: {
    color: "#FFFFFF",
  },
    schedule: {
    marginTop: 24,
    paddingBottom: 32,
  },
  sectionTitle: {
    marginBottom: 12,
    color: "#0F172A",
    fontSize: 20,
    fontWeight: "700",
  },
  timeSlot: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  timeLabel: {
    width: 58,
    color: "#64748B",
    fontSize: 13,
    fontWeight: "600",
  },
  slotContent: {
    minHeight: 48,
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  emptySlot: {
    color: "#94A3B8",
    fontSize: 14,
  },
  selectedSlot: {
  backgroundColor: "#DBEAFE",
  borderWidth: 1,
  borderColor: "#1D4ED8",
  },
  selectedSlotText: {
    color: "#1D4ED8",
    fontWeight: "700",
  },
  activityForm: {
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },
  formTitle: {
    marginBottom: 10,
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "700",
  },
  activityInput: {
    minHeight: 48,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    color: "#0F172A",
  },
  saveButton: {
    marginTop: 12,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#1D4ED8",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  deleteButton: {
    marginTop: 8,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
  },
  deleteButtonText: {
    color: "#B91C1C",
    fontSize: 15,
    fontWeight: "700",
  },
  kindLabel: {
    marginTop: 16,
    marginBottom: 8,
    color: "#334155",
    fontSize: 14,
    fontWeight: "600",
  },
  kindOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  kindOption: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
  },
  selectedKindOption: {
    borderColor: "#1D4ED8",
    backgroundColor: "#DBEAFE",
  },
  kindOptionText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "600",
  },
  selectedKindOptionText: {
    color: "#1D4ED8",
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 24,
    height: 24,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#94A3B8",
    borderRadius: 7,
    backgroundColor: "#FFFFFF",
  },
  checkedCheckbox: {
    borderColor: "#16A34A",
    backgroundColor: "#16A34A",
  },
  checkboxText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  activityTitle: {
    flex: 1,
    color: "#334155",
    fontSize: 14,
  },
  completedActivityTitle: {
    color: "#94A3B8",
    textDecorationLine: "line-through",
  },
  errorText: {
    marginTop: 6,
    color: "#B91C1C",
    fontSize: 13,
  },
  progressCard: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#E0F2FE",
  },
  progressTitle: {
    color: "#075985",
    fontSize: 14,
    fontWeight: "700",
  },
  progressText: {
    marginTop: 4,
    color: "#0C4A6E",
    fontSize: 16,
  },
  weekNavigation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  weekTitle: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "700",
  },
  weekButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  weekButtonText: {
    color: "#1D4ED8",
    fontSize: 26,
    fontWeight: "600",
  },
  todayButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#DBEAFE",
  },
  todayButtonText: {
    color: "#1D4ED8",
    fontSize: 14,
    fontWeight: "700",
  },
  weekCenter: {
    alignItems: "center",
  },
  weekRange: {
    marginTop: 6,
    color: "#64748B",
    fontSize: 12,
  },
  slotSelectButton: {
    flex: 1,
    minHeight: 48,
    justifyContent: "center",
  },
  activitySelectButton: {
    flex: 1,
    minHeight: 48,
    justifyContent: "center",
    paddingVertical: 8,
  },
  selectedActivityTitle: {
    color: "#1D4ED8",
    fontWeight: "700",
  },
  progressTrack: {
    height: 10,
    marginTop: 10,
    overflow: "hidden",
    borderRadius: 5,
    backgroundColor: "#BAE6FD",
  },
  progressFill: {
    height: "100%",
    borderRadius: 5,
    backgroundColor: "#0284C7",
  },
  progressPercent: {
    marginTop: 6,
    color: "#075985",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right",
  },
  templateSlot: {
    flex: 1,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#A5B4FC",
    backgroundColor: "#EEF2FF",
  },
  templateLabel: {
    color: "#4338CA",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  templateTitle: {
    marginTop: 3,
    color: "#312E81",
    fontSize: 14,
    fontWeight: "600",
  },
  cancelRoutineButton: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
  },
  cancelRoutineText: {
    color: "#B91C1C",
    fontSize: 12,
    fontWeight: "600",
  },
});