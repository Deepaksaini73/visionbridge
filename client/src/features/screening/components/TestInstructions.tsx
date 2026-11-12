import React, { useState } from 'react';
import { ScreeningModuleId } from '../types/screening';
import { Volume2, VolumeX, CheckCircle, Info } from 'lucide-react';

interface TestInstructionsProps {
  moduleId: ScreeningModuleId;
  onStart: () => void;
}

const INSTRUCTION_DATA: Record<ScreeningModuleId, {
  titleEn: string;
  titleHi: string;
  stepsEn: string[];
  stepsHi: string[];
  speechTextEn: string;
  speechTextHi: string;
}> = {
  DISTANCE_ACUITY: {
    titleEn: 'Distance Visual Acuity Instructions (3 Meters)',
    titleHi: 'दूरी दृष्टि तीक्ष्णता निर्देश (3 मीटर)',
    stepsEn: [
      'Position customer seated or standing at exactly 3 meters from the screen.',
      'Cover the Left Eye first (test the Right Eye OD monocularly). Do not press on the eyeball.',
      'Customer indicates the direction the open limbs of the "E" are pointing (UP, DOWN, LEFT, RIGHT).',
      'The store operator taps the corresponding directional button or uses the keyboard arrow keys.',
      'Repeat the test for the Left Eye (OS).',
    ],
    stepsHi: [
      'ग्राहक को स्क्रीन से ठीक 3 मीटर की दूरी पर बैठाएं या खड़ा करें।',
      'पहले बाईं आँख को हाथ या आवरण से हल्के से ढकें (दाईं आँख की जांच करें)। आँख पर दबाव न डालें।',
      'अक्षर "E" के खुले हुए भाग की दिशा (ऊपर, नीचे, बाएँ, दाएँ) बताएं।',
      'ऑपरेटर संबंधित दिशा बटन पर क्लिक करें या कीबोर्ड तीर कुंजियों का प्रयोग करें।',
      'इसके पश्चात यही प्रक्रिया बाईं आँख के लिए दोहराएं।',
    ],
    speechTextEn: 'Please stand or sit three meters away. Cover your left eye gently. Tell the operator which direction the letter E is pointing: up, down, left, or right.',
    speechTextHi: 'कृपया स्क्रीन से तीन मीटर दूर रहें। अपनी बाईं आँख को हल्के से ढकें और बताएं कि ई का खुला सिरा किस तरफ है: ऊपर, नीचे, बाएँ या दाएँ।',
  },
  NEAR_ACUITY: {
    titleEn: 'Near Visual Acuity Instructions (40 cm Reading Distance)',
    titleHi: 'निकट दृष्टि (पठन) जांच निर्देश (40 सेमी दूरी)',
    stepsEn: [
      'Customer holds the screen or sits comfortably at standard reading distance (40 cm / comfortable arm distance).',
      'Test each eye separately, then test with both eyes open (Binocular OU).',
      'Customer reads the sample reading sentences or indicates small optotypes.',
      'Check whether current reading glasses (if worn) are used.',
    ],
    stepsHi: [
      'ग्राहक स्क्रीन को सामान्य पढ़ने की दूरी (लगभग 40 सेमी) पर सहजता से रखें।',
      'प्रत्येक आँख की अलग-अलग जांच करें, फिर दोनों आँखें खुली रखकर पढ़ें।',
      'प्रदर्शित वाक्यों या बारीक अक्षरों को स्पष्ट रूप से पढ़ें।',
      'यदि ग्राहक पढ़ने का चश्मा लगाते हैं, तो नोट करें।',
    ],
    speechTextEn: 'Hold the screen at comfortable reading distance, about forty centimeters. Read the displayed text out loud.',
    speechTextHi: 'स्क्रीन को पढ़ने की सामान्य दूरी लगभग चालीस सेंटीमीटर पर रखें और दिए गए पाठ को पढ़कर बताएं।',
  },
  CONTRAST_SENSITIVITY: {
    titleEn: 'Contrast Sensitivity Instructions (Diminishing Weber Contrast)',
    titleHi: 'कंट्रास्ट संवेदनशीलता जांच निर्देश',
    stepsEn: [
      'Customer views the screen at standard distance under diffuse lighting.',
      'Optotypes of constant size will appear with progressively lighter gray tones.',
      'Customer indicates the orientation or character as contrast decreases.',
      'Test stops when customer is unable to reliably identify the low-contrast target.',
    ],
    stepsHi: [
      'ग्राहक सामान्य दूरी पर देखें। कमरे में सीधी चमक न हो।',
      'स्क्रीन पर एक ही आकार के अक्षर धीरे-धीरे हल्के भूरे होते जाएंगे।',
      'हल्के होते अक्षर की दिशा या रूप पहचानकर बताएं।',
      'जब अक्षर दिखना बंद हो जाए तो अगला कदम चुनें।',
    ],
    speechTextEn: 'Letters will appear progressively fainter and lighter. Please indicate the direction or character as long as you can see it.',
    speechTextHi: 'स्क्रीन पर अक्षर धीरे-धीरे बहुत हल्के होते जाएंगे। जब तक आप देख पा रहे हैं, उसकी दिशा बताते रहें।',
  },
  COLOUR_VISION: {
    titleEn: 'Colour Vision Screening Instructions (Pseudoisochromatic Plates)',
    titleHi: 'रंग दृष्टि जांच निर्देश (कलर प्लेट्स)',
    stepsEn: [
      'Four procedural pseudoisochromatic dot plates will be displayed sequentially.',
      'Customer looks at the circle matrix and states what number they see hidden in the dots.',
      'Tap the numeric keypad or select "Nothing Visible" if no number is discernable.',
      'Do not allow customer to trace with fingers or spend more than 5 seconds per plate.',
    ],
    stepsHi: [
      'स्क्रीन पर चार रंगीन बिंदुओं वाली प्लेटें एक-एक करके दिखाई जाएंगी।',
      'बिंदुओं के बीच छिपे हुए अंक को पहचानकर बताएं।',
      'संख्यात्मक कीपैड पर उत्तर दर्ज करें। यदि कोई अंक न दिखे तो "कुछ नहीं दिख रहा" चुनें।',
      'प्रति प्लेट 5 सेकंड से अधिक समय न लें।',
    ],
    speechTextEn: 'Look at the colored dots on the screen. Tell the operator what number you see inside the circle.',
    speechTextHi: 'स्क्रीन पर रंगीन बिंदुओं को देखें और बताएं कि गोले के अंदर आपको कौन सा अंक दिखाई दे रहा है।',
  },
  AMSLER_GRID: {
    titleEn: 'Amsler Grid Assessment Instructions (Macular Distortion Check)',
    titleHi: 'एम्सलर ग्रिड जांच निर्देश (मैकुला एवं सीधी रेखाओं की जांच)',
    stepsEn: [
      'Customer views the 20x20 grid at 35 to 40 cm reading distance (with reading glasses if used).',
      'Cover one eye. Focus intently on the white central dot at all times.',
      'While looking at the center, answer: Are all lines straight and continuous? Are any boxes missing, wavy, or blurred?',
      'If wavy or dark spots are noticed, mark the affected quadrants or sectors.',
      'Repeat for the other eye.',
    ],
    stepsHi: [
      'स्क्रीन को पढ़ने की दूरी (35-40 सेमी) पर रखें (पढ़ने का चश्मा पहनकर)।',
      'एक आँख ढकें। अपनी दृष्टि केंद्र में बने सफेद बिंदु पर टिकाए रखें।',
      'केंद्र को देखते हुए बताएं: क्या सभी रेखाएं बिल्कुल सीधी दिख रही हैं? क्या कोई भाग टेढ़ा, धुंधला या गायब लग रहा है?',
      'यदि रेखाएं मुड़ी हुई या काला धब्बा दिखे तो संबंधित क्षेत्र चुनें।',
      'दूसरी आँख के लिए भी यही जांच करें।',
    ],
    speechTextEn: 'Look directly at the center white dot with one eye covered. Keep looking at the center and tell the operator if the lines look wavy, bent, or if any part of the grid is missing.',
    speechTextHi: 'एक आँख ढककर केंद्र के सफेद बिंदु को लगातार देखें। बताएं कि क्या जाल की रेखाएं मुड़ी हुई, टेढ़ी या कहीं से गायब तो नहीं लग रही हैं।',
  },
};

export const TestInstructions: React.FC<TestInstructionsProps> = ({ moduleId, onStart }) => {
  const [isPlayingEn, setIsPlayingEn] = useState(false);
  const [isPlayingHi, setIsPlayingHi] = useState(false);

  const data = INSTRUCTION_DATA[moduleId];

  const handleSpeak = (lang: 'en' | 'hi') => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const isEn = lang === 'en';
    const text = isEn ? data.speechTextEn : data.speechTextHi;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = isEn ? 'en-US' : 'hi-IN';
    utterance.rate = 0.9;

    if (isEn) {
      setIsPlayingEn(true);
      utterance.onend = () => setIsPlayingEn(false);
      utterance.onerror = () => setIsPlayingEn(false);
    } else {
      setIsPlayingHi(true);
      utterance.onend = () => setIsPlayingHi(false);
      utterance.onerror = () => setIsPlayingHi(false);
    }

    window.speechSynthesis.speak(utterance);
  };

  const handleStopSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlayingEn(false);
      setIsPlayingHi(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">{data.titleEn}</h2>
          <p className="text-xs text-teal-700 font-medium">{data.titleHi}</p>
        </div>

        {/* Audio TTS Buttons */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => (isPlayingEn ? handleStopSpeech() : handleSpeak('en'))}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border flex items-center space-x-1.5 transition-all ${
              isPlayingEn
                ? 'bg-rose-50 text-rose-700 border-rose-300'
                : 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100'
            }`}
          >
            {isPlayingEn ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span>{isPlayingEn ? 'Stop English' : 'Listen English'}</span>
          </button>

          <button
            type="button"
            onClick={() => (isPlayingHi ? handleStopSpeech() : handleSpeak('hi'))}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border flex items-center space-x-1.5 transition-all ${
              isPlayingHi
                ? 'bg-rose-50 text-rose-700 border-rose-300'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            {isPlayingHi ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span>{isPlayingHi ? 'रोकें (Stop)' : 'हिंदी में सुनें (Audio)'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* English steps */}
        <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
            <Info className="w-3.5 h-3.5 text-teal-600" />
            <span>Standard Operating Procedure (English)</span>
          </h3>
          <ul className="space-y-2 text-xs text-slate-600">
            {data.stepsEn.map((step, idx) => (
              <li key={idx} className="flex items-start space-x-2">
                <span className="font-bold text-teal-700 shrink-0">{idx + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Hindi steps */}
        <div className="space-y-3 bg-teal-50/40 p-4 rounded-lg border border-teal-100">
          <h3 className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center space-x-1.5">
            <Info className="w-3.5 h-3.5 text-teal-600" />
            <span>मानक संचालन प्रक्रिया (हिंदी)</span>
          </h3>
          <ul className="space-y-2 text-xs text-teal-900">
            {data.stepsHi.map((step, idx) => (
              <li key={idx} className="flex items-start space-x-2">
                <span className="font-bold text-teal-700 shrink-0">{idx + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="pt-2 flex justify-end">
        <button
          type="button"
          onClick={() => {
            handleStopSpeech();
            onStart();
          }}
          className="px-6 py-2.5 bg-teal-600 text-white font-semibold text-sm rounded-lg hover:bg-teal-700 shadow flex items-center space-x-2 transition-all"
        >
          <span>Begin Test Module</span>
          <CheckCircle className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

