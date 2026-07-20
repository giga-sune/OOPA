import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  CustomProvider,
  initializeAppCheck,
  type AppCheck,
} from "firebase/app-check";
import { getAI, GoogleAIBackend, type AI } from "firebase/ai";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

import { firebaseConfig } from "./firebaseConfig";

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

type FirebaseDevelopmentGlobal = typeof globalThis & {
  FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean;
  __OOPA_FIREBASE_APP_CHECK__?: AppCheck;
};

const firebaseDevelopmentGlobal = globalThis as FirebaseDevelopmentGlobal;
const appCheckDebugToken = process.env.EXPO_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN?.trim();

if (__DEV__ && !appCheckDebugToken) {
  throw new Error(
    "Missing EXPO_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN. Add the registered Firebase App Check debug token to .env.local.",
  );
}

if (__DEV__) {
  firebaseDevelopmentGlobal.FIREBASE_APPCHECK_DEBUG_TOKEN = appCheckDebugToken;
}

const appCheck: AppCheck =
  firebaseDevelopmentGlobal.__OOPA_FIREBASE_APP_CHECK__ ??
  initializeAppCheck(app, {
    provider: new CustomProvider({
      getToken: async () => {
        throw new Error(
          "Production Firebase App Check attestation is not configured yet.",
        );
      },
    }),
    isTokenAutoRefreshEnabled: true,
  });

firebaseDevelopmentGlobal.__OOPA_FIREBASE_APP_CHECK__ = appCheck;

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);
const ai: AI = getAI(app, { backend: new GoogleAIBackend() });

export { app, auth, db, storage, ai };
