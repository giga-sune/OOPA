import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { storage } from "../firebase/firebaseApp";

const STORAGE_ERROR_MESSAGES: Record<string, string> = {
  "storage/canceled": "Image upload was canceled.",
  "storage/invalid-format": "This image format is not supported.",
  "storage/invalid-argument": "The selected image could not be uploaded.",
  "storage/object-not-found": "The upload destination could not be found.",
  "storage/quota-exceeded": "Storage quota has been exceeded. Please try again later.",
  "storage/retry-limit-exceeded": "Image upload timed out. Please try again.",
  "storage/unauthenticated": "You must be signed in to upload an image.",
  "storage/unauthorized": "You do not have permission to upload this image.",
  "storage/unknown": "Image upload failed. Please try again.",
};

function mapStorageError(error: unknown, fallback: string): Error {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;

    if (typeof code === "string" && code.length > 0) {
      return new Error(STORAGE_ERROR_MESSAGES[code] ?? fallback);
    }
  }

  if (error instanceof Error && error.message) {
    return new Error(error.message);
  }

  return new Error(fallback);
}

export async function uploadImageToStorage(localUri: string, path: string): Promise<string> {
  let blob: Blob | null = null;

  try {
    const response = await fetch(localUri);
    blob = await response.blob();

    const storageRef = ref(storage, path);
    const uploadResult = await uploadBytes(
      storageRef,
      blob,
      blob.type ? { contentType: blob.type } : undefined
    );

    return await getDownloadURL(uploadResult.ref);
  } catch (error) {
    throw mapStorageError(error, "Could not upload the selected image.");
  } finally {
    const closableBlob = blob as Blob & { close?: () => void };

    if (closableBlob && typeof closableBlob.close === "function") {
      closableBlob.close();
    }
  }
}
