import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "propways_token";
const USER_KEY = "propways_user";

export async function saveSession(token: string, user: unknown) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function loadToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function loadUser<T>(): Promise<T | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}
