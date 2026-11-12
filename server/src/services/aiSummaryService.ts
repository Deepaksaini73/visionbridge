import { IInterviewAnswer, IInterviewWarningFlag, IStructuredSummary } from '../models/Interview.js';

/**
 * Deterministic rule-based summary generator.
 * Produces a clinical-grade factual intake note without hallucination or external dependencies.
 */
export function generateDeterministicSummary(
  answers: IInterviewAnswer[],
  warningFlags: IInterviewWarningFlag[]
): IStructuredSummary {
  const answerMap: Record<string, IInterviewAnswer> = {};
  for (const a of answers) {
    answerMap[a.questionId] = a;
  }

  const reportedDifficulties: string[] = [];
  const nearVisionConcerns: string[] = [];
  const distanceVisionConcerns: string[] = [];
  const warningSymptoms: string[] = [];
  let spectacleHistory = 'Never worn spectacles';
  let duration = 'Not specified';

  // Section A: Distance & Near
  const dist = answerMap['q_dist'];
  if (dist && dist.answerValue !== 'NONE') {
    distanceVisionConcerns.push(`Distance Vision: ${dist.answerLabel}`);
    reportedDifficulties.push(`Distance blur (${dist.answerLabel})`);
  }

  const near = answerMap['q_near'];
  if (near && near.answerValue !== 'NONE') {
    nearVisionConcerns.push(`Near Vision: ${near.answerLabel}`);
    reportedDifficulties.push(`Near difficulty (${near.answerLabel})`);
  }

  const blur = answerMap['q_blur'];
  if (blur && blur.answerValue !== 'NEVER') {
    reportedDifficulties.push(`Blur frequency: ${blur.answerLabel}`);
  }

  const affectedEye = answerMap['q_eye_affected'];
  if (affectedEye) {
    reportedDifficulties.push(`Affected: ${affectedEye.answerLabel}`);
  }

  const durAns = answerMap['q_duration'];
  if (durAns) {
    duration = durAns.answerLabel;
  }

  // Section B: Daily activities
  const reading = answerMap['q_reading'];
  if (reading && reading.answerValue !== 'NO') {
    nearVisionConcerns.push(`Reading: ${reading.answerLabel}`);
  }

  const phone = answerMap['q_phone'];
  if (phone && phone.answerValue !== 'COMFORTABLE') {
    nearVisionConcerns.push(`Phone usage: ${phone.answerLabel}`);
  }

  const faces = answerMap['q_faces'];
  if (faces && faces.answerValue !== 'NO') {
    distanceVisionConcerns.push(`Recognizing faces: ${faces.answerLabel}`);
  }

  const boards = answerMap['q_boards'];
  if (boards && boards.answerValue !== 'NO') {
    distanceVisionConcerns.push(`Street signs / boards: ${boards.answerLabel}`);
  }

  // Section C: Spectacles
  const spec = answerMap['q_spectacles'];
  if (spec) {
    if (spec.answerValue === 'CURRENT_USER') {
      const age = answerMap['q_glasses_age']?.answerLabel || 'Duration unspecified';
      const type = answerMap['q_glasses_type']?.answerLabel || 'Standard';
      spectacleHistory = `Current wearer (${type}, made: ${age})`;
    } else if (spec.answerValue === 'PAST_USER') {
      spectacleHistory = 'Previous glasses wearer, currently discontinued';
    } else {
      spectacleHistory = 'Never prescribed or worn spectacles';
    }
  }

  // Section D: Warnings
  for (const flag of warningFlags) {
    warningSymptoms.push(`${flag.severity}: ${flag.descriptionEn}`);
  }

  // Build concise narrative snippet
  const parts: string[] = [];
  if (reportedDifficulties.length > 0) {
    parts.push(`Customer reports ${reportedDifficulties.join(', ')}.`);
  } else {
    parts.push('No significant vision difficulties reported on basic checks.');
  }

  if (duration !== 'Not specified') {
    parts.push(`Symptoms present for approximately ${duration}.`);
  }

  parts.push(`Spectacle status: ${spectacleHistory}.`);

  if (warningSymptoms.length > 0) {
    parts.push(`ALERT: ${warningSymptoms.join('; ')}.`);
  } else {
    parts.push('No acute warning symptoms (severe pain, sudden loss, photopsia) reported.');
  }

  const aiSummarySnippet = parts.join(' ');

  return {
    reportedDifficulties,
    nearVisionConcerns,
    distanceVisionConcerns,
    spectacleHistory,
    duration,
    warningSymptoms,
    aiSummarySnippet,
    isAiGenerated: false,
    generatedAt: new Date(),
  };
}

/**
 * Generates an objective AI summary via Gemini if API key is provided,
 * otherwise transparently falls back to deterministic rule-based summary.
 */
export async function generateAiSummary(
  answers: IInterviewAnswer[],
  warningFlags: IInterviewWarningFlag[],
  customerName: string
): Promise<IStructuredSummary> {
  const deterministic = generateDeterministicSummary(answers, warningFlags);
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (!geminiApiKey || geminiApiKey === 'your_gemini_api_key_here') {
    return deterministic;
  }

  try {
    const prompt = `You are a clinical transcription assistant for the VisionBridge tele-optometry platform.
Summarize the following customer-reported vision interview for an optometrist's review.

Customer Name: ${customerName}
Reported Responses:
${JSON.stringify(answers.map(a => ({ question: a.questionText, answer: a.answerLabel })), null, 2)}

Warning Flags:
${JSON.stringify(warningFlags, null, 2)}

Strict Clinical Guidelines:
1. Provide a 2-3 sentence neutral, factual summary of reported symptoms only.
2. DO NOT make any clinical diagnosis (e.g. do not diagnose cataract, presbyopia, glaucoma, macular degeneration).
3. DO NOT recommend specific diopter spectacle lens powers or medications.
4. If warning flags exist (such as sudden vision loss or severe pain), explicitly mention them and state "Immediate in-person professional evaluation recommended."
5. Output ONLY the summary paragraph text, nothing else.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 250,
          },
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (response.ok) {
      const data = (await response.json()) as any;
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (text && text.length > 20) {
        return {
          ...deterministic,
          aiSummarySnippet: text,
          isAiGenerated: true,
          generatedAt: new Date(),
        };
      }
    }
  } catch (err) {
    console.warn('[AiSummaryService] Gemini API call skipped or timed out, using deterministic summary fallback:', err);
  }

  return deterministic;
}
