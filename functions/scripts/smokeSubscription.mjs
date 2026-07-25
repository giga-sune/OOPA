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
const email = `subscription-smoke-${suffix}@example.com`;
const password = `${randomBytes(16).toString("base64url")}aA1!`;
let idToken;
let uid;

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

async function callFunction(name, data) {
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

  if (!response.ok || payload.error) {
    throw new Error(`${name} failed: ${JSON.stringify(payload.error ?? payload)}`);
  }

  return payload.result;
}

try {
  const signup = await identityRequest("signUp", {
    email,
    password,
    returnSecureToken: true,
  });
  idToken = signup.idToken;
  uid = signup.localId;

  const allowance = await callFunction("getListingAllowance", {});
  const subscription = await callFunction("createSubscription", {
    interval: "monthly",
  });

  console.log(JSON.stringify({
    uid,
    allowance,
    subscriptionId: subscription.subscriptionId,
    customerId: subscription.customerId,
    hasClientSecret: typeof subscription.clientSecret === "string",
    hasEphemeralKey:
      typeof subscription.customerEphemeralKeySecret === "string",
  }, null, 2));
} finally {
  if (idToken) {
    await identityRequest("delete", {idToken});
  }
}
