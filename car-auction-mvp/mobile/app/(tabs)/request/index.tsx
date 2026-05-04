import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Stack, Link, useFocusEffect, useNavigation, useRouter } from "expo-router";
import { clearRequestDraft, loadRequestDraft, RequestDraft } from "@/lib/requestDraft";

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
  const [savedDraft, setSavedDraft] = useState<RequestDraft | null>(null);

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

      loadRequestDraft().then((draft) => {
        if (!isActive) return;
        if (draft?.pathname && draft.pathname !== "/request") {
          setSavedDraft(draft);
        } else {
          setSavedDraft(null);
        }
      });

      return () => {
        isActive = false;
      };
    }, [navigation])
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Let's Find Your Next Car" }} />
      <Text style={styles.title}>Do you know which car you want?</Text>
      {savedDraft && (
        <View style={styles.savedDraftCard}>
          <Text style={styles.savedDraftTitle}>Continue your saved request</Text>
          <Text style={styles.savedDraftSubtitle}>
            Pick up where you left off in the find-a-car flow.
          </Text>
          <View style={styles.savedDraftActions}>
            <TouchableOpacity
              testID="saved-request-continue"
              style={styles.resumeButton}
              onPress={() =>
                router.push({
                  pathname: savedDraft.pathname as any,
                  params: savedDraft.params,
                })
              }
            >
              <Text style={styles.resumeButtonText}>Continue</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="saved-request-discard"
              style={styles.discardButton}
              onPress={async () => {
                await clearRequestDraft();
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
          <Link key={option.href} href={option.href as any} asChild>
            <TouchableOpacity
              testID={
                option.href === "/request/make"
                  ? "request-choice-specific"
                  : option.href === "/request/budget"
                  ? "request-choice-guided"
                  : "request-choice-upload"
              }
              style={styles.optionButton}
            >
              <Text style={styles.optionText}>{option.label}</Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </TouchableOpacity>
          </Link>
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
