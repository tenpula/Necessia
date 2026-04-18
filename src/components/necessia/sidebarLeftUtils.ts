import { AnalysisProgress } from '@/types/paper';

export const DELAY_PRESETS = [
  { label: 'Fast', value: 10 },
  { label: 'Normal', value: 50 },
  { label: 'Slow', value: 100 },
  { label: 'Very Slow', value: 200 },
  { label: 'Ultra Slow', value: 500 },
] as const;

export const AVERAGE_API_PROCESSING_TIME_MS = 2000;

export function getDelayFromSlider(value: number): number {
  return DELAY_PRESETS[value]?.value ?? DELAY_PRESETS[1].value;
}

export function getSliderFromDelay(delay: number): number {
  const index = DELAY_PRESETS.findIndex((preset) => preset.value === delay);
  return index >= 0 ? index : 1;
}

export function calculateActualRPM(
  delayMs: number,
  apiProcessingTimeMs: number = AVERAGE_API_PROCESSING_TIME_MS
): number {
  const totalTimePerRequest = apiProcessingTimeMs + delayMs;
  return Math.round(60000 / totalTimePerRequest);
}

export function calculateTheoreticalMaxRPM(delayMs: number): number {
  return Math.round(60000 / delayMs);
}

export function estimateAnalysisTime(citationsToAnalyze: number, requestDelay: number) {
  const estimatedTimeSeconds =
    citationsToAnalyze > 0
      ? Math.round((citationsToAnalyze * (AVERAGE_API_PROCESSING_TIME_MS + requestDelay)) / 1000)
      : 0;

  return {
    estimatedTimeSeconds,
    estimatedTimeMinutes: Math.floor(estimatedTimeSeconds / 60),
    estimatedTimeSecondsRemainder: estimatedTimeSeconds % 60,
  };
}

export function isAnalysisIdle(analysisProgress?: AnalysisProgress): boolean {
  return !analysisProgress || analysisProgress.status === 'idle';
}

