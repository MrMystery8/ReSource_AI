import type { ProjectIdea, ExpertiseLevel } from '@resource-ai/shared';
import { EXPERTISE_LEVEL_ORDER, IDEA_SKILL_TO_EXPERTISE } from '@resource-ai/shared';

/**
 * Filters an array of ProjectIdea to only include ideas whose required skill level
 * does not exceed the user's stated expertise level.
 *
 * Skill level ordering: Beginner (1) < Intermediate (2) < Expert (3)
 * SkillLevel mapping: Beginner→Beginner, Intermediate→Intermediate, Advanced→Expert, Professional→Expert
 *
 * @param ideas - Array of project ideas to filter
 * @param userExpertise - The user's expertise level; defaults to 'Beginner' if undefined
 * @returns Filtered array containing only ideas the user can realistically attempt
 */
export function filterIdeasByExpertise(
  ideas: ProjectIdea[],
  userExpertise: ExpertiseLevel | undefined
): ProjectIdea[] {
  const effectiveExpertise: ExpertiseLevel = userExpertise ?? 'Beginner';
  const userLevel = EXPERTISE_LEVEL_ORDER[effectiveExpertise];

  return ideas.filter((idea) => {
    const mappedExpertise = IDEA_SKILL_TO_EXPERTISE[idea.skillLevel];
    const ideaLevel = EXPERTISE_LEVEL_ORDER[mappedExpertise];
    return ideaLevel <= userLevel;
  });
}
