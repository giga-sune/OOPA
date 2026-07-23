import { readFileSync } from "node:fs";
import test, { after, before } from "node:test";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";

const PROJECT_ID = "oopa-e977a";
const OWNER_UID = "owner-user";
const RENTER_UID = "renter-user";
const OUTSIDER_UID = "outsider-user";
const RENTAL_ID = "approved-rental";

let testEnv;

function validRental(status = "approved") {
  const startDate = Timestamp.fromDate(new Date("2026-07-01T00:00:00Z"));
  const endDate = Timestamp.fromDate(new Date("2026-07-08T00:00:00Z"));
  const createdAt = Timestamp.fromDate(new Date("2026-06-01T00:00:00Z"));

  return {
    propertyId: "property-one",
    renterUid: RENTER_UID,
    renterDisplayName: "Renter",
    ownerUid: OWNER_UID,
    ownerDisplayName: "Owner",
    propertyTitle: "Camera",
    propertyImageUrl: "https://example.com/camera.jpg",
    propertyRatePeriod: "week",
    propertyPrice: 50,
    startDate,
    endDate,
    totalUnits: 1,
    totalPrice: 50,
    message: null,
    status,
    createdAt,
    updatedAt: createdAt,
  };
}

function validChat() {
  return {
    rentalId: RENTAL_ID,
    propertyId: "property-one",
    propertyTitle: "Camera",
    propertyImageUrl: "https://example.com/camera.jpg",
    renterUid: RENTER_UID,
    renterDisplayName: "Renter",
    ownerUid: OWNER_UID,
    ownerDisplayName: "Owner",
    lastMessage: "Rental request approved.",
    lastMessageTimestamp: Timestamp.fromDate(new Date("2026-06-01T00:00:00Z")),
    unreadBy: [RENTER_UID],
  };
}

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "rentals", RENTAL_ID), validRental());
    await setDoc(doc(db, "chats", RENTAL_ID), validChat());
    await setDoc(doc(db, "notifications", `${RENTAL_ID}_request_approved`), {
      rentalId: RENTAL_ID,
      recipientUid: RENTER_UID,
      type: "request_approved",
      categoryLabel: "Rental Approved",
      bodyText: "Your request was approved.",
      propertyImageUrl: null,
      createdAt: Timestamp.fromDate(new Date("2026-06-01T00:00:00Z")),
      read: false,
    });
  });
});

after(async () => {
  await testEnv?.cleanup();
});

test("server-owned chat, notification, and push-token rules", async (t) => {
  const ownerDb = testEnv.authenticatedContext(OWNER_UID).firestore();
  const renterDb = testEnv.authenticatedContext(RENTER_UID).firestore();
  const outsiderDb = testEnv.authenticatedContext(OUTSIDER_UID).firestore();
  const anonymousDb = testEnv.unauthenticatedContext().firestore();

  await t.test("approved participants can read and query their chat", async () => {
    await assertSucceeds(getDoc(doc(ownerDb, "chats", RENTAL_ID)));
    await assertSucceeds(getDoc(doc(renterDb, "chats", RENTAL_ID)));
    await assertSucceeds(getDocs(query(
      collection(ownerDb, "chats"),
      where("ownerUid", "==", OWNER_UID)
    )));
    await assertFails(getDocs(collection(ownerDb, "chats")));
  });

  await t.test("outsiders and anonymous users cannot read chats", async () => {
    await assertFails(getDoc(doc(outsiderDb, "chats", RENTAL_ID)));
    await assertFails(getDoc(doc(anonymousDb, "chats", RENTAL_ID)));
  });

  await t.test("clients cannot create or delete server-owned chats", async () => {
    await assertFails(setDoc(doc(renterDb, "chats", "forged-chat"), {
      ...validChat(),
      rentalId: "forged-chat",
    }));
    await assertFails(deleteDoc(doc(ownerDb, "chats", RENTAL_ID)));
  });

  await t.test("participants can update only validated chat metadata", async () => {
    await assertSucceeds(updateDoc(doc(renterDb, "chats", RENTAL_ID), {
      lastMessage: "Hello",
      lastMessageTimestamp: serverTimestamp(),
      unreadBy: arrayUnion(OWNER_UID),
    }));
    await assertFails(updateDoc(doc(renterDb, "chats", RENTAL_ID), {
      ownerUid: RENTER_UID,
    }));
    await assertFails(updateDoc(doc(renterDb, "chats", RENTAL_ID), {
      unreadBy: [OUTSIDER_UID],
    }));
    await assertFails(updateDoc(doc(outsiderDb, "chats", RENTAL_ID), {
      lastMessage: "Hijacked",
      lastMessageTimestamp: serverTimestamp(),
    }));
  });

  await t.test("message writes enforce identity, schema, size, and immutability", async () => {
    const messages = collection(renterDb, "chats", RENTAL_ID, "messages");
    const validMessage = await assertSucceeds(addDoc(messages, {
      senderUid: RENTER_UID,
      text: "Hello owner",
      createdAt: serverTimestamp(),
    }));
    await assertSucceeds(getDocs(query(messages, orderBy("createdAt", "asc"))));
    await assertFails(addDoc(messages, {
      senderUid: OWNER_UID,
      text: "Spoofed",
      createdAt: serverTimestamp(),
    }));
    await assertFails(addDoc(messages, {
      senderUid: RENTER_UID,
      text: "Schema pollution",
      createdAt: serverTimestamp(),
      extraData: "not allowed",
    }));
    await assertFails(addDoc(messages, {
      senderUid: RENTER_UID,
      text: "x".repeat(2001),
      createdAt: serverTimestamp(),
    }));
    await assertFails(updateDoc(validMessage, {text: "Edited"}));
    await assertFails(deleteDoc(validMessage));
    await assertFails(getDocs(collection(
      outsiderDb,
      "chats",
      RENTAL_ID,
      "messages"
    )));
  });

  await t.test("notifications are server-owned and recipient-private", async () => {
    const notificationId = `${RENTAL_ID}_request_approved`;
    await assertSucceeds(getDoc(doc(renterDb, "notifications", notificationId)));
    await assertSucceeds(getDocs(query(
      collection(renterDb, "notifications"),
      where("recipientUid", "==", RENTER_UID),
      orderBy("createdAt", "desc")
    )));
    await assertFails(getDoc(doc(ownerDb, "notifications", notificationId)));
    await assertFails(addDoc(collection(renterDb, "notifications"), {
      recipientUid: RENTER_UID,
      type: "request_approved",
      bodyText: "Forged",
      createdAt: serverTimestamp(),
      read: false,
    }));
    await assertFails(updateDoc(doc(renterDb, "notifications", notificationId), {
      bodyText: "Changed",
    }));
    await assertSucceeds(deleteDoc(doc(renterDb, "notifications", notificationId)));
  });

  await t.test("push tokens are writable only by owner and never client-readable", async () => {
    const renterToken = doc(renterDb, "pushTokens", RENTER_UID);
    await assertSucceeds(setDoc(renterToken, {
      token: "ExponentPushToken[valid-renter-token]",
      updatedAt: serverTimestamp(),
    }));
    await assertFails(getDoc(renterToken));
    await assertFails(setDoc(doc(outsiderDb, "pushTokens", RENTER_UID), {
      token: "ExponentPushToken[attacker-token]",
      updatedAt: serverTimestamp(),
    }));
    await assertFails(setDoc(renterToken, {
      token: "short",
      updatedAt: serverTimestamp(),
    }));
    await assertFails(setDoc(renterToken, {
      token: "ExponentPushToken[valid-renter-token]",
      updatedAt: serverTimestamp(),
      role: "admin",
    }));
    await assertSucceeds(deleteDoc(renterToken));
  });

  await t.test("rental participants can read an absent payment document", async () => {
    await assertSucceeds(getDoc(doc(renterDb, "payments", RENTAL_ID)));
    await assertSucceeds(getDoc(doc(ownerDb, "payments", RENTAL_ID)));
    await assertFails(getDoc(doc(outsiderDb, "payments", RENTAL_ID)));
  });
});
