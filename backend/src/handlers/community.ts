import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { calculateLevel } from '../gamification/gamification-service';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import {
  CommunityPost,
  CommunityComment,
  UserLevel,
  CreateCommunityPostRequest,
  CreateCommunityPostResponse,
  CommunityFeedResponse,
  VoteRequest,
  VoteResponse,
  CreateCommentRequest,
  CreateCommentResponse,
  CommentsListResponse,
  ErrorResponse,
  VoteType,
  COMMUNITY_POINTS,
} from '@resource-ai/shared';
import { UserStore } from '../auth/user-store';
import { AvatarService } from '../auth/avatar-service';
import { resolveAuthenticatedUserId } from '../auth/request-identity';

const COMMUNITY_TABLE_NAME = process.env.COMMUNITY_TABLE_NAME!;
const USERS_TABLE_NAME = process.env.USERS_TABLE_NAME!;
const PROJECTS_TABLE_NAME = process.env.PROJECTS_TABLE_NAME!;
const BUCKET_NAME = process.env.BUCKET_NAME!;

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({});
const userStore = new UserStore();
const avatarService = new AvatarService();

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'Content-Type,X-Api-Key,x-api-key,Authorization,x-session-id',
};

const PRESIGNED_URL_EXPIRY = 3600; // 1 hour

// --- Response helpers ---

function errorResponse(statusCode: number, error: ErrorResponse): APIGatewayProxyResult {
  return { statusCode, headers: CORS_HEADERS, body: JSON.stringify(error) };
}

function successResponse(statusCode: number, body: unknown): APIGatewayProxyResult {
  return { statusCode, headers: CORS_HEADERS, body: JSON.stringify(body) };
}

// --- Helpers ---

async function getSignedImageUrls(imageKeys: string[]): Promise<string[]> {
  const urls: string[] = [];
  for (const key of imageKeys) {
    try {
      const url = await getSignedUrl(
        s3Client,
        new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }),
        { expiresIn: PRESIGNED_URL_EXPIRY }
      );
      urls.push(url);
    } catch {
      urls.push('');
    }
  }
  return urls;
}

async function getUserDisplayName(userId: string): Promise<string> {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: USERS_TABLE_NAME,
        Key: { userId },
        ProjectionExpression: 'displayName',
      })
    );
    return result.Item?.displayName ?? 'Anonymous';
  } catch {
    return 'Anonymous';
  }
}

async function getUserLevel(userId: string): Promise<UserLevel | undefined> {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: USERS_TABLE_NAME,
        Key: { userId },
        ProjectionExpression: '#lvl',
        ExpressionAttributeNames: { '#lvl': 'level' },
      })
    );

    const level = result.Item?.level;
    return typeof level === 'string' ? (level as UserLevel) : undefined;
  } catch {
    return undefined;
  }
}

async function getUserAvatarUrl(userId: string): Promise<string | undefined> {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: USERS_TABLE_NAME,
        Key: { userId },
        ProjectionExpression: 'avatarKey',
      })
    );

    const avatarKey = result.Item?.avatarKey;
    if (typeof avatarKey !== 'string' || avatarKey.length === 0) {
      return undefined;
    }

    return await avatarService.getAvatarUrl(avatarKey);
  } catch {
    return undefined;
  }
}

async function awardPoints(userId: string, points: number): Promise<void> {
  if (points === 0) return;
  const userResult = await docClient.send(
    new GetCommand({
      TableName: USERS_TABLE_NAME,
      Key: { userId },
      ProjectionExpression: 'points',
    })
  );
  const currentPoints = userResult.Item?.points ?? 0;
  const newPoints = currentPoints + points;
  const newLevel = calculateLevel(newPoints);

  await docClient.send(
    new UpdateCommand({
      TableName: USERS_TABLE_NAME,
      Key: { userId },
      UpdateExpression: 'SET #points = :points, #level = :level, #updatedAt = :now',
      ExpressionAttributeNames: {
        '#points': 'points',
        '#level': 'level',
        '#updatedAt': 'updatedAt',
      },
      ExpressionAttributeValues: {
        ':points': newPoints,
        ':level': newLevel,
        ':now': new Date().toISOString(),
      },
    })
  );
}

async function updateAuthorPointsAndVoteBadges(
  authorId: string,
  pointsDelta: number,
  upvoteDelta: number
): Promise<void> {
  const userResult = await docClient.send(
    new GetCommand({
      TableName: USERS_TABLE_NAME,
      Key: { userId: authorId },
      ProjectionExpression: 'points, badges, totalUpvotesReceived',
    })
  );

  const userRecord = userResult.Item ?? {};
  const currentPoints = userRecord.points ?? 0;
  const newPoints = currentPoints + pointsDelta;
  const currentBadges: string[] = userRecord.badges ?? [];
  const totalUpvotesReceived = (userRecord.totalUpvotesReceived ?? 0) + upvoteDelta;

  const newBadges: string[] = [];
  if (!currentBadges.includes('upvote-magnet') && totalUpvotesReceived >= 50) {
    newBadges.push('upvote-magnet');
  }

  const allBadges = [...currentBadges, ...newBadges];
  const newLevel = calculateLevel(newPoints);

  await docClient.send(
    new UpdateCommand({
      TableName: USERS_TABLE_NAME,
      Key: { userId: authorId },
      UpdateExpression: `SET #points = :points, #level = :level, #badges = :badges, 
        #totalUpvotesReceived = :totalUpvotesReceived, #updatedAt = :now`,
      ExpressionAttributeNames: {
        '#points': 'points',
        '#level': 'level',
        '#badges': 'badges',
        '#totalUpvotesReceived': 'totalUpvotesReceived',
        '#updatedAt': 'updatedAt',
      },
      ExpressionAttributeValues: {
        ':points': newPoints,
        ':level': newLevel,
        ':badges': allBadges,
        ':totalUpvotesReceived': totalUpvotesReceived,
        ':now': new Date().toISOString(),
      },
    })
  );
}

async function incrementUserCommunityStats(
  userId: string,
  field: string,
  amount: number = 1
): Promise<number> {
  const result = await docClient.send(
    new UpdateCommand({
      TableName: USERS_TABLE_NAME,
      Key: { userId },
      UpdateExpression: `SET #field = if_not_exists(#field, :zero) + :amt, #updatedAt = :now`,
      ExpressionAttributeNames: {
        '#field': field,
        '#updatedAt': 'updatedAt',
      },
      ExpressionAttributeValues: {
        ':amt': amount,
        ':zero': 0,
        ':now': new Date().toISOString(),
      },
      ReturnValues: 'UPDATED_NEW',
    })
  );
  return (result.Attributes?.[field] as number) ?? amount;
}

async function checkAndAwardBadges(userId: string): Promise<string[]> {
  const userResult = await docClient.send(
    new GetCommand({
      TableName: USERS_TABLE_NAME,
      Key: { userId },
      ProjectionExpression: 'badges, communityPosts, commentsGiven',
    })
  );

  const currentBadges: string[] = userResult.Item?.badges ?? [];
  const communityPosts: number = userResult.Item?.communityPosts ?? 0;
  const commentsGiven: number = userResult.Item?.commentsGiven ?? 0;
  const newBadges: string[] = [];

  if (!currentBadges.includes('community-starter') && communityPosts >= 1) {
    newBadges.push('community-starter');
  }
  if (!currentBadges.includes('community-pillar') && communityPosts >= 10) {
    newBadges.push('community-pillar');
  }
  if (!currentBadges.includes('helpful-neighbor') && commentsGiven >= 20) {
    newBadges.push('helpful-neighbor');
  }
  if (!currentBadges.includes('active-discussant') && commentsGiven >= 50) {
    newBadges.push('active-discussant');
  }

  if (newBadges.length > 0) {
    const allBadges = [...currentBadges, ...newBadges];
    await docClient.send(
      new UpdateCommand({
        TableName: USERS_TABLE_NAME,
        Key: { userId },
        UpdateExpression: 'SET #badges = :badges',
        ExpressionAttributeNames: { '#badges': 'badges' },
        ExpressionAttributeValues: { ':badges': allBadges },
      })
    );
  }

  return newBadges;
}

async function checkPostBadges(postId: string, postAuthorId: string): Promise<void> {
  // Check popular-creator (10 upvotes) and conversation-spark (5 comments)
  const postResult = await docClient.send(
    new GetCommand({
      TableName: COMMUNITY_TABLE_NAME,
      Key: { PK: `POST#${postId}`, SK: 'META' },
      ProjectionExpression: 'upvotes, commentCount',
    })
  );

  const upvotes = postResult.Item?.upvotes ?? 0;
  const commentCount = postResult.Item?.commentCount ?? 0;

  const userResult = await docClient.send(
    new GetCommand({
      TableName: USERS_TABLE_NAME,
      Key: { userId: postAuthorId },
      ProjectionExpression: 'badges',
    })
  );

  const currentBadges: string[] = userResult.Item?.badges ?? [];
  const newBadges: string[] = [];

  if (!currentBadges.includes('popular-creator') && upvotes >= 10) {
    newBadges.push('popular-creator');
  }
  if (!currentBadges.includes('conversation-spark') && commentCount >= 5) {
    newBadges.push('conversation-spark');
  }

  if (newBadges.length > 0) {
    const allBadges = [...currentBadges, ...newBadges];
    await docClient.send(
      new UpdateCommand({
        TableName: USERS_TABLE_NAME,
        Key: { userId: postAuthorId },
        UpdateExpression: 'SET #badges = :badges',
        ExpressionAttributeNames: { '#badges': 'badges' },
        ExpressionAttributeValues: { ':badges': allBadges },
      })
    );
  }
}

// --- Route Handlers ---

async function handleCreatePost(
  event: APIGatewayProxyEvent,
  userId: string
): Promise<APIGatewayProxyResult> {
  let body: CreateCommunityPostRequest;
  try {
    body = JSON.parse(event.body || '');
  } catch {
    return errorResponse(400, {
      error: { code: 'VALIDATION_ERROR', message: 'Request body must be valid JSON' },
    });
  }

  if (!body.projectId || typeof body.projectId !== 'string') {
    return errorResponse(400, {
      error: { code: 'VALIDATION_ERROR', message: 'projectId is required', field: 'projectId' },
    });
  }
  if (!body.text || typeof body.text !== 'string' || body.text.trim().length === 0) {
    return errorResponse(400, {
      error: { code: 'VALIDATION_ERROR', message: 'text is required', field: 'text' },
    });
  }
  if (body.text.trim().length > 2000) {
    return errorResponse(400, {
      error: { code: 'VALIDATION_ERROR', message: 'text must be at most 2000 characters', field: 'text' },
    });
  }
  if (!Array.isArray(body.imageKeys) || body.imageKeys.length === 0) {
    return errorResponse(400, {
      error: { code: 'VALIDATION_ERROR', message: 'At least 1 image is required', field: 'imageKeys' },
    });
  }
  if (body.imageKeys.length > 6) {
    return errorResponse(400, {
      error: { code: 'VALIDATION_ERROR', message: 'Maximum 6 images allowed', field: 'imageKeys' },
    });
  }

  // Verify project belongs to user and is completed
  const projectResult = await docClient.send(
    new GetCommand({
      TableName: PROJECTS_TABLE_NAME,
      Key: { projectId: body.projectId },
    })
  );

  if (!projectResult.Item) {
    return errorResponse(404, {
      error: { code: 'NOT_FOUND', message: 'Project not found' },
    });
  }

  if (projectResult.Item.userId !== userId) {
    return errorResponse(403, {
      error: { code: 'FORBIDDEN', message: 'You can only share your own projects' },
    });
  }

  if (projectResult.Item.status !== 'completed') {
    return errorResponse(400, {
      error: { code: 'VALIDATION_ERROR', message: 'Only completed projects can be shared' },
    });
  }

  const displayName = await getUserDisplayName(userId);
  const userLevel = await getUserLevel(userId);
  const avatarUrl = await getUserAvatarUrl(userId);
  const postId = uuidv4();
  const now = new Date().toISOString();

  const post: CommunityPost = {
    postId,
    userId,
    displayName,
    avatarUrl,
    userLevel,
    projectId: body.projectId,
    ideaTitle: projectResult.Item.ideaTitle ?? 'Untitled Project',
    grade: projectResult.Item.submission?.grade ?? 'C',
    text: body.text.trim(),
    imageKeys: body.imageKeys,
    upvotes: 0,
    downvotes: 0,
    commentCount: 0,
    createdAt: now,
  };

  // Store post in DynamoDB
  await docClient.send(
    new PutCommand({
      TableName: COMMUNITY_TABLE_NAME,
      Item: {
        PK: `POST#${postId}`,
        SK: 'META',
        GSI1PK: 'FEED',
        GSI1SK: now,
        GSI2PK: `USER#${userId}`,
        GSI2SK: now,
        postId: post.postId,
        userId: post.userId,
        displayName: post.displayName,
        userLevel: post.userLevel,
        projectId: post.projectId,
        ideaTitle: post.ideaTitle,
        grade: post.grade,
        text: post.text,
        imageKeys: post.imageKeys,
        upvotes: post.upvotes,
        downvotes: post.downvotes,
        commentCount: post.commentCount,
        createdAt: post.createdAt,
      },
    })
  );

  // Award points for sharing
  await awardPoints(userId, COMMUNITY_POINTS.sharePost);

  // Increment community posts count and check badges
  await incrementUserCommunityStats(userId, 'communityPosts');
  const newBadges = await checkAndAwardBadges(userId);

  // Generate signed URLs for response
  post.imageUrls = await getSignedImageUrls(post.imageKeys);

  const response: CreateCommunityPostResponse = {
    post,
    pointsAwarded: COMMUNITY_POINTS.sharePost,
    newBadges,
  };

  return successResponse(201, response);
}

async function handleGetFeed(
  event: APIGatewayProxyEvent,
  userId: string
): Promise<APIGatewayProxyResult> {
  const limit = Math.min(parseInt(event.queryStringParameters?.limit ?? '20', 10), 50);
  const cursor = event.queryStringParameters?.cursor;
  const sort = event.queryStringParameters?.sort ?? 'recent'; // recent | top

  let posts: CommunityPost[] = [];
  let total = 0;
  let nextCursor: string | undefined;

  if (sort === 'top') {
    // Scan all posts and sort by upvotes (for small scale)
    const result = await docClient.send(
      new QueryCommand({
        TableName: COMMUNITY_TABLE_NAME,
        IndexName: 'feed-index',
        KeyConditionExpression: 'GSI1PK = :feed',
        ExpressionAttributeValues: { ':feed': 'FEED' },
        ScanIndexForward: false,
        Limit: 200,
      })
    );

    const items = (result.Items ?? []) as any[];
    items.sort((a, b) => (b.upvotes ?? 0) - (a.upvotes ?? 0));
    total = items.length;

    const startIdx = cursor ? items.findIndex((i) => i.postId === cursor) + 1 : 0;
    const sliced = items.slice(startIdx, startIdx + limit);

    if (startIdx + limit < items.length) {
      nextCursor = sliced[sliced.length - 1]?.postId;
    }

    posts = sliced;
  } else {
    // Recent: query feed-index sorted by createdAt descending
    const queryParams: any = {
      TableName: COMMUNITY_TABLE_NAME,
      IndexName: 'feed-index',
      KeyConditionExpression: 'GSI1PK = :feed',
      ExpressionAttributeValues: { ':feed': 'FEED' } as any,
      ScanIndexForward: false,
      Limit: limit,
    };

    if (cursor) {
      queryParams.ExclusiveStartKey = {
        GSI1PK: 'FEED',
        GSI1SK: cursor,
        PK: `POST#${event.queryStringParameters?.cursorId ?? ''}`,
        SK: 'META',
      };
    }

    const result = await docClient.send(new QueryCommand(queryParams));
    posts = (result.Items ?? []) as CommunityPost[];
    total = posts.length;

    if (result.LastEvaluatedKey) {
      nextCursor = (result.LastEvaluatedKey as any).GSI1SK;
    }
  }

  // Enrich posts with signed image URLs and user's vote status
  const levelCache = new Map<string, UserLevel | undefined>();
  const avatarCache = new Map<string, string | undefined>();
  for (const post of posts) {
    if (!post.userLevel && post.userId) {
      if (!levelCache.has(post.userId)) {
        levelCache.set(post.userId, await getUserLevel(post.userId));
      }
      post.userLevel = levelCache.get(post.userId);
    }

    if (post.userId) {
      if (!avatarCache.has(post.userId)) {
        avatarCache.set(post.userId, await getUserAvatarUrl(post.userId));
      }
      post.avatarUrl = avatarCache.get(post.userId);
    }

    post.imageUrls = await getSignedImageUrls(post.imageKeys ?? []);

    // Check if current user has voted on this post
    try {
      const voteResult = await docClient.send(
        new GetCommand({
          TableName: COMMUNITY_TABLE_NAME,
          Key: { PK: `POST#${post.postId}`, SK: `VOTE#${userId}` },
        })
      );
      post.currentUserVote = (voteResult.Item?.vote as VoteType) ?? null;
    } catch {
      post.currentUserVote = null;
    }
  }

  const response: CommunityFeedResponse = { posts, total, nextCursor };
  return successResponse(200, response);
}

async function handleVote(
  event: APIGatewayProxyEvent,
  userId: string,
  postId: string
): Promise<APIGatewayProxyResult> {
  let body: VoteRequest;
  try {
    body = JSON.parse(event.body || '');
  } catch {
    return errorResponse(400, {
      error: { code: 'VALIDATION_ERROR', message: 'Request body must be valid JSON' },
    });
  }

  if (!body.vote || !['upvote', 'downvote'].includes(body.vote)) {
    return errorResponse(400, {
      error: { code: 'VALIDATION_ERROR', message: 'vote must be "upvote" or "downvote"' },
    });
  }

  // Get the post to find the author
  const postResult = await docClient.send(
    new GetCommand({
      TableName: COMMUNITY_TABLE_NAME,
      Key: { PK: `POST#${postId}`, SK: 'META' },
    })
  );

  if (!postResult.Item) {
    return errorResponse(404, {
      error: { code: 'NOT_FOUND', message: 'Post not found' },
    });
  }

  const postAuthorId = postResult.Item.userId as string;

  // Don't allow voting on own posts
  if (postAuthorId === userId) {
    return errorResponse(400, {
      error: { code: 'VALIDATION_ERROR', message: 'You cannot vote on your own post' },
    });
  }

  // Check existing vote
  const existingVoteResult = await docClient.send(
    new GetCommand({
      TableName: COMMUNITY_TABLE_NAME,
      Key: { PK: `POST#${postId}`, SK: `VOTE#${userId}` },
    })
  );

  const existingVote = existingVoteResult.Item?.vote as VoteType | undefined;
  let upvoteDelta = 0;
  let downvoteDelta = 0;
  let pointsDelta = 0;
  let newVote: VoteType | null = body.vote;

  if (existingVote === body.vote) {
    // Toggle off — remove vote
    newVote = null;
    if (body.vote === 'upvote') {
      upvoteDelta = -1;
      pointsDelta = -COMMUNITY_POINTS.receiveUpvote;
    } else {
      downvoteDelta = -1;
      pointsDelta = -COMMUNITY_POINTS.receiveDownvote;
    }

    // Delete the vote record
    await docClient.send(
      new UpdateCommand({
        TableName: COMMUNITY_TABLE_NAME,
        Key: { PK: `POST#${postId}`, SK: `VOTE#${userId}` },
        UpdateExpression: 'REMOVE #vote',
        ExpressionAttributeNames: { '#vote': 'vote' },
      })
    );
  } else if (existingVote) {
    // Switching vote
    if (existingVote === 'upvote' && body.vote === 'downvote') {
      upvoteDelta = -1;
      downvoteDelta = 1;
      pointsDelta = -COMMUNITY_POINTS.receiveUpvote + COMMUNITY_POINTS.receiveDownvote;
    } else {
      downvoteDelta = -1;
      upvoteDelta = 1;
      pointsDelta = -COMMUNITY_POINTS.receiveDownvote + COMMUNITY_POINTS.receiveUpvote;
    }

    await docClient.send(
      new PutCommand({
        TableName: COMMUNITY_TABLE_NAME,
        Item: {
          PK: `POST#${postId}`,
          SK: `VOTE#${userId}`,
          vote: body.vote,
          userId,
          createdAt: new Date().toISOString(),
        },
      })
    );
  } else {
    // New vote
    if (body.vote === 'upvote') {
      upvoteDelta = 1;
      pointsDelta = COMMUNITY_POINTS.receiveUpvote;
    } else {
      downvoteDelta = 1;
      pointsDelta = COMMUNITY_POINTS.receiveDownvote;
    }

    await docClient.send(
      new PutCommand({
        TableName: COMMUNITY_TABLE_NAME,
        Item: {
          PK: `POST#${postId}`,
          SK: `VOTE#${userId}`,
          vote: body.vote,
          userId,
          createdAt: new Date().toISOString(),
        },
      })
    );
  }

  // Update post vote counts
  const updateResult = await docClient.send(
    new UpdateCommand({
      TableName: COMMUNITY_TABLE_NAME,
      Key: { PK: `POST#${postId}`, SK: 'META' },
      UpdateExpression:
        'SET #upvotes = if_not_exists(#upvotes, :zero) + :upDelta, #downvotes = if_not_exists(#downvotes, :zero) + :downDelta',
      ExpressionAttributeNames: {
        '#upvotes': 'upvotes',
        '#downvotes': 'downvotes',
      },
      ExpressionAttributeValues: {
        ':upDelta': upvoteDelta,
        ':downDelta': downvoteDelta,
        ':zero': 0,
      },
      ReturnValues: 'UPDATED_NEW',
    })
  );

  // Award/deduct points and upvotes from post author
  if (pointsDelta !== 0 || upvoteDelta !== 0) {
    await updateAuthorPointsAndVoteBadges(postAuthorId, pointsDelta, upvoteDelta);
  }

  // Check post-level badges for the author
  await checkPostBadges(postId, postAuthorId);

  const response: VoteResponse = {
    upvotes: (updateResult.Attributes?.upvotes as number) ?? 0,
    downvotes: (updateResult.Attributes?.downvotes as number) ?? 0,
    currentUserVote: newVote,
    pointsDelta,
  };

  return successResponse(200, response);
}

async function handleCreateComment(
  event: APIGatewayProxyEvent,
  userId: string,
  postId: string
): Promise<APIGatewayProxyResult> {
  let body: CreateCommentRequest;
  try {
    body = JSON.parse(event.body || '');
  } catch {
    return errorResponse(400, {
      error: { code: 'VALIDATION_ERROR', message: 'Request body must be valid JSON' },
    });
  }

  if (!body.text || typeof body.text !== 'string' || body.text.trim().length === 0) {
    return errorResponse(400, {
      error: { code: 'VALIDATION_ERROR', message: 'text is required', field: 'text' },
    });
  }
  if (body.text.trim().length > 1000) {
    return errorResponse(400, {
      error: { code: 'VALIDATION_ERROR', message: 'Comment must be at most 1000 characters', field: 'text' },
    });
  }

  // Verify post exists
  const postResult = await docClient.send(
    new GetCommand({
      TableName: COMMUNITY_TABLE_NAME,
      Key: { PK: `POST#${postId}`, SK: 'META' },
    })
  );

  if (!postResult.Item) {
    return errorResponse(404, {
      error: { code: 'NOT_FOUND', message: 'Post not found' },
    });
  }

  const displayName = await getUserDisplayName(userId);
  const avatarUrl = await getUserAvatarUrl(userId);
  const commentId = uuidv4();
  const now = new Date().toISOString();

  const comment: CommunityComment = {
    commentId,
    postId,
    userId,
    displayName,
    avatarUrl,
    text: body.text.trim(),
    createdAt: now,
  };

  // Store comment
  await docClient.send(
    new PutCommand({
      TableName: COMMUNITY_TABLE_NAME,
      Item: {
        PK: `POST#${postId}`,
        SK: `COMMENT#${now}#${commentId}`,
        commentId: comment.commentId,
        postId: comment.postId,
        userId: comment.userId,
        displayName: comment.displayName,
        text: comment.text,
        createdAt: comment.createdAt,
      },
    })
  );

  // Increment comment count on post
  await docClient.send(
    new UpdateCommand({
      TableName: COMMUNITY_TABLE_NAME,
      Key: { PK: `POST#${postId}`, SK: 'META' },
      UpdateExpression: 'SET #commentCount = if_not_exists(#commentCount, :zero) + :one',
      ExpressionAttributeNames: { '#commentCount': 'commentCount' },
      ExpressionAttributeValues: { ':one': 1, ':zero': 0 },
    })
  );

  // Award points for commenting
  await awardPoints(userId, COMMUNITY_POINTS.leaveComment);

  // Track comments given for badge
  await incrementUserCommunityStats(userId, 'commentsGiven');
  await checkAndAwardBadges(userId);

  // Check post badges for post author
  const postAuthorId = postResult.Item.userId as string;
  await checkPostBadges(postId, postAuthorId);

  const response: CreateCommentResponse = { comment };
  return successResponse(201, response);
}

async function handleGetComments(
  event: APIGatewayProxyEvent,
  _userId: string,
  postId: string
): Promise<APIGatewayProxyResult> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: COMMUNITY_TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': `POST#${postId}`,
        ':prefix': 'COMMENT#',
      },
      ScanIndexForward: true,
    })
  );

  const avatarCache = new Map<string, string | undefined>();
  const comments: CommunityComment[] = [];
  for (const item of result.Items ?? []) {
    const commentUserId = item.userId as string;
    if (commentUserId && !avatarCache.has(commentUserId)) {
      avatarCache.set(commentUserId, await getUserAvatarUrl(commentUserId));
    }

    comments.push({
      commentId: item.commentId,
      postId: item.postId,
      userId: commentUserId,
      displayName: item.displayName,
      avatarUrl: avatarCache.get(commentUserId),
      text: item.text,
      createdAt: item.createdAt,
    });
  }

  const response: CommentsListResponse = {
    comments,
    total: comments.length,
  };

  return successResponse(200, response);
}

// --- Main handler (router) ---

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const userId = await resolveAuthenticatedUserId(event, userStore);

    if (!userId) {
      return errorResponse(401, {
        error: { code: 'AUTH_FAILURE', message: 'User not authenticated' },
      });
    }

    const method = event.httpMethod;
    const path = event.resource || event.path;

    // POST /community/posts — Create a new community post
    if (method === 'POST' && path.endsWith('/posts')) {
      return await handleCreatePost(event, userId);
    }

    // GET /community/posts — Get community feed
    if (method === 'GET' && path.endsWith('/posts')) {
      return await handleGetFeed(event, userId);
    }

    // POST /community/posts/{postId}/vote — Vote on a post
    if (method === 'POST' && path.includes('/vote')) {
      const postId = event.pathParameters?.postId;
      if (!postId) {
        return errorResponse(400, {
          error: { code: 'VALIDATION_ERROR', message: 'postId is required' },
        });
      }
      return await handleVote(event, userId, postId);
    }

    // POST /community/posts/{postId}/comments — Add a comment
    if (method === 'POST' && path.includes('/comments')) {
      const postId = event.pathParameters?.postId;
      if (!postId) {
        return errorResponse(400, {
          error: { code: 'VALIDATION_ERROR', message: 'postId is required' },
        });
      }
      return await handleCreateComment(event, userId, postId);
    }

    // GET /community/posts/{postId}/comments — Get comments for a post
    if (method === 'GET' && path.includes('/comments')) {
      const postId = event.pathParameters?.postId;
      if (!postId) {
        return errorResponse(400, {
          error: { code: 'VALIDATION_ERROR', message: 'postId is required' },
        });
      }
      return await handleGetComments(event, userId, postId);
    }

    return errorResponse(404, {
      error: { code: 'NOT_FOUND', message: `Route not found: ${method} ${path}` },
    });
  } catch (err) {
    console.error('CommunityHandler unexpected error:', err);
    return errorResponse(500, {
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
    });
  }
};
