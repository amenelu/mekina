import React from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import { Link } from "expo-router";

const COLORS = {
  foreground: "#F8F8F8",
  mutedForeground: "#8A94A3",
  border: "#313843",
  secondary: "#313843",
};

const Footer = () => {
  return (
    <View style={styles.container}>
      <View style={styles.footerContentGrid}>
        <View style={styles.footerSection}>
          <Text style={styles.footerBrand}>Mekina Auction</Text>
          <Text style={styles.footerDescription}>
            The premier automotive marketplace for modern vehicles in Ethiopia.
          </Text>
        </View>

        <View style={styles.footerSection}>
          <Text style={styles.footerLinkTitle}>Buying</Text>
          <Link href="/all_listings" asChild>
            <Pressable>
              <Text style={styles.footerLinkText}>All Listings</Text>
            </Pressable>
          </Link>
          <Pressable>
            <Text style={styles.footerLinkText}>How It Works</Text>
          </Pressable>
          <Pressable>
            <Text style={styles.footerLinkText}>FAQ</Text>
          </Pressable>
        </View>

        <View style={styles.footerSection}>
          <Text style={styles.footerLinkTitle}>Selling</Text>
          <Pressable>
            <Text style={styles.footerLinkText}>List Your Car</Text>
          </Pressable>
          <Link href="/trade-in" asChild>
            <Pressable>
              <Text style={styles.footerLinkText}>Trade-in Value</Text>
            </Pressable>
          </Link>
          <Pressable>
            <Text style={styles.footerLinkText}>Seller Guide</Text>
          </Pressable>
        </View>

        <View style={styles.footerSection}>
          <Text style={styles.footerLinkTitle}>Support</Text>
          <Pressable>
            <Text style={styles.footerLinkText}>Contact Us</Text>
          </Pressable>
          <Pressable>
            <Text style={styles.footerLinkText}>Terms & Conditions</Text>
          </Pressable>
          <Pressable>
            <Text style={styles.footerLinkText}>Privacy Policy</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.footerBottom}>
        <Text style={styles.footerCopyright}>
          &copy; {new Date().getFullYear()} Mekina Auction. All rights reserved.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.secondary,
    paddingTop: 40,
    paddingHorizontal: 25,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: 18, // give space so the button doesn't overlap content
  },
  footerContentGrid: { marginBottom: 20 },
  footerSection: { marginBottom: 30 },
  footerBrand: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.foreground,
    marginBottom: 8,
  },
  footerDescription: {
    fontSize: 15,
    color: COLORS.mutedForeground,
    lineHeight: 22,
  },
  footerLinkTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.foreground,
    marginBottom: 16,
  },
  footerLinkText: {
    color: COLORS.mutedForeground,
    fontSize: 15,
    marginBottom: 12,
  },
  footerBottom: {
    paddingTop: 20,
    paddingBottom: 20,
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
