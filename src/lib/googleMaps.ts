export type DistanceResult = {
  distanceKm: number;
  durationMinutes: number;
  source: "google" | "manual";
};

export type AddressSuggestion = {
  placeId: string;
  text: string;
  mainText: string;
  secondaryText: string;
};

export type PlaceDetails = {
  placeId: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
};

function getGoogleMapsKey(): string | null {
  return process.env.GOOGLE_MAPS_KEY ?? process.env.GOOGLE_MAPS_API_KEY ?? null;
}

export function googleMapsConfigured(): boolean {
  return Boolean(getGoogleMapsKey());
}

export async function getAddressSuggestions(input: string, sessionToken: string): Promise<AddressSuggestion[]> {
  const apiKey = getGoogleMapsKey();
  if (!apiKey) return [];

  const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat",
    },
    body: JSON.stringify({
      input,
      sessionToken,
      includedRegionCodes: ["ca"],
      languageCode: "en",
      regionCode: "ca",
      locationBias: {
        circle: {
          center: { latitude: 42.9849, longitude: -81.2453 },
          radius: 50000,
        },
      },
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(7000),
  });

  if (!response.ok) return [];
  const data = await response.json();
  const suggestions = Array.isArray(data?.suggestions) ? data.suggestions : [];

  return suggestions
    .map((suggestion: Record<string, unknown>) => {
      const prediction = suggestion.placePrediction as
        | {
            placeId?: string;
            text?: { text?: string };
            structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } };
          }
        | undefined;
      if (!prediction?.placeId || !prediction.text?.text) return null;
      return {
        placeId: prediction.placeId,
        text: prediction.text.text,
        mainText: prediction.structuredFormat?.mainText?.text ?? prediction.text.text,
        secondaryText: prediction.structuredFormat?.secondaryText?.text ?? "",
      };
    })
    .filter((suggestion: AddressSuggestion | null): suggestion is AddressSuggestion => suggestion !== null)
    .slice(0, 5);
}

export async function getPlaceDetails(placeId: string, sessionToken: string): Promise<PlaceDetails | null> {
  const apiKey = getGoogleMapsKey();
  if (!apiKey) return null;

  const query = new URLSearchParams({ sessionToken });
  const response = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?${query.toString()}`,
    {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "id,formattedAddress,location",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(7000),
    },
  );

  if (!response.ok) return null;
  const data = await response.json();
  if (!data?.id || !data?.formattedAddress || typeof data?.location?.latitude !== "number") return null;

  return {
    placeId: data.id,
    formattedAddress: data.formattedAddress,
    latitude: data.location.latitude,
    longitude: data.location.longitude,
  };
}

export async function getDistance(pickupAddress: string, dropoffAddress: string): Promise<DistanceResult | null> {
  const apiKey = getGoogleMapsKey();
  if (!apiKey) return null;

  const params = new URLSearchParams({
    origins: pickupAddress,
    destinations: dropoffAddress,
    units: "metric",
    region: "ca",
    key: apiKey,
  });

  try {
    const response = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;

    const data = await response.json();
    const element = data?.rows?.[0]?.elements?.[0];
    if (data?.status !== "OK" || !element || element.status !== "OK") return null;

    return {
      distanceKm: element.distance.value / 1000,
      durationMinutes: Math.round(element.duration.value / 60),
      source: "google",
    };
  } catch {
    return null;
  }
}
