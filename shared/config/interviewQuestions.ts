/**
 * VisionBridge Interview Question Engine Configuration
 * Configuration-driven, multilingual (English & Hindi), with deterministic adaptive branching.
 */

export interface QuestionOption {
  value: string;
  labelEn: string;
  labelHi: string;
  triggersQuestions?: string[];
  isUrgentFlag?: boolean;
  warningDescriptionEn?: string;
  warningDescriptionHi?: string;
}

export interface QuestionCondition {
  dependsOnQuestionId: string;
  matchingValues: string[];
}

export interface InterviewQuestionConfig {
  id: string;
  sectionId: 'sec_basic' | 'sec_daily' | 'sec_history' | 'sec_warning' | 'sec_lifestyle';
  category: 
    | 'NEAR_VISION' 
    | 'DISTANCE_VISION' 
    | 'BLURRED_VISION' 
    | 'EYE_STRAIN' 
    | 'HEADACHE' 
    | 'RED_FLAG_URGENT' 
    | 'LIFESTYLE';
  textEn: string;
  textHi: string;
  promptEn: string; // Used by browser Text-To-Speech
  promptHi: string;
  inputType: 'CHOICE' | 'TEXT';
  options?: QuestionOption[];
  condition?: QuestionCondition; // Evaluated dynamically for adaptive branching
  isRedFlagTrigger?: boolean;
  allowFreeTextInput?: boolean;
}

export interface InterviewSectionConfig {
  id: 'sec_basic' | 'sec_daily' | 'sec_history' | 'sec_warning' | 'sec_lifestyle';
  order: number;
  titleEn: string;
  titleHi: string;
  shortLabelEn: string;
  shortLabelHi: string;
  descriptionEn: string;
  descriptionHi: string;
}

export const INTERVIEW_SECTIONS: InterviewSectionConfig[] = [
  {
    id: 'sec_basic',
    order: 1,
    titleEn: 'Section A: Basic Vision Experience',
    titleHi: 'खंड क: बुनियादी दृष्टि अनुभव',
    shortLabelEn: 'Basic Vision',
    shortLabelHi: 'दृष्टि अनुभव',
    descriptionEn: 'Assessing distance, reading, blurriness, and symptom duration.',
    descriptionHi: 'दूरी, पढ़ाई, धुंधलापन और लक्षणों की अवधि का आकलन।',
  },
  {
    id: 'sec_daily',
    order: 2,
    titleEn: 'Section B: Daily Activities & Impact',
    titleHi: 'खंड ख: दैनिक कार्य और प्रभाव',
    shortLabelEn: 'Daily Activities',
    shortLabelHi: 'दैनिक कार्य',
    descriptionEn: 'Evaluating practical impact on reading, faces, signs, and phone usage.',
    descriptionHi: 'पढ़ने, चेहरों की पहचान, बोर्ड देखने और मोबाइल उपयोग पर प्रभाव।',
  },
  {
    id: 'sec_history',
    order: 3,
    titleEn: 'Section C: Eye-Care & Spectacle History',
    titleHi: 'खंड ग: चश्मा और नेत्र-जांच इतिहास',
    shortLabelEn: 'Eye History',
    shortLabelHi: 'नेत्र इतिहास',
    descriptionEn: 'History of previous spectacles and professional eye exams.',
    descriptionHi: 'पुराने चश्मे और पिछली पेशेवर नेत्र-जांच का रिकॉर्ड।',
  },
  {
    id: 'sec_warning',
    order: 4,
    titleEn: 'Section D: Urgent Warning Symptoms',
    titleHi: 'खंड घ: चेतावनी और आपातकालीन लक्षण',
    shortLabelEn: 'Warning Symptoms',
    shortLabelHi: 'चेतावनी लक्षण',
    descriptionEn: 'Screening for acute symptoms requiring prompt medical assessment.',
    descriptionHi: 'ऐसे लक्षणों की पहचान जिनके लिए तत्काल डॉक्टर की जांच जरूरी है।',
  },
  {
    id: 'sec_lifestyle',
    order: 5,
    titleEn: 'Section E: Additional Lifestyle Details',
    titleHi: 'खंड ङ: जीवनशैली और कार्य विवरण',
    shortLabelEn: 'Lifestyle & Work',
    shortLabelHi: 'जीवनशैली',
    descriptionEn: 'Screen exposure, outdoor sunlight/dust, and occupational habits.',
    descriptionHi: 'स्क्रीन समय, धूप-धूल का संपर्क और अन्य दृष्टि से जुड़े सवाल।',
  },
];

export const INTERVIEW_QUESTIONS: InterviewQuestionConfig[] = [
  // ==========================================
  // SECTION A: BASIC VISION EXPERIENCE
  // ==========================================
  {
    id: 'q_dist',
    sectionId: 'sec_basic',
    category: 'DISTANCE_VISION',
    textEn: 'Do you experience difficulty seeing objects or people at a distance?',
    textHi: 'क्या आपको दूर की चीजें या दूर खड़े लोगों को देखने में परेशानी होती है?',
    promptEn: 'Do you experience difficulty seeing objects or people at a distance?',
    promptHi: 'क्या आपको दूर की चीजें या दूर खड़े लोगों को देखने में परेशानी होती है?',
    inputType: 'CHOICE',
    options: [
      { value: 'NONE', labelEn: 'No, distance vision is clear', labelHi: 'नहीं, दूर का बिल्कुल साफ दिखता है' },
      { value: 'MILD', labelEn: 'Mild blur / slight squinting', labelHi: 'हल्का धुंधलापन / आँखें सिकोड़नी पड़ती हैं', triggersQuestions: ['q_faces', 'q_boards'] },
      { value: 'MODERATE', labelEn: 'Moderate difficulty', labelHi: 'मध्यम परेशानी (पहचानने में दिक्कत)', triggersQuestions: ['q_faces', 'q_boards'] },
      { value: 'SEVERE', labelEn: 'Severe difficulty / very blurry', labelHi: 'गंभीर परेशानी (बहुत धुंधला)', triggersQuestions: ['q_faces', 'q_boards'] },
    ],
  },
  {
    id: 'q_near',
    sectionId: 'sec_basic',
    category: 'NEAR_VISION',
    textEn: 'Do you experience difficulty reading nearby text or fine print?',
    textHi: 'क्या आपको पास का बारीक लिखा हुआ या अखबार पढ़ने में परेशानी होती है?',
    promptEn: 'Do you experience difficulty reading nearby text or fine print?',
    promptHi: 'क्या आपको पास का बारीक लिखा हुआ या अखबार पढ़ने में परेशानी होती है?',
    inputType: 'CHOICE',
    options: [
      { value: 'NONE', labelEn: 'No, near vision is clear', labelHi: 'नहीं, पास का साफ दिखता है' },
      { value: 'MILD', labelEn: 'Mild strain when reading', labelHi: 'पढ़ने में हल्का तनाव / थकान', triggersQuestions: ['q_reading', 'q_phone'] },
      { value: 'MODERATE', labelEn: 'Moderate difficulty (need bright light)', labelHi: 'मध्यम परेशानी (तेज़ रोशनी की जरूरत)', triggersQuestions: ['q_reading', 'q_phone'] },
      { value: 'SEVERE', labelEn: 'Severe difficulty / unable to read without glasses', labelHi: 'गंभीर परेशानी (बिना चश्मे पढ़ना नामुमकिन)', triggersQuestions: ['q_reading', 'q_phone'] },
    ],
  },
  {
    id: 'q_blur',
    sectionId: 'sec_basic',
    category: 'BLURRED_VISION',
    textEn: 'How frequently does blurred vision occur during the day?',
    textHi: 'दिन के समय धुंधलापन कितनी बार महसूस होता है?',
    promptEn: 'How frequently does blurred vision occur during the day?',
    promptHi: 'दिन के समय धुंधलापन कितनी बार महसूस होता है?',
    inputType: 'CHOICE',
    options: [
      { value: 'NEVER', labelEn: 'Never blurry', labelHi: 'कभी नहीं' },
      { value: 'OCCASIONAL', labelEn: 'Occasionally (mostly after tired)', labelHi: 'कभी-कभी (थकावट के बाद)' },
      { value: 'CONSTANT', labelEn: 'Constant blur all day', labelHi: 'लगातार पूरे दिन धुंधला रहता है' },
      { value: 'FLUCTUATING', labelEn: 'Fluctuates between morning and evening', labelHi: 'सुबह और शाम में घटता-बढ़ता रहता है' },
    ],
  },
  {
    id: 'q_eye_affected',
    sectionId: 'sec_basic',
    category: 'BLURRED_VISION',
    textEn: 'Is the vision difficulty affecting both eyes, or primarily one eye?',
    textHi: 'यह परेशानी दोनों आँखों में है, या मुख्य रूप से एक ही आँख में?',
    promptEn: 'Is the vision difficulty affecting both eyes, or primarily one eye?',
    promptHi: 'यह परेशानी दोनों आँखों में है, या मुख्य रूप से एक ही आँख में?',
    inputType: 'CHOICE',
    options: [
      { value: 'BOTH', labelEn: 'Both eyes equally', labelHi: 'दोनों आँखों में बराबर' },
      { value: 'RIGHT_ONLY', labelEn: 'Right eye primarily', labelHi: 'मुख्य रूप से दाहिनी आँख में', triggersQuestions: ['q_eye_detail'] },
      { value: 'LEFT_ONLY', labelEn: 'Left eye primarily', labelHi: 'मुख्य रूप से बाईं आँख में', triggersQuestions: ['q_eye_detail'] },
    ],
  },
  {
    id: 'q_eye_detail',
    sectionId: 'sec_basic',
    category: 'BLURRED_VISION',
    textEn: 'When you cover your other eye, does the affected eye feel significantly weaker?',
    textHi: 'जब आप दूसरी आँख को ढकते हैं, तो क्या इस आँख से काफी कम दिखाई देता है?',
    promptEn: 'When you cover your other eye, does the affected eye feel significantly weaker?',
    promptHi: 'जब आप दूसरी आँख को ढकते हैं, तो क्या इस आँख से काफी कम दिखाई देता है?',
    inputType: 'CHOICE',
    condition: {
      dependsOnQuestionId: 'q_eye_affected',
      matchingValues: ['RIGHT_ONLY', 'LEFT_ONLY'],
    },
    options: [
      { value: 'YES_NOTICEABLE', labelEn: 'Yes, noticeably weaker when isolated', labelHi: 'हाँ, अलग करने पर साफ तौर पर कमजोर लगती है' },
      { value: 'MILD_DIFFERENCE', labelEn: 'Only a mild difference', labelHi: 'केवल थोड़ा सा फर्क है' },
      { value: 'NOT_SURE', labelEn: 'Not sure / haven’t checked separately', labelHi: 'निश्चित नहीं / अलग से जांचा नहीं' },
    ],
  },
  {
    id: 'q_duration',
    sectionId: 'sec_basic',
    category: 'BLURRED_VISION',
    textEn: 'How long have you noticed these vision difficulties?',
    textHi: 'आप यह परेशानी कितने समय से महसूस कर रहे हैं?',
    promptEn: 'How long have you noticed these vision difficulties?',
    promptHi: 'आप यह परेशानी कितने समय से महसूस कर रहे हैं?',
    inputType: 'CHOICE',
    options: [
      { value: 'LESS_1_MONTH', labelEn: 'Less than 1 month (recent onset)', labelHi: '1 महीने से कम (हाल ही में शुरू)' },
      { value: '1_TO_6_MONTHS', labelEn: '1 to 6 months', labelHi: '1 से 6 महीने से' },
      { value: '6_TO_12_MONTHS', labelEn: '6 months to 1 year', labelHi: '6 महीने से 1 साल से' },
      { value: 'OVER_1_YEAR', labelEn: 'More than a year (gradual progression)', labelHi: '1 साल से अधिक समय से' },
    ],
  },
  {
    id: 'q_progression',
    sectionId: 'sec_basic',
    category: 'BLURRED_VISION',
    textEn: 'Over this period, has your vision been getting worse, staying the same, or improving?',
    textHi: 'इस दौरान आपकी दृष्टि और कमजोर हो रही है, वैसी ही है, या कुछ सुधार है?',
    promptEn: 'Over this period, has your vision been getting worse, staying the same, or improving?',
    promptHi: 'इस दौरान आपकी दृष्टि और कमजोर हो रही है, वैसी ही है, या कुछ सुधार है?',
    inputType: 'CHOICE',
    options: [
      { value: 'GETTING_WORSE', labelEn: 'Gradually getting worse', labelHi: 'धीरे-धीरे और कमजोर हो रही है' },
      { value: 'SAME', labelEn: 'Remaining about the same', labelHi: 'लगभग वैसी ही बनी हुई है' },
      { value: 'FLUCTUATING', labelEn: 'Some days better, some days worse', labelHi: 'कभी ठीक, कभी ज्यादा खराब' },
      { value: 'IMPROVING', labelEn: 'Slightly improving', labelHi: 'कुछ सुधार है' },
    ],
  },

  // ==========================================
  // SECTION B: DAILY ACTIVITIES & IMPACT
  // ==========================================
  {
    id: 'q_faces',
    sectionId: 'sec_daily',
    category: 'DISTANCE_VISION',
    textEn: 'Do you find it difficult to recognize familiar faces across the street or room?',
    textHi: 'क्या आपको सड़क पार या कमरे के दूसरे कोने से परिचित चेहरों को पहचानने में दिक्कत होती है?',
    promptEn: 'Do you find it difficult to recognize familiar faces across the street or room?',
    promptHi: 'क्या आपको सड़क पार या कमरे के दूसरे कोने से परिचित चेहरों को पहचानने में दिक्कत होती है?',
    inputType: 'CHOICE',
    condition: {
      dependsOnQuestionId: 'q_dist',
      matchingValues: ['MILD', 'MODERATE', 'SEVERE'],
    },
    options: [
      { value: 'NO', labelEn: 'No difficulty recognizing faces', labelHi: 'नहीं, चेहरे आसानी से पहचान लेते हैं' },
      { value: 'SOMETIMES', labelEn: 'Sometimes have to get closer to recognize', labelHi: 'कभी-कभी पास जाकर ही पहचान पाते हैं' },
      { value: 'OFTEN', labelEn: 'Frequently mistake people until hearing voice', labelHi: 'अक्सर आवाज सुने बिना पहचान नहीं पाते' },
    ],
  },
  {
    id: 'q_boards',
    sectionId: 'sec_daily',
    category: 'DISTANCE_VISION',
    textEn: 'Do you have trouble reading bus route numbers, road signs, or classroom boards?',
    textHi: 'क्या आपको बस का नंबर, सड़क के साइनबोर्ड या स्कूल का ब्लैकबोर्ड पढ़ने में परेशानी होती है?',
    promptEn: 'Do you have trouble reading bus route numbers, road signs, or classroom boards?',
    promptHi: 'क्या आपको बस का नंबर, सड़क के साइनबोर्ड या स्कूल का ब्लैकबोर्ड पढ़ने में परेशानी होती है?',
    inputType: 'CHOICE',
    condition: {
      dependsOnQuestionId: 'q_dist',
      matchingValues: ['MILD', 'MODERATE', 'SEVERE'],
    },
    options: [
      { value: 'NO', labelEn: 'No difficulty with signs or boards', labelHi: 'नहीं, बोर्ड और बस नंबर साफ दिखते हैं' },
      { value: 'SOMEWHAT', labelEn: 'Hard to read until very close', labelHi: 'काफी पास आने पर ही पढ़ पाते हैं' },
      { value: 'CANNOT_READ', labelEn: 'Cannot read without squinting heavily', labelHi: 'बिना आँखें सिकोड़े बिल्कुल नहीं पढ़ पाते' },
    ],
  },
  {
    id: 'q_reading',
    sectionId: 'sec_daily',
    category: 'NEAR_VISION',
    textEn: 'Do you have difficulty reading newspapers, books, or ration cards without pushing them away?',
    textHi: 'क्या आपको अखबार, किताब या राशन कार्ड पढ़ने के लिए हाथ को दूर फैलाना पड़ता है?',
    promptEn: 'Do you have difficulty reading newspapers, books, or ration cards without pushing them away?',
    promptHi: 'क्या आपको अखबार, किताब या राशन कार्ड पढ़ने के लिए हाथ को दूर फैलाना पड़ता है?',
    inputType: 'CHOICE',
    condition: {
      dependsOnQuestionId: 'q_near',
      matchingValues: ['MILD', 'MODERATE', 'SEVERE'],
    },
    options: [
      { value: 'NO', labelEn: 'Read comfortably at normal distance', labelHi: 'सामान्य दूरी पर आराम से पढ़ लेते हैं' },
      { value: 'PUSH_AWAY', labelEn: 'Have to hold at arm’s length to focus', labelHi: 'साफ देखने के लिए हाथ पूरा दूर फैलाना पड़ता है' },
      { value: 'HEADACHE_AFTER', labelEn: 'Reading causes eye strain or frontal headache', labelHi: 'पढ़ने के बाद सिर या आँखों में दर्द होने लगता है' },
      { value: 'CANNOT_READ', labelEn: 'Cannot read small letters at all', labelHi: 'बारीक अक्षर बिल्कुल नहीं पढ़े जाते' },
    ],
  },
  {
    id: 'q_phone',
    sectionId: 'sec_daily',
    category: 'NEAR_VISION',
    textEn: 'When using your mobile phone, do you need to enlarge the text size or hold it unusually far?',
    textHi: 'मोबाइल फोन इस्तेमाल करते समय क्या आपको फॉन्ट बड़ा करना पड़ता है या फोन दूर रखना पड़ता है?',
    promptEn: 'When using your mobile phone, do you need to enlarge the text size or hold it unusually far?',
    promptHi: 'मोबाइल फोन इस्तेमाल करते समय क्या आपको फॉन्ट बड़ा करना पड़ता है या फोन दूर रखना पड़ता है?',
    inputType: 'CHOICE',
    condition: {
      dependsOnQuestionId: 'q_near',
      matchingValues: ['MILD', 'MODERATE', 'SEVERE'],
    },
    options: [
      { value: 'COMFORTABLE', labelEn: 'Comfortable at default text size', labelHi: 'सामान्य साइज पर आराम से दिखता है' },
      { value: 'ENLARGED_FONT', labelEn: 'Had to set font size to large', labelHi: 'अक्षरों का साइज बड़ा करके रखा है' },
      { value: 'TIRED_QUICKLY', labelEn: 'Eyes water or tire after 5 minutes', labelHi: '5 मिनट फोन देखने पर ही पानी आने लगता है' },
      { value: 'AVOID_PHONE', labelEn: 'Avoid texting because of blurriness', labelHi: 'धुंधलेपन के कारण मैसेज पढ़ना टालते हैं' },
    ],
  },
  {
    id: 'q_daily',
    sectionId: 'sec_daily',
    category: 'EYE_STRAIN',
    textEn: 'Does your vision difficulty interfere with your job, tailoring, farming, or daily chores?',
    textHi: 'क्या दृष्टि की इस परेशानी से आपके काम, सिलाई, खेती या घरेलू कार्यों में बाधा आती है?',
    promptEn: 'Does your vision difficulty interfere with your job, tailoring, farming, or daily chores?',
    promptHi: 'क्या दृष्टि की इस परेशानी से आपके काम, सिलाई, खेती या घरेलू कार्यों में बाधा आती है?',
    inputType: 'CHOICE',
    options: [
      { value: 'NOT_AFFECTED', labelEn: 'Daily work is unaffected', labelHi: 'रोजमर्रा के काम पर कोई असर नहीं है' },
      { value: 'SLIGHTLY_AFFECTED', labelEn: 'Slight slowdown, but manageable', labelHi: 'थोड़ा समय ज्यादा लगता है पर काम हो जाता है' },
      { value: 'SIGNIFICANTLY_LIMITED', labelEn: 'Significantly affects livelihood / productivity', labelHi: 'काम पर बहुत ज्यादा असर पड़ रहा है' },
    ],
  },

  // ==========================================
  // SECTION C: EYE-CARE & SPECTACLE HISTORY
  // ==========================================
  {
    id: 'q_spectacles',
    sectionId: 'sec_history',
    category: 'LIFESTYLE',
    textEn: 'Do you currently wear eyeglasses, or have you worn them in the past?',
    textHi: 'क्या आप अभी चश्मा लगाते हैं, या पहले कभी चश्मा लगाया है?',
    promptEn: 'Do you currently wear eyeglasses, or have you worn them in the past?',
    promptHi: 'क्या आप अभी चश्मा लगाते हैं, या पहले कभी चश्मा लगाया है?',
    inputType: 'CHOICE',
    options: [
      { value: 'NEVER', labelEn: 'Never worn eyeglasses', labelHi: 'कभी चश्मा नहीं लगाया' },
      { value: 'CURRENT_USER', labelEn: 'Currently wear glasses', labelHi: 'हाँ, अभी चश्मा लगाते हैं', triggersQuestions: ['q_glasses_age', 'q_glasses_type'] },
      { value: 'PAST_USER', labelEn: 'Wore glasses in past, but stopped or lost them', labelHi: 'पहले लगाते थे, पर अब टूट गया या छोड़ दिया', triggersQuestions: ['q_glasses_age'] },
    ],
  },
  {
    id: 'q_glasses_age',
    sectionId: 'sec_history',
    category: 'LIFESTYLE',
    textEn: 'How long ago was your current or most recent pair of spectacles made?',
    textHi: 'आपका मौजूदा चश्मा कितने समय पहले बना था?',
    promptEn: 'How long ago was your current or most recent pair of spectacles made?',
    promptHi: 'आपका मौजूदा चश्मा कितने समय पहले बना था?',
    inputType: 'CHOICE',
    condition: {
      dependsOnQuestionId: 'q_spectacles',
      matchingValues: ['CURRENT_USER', 'PAST_USER'],
    },
    options: [
      { value: 'LESS_1_YEAR', labelEn: 'Less than 1 year ago', labelHi: '1 साल से कम समय पहले' },
      { value: '1_TO_2_YEARS', labelEn: '1 to 2 years ago', labelHi: '1 से 2 साल पहले' },
      { value: 'OVER_2_YEARS', labelEn: 'More than 2 years ago (may need update)', labelHi: '2 साल से ज्यादा समय पहले (जांच की जरूरत हो सकती है)' },
    ],
  },
  {
    id: 'q_glasses_type',
    sectionId: 'sec_history',
    category: 'LIFESTYLE',
    textEn: 'What type of glasses do you currently use?',
    textHi: 'आपका चश्मा किस प्रकार का है?',
    promptEn: 'What type of glasses do you currently use?',
    promptHi: 'आपका चश्मा किस प्रकार का है?',
    inputType: 'CHOICE',
    condition: {
      dependsOnQuestionId: 'q_spectacles',
      matchingValues: ['CURRENT_USER'],
    },
    options: [
      { value: 'READING_ONLY', labelEn: 'Reading only (pass-ke-liye)', labelHi: 'सिर्फ पास का पढ़ने के लिए' },
      { value: 'DISTANCE_ONLY', labelEn: 'Distance only (door-ke-liye)', labelHi: 'सिर्फ दूर देखने के लिए' },
      { value: 'BIFOCAL_PROGRESSIVE', labelEn: 'Both distance & reading (bifocal / progressive)', labelHi: 'दोनों के लिए (बायफोकल या प्रोग्रेसिव)' },
      { value: 'NOT_SURE', labelEn: 'Not sure of the lens type', labelHi: 'लेंस के प्रकार के बारे में पक्का नहीं पता' },
    ],
  },
  {
    id: 'q_prev_exam',
    sectionId: 'sec_history',
    category: 'LIFESTYLE',
    textEn: 'When was your last comprehensive eye checkup by an eye doctor or optometrist?',
    textHi: 'पिछली बार किसी नेत्र विशेषज्ञ या ऑप्टोमेट्रिस्ट से आँख की पूरी जांच कब कराई थी?',
    promptEn: 'When was your last comprehensive eye checkup by an eye doctor or optometrist?',
    promptHi: 'पिछली बार किसी नेत्र विशेषज्ञ या ऑप्टोमेट्रिस्ट से आँख की पूरी जांच कब कराई थी?',
    inputType: 'CHOICE',
    options: [
      { value: 'NEVER', labelEn: 'Never had an eye exam', labelHi: 'कभी किसी डॉक्टर से जांच नहीं कराई' },
      { value: 'WITHIN_YEAR', labelEn: 'Within the past year', labelHi: 'पिछले 1 साल के अंदर' },
      { value: '1_TO_3_YEARS', labelEn: '1 to 3 years ago', labelHi: '1 से 3 साल पहले' },
      { value: 'OVER_3_YEARS', labelEn: 'More than 3 years ago', labelHi: '3 साल से ज्यादा समय पहले' },
    ],
  },

  // ==========================================
  // SECTION D: URGENT WARNING SYMPTOMS
  // ==========================================
  {
    id: 'q_sudden_loss',
    sectionId: 'sec_warning',
    category: 'RED_FLAG_URGENT',
    textEn: 'Have you experienced a sudden, unexpected drop in vision, or a dark curtain/veil coming over your eye?',
    textHi: 'क्या आपकी दृष्टि अचानक एकाएक बहुत कम हो गई है, या आँख के आगे काला पर्दा सा छा गया है?',
    promptEn: 'Have you experienced a sudden, unexpected drop in vision, or a dark curtain or veil coming over your eye?',
    promptHi: 'क्या आपकी दृष्टि अचानक एकाएक बहुत कम हो गई है, या आँख के आगे काला पर्दा सा छा गया है?',
    inputType: 'CHOICE',
    isRedFlagTrigger: true,
    options: [
      { value: 'NO', labelEn: 'No, nothing sudden', labelHi: 'नहीं, ऐसा कुछ अचानक नहीं हुआ' },
      { 
        value: 'YES_SUDDEN_DROP', 
        labelEn: 'YES: Sudden vision drop in one or both eyes', 
        labelHi: 'हाँ: दृष्टि में अचानक भारी गिरावट आई है',
        isUrgentFlag: true,
        warningDescriptionEn: 'Sudden vision loss reported. Prompt medical assessment required.',
        warningDescriptionHi: 'अचानक दृष्टि हानि की सूचना। तत्काल नेत्र विशेषज्ञ से परामर्श आवश्यक है।'
      },
      { 
        value: 'YES_CURTAIN', 
        labelEn: 'YES: Dark shadow or curtain across vision', 
        labelHi: 'हाँ: आँख के आगे काला पर्दा या छाया दिखती है',
        isUrgentFlag: true,
        warningDescriptionEn: 'Dark curtain/shadow reported. Risk of retinal issue. Immediate evaluation recommended.',
        warningDescriptionHi: 'काले पर्दे जैसी छाया की सूचना। रेटिना की समस्या का जोखिम। तत्काल जांच की सलाह।'
      },
    ],
  },
  {
    id: 'q_severe_pain',
    sectionId: 'sec_warning',
    category: 'RED_FLAG_URGENT',
    textEn: 'Do you have severe, acute eye pain, especially accompanied by redness, nausea, or headache?',
    textHi: 'क्या आँख में गंभीर तेज दर्द हो रहा है, खासकर लाली, जी मिचलाना या तेज सिरदर्द के साथ?',
    promptEn: 'Do you have severe acute eye pain, especially accompanied by redness, nausea, or headache?',
    promptHi: 'क्या आँख में गंभीर तेज दर्द हो रहा है, खासकर लाली, जी मिचलाना या तेज सिरदर्द के साथ?',
    inputType: 'CHOICE',
    isRedFlagTrigger: true,
    options: [
      { value: 'NO', labelEn: 'No severe pain', labelHi: 'नहीं, कोई तेज दर्द नहीं है' },
      { value: 'MILD_TIREDNESS', labelEn: 'Mild ache / tiredness only', labelHi: 'केवल हल्की थकान या भारीपन' },
      { 
        value: 'YES_SEVERE_PAIN', 
        labelEn: 'YES: Severe eye pain with redness or nausea', 
        labelHi: 'हाँ: आँख में असहनीय तेज दर्द, लाली या उल्टी जैसा लगना',
        isUrgentFlag: true,
        warningDescriptionEn: 'Acute severe eye pain reported. Prompt evaluation required to rule out acute glaucoma or corneal infection.',
        warningDescriptionHi: 'आँख में तीव्र गंभीर दर्द की सूचना। तत्काल अस्पताल या नेत्र विशेषज्ञ से जांच आवश्यक।'
      },
    ],
  },
  {
    id: 'q_flashes',
    sectionId: 'sec_warning',
    category: 'RED_FLAG_URGENT',
    textEn: 'Do you see bright flashes of light (like camera flashes or lightning) in your side vision?',
    textHi: 'क्या आपको आँख के किनारे बिजली चमकने जैसे तेज प्रकाश के झटके दिखाई देते हैं?',
    promptEn: 'Do you see bright flashes of light in your side vision?',
    promptHi: 'क्या आपको आँख के किनारे बिजली चमकने जैसे तेज प्रकाश के झटके दिखाई देते हैं?',
    inputType: 'CHOICE',
    isRedFlagTrigger: true,
    options: [
      { value: 'NO', labelEn: 'No flashes seen', labelHi: 'नहीं, ऐसी चमक नहीं दिखती' },
      { 
        value: 'YES_FLASHES', 
        labelEn: 'YES: Frequent bright flashes of light', 
        labelHi: 'हाँ: बार-बार प्रकाश की चमक या फ्लैश दिखते हैं',
        isUrgentFlag: true,
        warningDescriptionEn: 'Photopsia (light flashes) reported. Evaluation for retinal detachment or tear advised.',
        warningDescriptionHi: 'प्रकाश की चमक दिखने की सूचना। रेटिना की स्थिति की जांच जरूरी।'
      },
    ],
  },
  {
    id: 'q_floaters',
    sectionId: 'sec_warning',
    category: 'RED_FLAG_URGENT',
    textEn: 'Have you recently noticed a sudden shower of new black dots, spots, or cobwebs floating in your sight?',
    textHi: 'क्या हाल ही में आपकी नजर में अचानक बहुत सारे काले धब्बे, बिंदु या मकड़ी के जाले जैसे तैरते दिखे हैं?',
    promptEn: 'Have you recently noticed a sudden shower of new black dots, spots, or cobwebs floating in your sight?',
    promptHi: 'क्या हाल ही में आपकी नजर में अचानक बहुत सारे काले धब्बे, बिंदु या मकड़ी के जाले जैसे तैरते दिखे हैं?',
    inputType: 'CHOICE',
    isRedFlagTrigger: true,
    options: [
      { value: 'NO', labelEn: 'No floaters / nothing new', labelHi: 'नहीं, ऐसा कुछ नहीं है' },
      { value: 'OLD_MILD', labelEn: 'A few old floaters for years, unchanged', labelHi: 'सालों से एक-दो पुराने धब्बे हैं, जो बदले नहीं' },
      { 
        value: 'YES_NEW_SHOWER', 
        labelEn: 'YES: Sudden shower of many new floaters recently', 
        labelHi: 'हाँ: हाल ही में अचानक बहुत सारे नए काले धब्बे शुरू हुए हैं',
        isUrgentFlag: true,
        warningDescriptionEn: 'Acute onset floaters reported. Retinal evaluation recommended.',
        warningDescriptionHi: 'अचानक नए फ्लोटर्स की सूचना। रेटिना जांच की सलाह।'
      },
    ],
  },
  {
    id: 'q_halos',
    sectionId: 'sec_warning',
    category: 'RED_FLAG_URGENT',
    textEn: 'Do you see colored rainbow-like circles or halos around lights at night?',
    textHi: 'क्या रात में लाइट या गाड़ियों की रोशनी के चारों ओर रंगीन इंद्रधनुषी घेरे दिखाई देते हैं?',
    promptEn: 'Do you see colored rainbow-like circles or halos around lights at night?',
    promptHi: 'क्या रात में लाइट या गाड़ियों की रोशनी के चारों ओर रंगीन इंद्रधनुषी घेरे दिखाई देते हैं?',
    inputType: 'CHOICE',
    isRedFlagTrigger: true,
    options: [
      { value: 'NO', labelEn: 'No halos around lights', labelHi: 'नहीं, कोई घेरे नहीं दिखते' },
      { 
        value: 'YES_HALOS', 
        labelEn: 'YES: Noticeable colored halos around streetlights or headlights', 
        labelHi: 'हाँ: रात में लाइटों के चारों ओर रंगीन गोल घेरे दिखते हैं',
        isUrgentFlag: true,
        warningDescriptionEn: 'Rainbow halos reported. May indicate corneal edema or elevated eye pressure.',
        warningDescriptionHi: 'रोशनी के चारों ओर रंगीन घेरे दिखने की सूचना। नेत्र दबाव की जांच आवश्यक।'
      },
    ],
  },

  // ==========================================
  // SECTION E: ADDITIONAL LIFESTYLE & DETAILS
  // ==========================================
  {
    id: 'q_screen_hours',
    sectionId: 'sec_lifestyle',
    category: 'LIFESTYLE',
    textEn: 'Approximately how many hours per day do you spend looking at digital screens (phone, computer, TV)?',
    textHi: 'आप रोजाना औसतन कितने घंटे मोबाइल, टीवी या कंप्यूटर स्क्रीन देखते हैं?',
    promptEn: 'Approximately how many hours per day do you spend looking at digital screens?',
    promptHi: 'आप रोजाना औसतन कितने घंटे मोबाइल, टीवी या कंप्यूटर स्क्रीन देखते हैं?',
    inputType: 'CHOICE',
    options: [
      { value: 'UNDER_2_HOURS', labelEn: 'Under 2 hours a day', labelHi: 'दिन में 2 घंटे से कम' },
      { value: '2_TO_6_HOURS', labelEn: '2 to 6 hours a day', labelHi: 'दिन में 2 से 6 घंटे' },
      { value: 'OVER_6_HOURS', labelEn: 'Over 6 hours a day (high digital exposure)', labelHi: 'दिन में 6 घंटे से ज्यादा (स्क्रीन पर ज्यादा समय)' },
    ],
  },
  {
    id: 'q_outdoor',
    sectionId: 'sec_lifestyle',
    category: 'LIFESTYLE',
    textEn: 'Do your daily activities involve significant outdoor sunlight, wind, or dust exposure?',
    textHi: 'क्या आपके रोजमर्रा के काम में बहुत ज्यादा धूप, तेज हवा या धूल-मिट्टी का सामना होता है?',
    promptEn: 'Do your daily activities involve significant outdoor sunlight, wind, or dust exposure?',
    promptHi: 'क्या आपके रोजमर्रा के काम में बहुत ज्यादा धूप, तेज हवा या धूल-मिट्टी का सामना होता है?',
    inputType: 'CHOICE',
    options: [
      { value: 'INDOORS', labelEn: 'Mostly indoors / sheltered work', labelHi: 'ज्यादातर घर या ऑफिस के अंदर' },
      { value: 'MODERATE_OUTDOOR', labelEn: 'Moderate outdoor commute or errands', labelHi: 'थोड़ा समय बाहर निकलना होता है' },
      { value: 'HEAVY_OUTDOOR', labelEn: 'Heavy outdoor work (farming, construction, driving)', labelHi: 'ज्यादातर बाहर काम (खेती, मजदूरी, ड्राइविंग आदि)' },
    ],
  },
  {
    id: 'q_other_concerns',
    sectionId: 'sec_lifestyle',
    category: 'LIFESTYLE',
    textEn: 'Do you have any other specific eye or vision concerns you would like the optometrist to know?',
    textHi: 'क्या आँख या नजर से जुड़ी कोई अन्य बात है जो आप डॉक्टर को बताना चाहते हैं?',
    promptEn: 'Do you have any other specific eye or vision concerns you would like the optometrist to know?',
    promptHi: 'क्या आँख या नजर से जुड़ी कोई अन्य बात है जो आप डॉक्टर को बताना चाहते हैं?',
    inputType: 'TEXT',
    allowFreeTextInput: true,
  },
];

/**
 * Evaluates whether a question should be shown based on dynamic adaptive branching rules.
 * Supports raw string answers, option objects ({ value: '...' }), or stored answers ({ answerValue: '...' }).
 */
export function isQuestionVisible(
  question: InterviewQuestionConfig,
  currentAnswers: Record<string, any>
): boolean {
  if (!question.condition) return true;

  const parentAnswer = currentAnswers[question.condition.dependsOnQuestionId];
  if (parentAnswer === undefined || parentAnswer === null || parentAnswer === '') return false;

  const answerVal =
    typeof parentAnswer === 'object' && parentAnswer !== null && 'answerValue' in parentAnswer
      ? parentAnswer.answerValue
      : typeof parentAnswer === 'object' && parentAnswer !== null && 'value' in parentAnswer
      ? parentAnswer.value
      : String(parentAnswer);

  return question.condition.matchingValues.includes(answerVal);
}

/**
 * Returns the list of active questions that should be presented given current answers.
 */
export function getActiveQuestions(
  currentAnswers: Record<string, any>
): InterviewQuestionConfig[] {
  return INTERVIEW_QUESTIONS.filter(q => isQuestionVisible(q, currentAnswers));
}

/**
 * Prunes answers to questions whose conditional visibility prerequisites
 * are no longer satisfied due to upstream answer changes.
 * Iteratively runs until a stable state is achieved.
 */
export function pruneInapplicableAnswers<T = any>(
  answers: Record<string, T>
): Record<string, T> {
  const pruned: Record<string, T> = { ...answers };
  let changed = true;

  while (changed) {
    changed = false;
    for (const question of INTERVIEW_QUESTIONS) {
      if (pruned[question.id] !== undefined) {
        if (!isQuestionVisible(question, pruned)) {
          delete pruned[question.id];
          changed = true;
        }
      }
    }
  }

  return pruned;
}

