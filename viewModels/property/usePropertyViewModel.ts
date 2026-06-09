import { useState, type Dispatch, type SetStateAction } from "react";
import * as ImagePicker from "expo-image-picker";

import { useAuth } from "../../context/AuthContext";
import { createProperty } from "../../services/firestore/propertyService";
import { uploadImageToStorage } from "../../services/storage/storageService";
import type {
  CreatePropertyInput,
  PropertyCondition,
  PropertyPriceType,
} from "../../types/property/propertyTypes";

const VALID_CONDITIONS: PropertyCondition[] = ["Like new", "Good", "Used"];
const VALID_PRICE_TYPES: PropertyPriceType[] = ["Fixed", "Flexible"];

export interface PublishPropertyInput
  extends Omit<CreatePropertyInput, "condition" | "priceType" | "images"> {
  condition: PropertyCondition | null;
  priceType: PropertyPriceType | null;
}

export interface PropertyViewModelResult {
  title: string;
  setTitle: Dispatch<SetStateAction<string>>;
  description: string;
  setDescription: Dispatch<SetStateAction<string>>;
  brand: string;
  setBrand: Dispatch<SetStateAction<string>>;
  price: string;
  setPrice: Dispatch<SetStateAction<string>>;
  priceType: PropertyPriceType;
  setPriceType: Dispatch<SetStateAction<PropertyPriceType>>;
  condition: PropertyCondition | null;
  setCondition: Dispatch<SetStateAction<PropertyCondition | null>>;
  selectedImageUri: string | null;
  pickImage: () => Promise<boolean>;
  clearSelectedImage: () => void;
  submitProperty: () => Promise<boolean>;
  loading: boolean;
  error: string;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) {
      return message;
    }
  }

  return fallback;
}

function validatePublishInput(input: PublishPropertyInput): string {
  if (!input.ownerUid.trim()) {
    return "You must be signed in to publish a listing.";
  }

  if (!input.title.trim()) {
    return "Title is required.";
  }

  if (!input.description.trim()) {
    return "Description is required.";
  }

  if (!input.brand.trim()) {
    return "Brand is required.";
  }

  if (input.condition === null || !VALID_CONDITIONS.includes(input.condition)) {
    return "Please choose a valid condition.";
  }

  if (input.priceType === null || !VALID_PRICE_TYPES.includes(input.priceType)) {
    return "Please choose a valid price type.";
  }

  if (!Number.isFinite(input.price) || input.price <= 0) {
    return "Enter a valid price.";
  }

  return "";
}

function extractImageExtension(asset: ImagePicker.ImagePickerAsset): string {
  const mimeExtension = asset.mimeType?.split("/").pop()?.toLowerCase();

  if (mimeExtension) {
    return mimeExtension === "jpeg" ? "jpg" : mimeExtension;
  }

  const fileNameExtension = asset.fileName?.split(".").pop()?.toLowerCase();

  if (fileNameExtension) {
    return fileNameExtension;
  }

  const uriWithoutQuery = asset.uri.split("?")[0];
  const uriExtension = uriWithoutQuery.includes(".")
    ? uriWithoutQuery.split(".").pop()?.toLowerCase()
    : undefined;

  return uriExtension || "jpg";
}

export default function usePropertyViewModel(): PropertyViewModelResult {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [brand, setBrand] = useState("");
  const [price, setPrice] = useState("");
  const [priceType, setPriceType] = useState<PropertyPriceType>("Fixed");
  const [condition, setCondition] = useState<PropertyCondition | null>(null);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [selectedImageExtension, setSelectedImageExtension] = useState("jpg");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const clearSelectedImage = () => {
    setSelectedImageUri(null);
    setSelectedImageExtension("jpg");
  };

  const pickImage = async (): Promise<boolean> => {
    setError("");

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setError("Please allow photo library access to add a listing image.");
        return false;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled) {
        return false;
      }

      const asset = result.assets[0];

      if (!asset?.uri) {
        setError("Could not read the selected image. Please try again.");
        return false;
      }

      setSelectedImageUri(asset.uri);
      setSelectedImageExtension(extractImageExtension(asset));
      return true;
    } catch (pickerError) {
      setError(
        getErrorMessage(pickerError, "Could not open your photo library. Please try again.")
      );
      return false;
    }
  };

  const submitProperty = async (): Promise<boolean> => {
    const input: PublishPropertyInput = {
      ownerUid: user?.uid ?? "",
      ownerEmail: user?.email ?? null,
      ownerDisplayName: user?.displayName ?? null,
      ownerPhotoURL: user?.photoURL ?? null,
      title,
      description,
      brand,
      condition,
      priceType,
      price: Number(price),
    };

    const validationError = validatePublishInput(input);
    setError(validationError);

    if (validationError) {
      return false;
    }

    if (!selectedImageUri) {
      setError("Please choose an image before publishing.");
      return false;
    }

    setError("");
    setLoading(true);

    try {
      const imagePath = `properties/${input.ownerUid}/${Date.now()}.${selectedImageExtension}`;
      const imageUrl = await uploadImageToStorage(selectedImageUri, imagePath);

      const sanitizedInput: CreatePropertyInput = {
        ownerUid: input.ownerUid,
        ownerEmail: input.ownerEmail,
        ownerDisplayName: input.ownerDisplayName,
        ownerPhotoURL: input.ownerPhotoURL,
        images: [imageUrl],
        title: input.title.trim(),
        description: input.description.trim(),
        brand: input.brand.trim(),
        condition: input.condition as PropertyCondition,
        priceType: input.priceType as PropertyPriceType,
        price: input.price,
      };

      await createProperty(sanitizedInput);
      setTitle("");
      setDescription("");
      setBrand("");
      setPrice("");
      setPriceType("Fixed");
      setCondition(null);
      clearSelectedImage();

      return true;
    } catch (serviceError) {
      setError(
        getErrorMessage(serviceError, "Could not publish this listing. Please try again.")
      );
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    title,
    setTitle,
    description,
    setDescription,
    brand,
    setBrand,
    price,
    setPrice,
    priceType,
    setPriceType,
    condition,
    setCondition,
    selectedImageUri,
    pickImage,
    clearSelectedImage,
    submitProperty,
    loading,
    error,
  };
}
