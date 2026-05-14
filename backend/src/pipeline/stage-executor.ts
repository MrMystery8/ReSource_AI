import { PipelineStageConfig, TriageSession } from '@resource-ai/shared';
import { BedrockClient } from '../bedrock-client';
import { FileStore, FetchedImage } from '../file-store';
import { PromptBuilder } from './prompt-builder';

/**
 * StageExecutor — Executes a single pipeline stage by building a prompt,
 * invoking the appropriate Bedrock model, and parsing the response.
 *
 * For text stages: constructs a text prompt, fetches any uploaded images from S3,
 * and invokes the model with multimodal content (text + images) when images are available.
 *
 * For image stages: constructs an image prompt, invokes the image model,
 * stores the generated image via FileStore, and returns the S3 key.
 */
export class StageExecutor {
  private readonly bedrockClient: BedrockClient;
  private readonly promptBuilder: PromptBuilder;
  private readonly fileStore: FileStore;

  constructor(bedrockClient: BedrockClient, promptBuilder: PromptBuilder, fileStore?: FileStore) {
    this.bedrockClient = bedrockClient;
    this.promptBuilder = promptBuilder;
    this.fileStore = fileStore ?? new FileStore();
  }

  /**
   * Execute a single pipeline stage.
   *
   * @param stage - The pipeline stage configuration (key, name, type)
   * @param session - The current triage session with user inputs
   * @param accumulatedOutputs - Outputs from all previously completed stages
   * @returns The parsed stage output (JSON object for text stages, { imageUrl } for image stages)
   */
  async execute(
    stage: PipelineStageConfig,
    session: TriageSession,
    accumulatedOutputs: Record<string, unknown>,
  ): Promise<unknown> {
    if (stage.type === 'image') {
      return this.executeImageStage(session, accumulatedOutputs);
    }

    return this.executeTextStage(stage, session, accumulatedOutputs);
  }

  /**
   * Execute a text generation stage: build prompt, fetch images if available,
   * invoke model (multimodal if images exist), parse JSON response.
   */
  private async executeTextStage(
    stage: PipelineStageConfig,
    session: TriageSession,
    accumulatedOutputs: Record<string, unknown>,
  ): Promise<unknown> {
    const prompt = this.promptBuilder.buildPrompt(stage, session, accumulatedOutputs);

    // Fetch uploaded images from S3 for multimodal analysis
    const images = await this.fetchSessionImages(session);

    let rawResponse: string;
    if (images.length > 0) {
      // Use multimodal invocation — AI can see the device photos
      rawResponse = await this.bedrockClient.invokeMultimodalModel(prompt, images);
    } else {
      // Text-only invocation
      rawResponse = await this.bedrockClient.invokeTextModel(prompt);
    }

    return this.parseJsonResponse(rawResponse);
  }

  /**
   * Execute an image generation stage: build prompt, invoke model, store image, return URL.
   */
  private async executeImageStage(
    session: TriageSession,
    accumulatedOutputs: Record<string, unknown>,
  ): Promise<{ imageUrl: string }> {
    const prompt = this.promptBuilder.buildImagePrompt(session, accumulatedOutputs);
    const imageBuffer = await this.bedrockClient.invokeImageModel(prompt);
    const s3Key = await this.fileStore.storeGeneratedImage(session.sessionId, imageBuffer);
    return { imageUrl: s3Key };
  }

  /**
   * Fetch uploaded images from S3 for the given session.
   * Only fetches image files (skips PDFs, docs, etc.).
   * Returns empty array if no images or if fetching fails.
   */
  private async fetchSessionImages(session: TriageSession): Promise<FetchedImage[]> {
    const fileIds = session.inputs.fileIds;
    if (!fileIds || fileIds.length === 0) {
      return [];
    }

    try {
      return await this.fileStore.fetchImages(fileIds, session.sessionId);
    } catch (err) {
      console.warn('[StageExecutor] Failed to fetch session images, proceeding without them:', err);
      return [];
    }
  }

  /**
   * Parse a raw text response as JSON.
   *
   * Models sometimes wrap JSON in markdown code blocks (```json ... ```).
   * This method attempts direct JSON.parse first, then falls back to
   * extracting JSON from code blocks.
   */
  private parseJsonResponse(raw: string): unknown {
    // First attempt: direct JSON parse
    const trimmed = raw.trim();
    try {
      return JSON.parse(trimmed);
    } catch {
      // Fall through to extraction
    }

    // Second attempt: extract JSON from markdown code blocks
    const extracted = this.extractJsonFromCodeBlock(trimmed);
    if (extracted !== null) {
      try {
        return JSON.parse(extracted);
      } catch {
        // Fall through to final error
      }
    }

    // Third attempt: find first { ... } or [ ... ] in the response
    const jsonMatch = this.extractJsonObject(trimmed);
    if (jsonMatch !== null) {
      try {
        return JSON.parse(jsonMatch);
      } catch {
        // Fall through to final error
      }
    }

    throw new Error(
      `Failed to parse stage response as JSON. Raw response: ${trimmed.substring(0, 200)}`,
    );
  }

  /**
   * Extract JSON content from a markdown code block.
   * Handles ```json ... ``` and ``` ... ``` patterns.
   */
  private extractJsonFromCodeBlock(text: string): string | null {
    const codeBlockRegex = /```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/;
    const match = text.match(codeBlockRegex);
    return match ? match[1].trim() : null;
  }

  /**
   * Extract the first JSON object or array from a string by finding
   * matching braces/brackets.
   */
  private extractJsonObject(text: string): string | null {
    const startIndex = text.search(/[{[]/);
    if (startIndex === -1) return null;

    const openChar = text[startIndex];
    const closeChar = openChar === '{' ? '}' : ']';
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = startIndex; i < text.length; i++) {
      const char = text[i];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\' && inString) {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (char === openChar) {
        depth++;
      } else if (char === closeChar) {
        depth--;
        if (depth === 0) {
          return text.substring(startIndex, i + 1);
        }
      }
    }

    return null;
  }
}
