import {
  IdeaCategory,
  ProjectIdea,
  RiskLevel,
  SecondLifeIdeasOutput,
  MAX_SECOND_LIFE_IDEA_WORDS,
  SECOND_LIFE_IDEAS_COUNT,
} from '@resource-ai/shared';

/**
 * Valid idea categories for Second Life Ideas.
 */
const VALID_IDEA_CATEGORIES: readonly IdeaCategory[] = [
  'beginner',
  'stem-learning',
  'practical-creative',
];

/**
 * Prompt template for the Safe Second Life Ideas stage.
 *
 * This is used by the PromptBuilder to construct the full prompt.
 * The stage generates exactly 3 creative project ideas for reusing device components.
 */
export const SECOND_LIFE_IDEAS_PROMPT_TEMPLATE = `You are a creative sustainability educator specializing in e-waste upcycling projects. Generate exactly ${SECOND_LIFE_IDEAS_COUNT} project ideas for giving this device's components a second life.

Each idea MUST be categorized as exactly one of: beginner, stem-learning, or practical-creative.

For each idea, provide:
- category: one of "beginner", "stem-learning", or "practical-creative"
- title: a short, descriptive project title
- description: a brief description of the project (MAXIMUM ${MAX_SECOND_LIFE_IDEA_WORDS} words)
- skillLevel: one of "Beginner", "Intermediate", "Advanced", or "Professional" — this MUST reflect the actual difficulty and MUST NOT exceed the user's stated expertise level
- requiredComponents: an array of component names from the device needed for this project
- additionalMaterials: an array of additional materials or tools needed beyond the device components

RISK LEVEL CONSTRAINTS:
- If Risk_Level is Red: ONLY suggest projects using components that are externally accessible WITHOUT opening or disassembling the device. Do NOT reference any internal components.
- If Risk_Level is Orange: Projects involving internal components MUST note supervised handling requirements.
- If Risk_Level is Green or Yellow: Projects may reference both internal and external components.

SKILL LEVEL CONSTRAINTS:
- All projects MUST be achievable within the user's stated skill level and available tools.
- The skillLevel field for EVERY idea MUST NOT exceed the user's stated expertise level.
- If no skill level is stated in the user context, default to beginner-level projects requiring only basic household tools.

COMPONENT CONSTRAINTS:
- You MUST only reference components that were identified in the Detailed Resource Analysis component profile.
- Do NOT invent or reference components that are not in the component profile.

Return the result as JSON with an "ideas" array containing exactly ${SECOND_LIFE_IDEAS_COUNT} idea objects.`;

/**
 * Counts the number of words in a string.
 * Words are separated by whitespace.
 */
function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed === '') return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Truncates a string to a maximum number of words.
 * If the string exceeds the limit, it is cut at the word boundary.
 */
function truncateToMaxWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text.trim();
  return words.slice(0, maxWords).join(' ');
}



/**
 * Validates and processes raw Second Life Ideas output from the LLM.
 *
 * Performs structural validation, category validation, word count enforcement,
 * and applies risk-level constraints:
 * - Validates exactly 3 ideas
 * - Each idea must have valid category, title, description, requiredComponents, additionalMaterials
 * - Truncates descriptions exceeding 90 words
 * - Defaults to beginner if no skill level stated (handled at prompt level)
 *
 * @param raw - The raw parsed JSON from the LLM response
 * @param riskLevel - The Safety Gate risk level for this session
 * @returns A validated SecondLifeIdeasOutput
 * @throws Error if the raw output does not conform to the expected structure
 */
export function validateSecondLifeIdeasOutput(
  raw: unknown,
  riskLevel: RiskLevel,
): SecondLifeIdeasOutput {
  if (raw === null || raw === undefined || typeof raw !== 'object') {
    throw new Error('Second Life Ideas output must be a non-null object');
  }

  const obj = raw as Record<string, unknown>;

  // Validate ideas array exists
  if (!Array.isArray(obj.ideas)) {
    throw new Error('Second Life Ideas output must contain an "ideas" array');
  }

  const ideasArray = obj.ideas;

  // Validate exactly 3 ideas
  if (ideasArray.length !== SECOND_LIFE_IDEAS_COUNT) {
    throw new Error(
      `Second Life Ideas must contain exactly ${SECOND_LIFE_IDEAS_COUNT} ideas. Got: ${ideasArray.length}`,
    );
  }

  // Validate and transform each idea
  const validatedIdeas: ProjectIdea[] = ideasArray.map((idea, index) => {
    return validateAndTransformIdea(idea, index, riskLevel);
  });

  return { ideas: validatedIdeas };
}

/**
 * Validates a single project idea and applies constraints.
 *
 * @param idea - The raw idea object
 * @param index - The idea index (for error messages)
 * @param riskLevel - The Safety Gate risk level
 * @returns A validated ProjectIdea
 * @throws Error if the idea does not conform to the expected structure
 */
function validateAndTransformIdea(
  idea: unknown,
  index: number,
  riskLevel: RiskLevel,
): ProjectIdea {
  if (idea === null || idea === undefined || typeof idea !== 'object') {
    throw new Error(`Idea ${index} must be a non-null object`);
  }

  const i = idea as Record<string, unknown>;

  // Validate category
  if (!VALID_IDEA_CATEGORIES.includes(i.category as IdeaCategory)) {
    throw new Error(
      `Idea ${index}: category must be one of: ${VALID_IDEA_CATEGORIES.join(', ')}. Got: ${String(i.category)}`,
    );
  }

  // Validate title
  if (typeof i.title !== 'string' || i.title.trim() === '') {
    throw new Error(`Idea ${index}: title must be a non-empty string`);
  }

  // Validate description
  if (typeof i.description !== 'string' || i.description.trim() === '') {
    throw new Error(`Idea ${index}: description must be a non-empty string`);
  }

  // Validate skillLevel
  const validSkillLevels = ['Beginner', 'Intermediate', 'Advanced', 'Professional'];
  if (!validSkillLevels.includes(i.skillLevel as string)) {
    // Default to 'Beginner' if not provided or invalid
    i.skillLevel = 'Beginner';
  }  // Validate requiredComponents
  if (!Array.isArray(i.requiredComponents)) {
    throw new Error(`Idea ${index}: requiredComponents must be an array`);
  }
  for (let j = 0; j < i.requiredComponents.length; j++) {
    if (typeof i.requiredComponents[j] !== 'string' || (i.requiredComponents[j] as string).trim() === '') {
      throw new Error(`Idea ${index}: requiredComponents[${j}] must be a non-empty string`);
    }
  }

  // Validate additionalMaterials
  if (!Array.isArray(i.additionalMaterials)) {
    throw new Error(`Idea ${index}: additionalMaterials must be an array`);
  }
  for (let j = 0; j < i.additionalMaterials.length; j++) {
    if (typeof i.additionalMaterials[j] !== 'string' || (i.additionalMaterials[j] as string).trim() === '') {
      throw new Error(`Idea ${index}: additionalMaterials[${j}] must be a non-empty string`);
    }
  }

  // Truncate description to max words if exceeded
  let description = i.description as string;
  if (countWords(description) > MAX_SECOND_LIFE_IDEA_WORDS) {
    description = truncateToMaxWords(description, MAX_SECOND_LIFE_IDEA_WORDS);
  }

  const requiredComponents = (i.requiredComponents as string[]).map((c) => c.trim());
  const additionalMaterials = (i.additionalMaterials as string[]).map((c) => c.trim());

  return {
    category: i.category as IdeaCategory,
    title: (i.title as string).trim(),
    description,
    skillLevel: i.skillLevel as 'Beginner' | 'Intermediate' | 'Advanced' | 'Professional',
    requiredComponents,
    additionalMaterials,
  };
}
