import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { clearRequestDraft } from "@/lib/requestDraft";
import { useRequestDraftPersistence } from "@/hooks/useRequestDraftPersistence";
import { createRequestForm } from "@/lib/api/requests";
import { showNativeFlowAlert } from "@/lib/nativeFlowAlert";
import { isWebRuntime, replaceWebRoute } from "@/lib/webRouteReset";
import { saveRecentSubmittedRequest } from "@/lib/recentSubmittedRequests";

const COLORS = {
  background: "#14181F",
  foreground: "#F8F8F8",
  card: "#1C212B",
  accent: "#A370F7",
  border: "#313843",
  mutedForeground: "#8A94A3",
  danger: "#E35D6A",
};

function getDraftImageUris(images: ImagePicker.ImagePickerAsset[]) {
  return images.map((image) => image.uri).filter(Boolean);
}

function parseDraftImages(
  value: string | string[] | undefined
): ImagePicker.ImagePickerAsset[] {
  const uris = Array.isArray(value) ? value : value ? [value] : [];
  return uris.map((uri) => ({
    uri,
    width: 0,
    height: 0,
    type: "image",
    fileName: uri.split("/").pop(),
    fileSize: 0,
    mimeType: "image/jpeg",
    assetId: null,
    base64: null,
    duration: null,
    exif: null,
    file: undefined,
    pairedVideoAsset: null,
  }));
}

const RequestUploadScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { token, user } = useAuth();
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>(
    parseDraftImages(params.images)
  );
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState(String(params.notes || ""));
  const [showValidation, setShowValidation] = useState(false);

  useRequestDraftPersistence("/request/upload", {
    ...params,
    notes,
    images: getDraftImageUris(images),
  });

  const handleImagePick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Sorry, we need camera roll permissions to make this work!"
      );
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
      selectionLimit: 6,
    });
    if (!result.canceled) {
      setImages(result.assets);
      setShowValidation(false);
    }
  };

  const handleSubmit = async () => {
    if (!token) {
      showNativeFlowAlert(
        "Login Required",
        "Please log in before submitting a request.",
        () => router.replace("/(auth)/login")
      );
      return;
    }

    if (images.length === 0 && !notes.trim() && !params.make) {
      setShowValidation(true);
      return;
    }

    setShowValidation(false);
    setLoading(true);

    const formData = new FormData();
    if (params.make) formData.append("make", params.make as string);
    if (params.model) formData.append("model", params.model as string);
    if (params.min_year) formData.append("min_year", params.min_year as string);
    formData.append("notes", notes);

    images.forEach((image) => {
      formData.append("images", {
        uri: image.uri,
        name: image.fileName || `photo_${Date.now()}.jpg`,
        type: image.mimeType || "image/jpeg",
      } as any);
    });

    try {
      const response = await createRequestForm(formData);
      await saveRecentSubmittedRequest(response.data.request, user?.id);
      await clearRequestDraft(user?.id);

      if (isWebRuntime()) {
        showNativeFlowAlert(
          "Request Submitted!",
          "Your request has been sent to our dealers. They will contact you with offers soon.",
          () => {
            replaceWebRoute("/my-requests");
          },
          "Close"
        );
        return;
      }

      showNativeFlowAlert(
        "Request Submitted!",
        "Your request has been sent to our dealers. They will contact you with offers soon.",
        () => router.replace("/(tabs)/my-requests"),
        "Close"
      );
    } catch (error: any) {
      console.error("Failed to submit request:", error);
      const message =
        error.response?.data?.message ||
        error.userMessage ||
        "An unknown error occurred.";
      showNativeFlowAlert("Submission Failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.title}>Upload a Picture</Text>
        <Text style={styles.subtitle}>
          {
            "Upload a photo of the car you are looking for and we'll find it for you."
          }
        </Text>

        <View style={styles.formCard}>
          <Text style={styles.label}>Notes (Optional)</Text>
          <TextInput
            testID="request-upload-notes-input"
            style={[
              styles.input,
              { height: 100, textAlignVertical: "top" },
              showValidation && images.length === 0 && !notes.trim() && !params.make
                ? styles.inputError
                : null,
            ]}
            value={notes}
            onChangeText={(value) => {
              setNotes(value);
              if (value.trim()) {
                setShowValidation(false);
              }
            }}
            multiline
            placeholder="e.g., specific color, trim, or features"
            placeholderTextColor={COLORS.mutedForeground}
          />
        </View>

        <View
          style={[
            styles.formCard,
            showValidation && images.length === 0 && !notes.trim() && !params.make
              ? styles.formCardError
              : null,
          ]}
        >
          <Text style={styles.label}>Photos</Text>
          {images.length > 0 && (
            <ScrollView horizontal style={styles.imageScrollView}>
              {images.map((img, index) => (
                <Image
                  key={index}
                  source={{ uri: img.uri }}
                  style={styles.thumbnail}
                />
              ))}
            </ScrollView>
          )}
          <TouchableOpacity
            style={styles.imagePickerButton}
            onPress={handleImagePick}
          >
            <Ionicons name="camera" size={20} color={COLORS.accent} />
            <Text style={styles.imagePickerText}>
              {images.length > 0 ? "Reselect Images" : "Select Images"}
            </Text>
          </TouchableOpacity>
          {showValidation && images.length === 0 && !notes.trim() && !params.make && (
            <Text style={styles.errorText}>
              Add notes or at least one photo before submitting.
            </Text>
          )}
        </View>

        <TouchableOpacity
          testID="request-upload-submit"
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.foreground} />
          ) : (
            <Text style={styles.submitButtonText}>Submit Request</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  counter: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.mutedForeground,
    textAlign: "center",
    marginBottom: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.foreground,
    marginBottom: 10,
    textAlign: "center",
    paddingTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.mutedForeground,
    textAlign: "center",
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  formCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  formCardError: {
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  label: {
    fontSize: 14,
    color: COLORS.mutedForeground,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.background,
    color: COLORS.foreground,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 16,
  },
  inputError: {
    borderColor: COLORS.danger,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 14,
    marginTop: 12,
  },
  imageScrollView: {
    marginBottom: 15,
  },
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: COLORS.background,
  },
  imagePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "transparent",
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.accent,
    borderStyle: "dashed",
  },
  imagePickerText: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: "600",
  },
  submitButton: {
    backgroundColor: COLORS.accent,
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    margin: 20,
  },
  submitButtonText: {
    color: COLORS.foreground,
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default RequestUploadScreen;
