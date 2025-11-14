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

// Common technical term misrecognitions from speech-to-text
const TECHNICAL_CORRECTIONS: Record<string, string> = {
  // Data types and programming
  'care': 'char',
  'chair': 'char',
  'car': 'char',
  'int': 'int',
  'integer': 'int',
  'string': 'string',
  'bool': 'bool',
  'boolean': 'bool',
  'float': 'float',
  'double': 'double',
  'void': 'void',
  
  // Programming concepts
  'array': 'array',
  'arry': 'array',
  'function': 'function',
  'variable': 'variable',
  'loop': 'loop',
  'class': 'class',
  'object': 'object',
  'method': 'method',
  'interface': 'interface',
  'inheritance': 'inheritance',
  'polymorphism': 'polymorphism',
  'encapsulation': 'encapsulation',
  'abstraction': 'abstraction',
  
  // Data structures
  'list': 'list',
  'stack': 'stack',
  'queue': 'queue',
  'tree': 'tree',
  'graph': 'graph',
  'hash': 'hash',
  'map': 'map',
  'set': 'set',
  
  // Algorithms
  'sorting': 'sorting',
  'searching': 'searching',
  'binary search': 'binary search',
  'quick sort': 'quicksort',
  'merge sort': 'merge sort',
  'bubble sort': 'bubble sort',
  
  // Technologies
  'react': 'React',
  'node': 'Node.js',
  'javascript': 'JavaScript',
  'typescript': 'TypeScript',
  'python': 'Python',
  'java': 'Java',
  'c plus plus': 'C++',
  'c sharp': 'C#',
  'sql': 'SQL',
  'html': 'HTML',
  'css': 'CSS',
  'api': 'API',
  'rest': 'REST',
  'json': 'JSON',
  'xml': 'XML',
  
  // System/OS concepts
  'operating system': 'operating system',
  'os': 'OS',
  'database': 'database',
  'db': 'database',
  'server': 'server',
  'client': 'client',
  'network': 'network',
  'protocol': 'protocol',
  'http': 'HTTP',
  'https': 'HTTPS',
  'tcp': 'TCP',
  'ip': 'IP',
  'dns': 'DNS',
  
  // Engineering concepts
  'algorithm': 'algorithm',
  'data structure': 'data structure',
  'time complexity': 'time complexity',
  'space complexity': 'space complexity',
  'big o': 'Big O',
  'o of n': 'O(n)',
  'design pattern': 'design pattern',
  'microservice': 'microservice',
  'docker': 'Docker',
  'kubernetes': 'Kubernetes',
  'aws': 'AWS',
  'cloud': 'cloud',
};

/**
 * Corrects common technical term misrecognitions in speech-to-text
 */
const correctTechnicalTerms = (text: string): string => {
  let corrected = text.toLowerCase();
  
  // Replace common misrecognitions
  Object.entries(TECHNICAL_CORRECTIONS).forEach(([wrong, correct]) => {
    // Use word boundaries to avoid partial matches
    const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
    corrected = corrected.replace(regex, correct);
  });
  
  // Special handling for "char" - very common misrecognition
  // If we see "care" or "chair" in a programming context, replace with "char"
  if (/\b(care|chair)\b/i.test(corrected) && 
      (/\b(int|string|bool|float|double|void|data\s*type|programming|code)\b/i.test(corrected) ||
       /\b(explain|what|difference|between|define|describe)\b/i.test(corrected))) {
    corrected = corrected.replace(/\b(care|chair)\b/gi, 'char');
  }
  
  return corrected;
};

/**
 * Enhances the question with context for better understanding
 */
const enhanceQuestion = (question: string): string => {
  const corrected = correctTechnicalTerms(question);
  
  // Add context if it's clearly a technical question
  const isTechnicalQuestion = 
    /\b(explain|what|how|why|define|describe|difference|between|compare|algorithm|data\s*structure|programming|code|technology|system|design|implementation)\b/i.test(corrected) ||
    /\b(int|char|string|bool|float|array|function|class|object|method|interface|api|database|server|client)\b/i.test(corrected);
  
  if (isTechnicalQuestion) {
    return `[Engineering/Technical Interview Question] ${corrected}`;
  }
  
  return corrected;
};

export const generateAnswerStream = async (
  question: string,
  onChunk: (chunk: string) => void
): Promise<void> => {
  let attempt = 0;
  
  // Enhanced system instruction for engineering interviews
  const systemInstruction = `You are an expert engineering interview coach specializing in technical interviews for engineering students. Your role is to provide clear, educational, and technically accurate answers.

CRITICAL INSTRUCTIONS:
1. Focus ONLY on engineering, programming, computer science, and technology concepts
2. If a question contains slight misrecognitions (e.g., "care" instead of "char"), automatically interpret the most likely technical term based on context
3. Give educational, technical answers - NOT general knowledge or non-technical explanations
4. When asked about programming concepts (like "int and char"), explain them as data types, not general words
5. Keep answers concise (45-60 words) and interview-ready
6. Use proper technical terminology
7. If the question is unclear but seems technical, infer the most likely technical interpretation
8. Always assume the context is engineering/computer science unless explicitly otherwise

Example: If asked "explain int and care datatype", understand this means "int and char datatype" and explain both as programming data types, not the word "care".

Output format: Direct, technical, educational answer suitable for an engineering interview.`;

  // Preprocess the question to correct misrecognitions and add context
  const enhancedQuestion = enhanceQuestion(question);

  while (attempt < MAX_RETRIES) {
    try {
      const responseStream = await ai.models.generateContentStream({
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