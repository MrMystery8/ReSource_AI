import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  MAX_FILE_SIZE_BYTES,
  ALLOWED_CONTENT_TYPES,
  PRESIGNED_URL_EXPIRY_SECONDS,
} from '@resource-ai/shared';

/**
 * FileStore — S3 access layer for file upload, retrieval, and pre-signed URL generation.
 *
 * Storage layout:
 *   uploads/{sessionId}/{fileId}.{ext}       — user-uploaded device evidence
 *   generated/{sessionId}/concept-visual.png — AI-generated concept image
 */
export class FileStore {
  private readonly s3: S3Client;
  private readonly bucketName: string;

  constructor(s3Client?: S3Client) {
    this.s3 = s3Client ?? new S3Client({});
    const bucket = process.env.BUCKET_NAME;
    if (!bucket) {
      throw new Error('BUCKET_NAME environment variable is not set');
    }
    this.bucketName = bucket;
  }

  /**
   * Upload a user-provided file to S3 after validating size and content type.
   *
   * @returns The S3 key where the file was stored
   * @throws Error if file exceeds MAX_FILE_SIZE_BYTES (10 MB)
   * @throws Error if contentType is not in ALLOWED_CONTENT_TYPES
   */
  async uploadFile(
    sessionId: string,
    fileId: string,
    body: Buffer,
    contentType: string,
    extension: string,
  ): Promise<string> {
    // Validate file size
    if (body.length > MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `File size ${body.length} bytes exceeds maximum allowed size of ${MAX_FILE_SIZE_BYTES} bytes (10 MB)`,
      );
    }

    // Validate content type
    if (!ALLOWED_CONTENT_TYPES.includes(contentType as any)) {
      throw new Error(
        `Unsupported content type "${contentType}". Allowed types: ${ALLOWED_CONTENT_TYPES.join(', ')}`,
      );
    }

    const key = `uploads/${sessionId}/${fileId}.${extension}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );

    return key;
  }

  /**
   * Generate a pre-signed GET URL for an S3 object with 1-hour expiry.
   */
  async getFileUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return getSignedUrl(this.s3, command, {
      expiresIn: PRESIGNED_URL_EXPIRY_SECONDS,
    });
  }

  /**
   * Store a generated concept image in S3 and return the S3 key.
   *
   * The image is stored at: generated/{sessionId}/concept-visual.png
   */
  async storeGeneratedImage(
    sessionId: string,
    imageBuffer: Buffer,
  ): Promise<string> {
    const key = `generated/${sessionId}/concept-visual.png`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: imageBuffer,
        ContentType: 'image/png',
      }),
    );

    return key;
  }
}
