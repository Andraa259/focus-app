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

export default function App() {
  const [selectedDate, setSelectedDate] = useState(() =>
    getDateKey(new Date()),
  );
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [activities, setActivities] = useState<Record<string, ActivityEntry>>({});
  const [isActivitiesLoaded, setIsActivitiesLoaded] = useState(false);
  const [activityDraft, setActivityDraft] = useState("");
  const [activityKind, setActivityKind] = useState<ActivityKind>("task");


  const today = new Date();
  const daysSinceMonday = (today.getDay() + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysSinceMonday);

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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Jadwal</Text>

      <Text style={styles.description}>
        {selectedDateLabel}
      </Text>

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
              {String(hour).padStart(2, "0")}:00
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: selectedHour === hour }}
              onPress={() => {
                const existingActivity = activities[`${selectedDate}-${hour}`];

                setSelectedHour(hour);
                setActivityDraft(existingActivity?.title ?? "");
                setActivityKind(existingActivity?.kind ?? "task");
              }}
              style={[
                styles.slotContent,
                selectedHour === hour && styles.selectedSlot,
              ]}
            >
              <Text
                style={[
                  styles.emptySlot,
                  selectedHour === hour && styles.selectedSlotText,
                ]}
              >
                {activities[`${selectedDate}-${hour}`]
                ? `${activities[`${selectedDate}-${hour}`].title} · ${
                    activityKinds.find(
                      (kind) =>
                        kind.value === activities[`${selectedDate}-${hour}`].kind,
                    )?.label ?? "Kegiatan"
                  }`
                : "+ Pilih slot"}
              </Text>
            </Pressable>
          </View>
        ))}
        {selectedHour !== null && (
          <View style={styles.activityForm}>
            <Text style={styles.formTitle}>
              Kegiatan pukul {String(selectedHour).padStart(2, "0")}:00
            </Text>

            <TextInput
              value={activityDraft}
              onChangeText={setActivityDraft}
              placeholder="Contoh: Belajar React Native"
              style={styles.activityInput}
              accessibilityLabel="Nama kegiatan"
            />
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
});