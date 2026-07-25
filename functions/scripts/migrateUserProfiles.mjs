import {applicationDefault, getApps, initializeApp} from "firebase-admin/app";
import {FieldValue, getFirestore} from "firebase-admin/firestore";

const shouldApply = process.argv.includes("--apply");
const projectId = process.env.GCLOUD_PROJECT || "oopa-e977a";
const canonicalFields = new Set([
  "uid",
  "email",
  "userName",
  "photoURL",
  "profilePictureUrl",
  "phone",
  "createdAt",
  "updatedAt",
]);

if (getApps().length === 0) {
  initializeApp({credential: applicationDefault(), projectId});
}

function nullableString(value, fallback = null) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function nullableUrl(value) {
  const normalized = nullableString(value);
  return normalized && /^https?:\/\//i.test(normalized) ? normalized : null;
}

const db = getFirestore();
const users = await db.collection("users").get();
const changes = [];

for (const snapshot of users.docs) {
  const data = snapshot.data();
  const userName = nullableString(
    data.userName,
    nullableString(data.displayName)
  );
  const canonical = {
    uid: snapshot.id,
    email: nullableString(data.email, ""),
    userName,
    photoURL: nullableUrl(data.photoURL),
    profilePictureUrl: nullableUrl(data.profilePictureUrl),
    phone: nullableString(data.phone),
    createdAt: data.createdAt ?? FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  const existingKeys = Object.keys(data);
  const needsMigration =
    existingKeys.some((key) => !canonicalFields.has(key)) ||
    [...canonicalFields].some((key) => !existingKeys.includes(key)) ||
    data.uid !== snapshot.id ||
    data.userName !== canonical.userName ||
    data.photoURL !== canonical.photoURL ||
    data.profilePictureUrl !== canonical.profilePictureUrl ||
    data.phone !== canonical.phone;

  if (needsMigration) {
    changes.push({reference: snapshot.ref, canonical, id: snapshot.id});
  }
}

console.table(changes.map(({id}) => ({uid: id})));
console.log(
  `${users.size} user profiles, ${changes.length} canonical migrations ` +
  `(${shouldApply ? "apply" : "dry-run"}).`
);

if (shouldApply) {
  for (let offset = 0; offset < changes.length; offset += 400) {
    const batch = db.batch();

    for (const change of changes.slice(offset, offset + 400)) {
      batch.set(change.reference, change.canonical);
    }

    await batch.commit();
  }

  console.log("User profile migration applied successfully.");
}
