import * as Notifications from "expo-notifications";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseApp";

// Configure how the notification behaves when the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

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
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    
    // Tokens are private and server-readable for trusted push delivery.
    await setDoc(doc(db, "pushTokens", userUid), {
      token,
      updatedAt: serverTimestamp(),
    });
    console.log("Expo Push Token saved:", token);
  } catch (error) {
    console.error("Error saving push token:", error);
  }
}
