import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Stack, Link } from "expo-router";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  mutedForeground: "#8A94A3",
  border: "#313843",
};

const StepCard = ({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) => (
  <View style={styles.stepCard}>
    <View style={styles.stepNumberContainer}>
      <Text style={styles.stepNumber}>{number}</Text>
    </View>
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepParagraph}>{children}</Text>
    </View>
  </View>
);

const HowItWorksScreen = () => {
  return (
    <>
      <Stack.Screen options={{ title: "How It Works" }} />
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.mainTitle}>How Mekina Works</Text>
          <Text style={styles.mainParagraph}>
            Our platform is designed to be the simplest and most transparent way
            to buy, sell, or rent cars in Ethiopia. Whether you're a buyer
            looking for your dream car, a seller, or a rental company, here’s
            how it works.
          </Text>

          <Text style={styles.sectionTitle}>For Buyers</Text>
          <StepCard number="1" title="Find Your Car in Two Ways">
            <Text>
              <Link href="/(tabs)/all_listings" asChild>
                <Text style={styles.linkText}>Browse our listings</Text>
              </Link>
              <Text style={styles.stepParagraph}>
                {" "}
                for sale and for rent directly from our app.
              </Text>
              {"\n"}
              <Link href="/request" asChild>
                <Text style={styles.linkText}>Submit a Request</Text>
              </Link>
              <Text style={styles.stepParagraph}>
                {" "}
                if you can't find what you're looking for.
              </Text>
            </Text>
          </StepCard>
          <StepCard number="2" title="Connect with Sellers">
            Ask sellers questions directly on any listing to get the information
            you need. We connect you with the seller to arrange payment and
            handover.
          </StepCard>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>For Sellers & Dealers</Text>
          <StepCard number="1" title="Submit Your Car">
            <Link href="/(tabs)/sell" asChild>
              <Text style={styles.linkText}>
                Use our simple submission form
              </Text>
            </Link>
            <Text style={styles.stepParagraph}>
              {" "}
              to list your car for a fixed-price sale.
            </Text>
          </StepCard>
          <StepCard number="2" title="Admin Review">
            Our team reviews every submission to ensure quality and accuracy. We
            may mark your car as "Featured"!
          </StepCard>
          <StepCard number="3" title="Manage Your Listing">
            Once live, you have full control from your dashboard to answer
            questions and manage visibility.
          </StepCard>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>For Rental Companies</Text>
          <StepCard number="1" title="List Your Fleet">
            Use our dedicated rental submission form to list your vehicles. Our
            team will review and approve them.
          </StepCard>
          <StepCard number="2" title="Manage Your Listings">
            Your dashboard gives you control over availability and visibility.
            Customers can see your vehicles and contact you directly.
          </StepCard>
        </View>
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20 },
  mainTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.foreground,
    marginBottom: 15,
  },
  mainParagraph: {
    fontSize: 16,
    color: COLORS.mutedForeground,
    lineHeight: 24,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: COLORS.foreground,
    marginBottom: 20,
    marginTop: 10,
  },
  stepCard: {
    flexDirection: "row",
    marginBottom: 25,
    alignItems: "flex-start",
  },
  stepNumberContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  stepNumber: {
    color: COLORS.foreground,
    fontSize: 18,
    fontWeight: "bold",
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.foreground,
    marginBottom: 8,
  },
  stepParagraph: {
    fontSize: 15,
    color: COLORS.mutedForeground,
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 20,
  },
  linkText: {
    color: COLORS.accent,
    fontWeight: "bold",
  },
});

export default HowItWorksScreen;
