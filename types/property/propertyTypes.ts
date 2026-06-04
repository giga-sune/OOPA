export type PropertyCondition = "Like new" | "Good" | "Used";
export type PropertyPriceType = "Fixed" | "Flexible";

export interface Property {
  id: string;
  ownerUid: string;
  ownerEmail: string | null;
  ownerDisplayName: string | null;
  ownerPhotoURL: string | null;
  title: string;
  description: string;
  brand: string;
  condition: PropertyCondition;
  priceType: PropertyPriceType;
  price: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePropertyInput {
  ownerUid: string;
  ownerEmail: string | null;
  ownerDisplayName: string | null;
  ownerPhotoURL: string | null;
  title: string;
  description: string;
  brand: string;
  condition: PropertyCondition;
  priceType: PropertyPriceType;
  price: number;
}

export interface UpdatePropertyInput {
  title?: string;
  description?: string;
  brand?: string;
  condition?: PropertyCondition;
  priceType?: PropertyPriceType;
  price?: number;
}
