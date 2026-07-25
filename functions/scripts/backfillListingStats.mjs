import {applicationDefault, getApps, initializeApp} from "firebase-admin/app";
import {FieldValue, getFirestore} from "firebase-admin/firestore";

const shouldApply = process.argv.includes("--apply");
const projectId = process.env.GCLOUD_PROJECT || "oopa-e977a";

if (getApps().length === 0) {
  initializeApp({credential: applicationDefault(), projectId});
}

const db = getFirestore();
const properties = await db.collection("properties").get();
const counts = new Map();
const propertiesWithOwnerEmail = [];

for (const property of properties.docs) {
  const ownerUid = property.get("ownerUid");

  if (typeof ownerUid === "string" && ownerUid) {
    counts.set(ownerUid, (counts.get(ownerUid) ?? 0) + 1);
  }

  if (property.data().ownerEmail !== undefined) {
    propertiesWithOwnerEmail.push(property.ref);
  }
}

const existingStats = await db.collection("listingStats").get();
const allUids = new Set([
  ...counts.keys(),
  ...existingStats.docs.map((snapshot) => snapshot.id),
]);
const changes = [];

for (const uid of [...allUids].sort()) {
  const nextCount = counts.get(uid) ?? 0;
  const existing = existingStats.docs.find((snapshot) => snapshot.id === uid);
  const currentCount = existing?.get("activeCount");

  if (currentCount !== nextCount) {
    changes.push({uid, currentCount: currentCount ?? null, nextCount});
  }
}

console.table(changes);
console.log(
  `${properties.size} properties, ${allUids.size} owners, ` +
  `${changes.length} listingStats changes, ` +
  `${propertiesWithOwnerEmail.length} public owner email fields to remove ` +
  `(${shouldApply ? "apply" : "dry-run"}).`
);

if (shouldApply && (changes.length > 0 || propertiesWithOwnerEmail.length > 0)) {
  const operations = [
    ...changes.map((change) => ({kind: "stats", change})),
    ...propertiesWithOwnerEmail.map((propertyRef) => ({
      kind: "email",
      propertyRef,
    })),
  ];

  for (let offset = 0; offset < operations.length; offset += 400) {
    const batch = db.batch();

    for (const operation of operations.slice(offset, offset + 400)) {
      if (operation.kind === "stats") {
        const {change} = operation;
        batch.set(db.collection("listingStats").doc(change.uid), {
          activeCount: change.nextCount,
          updatedAt: FieldValue.serverTimestamp(),
        }, {merge: true});
      } else {
        batch.update(operation.propertyRef, {
          ownerEmail: FieldValue.delete(),
        });
      }
    }

    await batch.commit();
  }

  console.log("Listing stats and owner-email cleanup applied successfully.");
}
