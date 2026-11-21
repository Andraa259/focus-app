import { StyleSheet, Text, View } from "react-native";

export default function FocusCard() {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>SESI FOKUS</Text>
      <Text style={styles.title}>Siap fokus?</Text>
      <Text style={styles.description}>
        Pilih satu hal penting untuk dikerjakan sekarang.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    padding: 20,
    borderRadius: 20,
    backgroundColor: "#1D4ED8",
  },
  label: {
    color: "#BFDBFE",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  title: {
    marginTop: 10,
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
  },
  description: {
    marginTop: 6,
    color: "#DBEAFE",
    fontSize: 15,
    lineHeight: 22,
  },
});
