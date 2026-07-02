export type PropertyCondition = "Like new" | "Good" | "Used";
export type PropertyPriceType = "Fixed" | "Flexible";
export type PropertyRatePeriod = "week" | "month";
export type PropertyPriceBand = "under-50" | "50-to-150" | "150-plus";

export interface LocationData {
  address: string;
  latitude: number;
  longitude: number;
}

export interface Property {
  id: string;
  ownerUid: string;
  ownerEmail: string | null;
  ownerDisplayName: string | null;
  ownerPhotoURL: string | null;
  images: string[];
  title: string;
  description: string;
  brand: string;
  condition: PropertyCondition;
  priceType: PropertyPriceType;
  price: number;
  ratePeriod: PropertyRatePeriod;
  location: LocationData | null;
  /** Canonical lowercase search index written with every Firestore property document. */
  searchKeywords: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePropertyInput {
  ownerUid: string;
  ownerEmail: string | null;
  ownerDisplayName: string | null;
  ownerPhotoURL: string | null;
  images: string[];
  title: string;
  description: string;
  brand: string;
  condition: PropertyCondition;
  priceType: PropertyPriceType;
  price: number;
  ratePeriod: PropertyRatePeriod;
  location: LocationData | null;
}

export interface PropertyFilters {
  condition: PropertyCondition | null;
  priceBand: PropertyPriceBand | null;
  priceType: PropertyPriceType | null;
}

export interface UpdatePropertyInput {
  images?: string[];
  title?: string;
  description?: string;
  brand?: string;
  condition?: PropertyCondition;
  priceType?: PropertyPriceType;
  price?: number;
  ratePeriod?: PropertyRatePeriod;
  location?: LocationData;
}
