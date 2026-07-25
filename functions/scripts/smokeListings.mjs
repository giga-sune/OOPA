import {randomBytes} from "node:crypto";
import {readFile} from "node:fs/promises";

const projectId = process.env.GCLOUD_PROJECT || "oopa-e977a";
const region = "us-central1";
const configSource = await readFile(
  new URL("../../services/firebase/firebaseConfig.ts", import.meta.url),
  "utf8"
);
const apiKey = configSource.match(/apiKey:\s*["']([^"']+)["']/)?.[1];

if (!apiKey) {
  throw new Error("Firebase Web API key was not found.");
}

const suffix = randomBytes(8).toString("hex");
const email = `listing-smoke-${suffix}@example.com`;
const password = `${randomBytes(16).toString("base64url")}aA1!`;
const propertyIds = [];
let idToken;

async function identityRequest(action, body) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:${action}?key=${apiKey}`,
    {
      method: "POST",
      headers: {"content-type": "application/json"},
      body: JSON.stringify(body),
    }
  );
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(`Firebase Auth ${action} failed: ${JSON.stringify(payload)}`);
  }

  return payload;
}

async function callFunction(name, data, expectedStatus) {
  const response = await fetch(
    `https://${region}-${projectId}.cloudfunctions.net/${name}`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${idToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({data}),
    }
  );
  const payload = await response.json();
  const status = payload.error?.status;

  if (expectedStatus) {
    if (status !== expectedStatus) {
      throw new Error(
        `${name} returned ${status ?? response.status}, expected ${expectedStatus}.`
      );
    }
    return payload.error;
  }

  if (!response.ok || payload.error) {
    throw new Error(`${name} failed: ${JSON.stringify(payload.error ?? payload)}`);
  }

  return payload.result;
}

function listing(index) {
  return {
    images: [`https://example.com/oopa-smoke-${index}.jpg`],
    title: `OOPA smoke listing ${index}`,
    description: "Temporary callable listing-limit verification.",
    brand: "OOPA",
    condition: "Good",
    priceType: "Fixed",
    price: 25,
    ratePeriod: "week",
    location: {
      address: "Toronto, Ontario",
      latitude: 43.6532,
      longitude: -79.3832,
    },
  };
}

try {
  const signup = await identityRequest("signUp", {
    email,
    password,
    returnSecureToken: true,
  });
  idToken = signup.idToken;

  const initial = await callFunction("getListingAllowance", {});
  for (let index = 1; index <= 3; index += 1) {
    const created = await callFunction("createListing", {
      listing: listing(index),
    });
    propertyIds.push(created.propertyId);
  }
  const atLimit = await callFunction("getListingAllowance", {});
  const fourthError = await callFunction(
    "createListing",
    {listing: listing(4)},
    "RESOURCE_EXHAUSTED"
  );
  await callFunction("deleteListing", {propertyId: propertyIds.pop()});
  const afterDelete = await callFunction("getListingAllowance", {});

  console.log(JSON.stringify({
    initial,
    atLimit,
    fourthStatus: fourthError.status,
    afterDelete,
  }, null, 2));
} finally {
  if (idToken) {
    for (const propertyId of propertyIds) {
      await callFunction("deleteListing", {propertyId});
    }
    await identityRequest("delete", {idToken});
  }
}
