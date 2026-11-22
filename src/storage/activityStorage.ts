import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityEntry } from "../types/activity";

const ACTIVITIES_STORAGE_KEY = "focus-...ties";

export async function loadActivities():Promise<Record<string, ActivityEntry>> {
    const storedValue = await AsyncStorage.getItem(ACTIVITIES_STORAGE_KEY);
    if (storedValue === null) {
        return {};
    }
    return JSON.parse(storedValue) as Record<string, ActivityEntry>;
}

export async function saveActivities(activities: Record<string, ActivityEntry>): Promise<void> {
    const serializedActivities = JSON.stringify(activities);
    await AsyncStorage.setItem(ACTIVITIES_STORAGE_KEY, serializedActivities);
}