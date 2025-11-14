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
    };

    recognition.onend = () => {
      setIsRecording(false);
      // Only trigger the onStop callback if we have a meaningful transcript.
      // This prevents creating empty messages when recognition stops due to silence.
      if (!skipOnStopRef.current && options.onStop && transcriptRef.current.trim()) {
        // Apply final post-processing before sending
        const finalTranscript = postProcessTranscript(transcriptRef.current.trim());
        if (finalTranscript.length > 0) {
          options.onStop(finalTranscript);
        }
      }
      skipOnStopRef.current = false;
      setTranscript('');
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
      let bestFinalTranscript = '';

      // Rebuild the full transcript from all results with confidence filtering
      for (let i = 0; i < event.results.length; ++i) {
        const result = event.results[i];
        const transcript = result[0]?.transcript || '';
        const confidence = result[0]?.confidence || 0;
        
        if (result.isFinal) {
          // For final results, use the best alternative if available
          let bestTranscript = transcript;
          let bestConfidence = confidence;
          
          // Check alternatives if available
          if (result.length > 1) {
            for (let j = 0; j < result.length; j++) {
              const alt = result[j];
              if (alt.confidence > bestConfidence) {
                bestTranscript = alt.transcript;
                bestConfidence = alt.confidence;
              }
            }
          }
          
          // Only use final results with reasonable confidence (>0.3) or if it's the only option
          if (bestConfidence > 0.3 || result.length === 1) {
            finalTranscript += (finalTranscript ? ' ' : '') + bestTranscript;
            bestFinalTranscript = bestTranscript;
          } else {
            // Low confidence, but use it anyway if no better option
            finalTranscript += (finalTranscript ? ' ' : '') + transcript;
          }
        } else {
          // For interim results, use the first (most confident) alternative
          interimTranscript = transcript;
        }
      }
      
      // Combine final and interim, prioritizing final results
      let fullTranscript = finalTranscript || interimTranscript;
      
      // Apply post-processing for technical term corrections
      if (fullTranscript) {
        // Process interim results in real-time for better UX
        if (interimTranscript && !finalTranscript) {
          fullTranscript = postProcessTranscript(interimTranscript);
        } else if (finalTranscript) {
          // For final results, apply more thorough processing
          fullTranscript = postProcessTranscript(finalTranscript);
        }
      }
      
      setTranscript(fullTranscript);
      transcriptRef.current = fullTranscript;
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
      recognitionRef.current.stop();
    }
  }, []);

  const cancelRecording = useCallback(() => {
    skipOnStopRef.current = true;
    if (recognitionRef.current && isRecordingRef.current) {
      recognitionRef.current.stop();
    }
    setTranscript('');
    transcriptRef.current = '';
  }, []);

  return { isRecording, transcript, startRecording, stopRecording, cancelRecording };
};