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
    ratePeriod: string;
    image: string | null;
    ownerDisplayName: string;
  };
};

export type TabParamList = {
  Home: undefined;
  Search: undefined;
  Post: undefined;
  Orders: undefined;
  Profile: undefined;
};
