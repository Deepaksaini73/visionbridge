import mongoose, { Schema, Document } from 'mongoose';

export interface IInterviewAnswer {
  questionId: string;
  sectionId?: string;
  questionText: string;
  category: string;
  answerValue: string;
  answerLabel: string;
  answerType?: 'CHOICE' | 'TEXT';
  language?: 'en' | 'hi';
  inputMethod?: 'VOICE' | 'TEXT' | 'OPTION_CLICK';
  voiceTranscript?: string;
  isRedFlag: boolean;
  answeredAt: Date;
}

export interface IInterviewWarningFlag {
  flagType: string;
  questionId: string;
  severity: 'URGENT' | 'WARNING';
  descriptionEn: string;
  descriptionHi: string;
}

export interface IStructuredSummary {
  reportedDifficulties: string[];
  nearVisionConcerns: string[];
  distanceVisionConcerns: string[];
  spectacleHistory: string;
  duration: string;
  warningSymptoms: string[];
  skippedQuestions?: string[];
  aiSummarySnippet?: string;
  isAiGenerated?: boolean;
  generatedAt?: Date;
}

export interface IInterview extends Document {
  interviewId: string;
  customerId: string;
  customerCode: string;
  clientUuid: string;
  storeId: string;
  conductedBy?: {
    id: string;
    name: string;
  };
  language: 'hi' | 'en';
  status: 'IN_PROGRESS' | 'COMPLETED';
  completedSections: string[];
  hasRedFlags: boolean;
  redFlagReason?: string;
  warningFlags: IInterviewWarningFlag[];
  answers: IInterviewAnswer[];
  responses: IInterviewAnswer[]; // Alias for backwards compatibility
  summary?: IStructuredSummary;
  startedAt: Date;
  completedAt?: Date;
  durationSeconds?: number;
  createdAt: Date;
  updatedAt: Date;
}

const InterviewAnswerSchema = new Schema<IInterviewAnswer>(
  {
    questionId: { type: String, required: true },
    sectionId: { type: String },
    questionText: { type: String, required: true },
    category: { type: String, required: true },
    answerValue: { type: String, required: true },
    answerLabel: { type: String, required: true },
    answerType: { type: String, enum: ['CHOICE', 'TEXT'], default: 'CHOICE' },
    language: { type: String, enum: ['en', 'hi'], default: 'hi' },
    inputMethod: { type: String, enum: ['VOICE', 'TEXT', 'OPTION_CLICK'], default: 'OPTION_CLICK' },
    voiceTranscript: { type: String },
    isRedFlag: { type: Boolean, default: false },
    answeredAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const InterviewWarningFlagSchema = new Schema<IInterviewWarningFlag>(
  {
    flagType: { type: String, required: true },
    questionId: { type: String, required: true },
    severity: { type: String, enum: ['URGENT', 'WARNING'], default: 'WARNING' },
    descriptionEn: { type: String, required: true },
    descriptionHi: { type: String, required: true },
  },
  { _id: false }
);

const StructuredSummarySchema = new Schema<IStructuredSummary>(
  {
    reportedDifficulties: [{ type: String }],
    nearVisionConcerns: [{ type: String }],
    distanceVisionConcerns: [{ type: String }],
    spectacleHistory: { type: String },
    duration: { type: String },
    warningSymptoms: [{ type: String }],
    skippedQuestions: [{ type: String }],
    aiSummarySnippet: { type: String },
    isAiGenerated: { type: Boolean, default: false },
    generatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const InterviewSchema = new Schema<IInterview>(
  {
    interviewId: { type: String, required: true, unique: true, index: true },
    customerId: { type: String, required: true, index: true },
    customerCode: { type: String, required: true, index: true },
    clientUuid: { type: String, required: true, index: true },
    storeId: { type: String, required: true, index: true },
    conductedBy: {
      id: { type: String },
      name: { type: String },
    },
    language: { type: String, enum: ['hi', 'en'], default: 'hi', required: true },
    status: { type: String, enum: ['IN_PROGRESS', 'COMPLETED'], default: 'IN_PROGRESS', index: true },
    completedSections: [{ type: String }],
    hasRedFlags: { type: Boolean, default: false, index: true },
    redFlagReason: { type: String },
    warningFlags: [InterviewWarningFlagSchema],
    answers: [InterviewAnswerSchema],
    responses: [InterviewAnswerSchema],
    summary: StructuredSummarySchema,
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    durationSeconds: { type: Number },
  },
  { timestamps: true }
);

// Keep answers and responses synchronized
InterviewSchema.pre('validate', function (next) {
  if (this.answers && (!this.responses || this.responses.length === 0)) {
    this.responses = this.answers;
  } else if (this.responses && (!this.answers || this.answers.length === 0)) {
    this.answers = this.responses;
  }
  next();
});

// Index for store-level queries
InterviewSchema.index({ storeId: 1, customerId: 1, status: 1 });

export const Interview = mongoose.model<IInterview>('Interview', InterviewSchema);
