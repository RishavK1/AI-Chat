import { useState, useRef, useEffect, useCallback } from 'react';
import { postProcessTranscript } from '../utils/speechCorrections';

interface SpeechRecognitionOptions {
  onStop?: (transcript: string) => void;
}

// Fix: Cast window to any to access browser-specific SpeechRecognition APIs,
// as TypeScript's default Window type does not include them.
const SpeechRecognition =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export const useSpeechRecognition = (options: SpeechRecognitionOptions = {}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  // Fix: Use `any` for the ref type. This resolves the error where the `SpeechRecognition`
  // constant shadows the global `SpeechRecognition` type, which might not be available
  // in the TypeScript environment, preventing a "cannot find name" error.
  const recognitionRef = useRef<any | null>(null);
  const skipOnStopRef = useRef(false);
  const isManualStopRef = useRef(false); // Track if stop was manual
  const accumulatedFinalRef = useRef(''); // Accumulate final transcript parts
  const seenFinalResultsRef = useRef<Set<string>>(new Set()); // Track seen final results to prevent duplicates

  // Ref to hold the latest recording state to avoid stale closures in callbacks.
  const isRecordingRef = useRef(isRecording);
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Use a ref to hold the latest transcript for the onStop callback
  const transcriptRef = useRef(transcript);
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    if (!SpeechRecognition) {
      console.error('Speech Recognition API not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    
    // Enhanced recognition settings for better accuracy
    recognition.continuous = true; // Keep listening until manually stopped
    recognition.interimResults = true; // Show real-time results
    recognition.lang = 'en-US'; // US English for better technical term recognition
    
    // Try to set maxAlternatives if available (Chrome/Edge)
    if ('maxAlternatives' in recognition) {
      (recognition as any).maxAlternatives = 3; // Get multiple alternatives for better accuracy
    }
    
    // Try to set grammars if available (for technical terms)
    try {
      if ('grammars' in recognition) {
        // Create a grammar list for technical terms
        const grammar = '#JSGF V1.0; grammar technical; public <technical> = char | int | string | array | function | class | object | algorithm | data structure;';
        const grammarList = new (window as any).webkitSpeechGrammarList();
        grammarList.addFromString(grammar, 1);
        (recognition as any).grammars = grammarList;
      }
    } catch (e) {
      // Grammar not supported, continue without it
      console.debug('Speech grammar not supported');
    }

    recognition.onstart = () => {
      setIsRecording(true);
      setTranscript('');
      transcriptRef.current = '';
      isManualStopRef.current = false;
      accumulatedFinalRef.current = '';
      seenFinalResultsRef.current = new Set();
    };

    recognition.onend = () => {
      setIsRecording(false);
      
      // Only trigger the onStop callback if it was manually stopped and not skipped
      if (!skipOnStopRef.current && isManualStopRef.current && options.onStop && transcriptRef.current.trim()) {
        // Use the accumulated final transcript
        const finalText = accumulatedFinalRef.current.trim() || transcriptRef.current.trim();
        if (finalText) {
          // Apply final post-processing before sending
          const finalTranscript = postProcessTranscript(finalText);
          if (finalTranscript.length > 0) {
            // Call onStop with the transcript - don't clear transcript here
            options.onStop(finalTranscript);
          }
        }
      }
      
      // Reset state but keep transcript visible
      skipOnStopRef.current = false;
      isManualStopRef.current = false;
      accumulatedFinalRef.current = '';
      seenFinalResultsRef.current = new Set();
      // Don't clear transcript - let it stay visible
    };

    recognition.onerror = (event: any) => {
      // The 'no-speech' error is a common timeout event. We handle it gracefully
      // by logging a warning instead of a disruptive error.
      if (event.error === 'no-speech') {
        console.warn('Speech recognition timed out: No speech detected.');
      } else {
        console.error('Speech recognition error:', event.error);
      }
      // The `onend` event will fire automatically after an error, handling state cleanup.
    };

    recognition.onresult = (event: any) => {
      // Process results - only add NEW final results to prevent duplicates
      let interimText = '';
      const newFinalParts: string[] = [];

      // Process all results but only add ones we haven't seen
      for (let i = 0; i < event.results.length; ++i) {
        const result = event.results[i];
        if (!result) continue;
        
        const transcript = result[0]?.transcript?.trim() || '';
        if (!transcript) continue;
        
        if (result.isFinal) {
          // Only add if we haven't seen this exact final result before
          if (!seenFinalResultsRef.current.has(transcript)) {
            seenFinalResultsRef.current.add(transcript);
            newFinalParts.push(transcript);
          }
        } else {
          // Use only the last interim result
          interimText = transcript;
        }
      }
      
      // Add new final parts to accumulated text
      if (newFinalParts.length > 0) {
        if (accumulatedFinalRef.current) {
          accumulatedFinalRef.current += ' ' + newFinalParts.join(' ');
        } else {
          accumulatedFinalRef.current = newFinalParts.join(' ');
        }
      }
      
      // Build display transcript: accumulated final + current interim
      const finalText = accumulatedFinalRef.current;
      const displayText = finalText + (interimText ? ' ' + interimText : '');
      
      // Apply post-processing for technical term corrections
      let processedTranscript = displayText.trim();
      if (processedTranscript) {
        processedTranscript = postProcessTranscript(processedTranscript);
      }
      
      setTranscript(processedTranscript);
      transcriptRef.current = processedTranscript;
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = useCallback(() => {
    if (recognitionRef.current && !isRecordingRef.current) {
      try {
        recognitionRef.current.start();
      } catch(e) {
        console.error("Error starting speech recognition:", e);
      }
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current && isRecordingRef.current) {
      isManualStopRef.current = true; // Mark as manual stop
      recognitionRef.current.stop();
    }
  }, []);

  const cancelRecording = useCallback(() => {
    skipOnStopRef.current = true;
    isManualStopRef.current = false;
    if (recognitionRef.current && isRecordingRef.current) {
      recognitionRef.current.stop();
    }
    setTranscript('');
    transcriptRef.current = '';
    accumulatedFinalRef.current = '';
    seenFinalResultsRef.current = new Set();
  }, []);

  return { isRecording, transcript, startRecording, stopRecording, cancelRecording };
};