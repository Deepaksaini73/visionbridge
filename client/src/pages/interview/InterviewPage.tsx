import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Save,
  RotateCcw,
  Languages,
  Check,
  Loader2,
  HelpCircle,
  Eye,
  FileCheck2,
  X,
  Stethoscope,
  Info
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/services/api';
import { offlineDb } from '@/offline/db';
import { useVoiceInterview } from '@/hooks/useVoiceInterview';
import {
  INTERVIEW_SECTIONS,
  INTERVIEW_QUESTIONS,
  getActiveQuestions,
  pruneInapplicableAnswers,
  InterviewQuestionConfig,
  QuestionOption,
} from '@shared/config/interviewQuestions';
import { CustomerDemographics } from '@shared/types';

export const InterviewPage: React.FC = () => {
  const { id: customerParamId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Core state
  const [customer, setCustomer] = useState<CustomerDemographics | null>(null);
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [language, setLanguage] = useState<'hi' | 'en'>('hi');
  const [answers, setAnswers] = useState<Record<string, { value: string; label: string; text?: string; method: 'VOICE' | 'TEXT' | 'OPTION_CLICK'; isRedFlag: boolean }>>({});
  const [currentQuestionId, setCurrentQuestionId] = useState<string>(INTERVIEW_QUESTIONS[0].id);
  const [completedSections, setCompletedSections] = useState<string[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [completedSummary, setCompletedSummary] = useState<any | null>(null);

  // Editable transcription / manual input state for current question
  const [customTextResponse, setCustomTextResponse] = useState('');

  // Voice Interaction Hook
  const {
    isListening,
    transcript,
    setTranscript,
    isSpeaking,
    recognitionError,
    clearError: clearVoiceError,
    isSpeechRecognitionSupported,
    isSpeechSynthesisSupported,
    startListening,
    stopListening,
    speakQuestion,
    stopSpeaking,
  } = useVoiceInterview({ language });

  // 1. Load Customer and Start or Resume Interview Session
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      if (!customerParamId) return;
      setIsLoading(true);
      setErrorMessage(null);

      try {
        // Fetch customer profile
        const custRes = await apiRequest<CustomerDemographics>(`/customers/${customerParamId}`);
        if (!custRes.success || !custRes.data) {
          throw new Error(custRes.error?.message || 'Customer record could not be found.');
        }

        if (!isMounted) return;
        setCustomer(custRes.data);
        const preferredLang = (custRes.data.preferredLanguage === 'en' ? 'en' : 'hi') as 'en' | 'hi';
        setLanguage(preferredLang);

        // Start or resume interview session with backend
        const intRes = await apiRequest<any>('/interviews/start', {
          method: 'POST',
          body: JSON.stringify({
            customerId: custRes.data.customerId || custRes.data.id,
            language: preferredLang,
          }),
        });

        if (intRes.success && intRes.data) {
          setInterviewId(intRes.data.interviewId || intRes.data.id);
          
          // If resuming previous draft, restore answers
          if (intRes.data.answers && Array.isArray(intRes.data.answers) && intRes.data.answers.length > 0) {
            const restoredMap: Record<string, any> = {};
            for (const a of intRes.data.answers) {
              restoredMap[a.questionId] = {
                value: a.answerValue,
                label: a.answerLabel,
                text: a.voiceTranscript,
                method: a.inputMethod || 'OPTION_CLICK',
                isRedFlag: a.isRedFlag,
              };
            }
            const prunedRestored = pruneInapplicableAnswers(restoredMap);
            setAnswers(prunedRestored);
            if (intRes.data.completedSections) {
              setCompletedSections(intRes.data.completedSections);
            }
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMessage(err.message || 'Failed to initialize vision interview session.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initSession();

    return () => {
      isMounted = false;
      stopSpeaking();
    };
  }, [customerParamId]);

  // Derive dynamic list of active questions based on adaptive branching rules
  const activeQuestions = useMemo(() => {
    return getActiveQuestions(answers);
  }, [answers]);

  // Current active question index in the activeQuestions list
  const currentQuestionIndex = useMemo(() => {
    const idx = activeQuestions.findIndex(q => q.id === currentQuestionId);
    return idx >= 0 ? idx : 0;
  }, [activeQuestions, currentQuestionId]);

  // Safe current question reference
  const currentQuestion: InterviewQuestionConfig | undefined = activeQuestions[currentQuestionIndex];

  // Re-anchor currentQuestionId if active questions change dynamically and current question is excluded
  useEffect(() => {
    if (activeQuestions.length > 0 && !activeQuestions.some(q => q.id === currentQuestionId)) {
      const safeIdx = Math.min(currentQuestionIndex, activeQuestions.length - 1);
      setCurrentQuestionId(activeQuestions[safeIdx]?.id || activeQuestions[0].id);
    }
  }, [activeQuestions, currentQuestionId]);

  // Current active section
  const currentSection = useMemo(() => {
    if (!currentQuestion) return INTERVIEW_SECTIONS[0];
    return INTERVIEW_SECTIONS.find(s => s.id === currentQuestion.sectionId) || INTERVIEW_SECTIONS[0];
  }, [currentQuestion]);

  // Current question answer
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;

  // Sync custom input text when question changes
  useEffect(() => {
    if (currentAnswer) {
      setCustomTextResponse(currentAnswer.text || currentAnswer.label || '');
    } else {
      setCustomTextResponse('');
    }
    setTranscript('');
    stopSpeaking();
  }, [currentQuestion?.id]);

  // Sync recognized voice transcript into editable field and attempt smart option auto-matching
  useEffect(() => {
    if (transcript && currentQuestion) {
      setCustomTextResponse(transcript);

      // Auto-match voice transcript against options if match found
      if (currentQuestion.options) {
        const lower = transcript.toLowerCase().trim();
        const matched = currentQuestion.options.find(opt => {
          const optEn = opt.labelEn.toLowerCase();
          const optHi = opt.labelHi.toLowerCase();
          const val = opt.value.toLowerCase();
          return lower.includes(optEn) || lower.includes(optHi) || lower.includes(val) ||
                 (lower.includes('severe') && opt.value === 'SEVERE') ||
                 (lower.includes('moderate') && opt.value === 'MODERATE') ||
                 (lower.includes('mild') && opt.value === 'MILD') ||
                 (lower.includes('none') && opt.value === 'NONE') ||
                 (lower.includes('yes') && opt.value.includes('YES')) ||
                 (lower.includes('no') && opt.value === 'NO') ||
                 (lower.includes('हाँ') && opt.value.includes('YES')) ||
                 (lower.includes('नहीं') && opt.value === 'NO') ||
                 (lower.includes('गंभीर') && opt.value === 'SEVERE') ||
                 (lower.includes('मध्यम') && opt.value === 'MODERATE');
        });

        if (matched) {
          handleSelectOption(matched, 'VOICE', transcript);
        }
      }
    }
  }, [transcript]);

  // Trigger TTS question read-aloud
  const handleReadQuestion = () => {
    if (!currentQuestion) return;
    if (isSpeaking) {
      stopSpeaking();
    } else {
      const textToSpeak = language === 'hi' ? currentQuestion.promptHi : currentQuestion.promptEn;
      speakQuestion(textToSpeak, language);
    }
  };

  // Option Selection Handler
  const handleSelectOption = (option: QuestionOption, method: 'OPTION_CLICK' | 'VOICE' = 'OPTION_CLICK', voiceText?: string) => {
    if (!currentQuestion) return;

    const isRedFlag = !!option.isUrgentFlag || !!currentQuestion.isRedFlagTrigger && option.value.includes('YES');

    const updatedAnswers = {
      ...answers,
      [currentQuestion.id]: {
        value: option.value,
        label: language === 'hi' ? option.labelHi : option.labelEn,
        text: voiceText || (language === 'hi' ? option.labelHi : option.labelEn),
        method,
        isRedFlag,
      },
    };

    // Immediately prune answers to questions whose dependencies are no longer satisfied
    const prunedAnswers = pruneInapplicableAnswers(updatedAnswers);
    setAnswers(prunedAnswers);

    setCustomTextResponse(language === 'hi' ? option.labelHi : option.labelEn);
  };

  // Save text input response
  const handleSaveTextResponse = () => {
    if (!currentQuestion || !customTextResponse.trim()) return;

    const updatedAnswers = {
      ...answers,
      [currentQuestion.id]: {
        value: customTextResponse.trim(),
        label: customTextResponse.trim(),
        text: customTextResponse.trim(),
        method: isListening ? ('VOICE' as const) : ('TEXT' as const),
        isRedFlag: false,
      },
    };

    const prunedAnswers = pruneInapplicableAnswers(updatedAnswers);
    setAnswers(prunedAnswers);
  };

  // Check if any Red Flag Urgent Warning has been triggered so far
  const activeRedFlagWarnings = useMemo(() => {
    const list: Array<{ questionText: string; warningText: string }> = [];
    for (const q of INTERVIEW_QUESTIONS) {
      const ans = answers[q.id];
      if (ans && ans.isRedFlag) {
        const opt = q.options?.find(o => o.value === ans.value);
        list.push({
          questionText: language === 'hi' ? q.textHi : q.textEn,
          warningText: language === 'hi' ? (opt?.warningDescriptionHi || ans.label) : (opt?.warningDescriptionEn || ans.label),
        });
      }
    }
    return list;
  }, [answers, language]);

  // Progress Calculations
  const totalQuestions = activeQuestions.length;
  const answeredCount = activeQuestions.filter(q => !!answers[q.id]).length;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  // Navigation: Next
  const handleNext = () => {
    if (customTextResponse.trim() && currentQuestion && !answers[currentQuestion.id]) {
      handleSaveTextResponse();
    }

    if (currentQuestionIndex < activeQuestions.length - 1) {
      setCurrentQuestionId(activeQuestions[currentQuestionIndex + 1].id);
    }
  };

  // Navigation: Previous
  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionId(activeQuestions[currentQuestionIndex - 1].id);
    }
  };

  // Save Progress (Draft) to Backend & IndexedDB
  const handleSaveProgress = async () => {
    if (!interviewId) return;
    setIsSaving(true);
    setSaveSuccessMessage(null);

    // Only include currently active, non-pruned questions
    const activeQuestionIds = new Set(activeQuestions.map(q => q.id));
    const activeEntries = Object.entries(answers).filter(([qid]) => activeQuestionIds.has(qid));

    const formattedPayload = activeEntries.map(([qid, a]) => {
      const qConfig = INTERVIEW_QUESTIONS.find(q => q.id === qid);
      return {
        questionId: qid,
        sectionId: qConfig?.sectionId || 'sec_basic',
        questionText: language === 'hi' ? (qConfig?.textHi || qid) : (qConfig?.textEn || qid),
        category: qConfig?.category || 'BLURRED_VISION',
        answerValue: a.value,
        answerLabel: a.label,
        answerType: qConfig?.inputType || 'CHOICE',
        language,
        inputMethod: a.method,
        voiceTranscript: a.text,
        isRedFlag: a.isRedFlag,
        answeredAt: new Date().toISOString(),
      };
    });

    try {
      // 1. Save to Backend API
      await apiRequest(`/interviews/${interviewId}/progress`, {
        method: 'PUT',
        body: JSON.stringify({
          answers: formattedPayload,
          completedSections,
          language,
        }),
      });

      // 2. Mirror into IndexedDB offline storage
      try {
        for (const item of formattedPayload) {
          await offlineDb.interviews.add({
            customerId: customer?.customerId || customerParamId || '',
            questionId: item.questionId,
            questionText: item.questionText,
            selectedOption: item.answerValue,
            voiceTranscript: item.voiceTranscript,
            isRedFlag: item.isRedFlag,
            syncStatus: 'SYNCED',
            answeredAt: new Date().toISOString(),
          });
        }
      } catch {
        // Non-blocking IndexedDB write
      }

      setSaveSuccessMessage('Interview progress saved securely.');
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    } catch (err: any) {
      alert(`Could not save progress: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Complete Interview
  const handleCompleteInterview = async () => {
    if (!interviewId) return;

    if (answeredCount < totalQuestions) {
      const confirmIncomplete = window.confirm(
        `You have answered ${answeredCount} of ${totalQuestions} questions. Do you want to submit the interview now with the answers provided?`
      );
      if (!confirmIncomplete) return;
    }

    setIsSaving(true);

    // Only include currently active, non-pruned questions
    const activeQuestionIds = new Set(activeQuestions.map(q => q.id));
    const activeEntries = Object.entries(answers).filter(([qid]) => activeQuestionIds.has(qid));

    const formattedPayload = activeEntries.map(([qid, a]) => {
      const qConfig = INTERVIEW_QUESTIONS.find(q => q.id === qid);
      return {
        questionId: qid,
        sectionId: qConfig?.sectionId || 'sec_basic',
        questionText: language === 'hi' ? (qConfig?.textHi || qid) : (qConfig?.textEn || qid),
        category: qConfig?.category || 'BLURRED_VISION',
        answerValue: a.value,
        answerLabel: a.label,
        answerType: qConfig?.inputType || 'CHOICE',
        language,
        inputMethod: a.method,
        voiceTranscript: a.text,
        isRedFlag: a.isRedFlag,
        answeredAt: new Date().toISOString(),
      };
    });

    try {
      const res = await apiRequest(`/interviews/${interviewId}/complete`, {
        method: 'POST',
        body: JSON.stringify({
          answers: formattedPayload,
          completedSections: ['sec_basic', 'sec_daily', 'sec_history', 'sec_warning', 'sec_lifestyle'],
          language,
        }),
      });

      if (res.success && res.data) {
        setCompletedSummary(res.data);
        setShowSummaryModal(true);
      } else {
        alert(res.error?.message || 'Failed to complete interview.');
      }
    } catch (err: any) {
      alert(`Error submitting interview: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto" />
          <p className="text-xs font-semibold text-slate-600">Loading Vision Interview Session...</p>
        </div>
      </div>
    );
  }

  if (errorMessage || !customer) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center space-y-4">
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-2 justify-center">
          <ShieldAlert className="w-5 h-5 text-rose-600" />
          <span>{errorMessage || 'Customer record not found.'}</span>
        </div>
        <Link
          to="/customers"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Customer Directory</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 pb-16">
      
      {/* 1. TOP HEADER BAR (Sticky below main navigation) */}
      <div className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-16 z-30 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          
          {/* Back & Customer Summary */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowExitConfirm(true)}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-navy-950 transition-colors"
              title="Exit Interview"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-navy-950 truncate max-w-[200px] sm:max-w-none">
                  {customer.fullName || customer.name}
                </h1>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                  {customer.customerId || customer.customerCode}
                </span>
                <span className="hidden sm:inline-block text-[11px] text-slate-500">
                  ({customer.gender === 'FEMALE' ? 'F' : 'M'}, {customer.age}y)
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Vision Intake Interview • Store: {customer.storeName || customer.storeId}
              </p>
            </div>
          </div>

          {/* Language Switcher & Save Button */}
          <div className="flex items-center gap-2">
            
            {/* Language Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                onClick={() => setLanguage('hi')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  language === 'hi'
                    ? 'bg-white text-teal-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                हिंदी
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  language === 'en'
                    ? 'bg-white text-teal-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                EN
              </button>
            </div>

            {/* Save Progress Button */}
            <button
              onClick={handleSaveProgress}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 text-slate-500" />}
              <span className="hidden sm:inline">Save Progress</span>
            </button>
          </div>
        </div>

        {/* Linear Progress Bar */}
        <div className="w-full bg-slate-100 h-1.5">
          <div
            className="bg-teal-500 h-1.5 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Save Success Alert Banner */}
      {saveSuccessMessage && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-3">
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{saveSuccessMessage}</span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* 2. PROMINENT RED FLAG EMERGENCY CARE ALERT (When any danger symptom is recorded) */}
        {activeRedFlagWarnings.length > 0 && (
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border-2 border-amber-400 text-amber-950 shadow-sm space-y-2 animate-fade-in">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-amber-900">
                  {language === 'hi' ? 'तत्काल नेत्र जांच आवश्यक (चेतावनी लक्षण)' : 'Prompt Professional Attention Advised'}
                </h3>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  {language === 'hi'
                    ? 'ग्राहक द्वारा अचानक नजर कम होना या गंभीर दर्द जैसे लक्षण बताए गए हैं। कृपया ग्राहक को तुरंत किसी नेत्र विशेषज्ञ (आई डॉक्टर) या अस्पताल से जांच कराने की सलाह दें।'
                    : 'The customer reported acute warning symptoms (e.g. sudden vision drop, severe pain, or photopsia). Advise prompt in-person assessment by an ophthalmologist or hospital emergency eye clinic.'}
                </p>
                <div className="mt-2 space-y-1">
                  {activeRedFlagWarnings.map((flag, idx) => (
                    <div key={idx} className="text-[11px] font-semibold text-amber-950 bg-amber-100/70 px-2.5 py-1 rounded-lg">
                      • {flag.warningText}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. CURRENT SECTION BADGE & QUESTION CARD */}
        {currentQuestion ? (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-healthcare-md p-6 sm:p-8 space-y-6">
            
            {/* Section & Question Counter */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 text-xs font-bold border border-teal-200">
                  {language === 'hi' ? currentSection.shortLabelHi : currentSection.shortLabelEn}
                </span>
                <span className="text-xs text-slate-400">
                  Question {currentQuestionIndex + 1} of {totalQuestions}
                </span>
              </div>

              {/* Read Aloud Button */}
              <button
                type="button"
                onClick={handleReadQuestion}
                disabled={!isSpeechSynthesisSupported}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  isSpeaking
                    ? 'bg-teal-600 text-white animate-pulse shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
                title={isSpeaking ? 'Stop voice readout' : 'Read question aloud'}
              >
                {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-teal-600" />}
                <span>{isSpeaking ? (language === 'hi' ? 'रोकें' : 'Stop') : (language === 'hi' ? 'प्रश्न सुनें' : 'Listen')}</span>
              </button>
            </div>

            {/* Question Text */}
            <div className="space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-bold text-navy-950 leading-snug">
                {language === 'hi' ? currentQuestion.textHi : currentQuestion.textEn}
              </h2>
              <p className="text-xs text-slate-400 italic">
                {language === 'hi' ? currentQuestion.textEn : currentQuestion.textHi}
              </p>
            </div>

            {/* Microphone Voice Input Section */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${isListening ? 'bg-rose-500 animate-ping' : 'bg-slate-300'}`} />
                  <span className="text-xs font-bold text-slate-700">
                    {isListening
                      ? (language === 'hi' ? 'सुन रहे हैं... बोलिए (Listening)' : 'Listening... Speak now')
                      : (language === 'hi' ? 'आवाज़ द्वारा उत्तर दें (Voice Input)' : 'Voice Input (Optional)')}
                  </span>
                </div>

                {!isSpeechRecognitionSupported && (
                  <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Voice not supported on browser
                  </span>
                )}
              </div>

              {/* Big Pulse Microphone Button */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (isListening) {
                      stopListening();
                    } else {
                      startListening(language);
                    }
                  }}
                  disabled={!isSpeechRecognitionSupported}
                  className={`relative p-4 rounded-2xl font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-sm ${
                    isListening
                      ? 'bg-rose-600 text-white ring-4 ring-rose-200 animate-pulse'
                      : 'bg-teal-600 hover:bg-teal-700 text-white'
                  }`}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  <span>{isListening ? (language === 'hi' ? 'रिकॉर्डिंग रोकें' : 'Stop Listening') : (language === 'hi' ? 'बोलने के लिए दबाएं' : 'Tap to Speak')}</span>
                </button>

                {/* Speech Recognized Live Preview / Text Editor */}
                <div className="w-full">
                  <input
                    type="text"
                    value={customTextResponse}
                    onChange={(e) => setCustomTextResponse(e.target.value)}
                    onBlur={handleSaveTextResponse}
                    placeholder={
                      language === 'hi'
                        ? 'आवाज़ से बोला गया उत्तर यहाँ दिखेगा (सुधार भी सकते हैं)...'
                        : 'Recognized answer preview or type manual response...'
                    }
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    {language === 'hi'
                      ? 'सुझाव: आवाज़ से बोलने के बाद ऑपरेटर यहाँ देखकर पुष्टि या सुधार कर सकते हैं।'
                      : 'Operator review: Speech transcription can be edited before advancing.'}
                  </span>
                </div>
              </div>

              {recognitionError && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-[11px] flex items-center justify-between">
                  <span>{recognitionError}</span>
                  <button onClick={clearVoiceError} className="font-bold text-amber-700 hover:text-amber-900">✕</button>
                </div>
              )}
            </div>

            {/* Multiple Choice Options Grid */}
            {currentQuestion.options && currentQuestion.options.length > 0 && (
              <div className="space-y-2.5">
                <label className="block text-xs font-semibold text-slate-700">
                  {language === 'hi' ? 'उपयुक्त विकल्प चुनें:' : 'Select applicable response:'}
                </label>

                <div className="grid grid-cols-1 gap-2.5">
                  {currentQuestion.options.map((option) => {
                    const isSelected = currentAnswer?.value === option.value;
                    const isUrgent = option.isUrgentFlag;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleSelectOption(option, 'OPTION_CLICK')}
                        className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${
                          isSelected
                            ? isUrgent
                              ? 'bg-rose-50 border-rose-400 text-rose-950 ring-2 ring-rose-200'
                              : 'bg-teal-50/80 border-teal-500 text-teal-950 ring-2 ring-teal-200 shadow-xs'
                            : isUrgent
                            ? 'bg-white border-amber-200 hover:border-amber-400 hover:bg-amber-50/40 text-slate-800'
                            : 'bg-white border-slate-200 hover:border-teal-300 hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <div className="space-y-0.5 pr-3">
                          <div className="font-semibold text-xs sm:text-sm">
                            {language === 'hi' ? option.labelHi : option.labelEn}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {language === 'hi' ? option.labelEn : option.labelHi}
                          </div>
                          {isUrgent && (
                            <span className="inline-block mt-1 text-[10px] font-bold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded">
                              ⚠️ Warning Flag Trigger
                            </span>
                          )}
                        </div>

                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isSelected
                            ? isUrgent ? 'bg-rose-600 text-white' : 'bg-teal-600 text-white'
                            : 'border border-slate-300 text-transparent'
                        }`}>
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Free Text Input (For questions with open-ended input like q_other_concerns) */}
            {currentQuestion.inputType === 'TEXT' && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  {language === 'hi' ? 'अतिरिक्त टिप्पणी / विवरण दर्ज करें:' : 'Enter Additional Comments:'}
                </label>
                <textarea
                  rows={3}
                  value={customTextResponse}
                  onChange={(e) => setCustomTextResponse(e.target.value)}
                  onBlur={handleSaveTextResponse}
                  placeholder={
                    language === 'hi'
                      ? 'ग्राहक द्वारा बताई गई अन्य कोई बात यहाँ लिखें...'
                      : 'Type or dictate other observations or concerns...'
                  }
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-teal-500"
                />
              </div>
            )}

            {/* Answer Status Indicator */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                {currentAnswer ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Response recorded ({currentAnswer.method === 'VOICE' ? 'Voice Dictated' : 'Option Selected'})
                  </span>
                ) : (
                  <span className="text-slate-400 italic">No answer recorded yet</span>
                )}
              </span>

              {currentAnswer && (
                <button
                  type="button"
                  onClick={() => {
                    const nextAns = { ...answers };
                    delete nextAns[currentQuestion.id];
                    const pruned = pruneInapplicableAnswers(nextAns);
                    setAnswers(pruned);
                    setCustomTextResponse('');
                  }}
                  className="text-[11px] text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear Answer</span>
                </button>
              )}
            </div>

          </div>
        ) : (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-teal-600 mx-auto" />
            <h2 className="text-lg font-bold text-navy-950">All Questions Addressed</h2>
            <p className="text-xs text-slate-500">
              You have completed all active interview questions for this customer.
            </p>
          </div>
        )}

        {/* 4. BOTTOM ACTION & NAVIGATION BAR */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between gap-3">
          
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{language === 'hi' ? 'पिछला प्रश्न' : 'Previous'}</span>
          </button>

          {currentQuestionIndex < totalQuestions - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <span>{language === 'hi' ? 'अगला प्रश्न' : 'Next Question'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCompleteInterview}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-navy-950 hover:bg-navy-900 text-white text-xs font-bold shadow-healthcare-md flex items-center gap-2 transition-colors"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck2 className="w-4 h-4 text-teal-400" />}
              <span>{language === 'hi' ? 'इंटरव्यू पूर्ण करें' : 'Complete & Generate Summary'}</span>
            </button>
          )}

        </div>

      </main>

      {/* 5. EXIT CONFIRMATION MODAL */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-navy-950/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-healthcare-lg space-y-4">
            <h3 className="font-bold text-navy-950 text-base">Exit Interview Session?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your recorded answers can be saved so you can resume this interview at any time from the customer profile.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Continue Interview
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleSaveProgress();
                  navigate(`/customers/${customer.customerId || customerParamId}`);
                }}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-sm"
              >
                Save & Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. INTERVIEW COMPLETION & STRUCTURED SUMMARY MODAL */}
      {showSummaryModal && completedSummary && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-healthcare-lg overflow-hidden my-8">
            
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-navy-950 to-teal-900 text-white space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-teal-300 uppercase tracking-wider">
                  VisionBridge Intake Record
                </span>
                <span className="text-xs font-mono bg-white/10 px-2.5 py-0.5 rounded">
                  {completedSummary.interviewId}
                </span>
              </div>
              <h2 className="text-xl font-bold">
                Preliminary Vision Interview Completed
              </h2>
              <p className="text-xs text-slate-300">
                Customer: <strong>{customer.fullName || customer.name}</strong> • Language: {language === 'hi' ? 'Hindi (हिंदी)' : 'English'}
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              
              {/* Mandatory Medical Disclaimer */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-600 leading-relaxed flex items-start gap-2.5">
                <Info className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Clinical Notice:</strong> This interview collects customer-reported subjective information. It does not diagnose eye conditions or replace a comprehensive eye examination by a qualified optometrist or ophthalmologist.
                </span>
              </div>

              {/* Red Flag Warning Notice if present */}
              {completedSummary.hasRedFlags && (
                <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-rose-900 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-rose-700">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Urgent Clinical Attention Required</span>
                  </div>
                  <p className="text-xs text-rose-800 leading-relaxed">
                    {completedSummary.redFlagReason || 'Customer reported acute warning symptoms requiring prompt in-person assessment.'}
                  </p>
                </div>
              )}

              {/* Structured AI / Deterministic Intake Summary */}
              {completedSummary.summary && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-xs text-navy-950 uppercase tracking-wider flex items-center gap-1.5">
                      <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                      <span>Structured Intake Summary</span>
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-teal-50 text-teal-700 font-semibold border border-teal-200">
                      {completedSummary.summary.isAiGenerated ? 'Gemini AI Formatted' : 'Rule-Engine Structured'}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-100 text-xs text-navy-950 leading-relaxed font-medium">
                    {completedSummary.summary.aiSummarySnippet}
                  </div>
                </div>
              )}

              {/* Reported Findings Breakdown */}
              <div className="space-y-3">
                <h3 className="font-bold text-xs text-navy-950 uppercase tracking-wider">
                  Reported Symptom Findings
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Distance Vision</span>
                    <p className="font-medium text-slate-800">
                      {completedSummary.summary?.distanceVisionConcerns?.length > 0
                        ? completedSummary.summary.distanceVisionConcerns.join(', ')
                        : 'No significant distance difficulty reported'}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Near Vision / Reading</span>
                    <p className="font-medium text-slate-800">
                      {completedSummary.summary?.nearVisionConcerns?.length > 0
                        ? completedSummary.summary.nearVisionConcerns.join(', ')
                        : 'No significant near vision difficulty reported'}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Spectacle History</span>
                    <p className="font-medium text-slate-800">
                      {completedSummary.summary?.spectacleHistory || 'Not specified'}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Symptom Duration</span>
                    <p className="font-medium text-slate-800">
                      {completedSummary.summary?.duration || 'Not specified'}
                    </p>
                  </div>

                </div>
              </div>

              {/* Complete Responses List */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase">
                  Audited Customer Responses ({completedSummary.answers?.length || 0})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {completedSummary.answers?.map((ans: any, idx: number) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-semibold text-slate-400">{ans.questionId}</span>
                        <div className="font-medium text-slate-800">{ans.questionText}</div>
                        {ans.voiceTranscript && ans.inputMethod === 'VOICE' && (
                          <div className="text-[10px] text-teal-700 italic">Dictated: "{ans.voiceTranscript}"</div>
                        )}
                      </div>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded flex-shrink-0 ${
                        ans.isRedFlag ? 'bg-rose-100 text-rose-800' : 'bg-white text-navy-950 border border-slate-200'
                      }`}>
                        {ans.answerLabel}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Modal Footer Actions */}
            <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate(`/customers/${customer.customerId || customerParamId}`)}
                className="px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold"
              >
                Return to Customer Profile
              </button>

              <button
                type="button"
                onClick={() => alert(`Launching Visual Screening for ${customer.fullName || customer.name}... (Milestone 4)`)}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5"
              >
                <Eye className="w-4 h-4" />
                <span>Next: Preliminary Vision Screening</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
