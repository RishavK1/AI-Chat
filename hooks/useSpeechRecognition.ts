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
  const lastProcessedIndexRef = useRef(0); // Track last processed result index (for mobile duplicates)
  const finalTranscriptPartsRef = useRef<string[]>([]); // Store final parts to prevent duplicates
  const isMobileRef = useRef(false); // Detect if mobile

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 768;
      isMobileRef.current = isTouchDevice && isSmallScreen;
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
      lastProcessedIndexRef.current = 0;
      finalTranscriptPartsRef.current = [];
    };

    recognition.onend = () => {
      setIsRecording(false);
      
      // Only trigger the onStop callback if it was manually stopped and not skipped
      if (!skipOnStopRef.current && isManualStopRef.current && options.onStop && transcriptRef.current.trim()) {
        // Apply final post-processing before sending
        const finalTranscript = postProcessTranscript(transcriptRef.current.trim());
        if (finalTranscript.length > 0) {
          options.onStop(finalTranscript);
        }
      }
      
      // Reset state
      skipOnStopRef.current = false;
      isManualStopRef.current = false;
      setTranscript('');
      lastProcessedIndexRef.current = 0;
      finalTranscriptPartsRef.current = [];
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
      let finalTranscript = '';
      let interimTranscript = '';

      // On mobile: only process NEW results to prevent duplicates
      // On desktop: process all results (works fine there)
      const startIndex = isMobileRef.current ? lastProcessedIndexRef.current : 0;

      for (let i = startIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        const transcript = result[0]?.transcript?.trim() || '';
        const confidence = result[0]?.confidence || 0;
        
        if (!transcript) continue;
        
        if (result.isFinal) {
          // For final results, use the best alternative if available
          let bestTranscript = transcript;
          let bestConfidence = confidence;
          
          // Check alternatives if available
          if (result.length > 1) {
            for (let j = 0; j < result.length; j++) {
              const alt = result[j];
              const altConfidence = alt.confidence || 0;
              if (altConfidence > bestConfidence) {
                bestTranscript = alt.transcript?.trim() || bestTranscript;
                bestConfidence = altConfidence;
              }
            }
          }
          
          // Only use final results with reasonable confidence (>0.2) or if it's the only option
          if (bestConfidence > 0.2 || result.length === 1) {
            if (bestTranscript) {
              // On mobile: store in array to prevent duplicates
              if (isMobileRef.current) {
                finalTranscriptPartsRef.current.push(bestTranscript);
              } else {
                finalTranscript += (finalTranscript ? ' ' : '') + bestTranscript;
              }
            }
          } else if (transcript) {
            // Low confidence, but use it anyway if no better option
            if (isMobileRef.current) {
              finalTranscriptPartsRef.current.push(transcript);
            } else {
              finalTranscript += (finalTranscript ? ' ' : '') + transcript;
            }
          }
        } else {
          // For interim results, use only the LAST interim result (most recent)
          interimTranscript = transcript;
        }
      }
      
      // Update the last processed index (mobile only)
      if (isMobileRef.current) {
        lastProcessedIndexRef.current = event.results.length;
        // Build final transcript from stored parts
        finalTranscript = finalTranscriptPartsRef.current.join(' ');
      }
      
      const fullTranscript = finalTranscript + (interimTranscript ? ' ' + interimTranscript : '');
      
      // Apply post-processing for technical term corrections
      let processedTranscript = fullTranscript.trim();
      if (processedTranscript) {
        if (interimTranscript && !finalTranscript) {
          // Only interim - process it
          processedTranscript = postProcessTranscript(interimTranscript);
        } else if (finalTranscript) {
          // We have final results - process the full transcript
          processedTranscript = postProcessTranscript(fullTranscript);
        }
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
    lastProcessedIndexRef.current = 0;
    finalTranscriptPartsRef.current = [];
  }, []);

  return { isRecording, transcript, startRecording, stopRecording, cancelRecording };
};