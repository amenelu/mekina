import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Stack, useFocusEffect, useNavigation, useRouter } from "expo-router";
import {
  clearLegacyRequestDraft,
  clearRequestDraft,
  loadRequestDraft,
  RequestDraft,
} from "@/lib/requestDraft";
import { getRequestLimit } from "@/lib/api/requests";
import { showNativeFlowAlert } from "@/lib/nativeFlowAlert";
import { useAuth } from "@/hooks/useAuth";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  border: "#313843",
};

const choiceOptions = [
  {
    label: "Yes, I know what I want",
    description: "Tell us the make and model you're looking for.",
    href: "/request/make",
  },
  {
    label: "No, help me decide",
    description:
      "We'll guide you through some options to find the perfect fit.",
    href: "/request/budget",
  },
  {
    label: "I have a picture of what I want",
    description: "Upload a photo and we'll find it for you.",
    href: "/request/upload",
  },
];

const RequestChoiceScreen = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const userId = useAuth((state) => state.user?.id);
  const [savedDraft, setSavedDraft] = useState<RequestDraft | null>(null);
  const [checkingLimit, setCheckingLimit] = useState(true);
  const [canCreateRequest, setCanCreateRequest] = useState(true);
  const [limitMessage, setLimitMessage] = useState("");

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const state = navigation.getState();
      if (state && (state.routes.length > 1 || state.index !== 0)) {
        navigation.reset({
          index: 0,
          routes: [{ name: "index" as never }],
        });
      }

      clearLegacyRequestDraft().catch((error) => {
        console.error("Failed to clear legacy request draft:", error);
      });

      loadRequestDraft(userId).then((draft) => {
        if (!isActive) return;
        if (draft?.pathname && draft.pathname !== "/request") {
          setSavedDraft(draft);
        } else {
          setSavedDraft(null);
        }
      });

      setCheckingLimit(true);
      getRequestLimit()
        .then((response) => {
          if (!isActive) return;
          const canCreate = response.data.can_create_request;
          setCanCreateRequest(canCreate);
          setLimitMessage(response.data.message || "");
          if (!canCreate) {
            showNativeFlowAlert(
              "Daily Limit Reached",
              response.data.message ||
                "You have reached the daily limit of 3 requests. Please try again later."
            );
          }
        })
        .catch((error: any) => {
          if (!isActive) return;
          const message =
            error.response?.data?.message ||
            error.userMessage ||
            "We could not check your request limit. Please try again.";
          setCanCreateRequest(false);
          setLimitMessage(message);
          showNativeFlowAlert("Unable to Start Request", message);
        })
        .finally(() => {
          if (isActive) {
            setCheckingLimit(false);
          }
        });

      return () => {
        isActive = false;
      };
    }, [navigation, userId])
  );

  const navigateIfAllowed = (href: string, params?: Record<string, unknown>) => {
    if (checkingLimit) return;
    if (!canCreateRequest) {
      showNativeFlowAlert(
        "Daily Limit Reached",
        limitMessage ||
          "You have reached the daily limit of 3 requests. Please try again later."
      );
      return;
    }

    router.push(params ? ({ pathname: href as any, params } as any) : (href as any));
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Let's Find Your Next Car" }} />
      <Text style={styles.title}>Do you know which car you want?</Text>
      {checkingLimit && (
        <View style={styles.limitCard}>
          <ActivityIndicator color={COLORS.accent} />
          <Text style={styles.limitText}>Checking your daily request limit...</Text>
        </View>
      )}
      {!checkingLimit && !canCreateRequest && (
        <View style={styles.limitCard}>
          <Text style={styles.limitTitle}>Daily Limit Reached</Text>
          <Text style={styles.limitText}>
            {limitMessage ||
              "You have reached the daily limit of 3 requests. Please try again later."}
          </Text>
        </View>
      )}
      {savedDraft && (
        <View style={styles.savedDraftCard}>
          <Text style={styles.savedDraftTitle}>Continue your saved request</Text>
          <Text style={styles.savedDraftSubtitle}>
            Pick up where you left off in the find-a-car flow.
          </Text>
          <View style={styles.savedDraftActions}>
            <TouchableOpacity
              testID="saved-request-continue"
              style={[
                styles.resumeButton,
                (!canCreateRequest || checkingLimit) && styles.disabledButton,
              ]}
              disabled={!canCreateRequest || checkingLimit}
              onPress={() =>
                navigateIfAllowed(savedDraft.pathname, savedDraft.params)
              }
            >
              <Text style={styles.resumeButtonText}>Continue</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="saved-request-discard"
              style={styles.discardButton}
              onPress={async () => {
                await clearRequestDraft(userId);
                setSavedDraft(null);
              }}
            >
              <Text style={styles.discardButtonText}>Discard</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      <View style={styles.optionsContainer}>
        {choiceOptions.map((option) => (
          <TouchableOpacity
            key={option.href}
            testID={
              option.href === "/request/make"
                ? "request-choice-specific"
                : option.href === "/request/budget"
                ? "request-choice-guided"
                : "request-choice-upload"
            }
            style={[
              styles.optionButton,
              (!canCreateRequest || checkingLimit) && styles.disabledOption,
            ]}
            disabled={checkingLimit}
            onPress={() => navigateIfAllowed(option.href)}
          >
            <Text style={styles.optionText}>{option.label}</Text>
            <Text style={styles.optionDescription}>{option.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.foreground,
    marginBottom: 30,
    textAlign: "center",
  },
  optionsContainer: {
    gap: 15,
  },
  limitCard: {
    backgroundColor: "rgba(163, 112, 247, 0.12)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.accent,
    padding: 16,
    marginBottom: 20,
    alignItems: "center",
  },
  limitTitle: {
    color: COLORS.foreground,
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 6,
  },
  limitText: {
    color: COLORS.foreground,
    opacity: 0.85,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  savedDraftCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 20,
  },
  savedDraftTitle: {
    color: COLORS.foreground,
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 6,
  },
  savedDraftSubtitle: {
    color: COLORS.foreground,
    opacity: 0.8,
    fontSize: 14,
    lineHeight: 20,
  },
  savedDraftActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  resumeButton: {
    flex: 1,
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  resumeButtonText: {
    color: COLORS.foreground,
    fontWeight: "700",
    fontSize: 15,
  },
  discardButton: {
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  discardButtonText: {
    color: COLORS.foreground,
    opacity: 0.75,
    fontSize: 14,
    fontWeight: "600",
  },
  optionButton: {
    backgroundColor: COLORS.card,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  disabledButton: {
    opacity: 0.55,
  },
  disabledOption: {
    opacity: 0.45,
  },
  optionText: {
    color: COLORS.foreground,
    fontSize: 18,
    fontWeight: "500",
    textAlign: "center",
  },
  optionDescription: {
    color: COLORS.foreground,
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
});

export default RequestChoiceScreen;
