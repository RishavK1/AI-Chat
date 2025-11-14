import { generateAnswerStream as generateGeminiAnswer } from './geminiService';
import type { ProviderSettings, AIProvider } from '../types';

const SYSTEM_PROMPT = `You are an expert JavaScript engineering interview coach. You specialize in front-end and full-stack JavaScript interviews (JavaScript, Node.js, frameworks, tooling) and your role is to provide clear, educational, and technically accurate answers.

CRITICAL INSTRUCTIONS:
1. Treat EVERY question as a JavaScript-focused interview prompt unless it explicitly targets another stack.
2. Cover language fundamentals (ES6+ features, closures, prototypes, async patterns, event loop), browser APIs, Node.js runtime, React/SPA architecture, testing, tooling, performance, and best practices.
3. If speech recognition introduces slight misrecognitions (e.g., "care" instead of "char", "jason" instead of "JSON"), automatically interpret the most likely JavaScript term.
4. Give educational, technical answers—not general definitions—highlighting why the concept matters in interviews and real projects.
5. Keep answers concise (45-60 words) and interview-ready, but prioritize clarity over brevity when a concept needs detail.
6. Use precise JavaScript terminology and include code-level reasoning when appropriate (without long code blocks).
7. When a question is vague, infer the closest JavaScript topic (e.g., if asked "explain hosting", answer about hoisting in JavaScript).
8. If a question truly lies outside JavaScript, briefly answer it but relate back to JavaScript perspectives when possible.

Output format: Direct, technical, educational answer suitable for a JavaScript interview (45-60 words).`;

interface ProviderOptions extends ProviderSettings {}

export const generateAnswerWithProvider = async (
  question: string,
  onChunk: (chunk: string) => void,
  options: ProviderOptions
) => {
  const provider = options.provider || 'default';

  switch (provider) {
    case 'default':
      return generateGeminiAnswer(question, onChunk);
    case 'gemini': {
      if (!options.apiKey) {
        throw new Error('Please provide a Gemini API key.');
      }
      return generateGeminiAnswer(question, onChunk, { apiKey: options.apiKey });
    }
    case 'openai':
      return generateOpenAIAnswer(question, onChunk, options.apiKey);
    case 'claude':
      return generateClaudeAnswer(question, onChunk, options.apiKey);
    default:
      return generateGeminiAnswer(question, onChunk);
  }
};

const generateOpenAIAnswer = async (
  question: string,
  onChunk: (chunk: string) => void,
  apiKey?: string
) => {
  if (!apiKey) {
    throw new Error('Please provide an OpenAI API key.');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: question },
      ],
      temperature: 0.4,
      max_tokens: 200,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI error: ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (content) {
    onChunk(content);
  } else {
    throw new Error('OpenAI returned an empty response.');
  }
};

const generateClaudeAnswer = async (
  question: string,
  onChunk: (chunk: string) => void,
  apiKey?: string
) => {
  if (!apiKey) {
    throw new Error('Please provide an Anthropic (Claude) API key.');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 200,
      temperature: 0.4,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: question,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude error: ${errorText}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text;
  if (content) {
    onChunk(content);
  } else {
    throw new Error('Claude returned an empty response.');
  }
};

