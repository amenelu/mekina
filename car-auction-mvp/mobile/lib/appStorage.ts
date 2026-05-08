import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

function getBrowserStorage(kind: "local" | "session") {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

async function getWebStorageItem(key: string) {
  return getBrowserStorage("local")?.getItem(key) ?? null;
}

async function setWebStorageItem(key: string, value: string) {
  const storage = getBrowserStorage("local");
  if (!storage) {
    return;
  }

  try {
    storage.setItem(key, value);
  } catch {
    // Ignore storage quota/private mode failures on web.
  }
}

async function removeWebStorageItem(key: string) {
  const storage = getBrowserStorage("local");
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(key);
  } catch {
    // Ignore storage failures on web.
  }
}

async function getAuthWebStorageItem(key: string) {
  return (
    getBrowserStorage("local")?.getItem(key) ??
    getBrowserStorage("session")?.getItem(key) ??
    null
  );
}

async function setAuthWebStorageItem(key: string, value: string) {
  const localStorage = getBrowserStorage("local");
  const sessionStorage = getBrowserStorage("session");

  if (!localStorage && !sessionStorage) {
    return;
  }

  let rememberMe = false;

  try {
    const parsed = JSON.parse(value);
    rememberMe = parsed?.state?.rememberMe === true;
  } catch {
    rememberMe = false;
  }

  const target = rememberMe ? localStorage : sessionStorage;
  const other = rememberMe ? sessionStorage : localStorage;

  try {
    target?.setItem(key, value);
    other?.removeItem(key);
  } catch {
    // Ignore storage quota/private mode failures on web.
  }
}

async function removeAuthWebStorageItem(key: string) {
  try {
    getBrowserStorage("local")?.removeItem(key);
    getBrowserStorage("session")?.removeItem(key);
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

export const authStorage = {
  getItem(key: string) {
    if (Platform.OS === "web") {
      return getAuthWebStorageItem(key);
    }

    return SecureStore.getItemAsync(key);
  },
  setItem(key: string, value: string) {
    if (Platform.OS === "web") {
      return setAuthWebStorageItem(key, value);
    }

    return SecureStore.setItemAsync(key, value);
  },
  removeItem(key: string) {
    if (Platform.OS === "web") {
      return removeAuthWebStorageItem(key);
    }

    return SecureStore.deleteItemAsync(key);
  },
};
