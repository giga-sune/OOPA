import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    where,
    arrayUnion,
    arrayRemove,
    type DocumentData,
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
  
  // 1. STREAM ACTIVE CHATS FOR INBOX (Real-time update stream)
  export function subscribeToUserChats(userUid: string, onUpdate: (chats: ChatChannel[]) => void) {
    // Query channels where the current user is either the borrower OR the lender
    const chatsQuery = query(
      collection(db, CHATS_COLLECTION),
      where("lastMessageTimestamp", "!=", null)
    );
  
    return onSnapshot(chatsQuery, (snapshot) => {
      const channels: ChatChannel[] = [];
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Filter logically in memory because Firestore limits complex OR queries cross-field structures
        if (data.renterUid === userUid || data.ownerUid === userUid) {
          channels.push({
            id: docSnap.id,
            propertyId: data.propertyId,
            propertyTitle: data.propertyTitle,
            propertyImageUrl: data.propertyImageUrl,
            renterUid: data.renterUid,
            renterDisplayName: data.renterDisplayName,
            ownerUid: data.ownerUid,
            ownerDisplayName: data.ownerDisplayName,
            lastMessage: data.lastMessage || "",
            lastMessageTimestamp: data.lastMessageTimestamp,
            unreadBy: data.unreadBy || [],
          });
        }
      });
  
      // Sort by newest timestamp locally
      channels.sort((a, b) => {
        const timeA = a.lastMessageTimestamp?.seconds || 0;
        const timeB = b.lastMessageTimestamp?.seconds || 0;
        return timeB - timeA;
      });
  
      onUpdate(channels);
    });
  }
  
  // stream messsage within a specific chat channel
  export function subscribeToMessages(rentalId: string, onUpdate: (messages: ChatMessage[]) => void) {
    const msgQuery = query(
      collection(db, CHATS_COLLECTION, rentalId, MESSAGES_SUBCOLLECTION),
      orderBy("createdAt", "asc")
    );
  
    return onSnapshot(msgQuery, (snapshot) => {
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
    });
  }
  
  // Send a new message
  export async function sendMessage(rentalId: string, senderUid: string, recipientUid: string, text: string): Promise<void> {
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