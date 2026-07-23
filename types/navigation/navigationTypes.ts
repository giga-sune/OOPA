import type { Rental, RentalRatePeriod } from "../rental/rentalTypes";

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  MainApp: undefined;
  MyListings: undefined;
  Details: { propertyId: string };
  MapViewer: { latitude: number; longitude: number; address: string };
  CheckoutScreen: {
    propertyId: string;
    title: string;
    price: number;
    ratePeriod: RentalRatePeriod;
    image: string | null;
    ownerDisplayName: string;
  };

  LenderRequestDetailScreen: { rentalId: string };
  BorrowerOrderDetailScreen: { rentalId: string };
  ReviewItemScreen: { rental: Rental };
  ReportItemScreen: { rental: Rental };
  AllReviews: { 
    propertyId: string; 
    propertyTitle: string; 
  };

  ChatRoom: { 
    rentalId: string; 
    title: string; 
    recipientUid: string; 
    recipientName: string; 
  };
};

export type TabParamList = {
  Home: undefined;
  Inbox: undefined;
  Post: undefined;
  Orders: undefined;
  Profile: undefined;
};
