import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import AsyncStorage from "@react-native-async-storage/async-storage";
// @ts-expect-error - getReactNativePersistence is resolved by Metro at runtime
import { getAuth, initializeAuth, getReactNativePersistence, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator, type Functions } from "firebase/functions";

import { firebaseConfig } from "./firebaseConfig";

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);
const functions: Functions = getFunctions(app);

const functionsEmulatorHost = process.env.EXPO_PUBLIC_FUNCTIONS_EMULATOR_HOST;

if (__DEV__ && functionsEmulatorHost) {
  connectFunctionsEmulator(functions, functionsEmulatorHost, 5001);
}

export { app, auth, db, storage, functions };
