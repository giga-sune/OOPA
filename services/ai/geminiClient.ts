const GEMINI_API_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta";

interface GeminiGenerationConfig {
  candidateCount: number;
  maxOutputTokens: number;
  temperature: number;
  topP: number;
  responseMimeType: "text/plain";
}

interface GenerateGeminiTextInput {
  model: string;
  systemInstruction: string;
  prompt: string;
  generationConfig: GeminiGenerationConfig;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseResponseBody(responseText: string): unknown {
  if (!responseText) return null;

  try {
    return JSON.parse(responseText) as unknown;
  } catch {
    return responseText;
  }
}

function extractGeneratedText(responseBody: unknown): string {
  if (!isRecord(responseBody) || !Array.isArray(responseBody.candidates)) {
    return "";
  }

  const responseParts: string[] = [];

  for (const candidate of responseBody.candidates) {
    if (!isRecord(candidate) || !isRecord(candidate.content)) continue;

    const { parts } = candidate.content;
    if (!Array.isArray(parts)) continue;

    for (const part of parts) {
      if (isRecord(part) && typeof part.text === "string") {
        responseParts.push(part.text);
      }
    }
  }

  return responseParts.join("").trim();
}

export async function generateGeminiText({
  model,
  systemInstruction,
  prompt,
  generationConfig,
}: GenerateGeminiTextInput): Promise<string> {
  if (!__DEV__) {
    throw new Error(
      "The temporary direct Gemini API client is disabled outside development.",
    );
  }

  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY?.trim();

  if (!apiKey) {
    const configurationError = new Error(
      "Missing EXPO_PUBLIC_GEMINI_API_KEY. Add it to .env.local and reload the app.",
    );

    console.error(
      "DIRECT GEMINI API CONFIGURATION ERROR:",
      configurationError.message,
    );
    throw configurationError;
  }

  const endpoint = `${GEMINI_API_BASE_URL}/models/${encodeURIComponent(model)}:generateContent`;
  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig,
      }),
    });
  } catch (error) {
    console.error("DIRECT GEMINI API NETWORK ERROR:", error);
    throw error;
  }

  const responseText = await response.text();
  const responseBody = parseResponseBody(responseText);

  if (!response.ok) {
    console.error("DIRECT GEMINI API ERROR DETAILED:", {
      status: response.status,
      statusText: response.statusText,
      responseBody,
    });

    throw new Error(
      `Direct Gemini API request failed with HTTP ${response.status}.`,
    );
  }

  const generatedText = extractGeneratedText(responseBody);

  if (!generatedText) {
    console.error("DIRECT GEMINI API EMPTY RESPONSE:", responseBody);
    throw new Error("Gemini returned no generated text.");
  }

  return generatedText;
}
