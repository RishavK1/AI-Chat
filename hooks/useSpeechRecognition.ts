import { useState, useRef, useEffect, useCallback } from 'react';

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
    // By setting continuous to false, the recognition automatically stops when the user pauses.
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
      setTranscript('');
      transcriptRef.current = '';
    };

    recognition.onend = () => {
      setIsRecording(false);
      // Only trigger the onStop callback if we have a meaningful transcript.
      // This prevents creating empty messages when recognition stops due to silence.
      if (options.onStop && transcriptRef.current.trim()) {
        options.onStop(transcriptRef.current.trim());
      }
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

      // Rebuild the full transcript from all results to ensure accuracy.
      for (let i = 0; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript = event.results[i][0].transcript;
        }
      }
      
      const fullTranscript = finalTranscript + interimTranscript;
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

  return { isRecording, transcript, startRecording, stopRecording };
};