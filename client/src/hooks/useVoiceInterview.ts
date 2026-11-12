import { useState, useEffect, useRef, useCallback } from 'react';

// Web Speech API interface declarations for TypeScript
interface IWindowWithSpeech extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export interface UseVoiceInterviewOptions {
  onTranscript?: (transcript: string) => void;
  language?: 'en' | 'hi';
}

export function useVoiceInterview(options: UseVoiceInterviewOptions = {}) {
  const { language = 'hi' } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const [isSpeechRecognitionSupported, setIsSpeechRecognitionSupported] = useState(false);
  const [isSpeechSynthesisSupported, setIsSpeechSynthesisSupported] = useState(false);

  const recognitionRef = useRef<any>(null);

  // Check browser support on mount
  useEffect(() => {
    const win = window as unknown as IWindowWithSpeech;
    const hasRec = !!(win.SpeechRecognition || win.webkitSpeechRecognition);
    const hasSynth = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

    setIsSpeechRecognitionSupported(hasRec);
    setIsSpeechSynthesisSupported(hasSynth);

    if (hasRec) {
      const SpeechRecConstructor = win.SpeechRecognition || win.webkitSpeechRecognition;
      const rec = new SpeechRecConstructor();
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        setIsListening(true);
        setRecognitionError(null);
      };

      rec.onresult = (event: any) => {
        let interimText = '';
        let finalText = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalText += event.results[i][0].transcript;
          } else {
            interimText += event.results[i][0].transcript;
          }
        }

        const currentText = finalText || interimText;
        setTranscript(currentText);
        if (options.onTranscript && currentText) {
          options.onTranscript(currentText);
        }
      };

      rec.onerror = (event: any) => {
        setIsListening(false);
        const errType = event.error;
        console.warn('[SpeechRecognition] Error encountered:', errType);

        if (errType === 'not-allowed') {
          setRecognitionError('Microphone access was denied. Please allow microphone permission in your browser settings or use manual input.');
        } else if (errType === 'audio-capture') {
          setRecognitionError('No microphone hardware detected. You can type or select options manually.');
        } else if (errType === 'network') {
          setRecognitionError('Network error during voice recognition. Operating in manual input mode.');
        } else if (errType === 'no-speech') {
          setRecognitionError('No speech was detected. Please tap the microphone and speak again, or select an option.');
        } else {
          setRecognitionError(`Voice recognition unavailable (${errType}). Please use touch or text input.`);
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Start speech recognition
  const startListening = useCallback((targetLanguage: 'en' | 'hi' = language) => {
    setRecognitionError(null);
    setTranscript('');

    if (!isSpeechRecognitionSupported || !recognitionRef.current) {
      setRecognitionError('Speech recognition is not supported in this browser. Please select an option or type your answer.');
      return;
    }

    // Stop synthesis if currently reading question
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    try {
      recognitionRef.current.lang = targetLanguage === 'hi' ? 'hi-IN' : 'en-IN';
      recognitionRef.current.start();
    } catch (err: any) {
      // If already started, restart
      try {
        recognitionRef.current.abort();
        recognitionRef.current.start();
      } catch {
        console.warn('[SpeechRecognition] Start failed:', err);
      }
    }
  }, [isSpeechRecognitionSupported, language]);

  // Stop speech recognition
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
  }, [isListening]);

  // Read question aloud via Text-to-Speech
  const speakQuestion = useCallback((text: string, targetLanguage: 'en' | 'hi' = language) => {
    if (!isSpeechSynthesisSupported || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = targetLanguage === 'hi' ? 'hi-IN' : 'en-IN';
    utterance.rate = 0.95; // Slightly slower, clear conversational pace for healthcare comprehension
    utterance.pitch = 1.0;

    // Pick best matching voice
    const voices = window.speechSynthesis.getVoices();
    const targetLangCode = targetLanguage === 'hi' ? 'hi' : 'en';
    const matchingVoice = voices.find(v => v.lang.toLowerCase().startsWith(targetLangCode));
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [isSpeechSynthesisSupported, language]);

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  return {
    isListening,
    transcript,
    setTranscript,
    isSpeaking,
    recognitionError,
    clearError: () => setRecognitionError(null),
    isSpeechRecognitionSupported,
    isSpeechSynthesisSupported,
    startListening,
    stopListening,
    speakQuestion,
    stopSpeaking,
  };
}

