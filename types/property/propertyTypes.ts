export type PropertyCondition = "Like new" | "Good" | "Used";
export type PropertyPriceType = "Fixed" | "Flexible";
export type PropertyRatePeriod = "week" | "month";

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
}
