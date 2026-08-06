import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  arrayUnion,
  arrayRemove,
  type DocumentData,
  type QuerySnapshot,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../firebase/firebaseApp";

// Show notifications while the app is in the foreground.
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

async function sendRemotePushNotification(
  recipientUid: string,
  title: string,
  body: string,
  data: Record<string, any> = {}
) {
  try {
    const tokenDoc = await getDoc(doc(db, "pushTokens", recipientUid));
    if (!tokenDoc.exists()) return;

    const pushToken = tokenDoc.data()?.token;
    if (!pushToken) return;

    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: pushToken,
        sound: "default",
        title,
        body,
        data,
      }),
    });
  } catch (error) {
    console.error("Failed to send remote push notification:", error);
  }
}

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
    await addDoc(collection(db, "notifications"), {
      recipientUid,
      type,
      categoryLabel,
      bodyText,
      propertyImageUrl,
      createdAt: serverTimestamp(),
      read: false,
    });

    await sendRemotePushNotification(
      recipientUid,
      categoryLabel,
      bodyText,
      dataPayload
    );
  } catch (error) {
    console.error("Failed to send app notification:", error);
  }
}

const CHATS_COLLECTION = "chats";
const MESSAGES_SUBCOLLECTION = "messages";

export interface ChatChannel {
  id: string; // Rental ID
  propertyId: string;
  propertyTitle: string;
  propertyImageUrl: string | null;
  renterUid: string;
  renterDisplayName: string;
  ownerUid: string;
  ownerDisplayName: string;
  lastMessage: string;
  lastMessageTimestamp: any;
  unreadBy: string[];
}

export interface ChatMessage {
  id: string;
  senderUid: string;
  text: string;
  createdAt: any;
}

export interface PreparedRentalChat {
  rentalId: string;
  title: string;
  recipientUid: string;
  recipientName: string;
}

export async function ensureChatChannel(
  rentalId: string
): Promise<PreparedRentalChat> {
  const prepareRentalChat = httpsCallable<
    { rentalId: string },
    PreparedRentalChat
  >(functions, "prepareRentalChat");
  const result = await prepareRentalChat({ rentalId });
  return result.data;
}

function mapChatChannel(docSnap: { id: string; data: () => DocumentData }): ChatChannel {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    propertyId: data.propertyId ?? "",
    propertyTitle: data.propertyTitle ?? "",
    propertyImageUrl: data.propertyImageUrl ?? null,
    renterUid: data.renterUid,
    renterDisplayName: data.renterDisplayName ?? "",
    ownerUid: data.ownerUid,
    ownerDisplayName: data.ownerDisplayName ?? "",
    lastMessage: data.lastMessage || "",
    lastMessageTimestamp: data.lastMessageTimestamp,
    unreadBy: data.unreadBy || [],
  };
}

function mergeChatSnapshots(
  renterSnapshot: QuerySnapshot<DocumentData>,
  ownerSnapshot: QuerySnapshot<DocumentData>
): ChatChannel[] {
  const channelsById = new Map<string, ChatChannel>();

  renterSnapshot.forEach((docSnap) => {
    channelsById.set(docSnap.id, mapChatChannel(docSnap));
  });

  ownerSnapshot.forEach((docSnap) => {
    channelsById.set(docSnap.id, mapChatChannel(docSnap));
  });

  return Array.from(channelsById.values())
    .filter((channel) => channel.lastMessageTimestamp != null)
    .sort((a, b) => {
      const timeA = a.lastMessageTimestamp?.seconds || 0;
      const timeB = b.lastMessageTimestamp?.seconds || 0;
      return timeB - timeA;
    });
}

export function subscribeToUserChats(
  userUid: string,
  onUpdate: (chats: ChatChannel[]) => void,
  onError?: (error: Error) => void
) {
  const chatsRef = collection(db, CHATS_COLLECTION);
  const renterQuery = query(chatsRef, where("renterUid", "==", userUid));
  const ownerQuery = query(chatsRef, where("ownerUid", "==", userUid));

  let renterSnapshot: QuerySnapshot<DocumentData> | null = null;
  let ownerSnapshot: QuerySnapshot<DocumentData> | null = null;

  const emitMerged = () => {
    if (!renterSnapshot || !ownerSnapshot) return;
    onUpdate(mergeChatSnapshots(renterSnapshot, ownerSnapshot));
  };

  const handleError = (error: Error) => {
    onError?.(error);
  };

  const unsubscribeRenter = onSnapshot(
    renterQuery,
    (snapshot) => {
      renterSnapshot = snapshot;
      emitMerged();
    },
    handleError
  );

  const unsubscribeOwner = onSnapshot(
    ownerQuery,
    (snapshot) => {
      ownerSnapshot = snapshot;
      emitMerged();
    },
    handleError
  );

  return () => {
    unsubscribeRenter();
    unsubscribeOwner();
  };
}

export function subscribeToMessages(
  rentalId: string,
  onUpdate: (messages: ChatMessage[]) => void,
  onError?: (error: Error) => void
) {
  const msgQuery = query(
    collection(db, CHATS_COLLECTION, rentalId, MESSAGES_SUBCOLLECTION),
    orderBy("createdAt", "asc")
  );

  return onSnapshot(
    msgQuery,
    (snapshot) => {
      const messages: ChatMessage[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          senderUid: data.senderUid,
          text: data.text,
          createdAt: data.createdAt,
        };
      });
      onUpdate(messages);
    },
    (error) => onError?.(error)
  );
}

export async function sendMessage(
  rentalId: string,
  senderUid: string,
  recipientUid: string,
  text: string,
  propertyImageUrl?: string | null
): Promise<void> {
  const trimmedText = text.trim();
  if (!trimmedText) return;

  await addDoc(collection(db, CHATS_COLLECTION, rentalId, MESSAGES_SUBCOLLECTION), {
    senderUid,
    text: trimmedText,
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db, CHATS_COLLECTION, rentalId), {
    lastMessage: trimmedText,
    lastMessageTimestamp: serverTimestamp(),
    unreadBy: arrayUnion(recipientUid),
  });

  await sendAppNotification({
    recipientUid,
    type: "new_message",
    categoryLabel: "New Message",
    bodyText: trimmedText.length > 50 ? `${trimmedText.substring(0, 50)}...` : trimmedText,
    propertyImageUrl: propertyImageUrl || null,
  });
}

export async function markChatAsRead(rentalId: string, userUid: string): Promise<void> {
  await updateDoc(doc(db, CHATS_COLLECTION, rentalId), {
    unreadBy: arrayRemove(userUid),
  });
}