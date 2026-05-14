import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  ThrottlingException,
  ServiceUnavailableException,
} from '@aws-sdk/client-bedrock-runtime';
import {
  BEDROCK_REQUEST_TIMEOUT_MS,
  BEDROCK_RETRY_DELAY_MS,
} from '@resource-ai/shared';

// Amazon Nova Pro via APAC cross-region inference profile
const DEFAULT_TEXT_MODEL = 'apac.amazon.nova-pro-v1:0';
const DEFAULT_IMAGE_MODEL = 'amazon.titan-image-generator-v1';

/**
 * Convert a MIME type to the format string expected by Nova's image content block.
 */
function mediaTypeToFormat(mediaType: string): string {
  switch (mediaType) {
    case 'image/jpeg': return 'jpeg';
    case 'image/png': return 'png';
    case 'image/webp': return 'webp';
    case 'image/gif': return 'gif';
    default: return 'jpeg';
  }
}

function isTransientError(error: unknown): boolean {
  return (
    error instanceof ThrottlingException ||
    error instanceof ServiceUnavailableException
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class BedrockClient {
  private readonly client: BedrockRuntimeClient;

  constructor(region?: string) {
    this.client = new BedrockRuntimeClient({
      region: region ?? process.env.AWS_REGION ?? 'us-east-1',
      requestHandler: {
        requestTimeout: BEDROCK_REQUEST_TIMEOUT_MS,
      } as any,
    });
  }

  /**
   * Invoke a text generation model (Amazon Nova Pro) and return the text response.
   */
  async invokeTextModel(
    prompt: string,
    modelId: string = DEFAULT_TEXT_MODEL
  ): Promise<string> {
    const body = JSON.stringify({
      schemaVersion: 'messages-v1',
      messages: [{ role: 'user', content: [{ text: prompt }] }],
      inferenceConfig: {
        maxTokens: 4096,
        topP: 0.9,
        temperature: 0.7,
      },
    });

    const responseBody = await this.invokeWithRetry(modelId, body);
    const parsed = JSON.parse(responseBody);

    // Nova response format: { output: { message: { content: [{ text: "..." }] } } }
    const textContent = parsed.output?.message?.content?.[0]?.text;
    if (typeof textContent !== 'string') {
      throw new Error('Unexpected text model response format');
    }
    return textContent;
  }

  /**
   * Invoke a text generation model with multimodal content (text + images).
   * Images are passed as base64-encoded inline content alongside the text prompt.
   *
   * @param prompt - The text prompt
   * @param images - Array of { bytes, mediaType } for each image to include
   * @param modelId - The model to invoke (defaults to Nova Pro)
   */
  async invokeMultimodalModel(
    prompt: string,
    images: Array<{ bytes: Buffer; mediaType: string }>,
    modelId: string = DEFAULT_TEXT_MODEL
  ): Promise<string> {
    // Build content array: images first, then text prompt
    const content: Array<Record<string, unknown>> = [];

    for (const image of images) {
      content.push({
        image: {
          format: mediaTypeToFormat(image.mediaType),
          source: {
            bytes: image.bytes.toString('base64'),
          },
        },
      });
    }

    content.push({ text: prompt });

    const body = JSON.stringify({
      schemaVersion: 'messages-v1',
      messages: [{ role: 'user', content }],
      inferenceConfig: {
        maxTokens: 4096,
        topP: 0.9,
        temperature: 0.7,
      },
    });

    const responseBody = await this.invokeWithRetry(modelId, body);
    const parsed = JSON.parse(responseBody);

    const textContent = parsed.output?.message?.content?.[0]?.text;
    if (typeof textContent !== 'string') {
      throw new Error('Unexpected multimodal model response format');
    }
    return textContent;
  }

  /**
   * Alias for invokeTextModel — kept for backward compatibility with
   * gamification handlers that call invokeClaudeModel explicitly.
   */
  async invokeClaudeModel(
    prompt: string,
    modelId: string = DEFAULT_TEXT_MODEL
  ): Promise<string> {
    return this.invokeTextModel(prompt, modelId);
  }

  /**
   * Invoke an image generation model (Titan Image) and return the image bytes.
   */
  async invokeImageModel(
    prompt: string,
    modelId: string = DEFAULT_IMAGE_MODEL
  ): Promise<Buffer> {
    const body = JSON.stringify({
      taskType: 'TEXT_IMAGE',
      textToImageParams: { text: prompt },
      imageGenerationConfig: {
        numberOfImages: 1,
        width: 1024,
        height: 1024,
      },
    });

    const responseBody = await this.invokeWithRetry(modelId, body);
    const parsed = JSON.parse(responseBody);

    // Titan Image response format: { images: ["base64-encoded-string"] }
    const base64Image = parsed.images?.[0];
    if (typeof base64Image !== 'string') {
      throw new Error('Unexpected image model response format');
    }
    return Buffer.from(base64Image, 'base64');
  }

  /**
   * Invoke Bedrock InvokeModel with retry logic:
   * retry once after BEDROCK_RETRY_DELAY_MS on transient errors.
   */
  private async invokeWithRetry(
    modelId: string,
    body: string
  ): Promise<string> {
    try {
      return await this.invoke(modelId, body);
    } catch (error: unknown) {
      if (isTransientError(error)) {
        await delay(BEDROCK_RETRY_DELAY_MS);
        return await this.invoke(modelId, body);
      }
      throw error;
    }
  }

  private async invoke(modelId: string, body: string): Promise<string> {
    const command = new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: new TextEncoder().encode(body),
    });

    const response = await this.client.send(command);

    if (!response.body) {
      throw new Error('Empty response from Bedrock');
    }

    return new TextDecoder().decode(response.body);
  }
}
