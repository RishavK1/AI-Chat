/**
 * Common technical term misrecognitions from speech-to-text
 * This is used to correct speech recognition errors in real-time
 */
export const TECHNICAL_CORRECTIONS: Record<string, string> = {
  // Data types and programming - most common misrecognitions
  'care': 'char',
  'chair': 'char',
  'car': 'char',
  'chore': 'char',
  'int': 'int',
  'integer': 'int',
  'string': 'string',
  'bool': 'bool',
  'boolean': 'bool',
  'float': 'float',
  'double': 'double',
  'void': 'void',
  'byte': 'byte',
  'short': 'short',
  'long': 'long',
  
  // Programming concepts
  'array': 'array',
  'arry': 'array',
  'a ray': 'array',
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
  'recursion': 'recursion',
  'iteration': 'iteration',
  
  // Data structures
  'list': 'list',
  'stack': 'stack',
  'queue': 'queue',
  'tree': 'tree',
  'graph': 'graph',
  'hash': 'hash',
  'map': 'map',
  'set': 'set',
  'heap': 'heap',
  'linked list': 'linked list',
  
  // Algorithms
  'sorting': 'sorting',
  'searching': 'searching',
  'binary search': 'binary search',
  'quick sort': 'quicksort',
  'merge sort': 'merge sort',
  'bubble sort': 'bubble sort',
  'selection sort': 'selection sort',
  'insertion sort': 'insertion sort',
  
  // Technologies
  'react': 'React',
  'node': 'Node.js',
  'javascript': 'JavaScript',
  'typescript': 'TypeScript',
  'python': 'Python',
  'java': 'Java',
  'c plus plus': 'C++',
  'c sharp': 'C#',
  'see sharp': 'C#',
  'sql': 'SQL',
  'sequel': 'SQL',
  'html': 'HTML',
  'css': 'CSS',
  'api': 'API',
  'a p i': 'API',
  'rest': 'REST',
  'json': 'JSON',
  'jason': 'JSON',
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
  'big oh': 'Big O',
  'o of n': 'O(n)',
  'design pattern': 'design pattern',
  'microservice': 'microservice',
  'docker': 'Docker',
  'kubernetes': 'Kubernetes',
  'aws': 'AWS',
  'cloud': 'cloud',
  
  // Common interview phrases
  'explain': 'explain',
  'what is': 'what is',
  'how does': 'how does',
  'difference between': 'difference between',
  'compare': 'compare',
  'define': 'define',
  'describe': 'describe',
};

/**
 * Corrects common technical term misrecognitions in speech-to-text
 * This function is used to improve accuracy of speech recognition
 */
export const correctTechnicalTerms = (text: string): string => {
  if (!text || text.trim().length === 0) return text;
  
  let corrected = text.toLowerCase().trim();
  
  // Replace common misrecognitions with word boundaries
  Object.entries(TECHNICAL_CORRECTIONS).forEach(([wrong, correct]) => {
    // Use word boundaries to avoid partial matches
    const regex = new RegExp(`\\b${wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    corrected = corrected.replace(regex, correct);
  });
  
  // Special handling for "char" - very common misrecognition
  // If we see "care" or "chair" in a programming context, replace with "char"
  if (/\b(care|chair|chore)\b/i.test(corrected)) {
    // Check if it's in a technical context
    const hasTechnicalContext = 
      /\b(int|string|bool|float|double|void|data\s*type|programming|code|variable|function|explain|what|difference|between|define|describe|datatype)\b/i.test(corrected) ||
      /\b(explain|what|difference|between|define|describe)\b/i.test(corrected);
    
    if (hasTechnicalContext) {
      corrected = corrected.replace(/\b(care|chair|chore)\b/gi, 'char');
    }
  }
  
  // Fix common spacing issues
  corrected = corrected.replace(/\s+/g, ' ').trim();
  
  // Capitalize first letter of sentences
  corrected = corrected.charAt(0).toUpperCase() + corrected.slice(1);
  
  return corrected;
};

/**
 * Post-processes speech recognition transcript for better accuracy
 */
export const postProcessTranscript = (transcript: string): string => {
  if (!transcript || transcript.trim().length === 0) return transcript;
  
  // Apply technical corrections
  let processed = correctTechnicalTerms(transcript);
  
  // Fix common punctuation issues
  processed = processed
    .replace(/\s+([,.!?])/g, '$1') // Remove space before punctuation
    .replace(/([,.!?])([^\s])/g, '$1 $2'); // Add space after punctuation
  
  // Fix common word combinations
  processed = processed
    .replace(/\bdata\s+type\b/gi, 'datatype')
    .replace(/\bdata\s+structure\b/gi, 'data structure')
    .replace(/\btime\s+complexity\b/gi, 'time complexity')
    .replace(/\bspace\s+complexity\b/gi, 'space complexity');
  
  return processed.trim();
};

