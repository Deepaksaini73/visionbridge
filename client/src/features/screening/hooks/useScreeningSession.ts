import { useState, useCallback } from 'react';
import {
  ScreeningModuleId,
  ScreeningSessionRecord,
  DeviceCalibrationState,
} from '../types/screening';
import { screeningApi } from '../services/screeningApi';
import { offlineDb } from '@/offline/db';

export type ScreeningWorkflowStage = 
  | 'DASHBOARD' 
  | 'CALIBRATION' 
  | 'INSTRUCTIONS' 
  | 'TESTING' 
  | 'SUMMARY';

export function useScreeningSession(customerId: string, customerCode?: string) {
  const [stage, setStage] = useState<ScreeningWorkflowStage>('DASHBOARD');
  const [selectedModules, setSelectedModules] = useState<ScreeningModuleId[]>([
    'DISTANCE_ACUITY',
    'NEAR_ACUITY',
    'CONTRAST_SENSITIVITY',
    'COLOUR_VISION',
    'AMSLER_GRID',
  ]);
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [session, setSession] = useState<ScreeningSessionRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [calibration, setCalibration] = useState<DeviceCalibrationState>({
    deviceType: 'DESKTOP',
    viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 1920,
    viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 1080,
    devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
    calibrationStatus: 'UNCALIBRATED',
    configuredDistanceMeters: 3.0,
    confirmedDistanceMeters: 3.0,
    ambientLighting: 'CONFIRMED_ADEQUATE',
  });

  const [operatorNotes, setOperatorNotes] = useState('');

  const currentModuleId: ScreeningModuleId | undefined = selectedModules[currentModuleIndex];

  // Toggle inclusion of a module
  const toggleModule = useCallback((id: ScreeningModuleId) => {
    setSelectedModules((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter(m => m !== id);
      } else {
        return [...prev, id];
      }
    });
  }, []);

  // Initialize or start session on server
  const startSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await screeningApi.startScreening({
        customerId,
        selectedTests: selectedModules,
      });

      if (res.success && res.data) {
        setSession(res.data);
        setCurrentModuleIndex(0);
        setStage('INSTRUCTIONS');
      } else {
        // Fallback local session if offline or error
        const localSessionId = `SCR-LOCAL-${Date.now().toString().slice(-4)}`;
        const localSession: ScreeningSessionRecord = {
          screeningId: localSessionId,
          customerId,
          customerCode: customerCode || customerId,
          storeId: 'ST-LOCAL',
          conductedBy: { id: 'usr_local', name: 'Store Operator' },
          protocolVersion: 'VB-ACUITY-2026.1',
          selectedTests: selectedModules,
          completedTests: [],
          skippedTests: [],
          calibrationDetails: calibration,
          visualAcuity: {
            rightEye: { tested: false, preliminaryScore: 'Pending', rawLevel: 0, totalTrials: 0, correctTrials: 0, status: 'INCOMPLETE', trials: [] },
            leftEye: { tested: false, preliminaryScore: 'Pending', rawLevel: 0, totalTrials: 0, correctTrials: 0, status: 'INCOMPLETE', trials: [] },
            rightEyeEstimatedScore: 'Pending',
            leftEyeEstimatedScore: 'Pending',
            testQuality: 'GOOD',
            trials: [],
          },
          warningFlags: [],
          hasRedFlags: false,
          testValidity: 'PRELIMINARY_UNCALIBRATED',
          status: 'IN_PROGRESS',
          professionalReviewStatus: 'PENDING_REVIEW',
          disclaimer: 'Preliminary screening tool. Does not diagnose eye conditions.',
          startedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setSession(localSession);
        setCurrentModuleIndex(0);
        setStage('INSTRUCTIONS');
      }
    } catch (err) {
      console.error('Failed to start screening session:', err);
      setError('Network communication failed. Operating in offline resilient mode.');
    } finally {
      setIsLoading(false);
    }
  }, [customerId, customerCode, selectedModules, calibration]);

  // Handle module completion
  const handleModuleComplete = useCallback(async (moduleResult: any) => {
    if (!session || !currentModuleId) return;

    const updatedCompleted = Array.from(new Set([...session.completedTests, currentModuleId]));
    const updatedSession = { ...session, completedTests: updatedCompleted };

    if (currentModuleId === 'DISTANCE_ACUITY') {
      updatedSession.visualAcuity = {
        ...updatedSession.visualAcuity,
        rightEye: moduleResult.rightEye,
        leftEye: moduleResult.leftEye,
        rightEyeEstimatedScore: moduleResult.rightEye.snellenEquivalent || 'Pending',
        leftEyeEstimatedScore: moduleResult.leftEye.snellenEquivalent || 'Pending',
        trials: moduleResult.trials,
      };
    } else if (currentModuleId === 'NEAR_ACUITY') {
      updatedSession.nearAcuity = moduleResult;
    } else if (currentModuleId === 'CONTRAST_SENSITIVITY') {
      updatedSession.contrastSensitivity = moduleResult;
    } else if (currentModuleId === 'COLOUR_VISION') {
      updatedSession.colourVision = moduleResult;
    } else if (currentModuleId === 'AMSLER_GRID') {
      updatedSession.amslerAssessment = moduleResult;
    }

    setSession(updatedSession);

    // Save intermediate progress to server and local DB
    try {
      if (session.screeningId && !session.screeningId.startsWith('SCR-LOCAL')) {
        screeningApi.saveProgress(session.screeningId, {
          calibrationDetails: calibration,
          completedTests: updatedCompleted,
          nearAcuity: updatedSession.nearAcuity,
          contrastSensitivity: updatedSession.contrastSensitivity,
          colourVision: updatedSession.colourVision,
          amslerAssessment: updatedSession.amslerAssessment,
        }).catch(() => {});
      }
    } catch {
      // Offline fallback silent
    }

    // Check if more selected tests remain
    if (currentModuleIndex < selectedModules.length - 1) {
      setCurrentModuleIndex(prev => prev + 1);
      setStage('INSTRUCTIONS');
    } else {
      setStage('SUMMARY');
    }
  }, [session, currentModuleId, currentModuleIndex, selectedModules, calibration]);

  // Skip current module
  const skipCurrentModule = useCallback(() => {
    if (!session || !currentModuleId) return;

    const updatedSkipped = Array.from(new Set([...session.skippedTests, currentModuleId]));
    setSession({ ...session, skippedTests: updatedSkipped });

    if (currentModuleIndex < selectedModules.length - 1) {
      setCurrentModuleIndex(prev => prev + 1);
      setStage('INSTRUCTIONS');
    } else {
      setStage('SUMMARY');
    }
  }, [session, currentModuleId, currentModuleIndex, selectedModules]);

  // Finalize screening session
  const finalizeSession = useCallback(async (isIncomplete = false, reason?: string) => {
    if (!session) return;
    setIsLoading(true);

    try {
      const payload = {
        calibrationDetails: calibration,
        selectedTests: session.selectedTests,
        completedTests: session.completedTests,
        skippedTests: session.skippedTests,
        trials: session.visualAcuity?.trials || [],
        nearAcuity: session.nearAcuity,
        contrastSensitivity: session.contrastSensitivity,
        colourVision: session.colourVision,
        amslerAssessment: session.amslerAssessment,
        operatorObservations: operatorNotes,
        testQuality: session.visualAcuity?.testQuality || 'GOOD',
        isIncomplete,
        incompleteReason: reason,
      };

      const res = await screeningApi.completeScreening(session.screeningId, payload);
      if (res.success && res.data) {
        setSession(res.data);
      }

      // Record to Dexie offline DB
      try {
        await offlineDb.screenings.add({
          customerId: session.customerId,
          clientUuid: `scr_${Date.now()}`,
          rightEyeAcuity: session.visualAcuity?.rightEye?.snellenEquivalent || 'N/A',
          leftEyeAcuity: session.visualAcuity?.leftEye?.snellenEquivalent || 'N/A',
          amslerDistorted: session.amslerAssessment?.rightEye?.status !== 'NO_DISTORTION',
          warningFlags: session.warningFlags || [],
          syncStatus: res.success ? 'SYNCED' : 'PENDING',
          completedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Dexie write notice:', err);
      }

      return res;
    } catch (err) {
      console.error('Finalize session failed:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [session, calibration, operatorNotes]);

  return {
    stage,
    setStage,
    selectedModules,
    toggleModule,
    currentModuleIndex,
    currentModuleId,
    session,
    setSession,
    calibration,
    setCalibration,
    operatorNotes,
    setOperatorNotes,
    isLoading,
    error,
    startSession,
    handleModuleComplete,
    skipCurrentModule,
    finalizeSession,
  };
}
