import { MAX_INPUT_LENGTH } from '@resource-ai/shared';

// --- HTML Tag Patterns ---
// Matches any HTML tag (opening, closing, self-closing)
const HTML_TAG_PATTERN = /<\/?[a-z][a-z0-9]*\b[^>]*\/?>/gi;

// Matches HTML event handler attributes (e.g., onerror=, onclick=)
const HTML_EVENT_HANDLER_PATTERN = /\bon\w+\s*=\s*["'][^"']*["']/gi;

// --- SQL Injection Patterns ---
const SQL_PATTERNS: RegExp[] = [
  /;\s*--/g,                          // Statement terminator followed by comment
  /--\s*$/gm,                         // Trailing SQL comment
  /\/\*[\s\S]*?\*\//g,               // Block comments
  /\bDROP\s+(TABLE|DATABASE|INDEX|VIEW)\b/gi,
  /\bALTER\s+TABLE\b/gi,
  /\bDELETE\s+FROM\b/gi,
  /\bINSERT\s+INTO\b/gi,
  /\bUNION\s+(ALL\s+)?SELECT\b/gi,
  /\bSELECT\s+.*\s+FROM\b/gi,
  /\bUPDATE\s+\w+\s+SET\b/gi,
  /\bEXEC(UTE)?\s*\(/gi,
  /\bxp_\w+/gi,                       // SQL Server extended procedures
];

// --- Prompt Injection Patterns ---
const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?previous\s+instructions/gi,
  /ignore\s+(all\s+)?prior\s+instructions/gi,
  /ignore\s+(all\s+)?above\s+instructions/gi,
  /disregard\s+(all\s+)?previous\s+instructions/gi,
  /disregard\s+(all\s+)?prior\s+instructions/gi,
  /forget\s+(all\s+)?previous\s+instructions/gi,
  /override\s+(all\s+)?previous\s+instructions/gi,
  /you\s+are\s+now\s+a/gi,
  /act\s+as\s+if\s+you\s+are/gi,
  /pretend\s+you\s+are/gi,
  /new\s+instructions:/gi,
  /\bsystem\s*:/gi,
  /\bassistant\s*:/gi,
  /\buser\s*:/gi,
  /\[INST\]/gi,
  /\[\/INST\]/gi,
  /<<SYS>>/g,
  /<\/SYS>/g,
  /<<\/?SYS>>/g,
  /<\|im_start\|>/gi,
  /<\|im_end\|>/gi,
  /<\|system\|>/gi,
  /<\|user\|>/gi,
  /<\|assistant\|>/gi,
  /###\s*(system|user|assistant)\s*:/gi,
  /\bBEGIN\s+INJECTION\b/gi,
  /\bEND\s+INJECTION\b/gi,
  /\bJAILBREAK\b/gi,
  /\bDAN\s+MODE\b/gi,
];

/**
 * Sanitizes user text input by removing dangerous patterns while preserving
 * semantic content. Handles SQL injection, XSS/HTML, and prompt injection attacks.
 *
 * @param input - The raw user input string to sanitize
 * @returns The sanitized string with dangerous patterns removed or escaped
 */
export function sanitize(input: string): string {
  let result = input;

  // 1. Remove HTML tags entirely
  result = result.replace(HTML_TAG_PATTERN, '');

  // 2. Remove HTML event handler patterns that might survive tag removal
  result = result.replace(HTML_EVENT_HANDLER_PATTERN, '');

  // 3. Remove SQL injection patterns
  for (const pattern of SQL_PATTERNS) {
    result = result.replace(pattern, '');
  }

  // 4. Escape remaining single quotes (SQL metacharacter)
  result = result.replace(/'/g, "\\'");

  // 5. Remove prompt injection patterns
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    result = result.replace(pattern, '');
  }

  // 6. Collapse multiple spaces left by removals into single spaces
  result = result.replace(/  +/g, ' ');

  // 7. Trim leading/trailing whitespace
  result = result.trim();

  return result;
}

/**
 * Validates that the input does not exceed the maximum allowed length.
 * Throws an error if the input exceeds MAX_INPUT_LENGTH (5000 characters).
 *
 * @param input - The user input string to validate
 * @throws Error if input length exceeds MAX_INPUT_LENGTH
 */
export function validateInputLength(input: string): void {
  if (input.length > MAX_INPUT_LENGTH) {
    throw new Error(
      `Input length ${input.length} exceeds maximum allowed length of ${MAX_INPUT_LENGTH} characters`
    );
  }
}
