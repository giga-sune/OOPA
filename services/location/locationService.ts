import * as Location from "expo-location";

export async function getReadableAddress(lat: number, lon: number): Promise<string> {
  try {
    const [geocodeResult] = await Location.reverseGeocodeAsync({
      latitude: lat,
      longitude: lon,
    });

    if (!geocodeResult) {
      return "Unknown Location";
    }

    const { streetNumber, street, city, region, country } = geocodeResult;

    // Filter out missing items to prevent double commas
    const components = [
      streetNumber && street ? `${streetNumber} ${street}` : street || streetNumber,
      city,
      region,
      country,
    ].filter((item): item is string => typeof item === "string" && item.trim().length > 0);

    return components.length > 0 ? components.join(", ") : `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  } catch (error) {
    console.error("Error running reverse geocoding lookup: ", error);
    throw new Error("Could not resolve address details from selected coordinate marker.");
  }
}

export async function searchAddressCoordinates(query: string): Promise<{ latitude: number; longitude: number } | null> {
    if (!query || query.trim().length < 3) return null;
    
    try {
      const results = await Location.geocodeAsync(query);
      if (results && results.length > 0) {
        return {
          latitude: results[0].latitude,
          longitude: results[0].longitude,
        };
      }
      return null;
    } catch (error) {
      console.error("Error performing search forward geocode: ", error);
      return null;
    }
  }