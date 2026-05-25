import React from "react";
import {
  View,
  Pressable,
  Text,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { showNativeFlowConfirm } from "@/lib/nativeFlowAlert";

const COLORS = {
  foreground: "#F8F8F8",
  mutedForeground: "#8A94A3",
  border: "#313843",
  secondary: "#313843",
};

const Footer = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === "web" && width >= 900;
  const isCompact = width < 420;

  const goTo = (href: string) => {
    router.push(href as any);
  };

  const goToTradeIn = () => {
    if (!user) {
      showNativeFlowConfirm({
        title: "Login Required",
        message: "Please log in to get a trade-in offer.",
        confirmText: "Login",
        onConfirm: () => router.push("/login"),
      });
      return;
    }

    goTo("/trade-in");
  };

  return (
    <View style={[styles.container, isWideWeb && styles.containerWide]}>
      <View
        style={[
          styles.footerContentGrid,
          isWideWeb && styles.footerContentGridWide,
          !isWideWeb && styles.footerContentGridCompact,
        ]}
      >
        <View
          style={[
            styles.footerSection,
            styles.brandSectionCompact,
            isWideWeb && styles.brandSectionWide,
          ]}
        >
          <Text style={styles.footerBrand}>mekina</Text>
          <Text style={styles.footerDescription}>
            The premier automotive marketplace for modern vehicles in Ethiopia.
          </Text>
        </View>

        <View
          style={[
            styles.footerSection,
            styles.linkSectionCompact,
            isCompact && styles.linkSectionNarrow,
            isWideWeb && styles.linkSectionWide,
          ]}
        >
          <Text style={styles.footerLinkTitle}>Buying</Text>
          <Pressable
            style={styles.footerLinkButton}
            onPress={() => goTo("/all_listings")}
          >
            <Text style={styles.footerLinkText}>All Listings</Text>
          </Pressable>
          <Pressable
            style={styles.footerLinkButton}
            onPress={() => goTo("/how-it-works")}
          >
            <Text style={styles.footerLinkText}>How It Works</Text>
          </Pressable>
          <Pressable
            style={styles.footerLinkButton}
            onPress={() => goTo("/faq")}
          >
            <Text style={styles.footerLinkText}>FAQ</Text>
          </Pressable>
        </View>

        <View
          style={[
            styles.footerSection,
            styles.linkSectionCompact,
            isCompact && styles.linkSectionNarrow,
            isWideWeb && styles.linkSectionWide,
          ]}
        >
          <Text style={styles.footerLinkTitle}>Selling</Text>
          <Pressable
            style={styles.footerLinkButton}
            onPress={goToTradeIn}
          >
            <Text style={styles.footerLinkText}>Trade-in Value</Text>
          </Pressable>
        </View>

        <View
          style={[
            styles.footerSection,
            styles.linkSectionCompact,
            isCompact && styles.linkSectionNarrow,
            isWideWeb && styles.linkSectionWide,
          ]}
        >
          <Text style={styles.footerLinkTitle}>Support</Text>
          <Pressable style={styles.footerLinkButton}>
            <Text style={styles.footerLinkText}>Contact Us</Text>
          </Pressable>
          <Pressable style={styles.footerLinkButton}>
            <Text style={styles.footerLinkText}>Terms & Conditions</Text>
          </Pressable>
          <Pressable style={styles.footerLinkButton}>
            <Text style={styles.footerLinkText}>Privacy Policy</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.footerBottom}>
        <Text style={styles.footerCopyright}>
          &copy; {new Date().getFullYear()} mekina. All rights reserved.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.secondary,
    paddingTop: 24,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: Platform.OS === "web" ? 0 : 12,
  },
  containerWide: {
    paddingTop: 26,
    paddingHorizontal: 42,
  },
  footerContentGrid: { marginBottom: 10 },
  footerContentGridCompact: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "flex-start",
    columnGap: 12,
    rowGap: 10,
  },
  footerContentGridWide: {
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 28,
  },
  footerSection: { marginBottom: 18 },
  brandSectionCompact: {
    width: "100%",
    marginBottom: 8,
  },
  brandSectionWide: {
    flex: 1.25,
    maxWidth: 360,
    width: "auto",
    marginBottom: 0,
  },
  linkSectionCompact: {
    width: "30%",
    minWidth: 96,
  },
  linkSectionNarrow: {
    minWidth: 86,
  },
  linkSectionWide: {
    flex: 0.7,
    minWidth: 120,
    width: "auto",
    marginBottom: 0,
  },
  footerBrand: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.foreground,
    marginBottom: 8,
  },
  footerDescription: {
    fontSize: 14,
    color: COLORS.mutedForeground,
    lineHeight: 20,
  },
  footerLinkButton: {
    alignSelf: "flex-start",
    marginBottom: 7,
    minHeight: 24,
    justifyContent: "center",
  },
  footerLinkTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.foreground,
    marginBottom: 8,
  },
  footerLinkText: {
    color: COLORS.mutedForeground,
    fontSize: 14,
  },
  footerBottom: {
    paddingTop: 12,
    paddingBottom: Platform.OS === "web" ? 8 : 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: "center",
  },
  footerCopyright: {
    color: COLORS.mutedForeground,
    fontSize: 13,
    textAlign: "center",
  },
});

export default Footer;
