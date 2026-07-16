import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import AsyncStorage from "@react-native-async-storage/async-storage";

// @ts-expect-error - getReactNativePersistence is not typed in the main web entrypoint but is resolved by Metro at runtime
import { initializeAuth, getReactNativePersistence } from "firebase/auth";

import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

export const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyCdsUJJjGkwxiDi7C53DfuKuX9BGYfv6og",
  authDomain: "oopa-e977a.firebaseapp.com",
  projectId: "oopa-e977a",
  storageBucket: "oopa-e977a.firebasestorage.app",
  messagingSenderId: "455696734050",
  appId: "1:455696734050:web:b376214566b5310bb17e3b",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export const functions = getFunctions(app);

if (__DEV__) {

  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}