import { ApiError, GoogleGenAI } from "@google/genai";
import { correctTechnicalTerms } from '../utils/speechCorrections';

const DEFAULT_API_KEY = process.env.API_KEY;

if (!DEFAULT_API_KEY) {
  console.warn(
    "API_KEY environment variable not set. App may not function correctly."
  );
}

const defaultClient = DEFAULT_API_KEY ? new GoogleGenAI({ apiKey: DEFAULT_API_KEY }) : null;

const getGeminiClient = (apiKey?: string) => {
  if (apiKey) {
    return new GoogleGenAI({ apiKey });
  }
  if (defaultClient) {
    return defaultClient;
  }
  throw new Error("Gemini API key not configured. Please provide a valid key.");
};

const model = 'gemini-2.5-flash';
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const JAVASCRIPT_TOPICS = [
  'javascript',
  'js',
  'node',
  'node.js',
  'react',
  'angular',
  'vue',
  'svelte',
  'express',
  'next.js',
  'vite',
  'async',
  'await',
  'promise',
  'closure',
  'hoisting',
  'prototype',
  'event loop',
  'call stack',
  'scope',
  'dom',
  'web api',
  'browser api',
  'es6',
  'typescript',
  'webpack',
  'babel',
  'jest',
  'cypress',
  'closure',
  'callbacks',
  'modules',
  'import',
  'export',
  'rest parameter',
  'spread operator',
];

const JAVASCRIPT_REGEX = new RegExp(
  `\\b(${JAVASCRIPT_TOPICS.map((topic) =>
    topic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  ).join('|')})\\b`,
  'i',
);

/**
 * Enhances the question with context for better understanding
 */
const enhanceQuestion = (question: string): string => {
  const corrected = correctTechnicalTerms(question);
  const hasJavaScriptKeyword = JAVASCRIPT_REGEX.test(corrected);
  
  // Add context if it's clearly a technical question
  const isTechnicalQuestion = 
    /\b(explain|what|how|why|define|describe|difference|between|compare|algorithm|data\s*structure|programming|code|technology|system|design|implementation)\b/i.test(corrected) ||
    /\b(int|char|string|bool|float|array|function|class|object|method|interface|api|database|server|client)\b/i.test(corrected);
  
  let contextualized = corrected;

  if (!hasJavaScriptKeyword) {
    contextualized = `[JavaScript Interview Context] ${contextualized}`;
  } else {
    contextualized = `[JavaScript Topic Identified] ${contextualized}`;
  }

  if (isTechnicalQuestion) {
    return `[Engineering/Technical Interview Question] ${contextualized}`;
  }
  
  return contextualized;
};

interface GeminiOptions {
  apiKey?: string;
}

export const generateAnswerStream = async (
  question: string,
  onChunk: (chunk: string) => void,
  options?: GeminiOptions
): Promise<void> => {
  let attempt = 0;
  
  // Enhanced system instruction with JavaScript focus
  const systemInstruction = `You are an expert JavaScript engineering interview coach. You specialize in front-end and full-stack JavaScript interviews (JavaScript, Node.js, frameworks, tooling) and your role is to provide clear, educational, and technically accurate answers.

CRITICAL INSTRUCTIONS:
1. Treat EVERY question as a JavaScript-focused interview prompt unless it explicitly targets another stack.
2. Cover language fundamentals (ES6+ features, closures, prototypes, async patterns, event loop), browser APIs, Node.js runtime, React/SPA architecture, testing, tooling, performance, and best practices.
3. If speech recognition introduces slight misrecognitions (e.g., "care" instead of "char", "jason" instead of "JSON"), automatically interpret the most likely JavaScript term.
4. Give educational, technical answers—not general definitions—highlighting why the concept matters in interviews and real projects.
5. Keep answers concise (45-60 words) and interview-ready, but prioritize clarity over brevity when a concept needs detail.
6. Use precise JavaScript terminology and include code-level reasoning when appropriate (without long code blocks).
7. When a question is vague, infer the closest JavaScript topic (e.g., if asked "explain hosting", answer about hoisting in JavaScript).
8. If a question truly lies outside JavaScript, briefly answer it but relate back to JavaScript perspectives when possible.

Example: If asked "explain int and care datatype", interpret it as a JavaScript data type question (number vs char/string) and ground the answer in JavaScript context.

Output format: Direct, technical, educational answer suitable for a JavaScript interview (45-60 words).`;

  // Preprocess the question to correct misrecognitions and add context
  const enhancedQuestion = enhanceQuestion(question);

  const client = getGeminiClient(options?.apiKey);

  while (attempt < MAX_RETRIES) {
    try {
      const responseStream = await client.models.generateContentStream({
        model,
        contents: enhancedQuestion,
        config: {
          systemInstruction,
          temperature: 0.5, // Lower temperature for more accurate technical answers
          topP: 0.9,
          topK: 40,
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