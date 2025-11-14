import { ApiError, GoogleGenAI } from "@google/genai";

if (!process.env.API_KEY) {
  console.warn(
    "API_KEY environment variable not set. App may not function correctly."
  );
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const model = 'gemini-2.5-flash';
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const generateAnswerStream = async (
  question: string,
  onChunk: (chunk: string) => void
): Promise<void> => {
  let attempt = 0;
  const systemInstruction =
    "You are an expert interview coach. Output a 45–60 word interview-ready spoken answer.";

  while (attempt < MAX_RETRIES) {
    try {
      const responseStream = await ai.models.generateContentStream({
        model,
        contents: question,
        config: {
          systemInstruction,
          temperature: 0.7,
          topP: 1,
          topK: 32,
        },
      });

      for await (const chunk of responseStream) {
        if (chunk.text) {
          onChunk(chunk.text);
        }
      }
      return;
    } catch (error) {
      attempt += 1;

      const status =
        error && typeof error === "object" && "status" in error
          ? Number((error as ApiError).status)
          : undefined;
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as Error).message)
          : "Unknown error";

      const isRetryable = status === 503 || status === 429;
      if (isRetryable && attempt < MAX_RETRIES) {
        const delay =
          INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(
          `Gemini API ${status} on attempt ${attempt}. Retrying in ${delay}ms...`
        );
        await sleep(delay);
        continue;
      }

      console.error("Error calling Gemini API:", error);

      if (status === 503) {
        throw new Error(
          "Gemini is temporarily overloaded. Please wait a moment and try again."
        );
      }

      if (status === 429) {
        throw new Error(
          "Gemini rate limit reached. Please slow down and try again shortly."
        );
      }

      throw new Error(
        message || "Failed to generate answer from Gemini API."
      );
    }
  }

  throw new Error("Failed to generate answer from Gemini API after multiple attempts.");
};