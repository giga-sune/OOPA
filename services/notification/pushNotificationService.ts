import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { addDoc, collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseApp";

// how notifications appear when the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Register the device and save the push token to Firestore
export async function registerForPushNotificationsAsync(userUid: string) {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Permission denied for push notifications");
    return;
  }

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      throw new Error("Missing EAS project ID for Expo push-token registration.");
    }

    const token = (
      await Notifications.getExpoPushTokenAsync({ projectId })
    ).data;

    await setDoc(doc(db, "pushTokens", userUid), {
      token,
      updatedAt: serverTimestamp(),
    });
    console.log("Expo Push Token saved:", token);
  } catch (error) {
    console.error("Error saving push token:", error);
  }
}

// Centralized helper to trigger both in-app database notifications & local alerts (Checkout & Chat)
interface SendNotificationParams {
  recipientUid: string;
  type: "new_request" | "new_message" | "general";
  categoryLabel: string;
  bodyText: string;
  propertyImageUrl?: string | null;
  dataPayload?: Record<string, any>;
}

export async function sendAppNotification({
  recipientUid,
  type,
  categoryLabel,
  bodyText,
  propertyImageUrl = null,
  dataPayload = {},
}: SendNotificationParams) {
  try {
    // Save notification to Firestore for the recipient's in-app notification center screen
    await addDoc(collection(db, "notifications"), {
      recipientUid,
      type,
      categoryLabel,
      bodyText,
      propertyImageUrl,
      createdAt: serverTimestamp(),
      read: false,
    });

    // Trigger local push notification banner alert on the active device
    await Notifications.scheduleNotificationAsync({
      content: {
        title: categoryLabel,
        body: bodyText,
        data: dataPayload,
      },
      trigger: null,
    });
  } catch (error) {
    console.error("Failed to send app notification:", error);
  }
}