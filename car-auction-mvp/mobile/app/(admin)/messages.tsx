import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getAdminMessageDetail, getAdminMessages } from "@/lib/api/admin";
import { useAuth } from "@/hooks/useAuth";

const COLORS = {
  background: "#14181F",
  card: "#1C212B",
  text: "#F8F8F8",
  textSecondary: "#8A94A3",
  accent: "#6118D7",
  border: "#313843",
  warning: "#ffc107",
  danger: "#dc3545",
};

type AdminConversation = {
  id: number;
  buyer?: { id: number; username: string; email?: string } | null;
  dealer?: { id: number; username: string; email?: string } | null;
  car?: { make?: string; model?: string; year?: number } | null;
  last_message_body: string;
  last_message_timestamp: string;
  message_count: number;
  flagged_message_count: number;
  lead_score: number;
  is_unlocked: boolean;
};

type AdminMessage = {
  id: number;
  body: string;
  original_body: string;
  was_masked: boolean;
  has_contact_risk?: boolean;
  contact_risk_score?: number;
  contact_risk_categories?: string[];
  timestamp: string;
  sender?: { id: number; username: string; email?: string } | null;
};

export default function AdminMessagesScreen() {
  const { token } = useAuth();
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === "web" && width >= 1000;
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<AdminConversation | null>(null);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = useCallback(async (isRefresh = false) => {
    if (!token) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await getAdminMessages(search);
      const nextConversations = response.data.conversations || [];
      setConversations(nextConversations);
      if (
        selectedConversation &&
        !nextConversations.some(
          (conversation: AdminConversation) =>
            conversation.id === selectedConversation.id
        )
      ) {
        setSelectedConversation(null);
        setMessages([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, selectedConversation, token]);

  const fetchConversationDetail = useCallback(async (conversationId: number) => {
    setDetailLoading(true);
    try {
      const response = await getAdminMessageDetail(conversationId);
      setSelectedConversation(response.data.conversation);
      setMessages(response.data.messages || []);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchConversations(), 250);
    return () => clearTimeout(timer);
  }, [fetchConversations]);

  useEffect(() => {
    if (selectedConversation) {
      fetchConversationDetail(selectedConversation.id);
    }
  }, [fetchConversationDetail, selectedConversation?.id]);

  const onRefresh = () => fetchConversations(true);

  const ConversationCard = ({ item }: { item: AdminConversation }) => {
    const isSelected = selectedConversation?.id === item.id;
    return (
      <Pressable
        style={[styles.conversationCard, isSelected && styles.selectedCard]}
        onPress={() => setSelectedConversation(item)}
      >
        <View style={styles.conversationHeader}>
          <Text style={styles.conversationTitle}>
            {item.car?.year ? `${item.car.year} ` : ""}
            {item.car?.make || "Vehicle"} {item.car?.model || ""}
          </Text>
          {item.flagged_message_count > 0 ? (
            <View style={styles.flagBadge}>
              <Ionicons name="warning" size={14} color="#111" />
              <Text style={styles.flagBadgeText}>{item.flagged_message_count}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.partyText}>
          Buyer: {item.buyer?.username || "Unknown"} | Dealer:{" "}
          {item.dealer?.username || "Unknown"}
        </Text>
        <Text style={styles.previewText} numberOfLines={2}>
          {item.last_message_body}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{item.message_count} messages</Text>
          <Text style={styles.metaText}>Score {item.lead_score}</Text>
          <Text style={styles.metaText}>
            {item.is_unlocked ? "Unlocked" : "Locked"}
          </Text>
        </View>
      </Pressable>
    );
  };

  const DetailPanel = () => {
    if (!selectedConversation) {
      return (
        <View style={styles.emptyDetail}>
          <Ionicons name="chatbubbles-outline" size={44} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>Select a conversation to review.</Text>
        </View>
      );
    }

    return (
      <View style={styles.detailPanel}>
        <View style={styles.detailHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.detailTitle}>
              {selectedConversation.car?.make || "Vehicle"}{" "}
              {selectedConversation.car?.model || ""}
            </Text>
            <Text style={styles.detailSubtitle}>
              {selectedConversation.buyer?.username || "Buyer"} and{" "}
              {selectedConversation.dealer?.username || "Dealer"}
            </Text>
          </View>
          <Pressable
            style={styles.collapseButton}
            onPress={() => {
              setSelectedConversation(null);
              setMessages([]);
            }}
          >
            <Ionicons name="close" size={20} color={COLORS.textSecondary} />
          </Pressable>
        </View>

        {detailLoading ? (
          <ActivityIndicator color={COLORS.accent} style={{ marginTop: 30 }} />
        ) : (
          <ScrollView contentContainerStyle={styles.messageList}>
            {messages.map((message) => (
              <View key={message.id} style={styles.messageCard}>
                <View style={styles.messageHeader}>
                  <Text style={styles.senderText}>
                    {message.sender?.username || "Unknown"}
                  </Text>
                  <Text style={styles.timestampText}>
                    {new Date(message.timestamp).toLocaleString()}
                  </Text>
                </View>
                <Text style={styles.messageText}>{message.body}</Text>
                {message.has_contact_risk ? (
                  <View style={styles.riskRow}>
                    <Ionicons name="warning" size={14} color={COLORS.warning} />
                    <Text style={styles.riskText}>
                      Contact risk {message.contact_risk_score ?? 0}
                      {message.contact_risk_categories?.length
                        ? ` - ${message.contact_risk_categories.join(", ")}`
                        : ""}
                    </Text>
                  </View>
                ) : null}
                {message.was_masked ? (
                  <View style={styles.originalBox}>
                    <Text style={styles.originalLabel}>Original captured text</Text>
                    <Text style={styles.originalText}>{message.original_body}</Text>
                  </View>
                ) : null}
              </View>
            ))}
            {messages.length === 0 ? (
              <Text style={styles.emptyText}>No messages in this conversation.</Text>
            ) : null}
          </ScrollView>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.pageShell, isWideWeb && styles.pageShellWide]}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by buyer, dealer, make, or model..."
            placeholderTextColor={COLORS.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View style={[styles.contentGrid, isWideWeb && styles.contentGridWide]}>
          <ScrollView
            style={[
              styles.listPane,
              isWideWeb && selectedConversation && styles.listPaneWide,
            ]}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {loading && !refreshing ? (
              <ActivityIndicator color={COLORS.accent} style={{ marginTop: 30 }} />
            ) : conversations.length > 0 ? (
              conversations.map((item) => (
                <ConversationCard key={item.id} item={item} />
              ))
            ) : (
              <Text style={styles.emptyText}>No conversations found.</Text>
            )}
          </ScrollView>
          {selectedConversation ? <DetailPanel /> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  pageShell: { flex: 1, padding: 16 },
  pageShellWide: {
    maxWidth: 1280,
    width: "100%",
    alignSelf: "center",
    paddingTop: 28,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 16,
    height: 48,
    marginLeft: 10,
  },
  contentGrid: { flex: 1 },
  contentGridWide: { flexDirection: "row", gap: 18 },
  listPane: { flex: 1 },
  listPaneWide: { maxWidth: 430 },
  conversationCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  selectedCard: { borderColor: COLORS.accent },
  conversationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  conversationTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
    flex: 1,
  },
  partyText: { color: COLORS.textSecondary, fontSize: 13, marginTop: 6 },
  previewText: { color: COLORS.text, fontSize: 14, marginTop: 10, lineHeight: 20 },
  metaRow: { flexDirection: "row", gap: 12, marginTop: 12, flexWrap: "wrap" },
  metaText: { color: COLORS.textSecondary, fontSize: 12 },
  flagBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.warning,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  flagBadgeText: { color: "#111", fontSize: 12, fontWeight: "900" },
  detailPanel: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    overflow: "hidden",
    minHeight: 280,
    maxHeight: Platform.OS === "web" ? 680 : undefined,
  },
  detailHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  detailTitle: { color: COLORS.text, fontSize: 20, fontWeight: "800" },
  detailSubtitle: { color: COLORS.textSecondary, marginTop: 4, fontSize: 14 },
  collapseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },
  messageList: { padding: 16 },
  messageCard: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 12,
  },
  messageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 8,
  },
  senderText: { color: COLORS.accent, fontWeight: "800", fontSize: 14 },
  timestampText: { color: COLORS.textSecondary, fontSize: 12 },
  messageText: { color: COLORS.text, fontSize: 15, lineHeight: 21 },
  riskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  riskText: {
    color: COLORS.warning,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  originalBox: {
    marginTop: 10,
    backgroundColor: "#321D22",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.danger,
    padding: 10,
  },
  originalLabel: {
    color: COLORS.warning,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 5,
    textTransform: "uppercase",
  },
  originalText: { color: COLORS.text, fontSize: 14, lineHeight: 20 },
  emptyDetail: {
    flex: 1,
    minHeight: 260,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  emptyText: {
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 22,
  },
});
