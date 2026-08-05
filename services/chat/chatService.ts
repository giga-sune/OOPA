import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  arrayUnion,
  arrayRemove,
  type DocumentData,
  type QuerySnapshot,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../firebase/firebaseApp";

const CHATS_COLLECTION = "chats";
const MESSAGES_SUBCOLLECTION = "messages";
const NOTIFICATIONS_COLLECTION = "notifications";

export interface ChatChannel {
  id: string; // The rentalId
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

// 1. STREAM ACTIVE CHATS FOR INBOX (Real-time update stream)
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

// stream message within a specific chat channel
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

// Send a new message and trigger an in-app notification for the recipient
export async function sendMessage(
  rentalId: string,
  senderUid: string,
  recipientUid: string,
  text: string,
  propertyImageUrl?: string | null
): Promise<void> {
  const trimmedText = text.trim();
  if (!trimmedText) return;

  // 1. Add the message to the subcollection
  await addDoc(collection(db, CHATS_COLLECTION, rentalId, MESSAGES_SUBCOLLECTION), {
    senderUid,
    text: trimmedText,
    createdAt: serverTimestamp(),
  });

  // 2. Update the parent channel header snippet
  await updateDoc(doc(db, CHATS_COLLECTION, rentalId), {
    lastMessage: trimmedText,
    lastMessageTimestamp: serverTimestamp(),
    unreadBy: arrayUnion(recipientUid), // Flags notification indicator for the receiver
  });

  // 3. Trigger an in-app notification document for the NotificationsScreen listener
  await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
    recipientUid: recipientUid,
    type: "new_message",
    categoryLabel: "New Message",
    bodyText: trimmedText.length > 50 ? `${trimmedText.substring(0, 50)}...` : trimmedText,
    propertyImageUrl: propertyImageUrl || null,
    createdAt: serverTimestamp(),
    read: false,
  });
}

// Mark chat as read when opened
export async function markChatAsRead(rentalId: string, userUid: string): Promise<void> {
  await updateDoc(doc(db, CHATS_COLLECTION, rentalId), {
    unreadBy: arrayRemove(userUid),
  });
}