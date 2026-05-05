import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

async function getWebStorageItem(key: string) {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

async function setWebStorageItem(key: string, value: string) {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage quota/private mode failures on web.
  }
}

async function removeWebStorageItem(key: string) {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage failures on web.
  }
}

export async function getItemAsync(key: string) {
  if (Platform.OS === "web") {
    return getWebStorageItem(key);
  }

  return SecureStore.getItemAsync(key);
}

export async function setItemAsync(key: string, value: string) {
  if (Platform.OS === "web") {
    return setWebStorageItem(key, value);
  }

  return SecureStore.setItemAsync(key, value);
}

export async function deleteItemAsync(key: string) {
  if (Platform.OS === "web") {
    return removeWebStorageItem(key);
  }

  return SecureStore.deleteItemAsync(key);
}

export const appStorage = {
  getItem: getItemAsync,
  setItem: setItemAsync,
  removeItem: deleteItemAsync,
};
