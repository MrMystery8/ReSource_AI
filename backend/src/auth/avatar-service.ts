import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  ALLOWED_IMAGE_TYPES,
  MAX_AVATAR_FILE_SIZE_BYTES,
  PRESIGNED_URL_EXPIRY_SECONDS,
} from '@resource-ai/shared';
import { v4 as uuidv4 } from 'uuid';

const AVATAR_PREFIX = 'avatars';
const CONTENT_TYPE_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

function normalizeImageContentType(contentType: string | undefined): string | null {
  if (!contentType) return null;
  const normalized = contentType.split(';')[0]?.trim().toLowerCase();
  return ALLOWED_IMAGE_TYPES.includes(normalized as (typeof ALLOWED_IMAGE_TYPES)[number])
    ? normalized
    : null;
}

function getExtension(contentType: string): string {
  return CONTENT_TYPE_TO_EXTENSION[contentType] ?? 'bin';
}

export interface AvatarUploadUrlResult {
  uploadUrl: string;
  avatarKey: string;
  expiresIn: number;
}

export class AvatarService {
  private readonly s3: S3Client;
  private readonly bucketName: string;

  constructor(s3Client?: S3Client) {
    this.s3 = s3Client ?? new S3Client({});
    const bucketName = process.env.BUCKET_NAME;
    if (!bucketName) {
      throw new Error('BUCKET_NAME environment variable is not set');
    }
    this.bucketName = bucketName;
  }

  isSupportedContentType(contentType: string): boolean {
    return normalizeImageContentType(contentType) !== null;
  }

  buildAvatarKey(userId: string, contentType: string): string {
    const normalizedType = normalizeImageContentType(contentType);
    if (!normalizedType) {
      throw new Error('Unsupported avatar content type');
    }

    const extension = getExtension(normalizedType);
    return `${AVATAR_PREFIX}/${userId}/${Date.now()}-${uuidv4()}.${extension}`;
  }

  avatarKeyBelongsToUser(userId: string, avatarKey: string): boolean {
    return avatarKey.startsWith(`${AVATAR_PREFIX}/${userId}/`);
  }

  async createUploadUrl(userId: string, contentType: string): Promise<AvatarUploadUrlResult> {
    const normalizedType = normalizeImageContentType(contentType);
    if (!normalizedType) {
      throw new Error('Unsupported avatar content type');
    }

    const avatarKey = this.buildAvatarKey(userId, normalizedType);
    const uploadUrl = await getSignedUrl(
      this.s3,
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: avatarKey,
        ContentType: normalizedType,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
      { expiresIn: PRESIGNED_URL_EXPIRY_SECONDS }
    );

    return {
      uploadUrl,
      avatarKey,
      expiresIn: PRESIGNED_URL_EXPIRY_SECONDS,
    };
  }

  async avatarExists(avatarKey: string): Promise<boolean> {
    try {
      await this.s3.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: avatarKey,
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  async getAvatarUrl(avatarKey: string): Promise<string> {
    return getSignedUrl(
      this.s3,
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: avatarKey,
      }),
      { expiresIn: PRESIGNED_URL_EXPIRY_SECONDS }
    );
  }

  async importGoogleAvatar(userId: string, sourceUrl: string): Promise<string | undefined> {
    if (!sourceUrl.startsWith('https://') && !sourceUrl.startsWith('http://')) {
      return undefined;
    }

    const response = await fetch(sourceUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        Accept: 'image/*',
      },
    });

    if (!response.ok) {
      return undefined;
    }

    const normalizedType = normalizeImageContentType(response.headers.get('content-type') ?? undefined);
    if (!normalizedType) {
      return undefined;
    }

    const contentLengthHeader = response.headers.get('content-length');
    if (contentLengthHeader) {
      const contentLength = Number.parseInt(contentLengthHeader, 10);
      if (Number.isFinite(contentLength) && contentLength > MAX_AVATAR_FILE_SIZE_BYTES) {
        return undefined;
      }
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length === 0 || bytes.length > MAX_AVATAR_FILE_SIZE_BYTES) {
      return undefined;
    }

    const avatarKey = this.buildAvatarKey(userId, normalizedType);
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: avatarKey,
        Body: bytes,
        ContentType: normalizedType,
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );

    return avatarKey;
  }
}
