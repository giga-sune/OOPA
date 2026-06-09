import { useState, type Dispatch, type SetStateAction } from "react";
import * as ImagePicker from "expo-image-picker";

import { useAuth } from "../../context/AuthContext";
import { createProperty } from "../../services/firestore/propertyService";
import { uploadImageToStorage } from "../../services/storage/storageService";
import type {
  CreatePropertyInput,
  PropertyCondition,
  PropertyPriceType,
  PropertyRatePeriod,
  LocationData,
} from "../../types/property/propertyTypes";

const VALID_CONDITIONS: PropertyCondition[] = ["Like new", "Good", "Used"];
const VALID_PRICE_TYPES: PropertyPriceType[] = ["Fixed", "Flexible"];
const VALID_RATE_PERIODS: PropertyRatePeriod[] = ["week", "month"];

export interface PublishPropertyInput
  extends Omit<CreatePropertyInput, "condition" | "priceType" | "images" | "ratePeriod" | "location"> {
  condition: PropertyCondition | null;
  priceType: PropertyPriceType | null;
  ratePeriod: PropertyRatePeriod | null;
  location: LocationData | null;
}

interface SelectedImageItem {
  uri: string;
  extension: string;
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
  ratePeriod: PropertyRatePeriod;
  setRatePeriod: Dispatch<SetStateAction<PropertyRatePeriod>>;
  selectedImages: string[];
  location: LocationData | null; // Added location variable definition mappings
  setLocation: Dispatch<SetStateAction<LocationData | null>>;
  pickImage: () => Promise<boolean>;
  removeImage: (index: number) => void;
  submitProperty: () => Promise<boolean>;
  loading: boolean;
  error: string;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function validatePublishInput(input: PublishPropertyInput): string {
  if (!input.ownerUid.trim()) return "You must be signed in to publish a listing.";
  if (!input.title.trim()) return "Title is required.";
  if (!input.description.trim()) return "Description is required.";
  if (!input.brand.trim()) return "Brand is required.";
  if (input.condition === null || !VALID_CONDITIONS.includes(input.condition)) return "Please choose a valid condition.";
  if (input.priceType === null || !VALID_PRICE_TYPES.includes(input.priceType)) return "Please choose a valid price type.";
  if (input.ratePeriod === null || !VALID_RATE_PERIODS.includes(input.ratePeriod)) return "Please choose a valid rate period.";
  if (!Number.isFinite(input.price) || input.price <= 0) return "Enter a valid price.";
  if (!input.location || !input.location.address) return "Please choose a valid meetup location on the map.";
  return "";
}

function extractImageExtension(asset: ImagePicker.ImagePickerAsset): string {
  const mimeExtension = asset.mimeType?.split("/").pop()?.toLowerCase();
  if (mimeExtension) return mimeExtension === "jpeg" ? "jpg" : mimeExtension;
  return "jpg";
}

export default function usePropertyViewModel(): PropertyViewModelResult {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [brand, setBrand] = useState("");
  const [price, setPrice] = useState("");
  const [priceType, setPriceType] = useState<PropertyPriceType>("Fixed");
  const [condition, setCondition] = useState<PropertyCondition | null>(null);
  const [ratePeriod, setRatePeriod] = useState<PropertyRatePeriod>("month");
  const [imagesList, setImagesList] = useState<SelectedImageItem[]>([]);
  const [location, setLocation] = useState<LocationData | null>(null); // Added state hook definition for local property updates
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const removeImage = (indexToRemove: number) => {
    setImagesList((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const pickImage = async (): Promise<boolean> => {
    setError("");
    if (imagesList.length >= 8) {
      setError("Maximum 8 images are allowed.");
      return false;
    }
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError("Please allow photo library access to add a listing image.");
        return false;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: 8 - imagesList.length,
        quality: 0.8,
      });
      if (result.canceled) return false;

      const incomingAssets = result.assets.slice(0, 8 - imagesList.length);
      const parsedItems: SelectedImageItem[] = incomingAssets.map((asset) => ({
        uri: asset.uri,
        extension: extractImageExtension(asset),
      }));
      setImagesList((prev) => [...prev, ...parsedItems]);
      return true;
    } catch (pickerError) {
      setError(getErrorMessage(pickerError, "Could not open your photo library. Please try again."));
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
      ratePeriod,
      location,
    };

    const validationError = validatePublishInput(input);
    setError(validationError);
    if (validationError) return false;

    if (imagesList.length === 0) {
      setError("Please choose at least one image before publishing.");
      return false;
    }

    setError("");
    setLoading(true);

    try {
      const uploadedImageUrls: string[] = [];
      for (let i = 0; i < imagesList.length; i++) {
        const item = imagesList[i];
        const imagePath = `properties/${input.ownerUid}/${Date.now()}_img_${i}.${item.extension}`;
        const imageUrl = await uploadImageToStorage(item.uri, imagePath);
        uploadedImageUrls.push(imageUrl);
      }

      const sanitizedInput: CreatePropertyInput = {
        ownerUid: input.ownerUid,
        ownerEmail: input.ownerEmail,
        ownerDisplayName: input.ownerDisplayName,
        ownerPhotoURL: input.ownerPhotoURL,
        images: uploadedImageUrls,
        title: input.title.trim(),
        description: input.description.trim(),
        brand: input.brand.trim(),
        condition: input.condition as PropertyCondition,
        priceType: input.priceType as PropertyPriceType,
        price: input.price,
        ratePeriod: input.ratePeriod as PropertyRatePeriod,
        location: input.location, // Injected into database creation pipeline payload mapping
      };

      await createProperty(sanitizedInput);
      setTitle("");
      setDescription("");
      setBrand("");
      setPrice("");
      setPriceType("Fixed");
      setCondition(null);
      setRatePeriod("month");
      setLocation(null); // Clean state on completion setup
      setImagesList([]);
      return true;
    } catch (serviceError) {
      setError(getErrorMessage(serviceError, "Could not publish this listing. Please try again."));
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
    ratePeriod,
    setRatePeriod,
    selectedImages: imagesList.map((item) => item.uri),
    location,
    setLocation,
    pickImage,
    removeImage,
    submitProperty,
    loading,
    error,
  };
}