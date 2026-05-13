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

const DEFAULT_TEXT_MODEL = 'us.anthropic.claude-sonnet-4-5-20251101-v1:0';
const DEFAULT_IMAGE_MODEL = 'amazon.titan-image-generator-v1';

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
      anthropic_version: 'bedrock-2023-05-31',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4096,
      top_p: 0.9,
      temperature: 0.7,
    });

    const responseBody = await this.invokeWithRetry(modelId, body);
    const parsed = JSON.parse(responseBody);

    // Anthropic Messages API response format: { content: [{ type: "text", text: "..." }] }
    const textContent = parsed.content?.[0]?.text;
    if (typeof textContent !== 'string') {
      throw new Error('Unexpected text model response format');
    }
    return textContent;
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
