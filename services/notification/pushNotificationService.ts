import * as Notifications from "expo-notifications";
import { doc, updateDoc } from "firebase/firestore";
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
    
    // Save the token to the user's document in Firestore
    const userDocRef = doc(db, "users", userUid);
    await updateDoc(userDocRef, {
      expoPushToken: token,
    });
    console.log("Expo Push Token saved:", token);
  } catch (error) {
    console.error("Error saving push token:", error);
  }
}

// Function to actually trigger the notification to the device
export async function sendNativePush(targetToken: string, title: string, body: string) {
  const message = {
    to: targetToken,
    sound: "default",
    title,
    body,
    data: { someData: "goes here" },
  };

  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });
}