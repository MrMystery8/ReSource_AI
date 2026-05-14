import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  MAX_FILE_SIZE_BYTES,
  ALLOWED_CONTENT_TYPES,
  PRESIGNED_URL_EXPIRY_SECONDS,
} from '@resource-ai/shared';

/**
 * Represents a fetched image with its bytes and media type.
 */
export interface FetchedImage {
  bytes: Buffer;
  mediaType: string;
}

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

  /**
   * Fetch an image from S3 by its full key. Returns the raw bytes and content type.
   */
  async fetchFile(key: string): Promise<FetchedImage> {
    const result = await this.s3.send(
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }),
    );

    const bytes = Buffer.from(await result.Body!.transformToByteArray());
    const mediaType = result.ContentType ?? 'application/octet-stream';

    return { bytes, mediaType };
  }

  /**
   * Resolve fileIds to their full S3 keys by listing objects with the fileId prefix.
   * Files are stored as uploads/{sessionId}/{fileId}.{ext} — but the sessionId at upload
   * time may be 'unassociated' if uploaded before session creation.
   *
   * This method searches both the session-specific prefix and the 'unassociated' prefix.
   */
  async resolveFileKeys(fileIds: string[], sessionId?: string): Promise<string[]> {
    const keys: string[] = [];

    for (const fileId of fileIds) {
      // Try session-specific path first, then unassociated
      const prefixes = sessionId
        ? [`uploads/${sessionId}/${fileId}`, `uploads/unassociated/${fileId}`]
        : [`uploads/unassociated/${fileId}`];

      let found = false;
      for (const prefix of prefixes) {
        const result = await this.s3.send(
          new ListObjectsV2Command({
            Bucket: this.bucketName,
            Prefix: prefix,
            MaxKeys: 1,
          }),
        );

        if (result.Contents && result.Contents.length > 0) {
          keys.push(result.Contents[0].Key!);
          found = true;
          break;
        }
      }

      if (!found) {
        console.warn(`[FileStore] Could not resolve fileId "${fileId}" to an S3 key`);
      }
    }

    return keys;
  }

  /**
   * Fetch multiple images from S3 by fileIds. Only returns image files (jpeg, png, webp, gif).
   * Non-image files are skipped.
   */
  async fetchImages(fileIds: string[], sessionId?: string): Promise<FetchedImage[]> {
    const keys = await this.resolveFileKeys(fileIds, sessionId);
    const images: FetchedImage[] = [];

    for (const key of keys) {
      try {
        const file = await this.fetchFile(key);
        // Only include image types
        if (file.mediaType.startsWith('image/')) {
          images.push(file);
        }
      } catch (err) {
        console.warn(`[FileStore] Failed to fetch file "${key}":`, err);
      }
    }

    return images;
  }
}
