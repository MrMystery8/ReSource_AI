import { PROJECT_GRADE_POINTS } from '@resource-ai/shared';

/**
 * Converts a project grade to the corresponding points value.
 *
 * @param grade - A grade string; must be one of: A, B, C, D, F
 * @returns The points awarded for the given grade
 * @throws Error if the grade is not a valid value in {A, B, C, D, F}
 */
export function gradeToPoints(grade: string): number {
  if (!(grade in PROJECT_GRADE_POINTS)) {
    throw new Error(
      `Invalid grade "${grade}". Expected one of: ${Object.keys(PROJECT_GRADE_POINTS).join(', ')}`
    );
  }
  return PROJECT_GRADE_POINTS[grade];
}
