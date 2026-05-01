import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type BrandPickerModalProps = {
  brands: readonly string[];
  selectedBrand: string;
  visible: boolean;
  onClose: () => void;
  onSelect: (brand: string) => void;
  title: string;
  allowSkip?: boolean;
  onSkip?: () => void;
};

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  border: "#313843",
  mutedForeground: "#8A94A3",
};

const BrandPickerModal = ({
  brands,
  selectedBrand,
  visible,
  onClose,
  onSelect,
  title,
  allowSkip = false,
  onSkip,
}: BrandPickerModalProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBrands = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return brands;

    return brands.filter((brand) => brand.toLowerCase().includes(query));
  }, [brands, searchQuery]);

  const handleClose = () => {
    setSearchQuery("");
    onClose();
  };

  const handleSelect = (brand: string) => {
    setSearchQuery("");
    onSelect(brand);
  };

  const handleSkip = () => {
    setSearchQuery("");
    onSkip?.();
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={styles.modalOverlay} onPress={handleClose}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
              <Pressable onPress={handleClose} hitSlop={10}>
                <Ionicons
                  name="close"
                  size={22}
                  color={COLORS.mutedForeground}
                />
              </Pressable>
            </View>

            <View style={styles.searchBar}>
              <Ionicons
                name="search"
                size={18}
                color={COLORS.mutedForeground}
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search brands..."
                placeholderTextColor={COLORS.mutedForeground}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
                autoCapitalize="words"
              />
            </View>

            <FlatList
              data={filteredBrands}
              keyExtractor={(item) => item}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              style={styles.brandList}
              contentContainerStyle={styles.brandListContent}
              renderItem={({ item }) => {
                const isSelected = selectedBrand === item;

                return (
                  <TouchableOpacity
                    style={[
                      styles.brandOption,
                      isSelected && styles.brandOptionSelected,
                    ]}
                    onPress={() => handleSelect(item)}
                  >
                    <Text
                      style={[
                        styles.brandOptionText,
                        isSelected && styles.brandOptionTextSelected,
                      ]}
                    >
                      {item}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={COLORS.foreground}
                      />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No matching brands found.</Text>
              }
            />

            {allowSkip && onSkip && (
              <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                <Text style={styles.skipButtonText}>No brand preference</Text>
              </TouchableOpacity>
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "82%",
    minHeight: "60%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    color: COLORS.foreground,
    fontSize: 20,
    fontWeight: "700",
    flex: 1,
    marginRight: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: COLORS.foreground,
    fontSize: 16,
  },
  brandList: {
    flex: 1,
    minHeight: 220,
  },
  brandListContent: {
    paddingBottom: 8,
    flexGrow: 1,
  },
  brandOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  brandOptionSelected: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accent,
  },
  brandOptionText: {
    color: COLORS.foreground,
    fontSize: 16,
    fontWeight: "500",
  },
  brandOptionTextSelected: {
    color: COLORS.foreground,
    fontWeight: "600",
  },
  emptyText: {
    color: COLORS.mutedForeground,
    textAlign: "center",
    paddingVertical: 24,
    fontSize: 15,
  },
  skipButton: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  skipButtonText: {
    color: COLORS.mutedForeground,
    fontSize: 15,
    fontWeight: "600",
  },
});

export default BrandPickerModal;
