import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { Link } from "expo-router";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  mutedForeground: "#8A94A3",
  border: "#313843",
  success: "#28a745",
  warning: "#ffc107",
};

// Mock data based on my_requests.html
const mockRequests = [
  {
    id: "req1",
    make: "Toyota",
    model: "RAV4",
    status: "Active",
    notes:
      "Looking for a recent model, preferably hybrid, with low mileage. Must have a sunroof and good safety features.",
    created_at: "Oct 26, 2023",
    offer_count: 3,
  },
  {
    id: "req2",
    make: null,
    model: null,
    status: "Pending",
    notes:
      "I need a reliable and fuel-efficient small car for city driving. My budget is around 1.5M ETB. Open to suggestions.",
    created_at: "Sep 15, 2023",
    offer_count: 0,
  },
  {
    id: "req3",
    make: "Ford",
    model: "Ranger",
    status: "Closed",
    notes: "Looking for a 4x4 pickup truck for work purposes.",
    created_at: "Aug 01, 2023",
    offer_count: 5,
  },
];

const RequestCard = ({ request }: { request: (typeof mockRequests)[0] }) => {
  const statusColor =
    request.status.toLowerCase() === "active"
      ? COLORS.success
      : request.status.toLowerCase() === "pending"
      ? COLORS.warning
      : COLORS.mutedForeground;

  return (
    <View style={styles.requestCard}>
      <Link href={`/request/${request.id}`} asChild>
        <Pressable>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>
              {request.make && request.model
                ? `${request.make} ${request.model}`
                : "General Request"}
            </Text>
            <Text style={[styles.statusTag, { backgroundColor: statusColor }]}>
              {request.status}
            </Text>
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardNotes} numberOfLines={3}>
              {request.notes}
            </Text>
          </View>
        </Pressable>
      </Link>
      <View style={styles.cardFooter}>
        <View style={styles.footerStat}>
          <Text style={styles.footerLabel}>Submitted</Text>
          <Text style={styles.footerValue}>{request.created_at}</Text>
        </View>
        <View style={styles.footerStat}>
          <Text style={styles.footerLabel}>Offers</Text>
          <Text style={styles.footerValue}>{request.offer_count}</Text>
        </View>
        <Link href={`/request/${request.id}`} asChild>
          <Pressable style={styles.viewOffersButton}>
            <Text style={styles.viewOffersButtonText}>View Offers</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
};

const MyRequestsScreen = () => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {mockRequests.length > 0 ? (
          mockRequests.map((req) => <RequestCard key={req.id} request={req} />)
        ) : (
          <View style={styles.noRequestsContainer}>
            <Text style={styles.noRequestsText}>
              You have not made any car requests yet.
            </Text>
            <Link href="/request" asChild>
              <Pressable>
                <Text style={styles.linkText}>Find a car now!</Text>
              </Pressable>
            </Link>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, gap: 20 },
  requestCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  cardTitle: { fontSize: 18, fontWeight: "bold", color: COLORS.foreground },
  statusTag: {
    color: "#fff",
    fontWeight: "bold",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 12,
    overflow: "hidden",
  },
  cardBody: { padding: 15 },
  cardNotes: { color: COLORS.mutedForeground, fontSize: 15, lineHeight: 22 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: "#181D25",
  },
  footerStat: { alignItems: "center" },
  footerLabel: { color: COLORS.mutedForeground, fontSize: 12 },
  footerValue: { color: COLORS.foreground, fontSize: 16, fontWeight: "600" },
  viewOffersButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  viewOffersButtonText: { color: COLORS.foreground, fontWeight: "bold" },
  noRequestsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  noRequestsText: {
    color: COLORS.mutedForeground,
    fontSize: 16,
    textAlign: "center",
  },
  linkText: {
    color: COLORS.accent,
    fontSize: 16,
    marginTop: 10,
    fontWeight: "600",
  },
});

export default MyRequestsScreen;
