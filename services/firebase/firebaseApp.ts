import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

// Functions and the Emulator connector
import { getFunctions, connectFunctionsEmulator, type Functions } from "firebase/functions";

import { firebaseConfig } from "./firebaseConfig";

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

// Initialize functions instance
const functions: Functions = getFunctions(app);

// Connection to local emulator during development
if (__DEV__) {
  // Points to port 5001 on your local machine
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}

export { app, auth, db, storage, functions };