import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { getDealerPipeline, updateDealerPipeline } from "@/lib/api/dealer";
import { DEALER_ROUTES } from "@/lib/roleRoutes";

const COLORS = {
  background: "#14181F",
  card: "#1C212B",
  text: "#F8F8F8",
  textSecondary: "#8A94A3",
  accent: "#6118D7",
  success: "#28a745",
  warning: "#ffc107",
  border: "#313843",
};

interface PipelineEntry {
  id: number;
  dealer_bid_id: number;
  deal_id?: number | null;
  request_id: number;
  stage: string;
  last_activity_at?: string | null;
  next_follow_up_at?: string | null;
  follow_up_due?: boolean;
  notes?: string | null;
  bid?: {
    price: number;
    make: string;
    model: string;
    car_year: number;
    status: string;
  } | null;
}

const STAGE_LABELS: Record<string, string> = {
  offer_sent: "Offer sent",
  buyer_viewed: "Buyer viewed",
  question_received: "Question received",
  follow_up_needed: "Follow-up needed",
  deal_accepted: "Deal accepted",
  deal_completed: "Deal completed",
  lost: "Lost",
};

export default function DealerPipelineScreen() {
  const [entries, setEntries] = useState<PipelineEntry[]>([]);
  const [stage, setStage] = useState<string | undefined>();
  const [stages, setStages] = useState<string[]>([]);
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchPipeline = useCallback(async (
    selectedStage = stage,
    options: { isRefresh?: boolean; initial?: boolean } = {}
  ) => {
    const { isRefresh = false, initial = false } = options;
    if (initial) {
      setLoading(true);
    } else if (!isRefresh) {
      setListLoading(true);
    }
    try {
      setErrorMessage(null);
      const response = await getDealerPipeline(selectedStage);
      setEntries(response.data.pipeline || []);
      setStages(response.data.stages || []);
      setStageCounts(response.data.stage_counts || {});
    } catch (error) {
      console.error("Failed to load dealer pipeline:", error);
      setEntries([]);
      setErrorMessage(
        "Could not load your follow-up pipeline. If this is the hosted app, pull the latest backend, run flask db upgrade, and reload the web app."
      );
      if (initial) {
        Alert.alert("Pipeline Error", "Could not load your follow-up pipeline.");
      }
    } finally {
      setLoading(false);
      setListLoading(false);
      setRefreshing(false);
    }
  }, [stage]);

  useEffect(() => {
    fetchPipeline(undefined, { initial: true });
  }, []);

  const selectStage = (nextStage?: string) => {
    setStage(nextStage);
    fetchPipeline(nextStage);
  };

  const markFollowUpNeeded = async (entry: PipelineEntry) => {
    try {
      await updateDealerPipeline(entry.dealer_bid_id, {
        stage: "follow_up_needed",
      });
      fetchPipeline(stage, { isRefresh: true });
    } catch (error) {
      console.error("Failed to update pipeline:", error);
      Alert.alert("Update Failed", "Could not update this lead.");
    }
  };

  const getEntryAction = (entry: PipelineEntry) => {
    if (["deal_accepted", "deal_completed"].includes(entry.stage)) {
      return {
        label: "View deal",
        disabled: !entry.deal_id,
        onPress: () => {
          if (entry.deal_id) {
            router.push(`/deal/${entry.deal_id}` as any);
          }
        },
      };
    }

    if (entry.stage === "lost") {
      return {
        label: "Closed by another dealer",
        disabled: true,
        onPress: () => {},
      };
    }

    return {
      label: "Open request",
      disabled: false,
      onPress: () =>
        router.push({
          pathname: DEALER_ROUTES.placeOffer as any,
          params: { request_id: String(entry.request_id) },
        }),
    };
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.replace(DEALER_ROUTES.dashboard as any)}>
          <Ionicons name="chevron-back" size={28} color={COLORS.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Lead Pipeline</Text>
        <View style={{ width: 28 }} />
      </View>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchPipeline(stage, { isRefresh: true });
            }}
            tintColor={COLORS.accent}
          />
        }
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stageRow}
        >
          <Pressable
            style={[styles.stageChip, !stage && styles.stageChipActive]}
            onPress={() => selectStage(undefined)}
          >
            <Text style={styles.stageText}>All</Text>
            <Text style={styles.stageCountText}>{stageCounts.all || 0}</Text>
          </Pressable>
          {stages.map((item) => (
            <Pressable
              key={item}
              style={[styles.stageChip, stage === item && styles.stageChipActive]}
              onPress={() => selectStage(item)}
            >
              <Text style={styles.stageText}>{STAGE_LABELS[item] || item}</Text>
              <Text style={styles.stageCountText}>{stageCounts[item] || 0}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.list}>
          {errorMessage ? (
            <View style={styles.errorBox}>
              <Ionicons
                name="warning-outline"
                size={20}
                color={COLORS.warning}
              />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : listLoading ? (
            <View style={styles.listLoading}>
              <ActivityIndicator color={COLORS.accent} />
              <Text style={styles.listLoadingText}>Loading leads...</Text>
            </View>
          ) : entries.length ? (
            entries.map((entry) => (
              <View key={entry.id} style={styles.card}>
                {(() => {
                  const entryAction = getEntryAction(entry);
                  return (
                    <>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cardTitle}>
                      {entry.bid
                        ? `${entry.bid.car_year} ${entry.bid.make} ${entry.bid.model}`
                        : `Request #${entry.request_id}`}
                    </Text>
                    <Text style={styles.cardMeta}>
                      {entry.bid
                        ? `${Number(entry.bid.price || 0).toLocaleString()} ETB`
                        : "Offer details unavailable"}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      entry.follow_up_due && styles.statusBadgeDue,
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {entry.follow_up_due
                        ? "Due"
                        : STAGE_LABELS[entry.stage] || entry.stage}
                    </Text>
                  </View>
                </View>
                <Text style={styles.helperText}>
                  Last activity{" "}
                  {entry.last_activity_at
                    ? new Date(entry.last_activity_at).toLocaleString()
                    : "not recorded"}
                </Text>
                {entry.next_follow_up_at ? (
                  <Text style={styles.helperText}>
                    Follow up {new Date(entry.next_follow_up_at).toLocaleString()}
                  </Text>
                ) : null}
                {entry.notes ? <Text style={styles.notes}>{entry.notes}</Text> : null}
                <View style={styles.actions}>
                  <Pressable
                    style={[
                      styles.secondaryButton,
                      entryAction.disabled && styles.disabledActionButton,
                    ]}
                    onPress={entryAction.onPress}
                    disabled={entryAction.disabled}
                  >
                    <Text
                      style={[
                        styles.secondaryText,
                        entryAction.disabled && styles.disabledActionText,
                      ]}
                    >
                      {entryAction.label}
                    </Text>
                  </Pressable>
                  {!["deal_completed", "lost"].includes(entry.stage) ? (
                    <Pressable
                      style={styles.primaryButton}
                      onPress={() => markFollowUpNeeded(entry)}
                    >
                      <Text style={styles.primaryText}>Mark follow-up</Text>
                    </Pressable>
                  ) : null}
                </View>
                    </>
                  );
                })()}
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No leads in this pipeline yet.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },
  header: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: "800" },
  stageRow: { gap: 8, padding: 16 },
  stageChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.card,
    minWidth: 108,
    alignItems: "center",
    justifyContent: "center",
  },
  stageChipActive: { borderColor: COLORS.accent },
  stageText: { color: COLORS.text, fontWeight: "700", textAlign: "center" },
  stageCountText: {
    color: COLORS.accent,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 4,
    textAlign: "center",
  },
  list: { padding: 16, paddingTop: 0 },
  listLoading: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 44,
    gap: 10,
  },
  listLoadingText: {
    color: COLORS.textSecondary,
    fontWeight: "700",
  },
  errorBox: {
    backgroundColor: "rgba(255,193,7,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,193,7,0.35)",
    borderRadius: 8,
    padding: 14,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  errorText: {
    flex: 1,
    color: COLORS.text,
    lineHeight: 20,
  },
  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  cardTitle: { color: COLORS.text, fontSize: 16, fontWeight: "800" },
  cardMeta: { color: COLORS.textSecondary, marginTop: 4 },
  statusBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "rgba(97, 24, 215, 0.16)",
  },
  statusBadgeDue: { backgroundColor: "rgba(255,193,7,0.18)" },
  statusText: { color: COLORS.text, fontSize: 12, fontWeight: "800" },
  helperText: { color: COLORS.textSecondary, marginTop: 8, fontSize: 12 },
  notes: { color: COLORS.text, marginTop: 10 },
  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
  primaryButton: {
    flex: 1,
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: "center",
  },
  primaryText: { color: "white", fontWeight: "800" },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: "center",
  },
  secondaryText: { color: COLORS.text, fontWeight: "800" },
  disabledActionButton: {
    opacity: 0.62,
    backgroundColor: COLORS.background,
  },
  disabledActionText: {
    color: COLORS.textSecondary,
  },
  emptyText: { color: COLORS.textSecondary, textAlign: "center", marginTop: 40 },
});
