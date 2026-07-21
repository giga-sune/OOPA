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
import { db } from "../firebase/firebaseApp";

const CHATS_COLLECTION = "chats";
const MESSAGES_SUBCOLLECTION = "messages";

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

export interface EnsureChatChannelInput {
  rentalId: string;
  propertyId?: string;
  propertyTitle: string;
  propertyImageUrl?: string | null;
  renterUid: string;
  ownerUid: string;
  renterDisplayName: string;
  ownerDisplayName: string;
}

export async function ensureChatChannel(input: EnsureChatChannelInput): Promise<void> {
  const chatRef = doc(db, CHATS_COLLECTION, input.rentalId);
  const chatSnap = await getDoc(chatRef);

  if (chatSnap.exists()) {
    return;
  }

  await setDoc(chatRef, {
    rentalId: input.rentalId,
    propertyId: input.propertyId ?? "",
    propertyTitle: input.propertyTitle,
    propertyImageUrl: input.propertyImageUrl ?? null,
    renterUid: input.renterUid,
    ownerUid: input.ownerUid,
    renterDisplayName: input.renterDisplayName,
    ownerDisplayName: input.ownerDisplayName,
    lastMessage: "Chat initiated",
    lastMessageTimestamp: serverTimestamp(),
    unreadBy: [],
  });
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

// stream messsage within a specific chat channel
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

// Send a new message
export async function sendMessage(
  rentalId: string,
  senderUid: string,
  recipientUid: string,
  text: string
): Promise<void> {
  if (!text.trim()) return;

  // Add the message to the subcollection
  await addDoc(collection(db, CHATS_COLLECTION, rentalId, MESSAGES_SUBCOLLECTION), {
    senderUid,
    text: text.trim(),
    createdAt: serverTimestamp(),
  });

  // Update the parent channel header snippet
  await updateDoc(doc(db, CHATS_COLLECTION, rentalId), {
    lastMessage: text.trim(),
    lastMessageTimestamp: serverTimestamp(),
    unreadBy: arrayUnion(recipientUid), // Flags notification indicator for the receiver
  });
}

// Mark chat as read when opened
export async function markChatAsRead(rentalId: string, userUid: string): Promise<void> {
  await updateDoc(doc(db, CHATS_COLLECTION, rentalId), {
    unreadBy: arrayRemove(userUid),
  });
}
