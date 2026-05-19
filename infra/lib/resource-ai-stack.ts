import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';
import * as path from 'path';

function parseStringArrayContext(value: unknown, fallback: string[]): string[] {
  if (Array.isArray(value)) {
    const list = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    return list.length > 0 ? list : fallback;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const trimmed = value.trim();
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const list = parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
        return list.length > 0 ? list : fallback;
      }
    } catch {
      const split = trimmed.split(',').map((item) => item.trim()).filter(Boolean);
      if (split.length > 0) {
        return split;
      }
    }
  }

  return fallback;
}

export class ResourceAiStack extends cdk.Stack {
  // Expose resources for use by subsequent tasks
  public readonly sessionsTable: dynamodb.Table;
  public readonly usersTable: dynamodb.Table;
  public readonly projectsTable: dynamodb.Table;
  public readonly fileStorageBucket: s3.Bucket;
  public readonly frontendBucket: s3.Bucket;
  public readonly api: apigateway.RestApi;
  public readonly apiKey: apigateway.IApiKey;
  public readonly distribution: cloudfront.Distribution;
  public readonly authMode: 'legacy' | 'cognito';

  // Auth infrastructure
  public readonly tokenAuthorizer?: apigateway.TokenAuthorizer;
  public readonly cognitoUserPool?: cognito.UserPool;
  public readonly cognitoUserPoolClient?: cognito.UserPoolClient;
  public readonly cognitoUserPoolDomain?: cognito.UserPoolDomain;
  public readonly cognitoAuthorizer?: apigateway.CognitoUserPoolsAuthorizer;

  // Lambda functions
  public readonly submitHandler: NodejsFunction;
  public readonly pollHandler: NodejsFunction;
  public readonly uploadHandler: NodejsFunction;
  public readonly pipelineOrchestrator: NodejsFunction;
  public readonly authHandler: NodejsFunction;
  public readonly adminHandler: NodejsFunction;
  public readonly sessionsHandler: NodejsFunction;
  public readonly leaderboardHandler: NodejsFunction;

  // New gamification Lambda functions
  public readonly guideGenerateHandler: NodejsFunction;
  public readonly guideChatHandler: NodejsFunction;
  public readonly projectSubmitHandler: NodejsFunction;
  public readonly projectsListHandler: NodejsFunction;
  public readonly projectUpdateHandler: NodejsFunction;
  public readonly projectGetHandler: NodejsFunction;

  // Community feature
  public readonly communityTable: dynamodb.Table;
  public readonly communityHandler: NodejsFunction;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const requestedAuthMode = String(
      this.node.tryGetContext('authMode') ?? process.env.RESOURCE_AI_AUTH_MODE ?? 'legacy'
    ).toLowerCase();
    this.authMode = requestedAuthMode === 'cognito' ? 'cognito' : 'legacy';

    // --- Task 2.1: DynamoDB Table and S3 Buckets ---

    // DynamoDB table for triage sessions
    this.sessionsTable = new dynamodb.Table(this, 'SessionsTable', {
      tableName: 'resource-ai-sessions',
      partitionKey: { name: 'sessionId', type: dynamodb.AttributeType.STRING },
      timeToLiveAttribute: 'expiresAt',
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.sessionsTable.addGlobalSecondaryIndex({
      indexName: 'userId-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    // DynamoDB table for user profiles and authentication
    this.usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: 'resource-ai-users',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.usersTable.addGlobalSecondaryIndex({
      indexName: 'email-index',
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
    });

    // DynamoDB table for recycling projects (gamification expansion)
    this.projectsTable = new dynamodb.Table(this, 'ProjectsTable', {
      tableName: 'resource-ai-projects',
      partitionKey: { name: 'projectId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.projectsTable.addGlobalSecondaryIndex({
      indexName: 'userId-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'startedAt', type: dynamodb.AttributeType.STRING },
    });

    // DynamoDB table for community posts (single-table design)
    this.communityTable = new dynamodb.Table(this, 'CommunityTable', {
      tableName: 'resource-ai-community',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // GSI for feed queries (all posts sorted by createdAt)
    this.communityTable.addGlobalSecondaryIndex({
      indexName: 'feed-index',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
    });

    // GSI for user's posts
    this.communityTable.addGlobalSecondaryIndex({
      indexName: 'user-posts-index',
      partitionKey: { name: 'GSI2PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI2SK', type: dynamodb.AttributeType.STRING },
    });

    // S3 bucket for file storage (uploads and generated images)
    this.fileStorageBucket = new s3.Bucket(this, 'FileStorageBucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [{ expiration: cdk.Duration.days(365) }],
      cors: [{
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
      }],
    });

    // S3 bucket for frontend static hosting
    this.frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    // --- Task 2.3: Lambda Functions and IAM Roles ---

    const handlersDir = path.join(__dirname, '..', '..', 'backend', 'src', 'handlers');

    const nodejsBundling = {
      externalModules: ['@aws-sdk/*'],
    };

    // PipelineOrchestrator Lambda (defined first so SubmitHandler can reference it)
    this.pipelineOrchestrator = new NodejsFunction(this, 'PipelineOrchestrator', {
      functionName: 'resource-ai-pipeline-orchestrator',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(handlersDir, 'pipeline.ts'),
      memorySize: 1024,
      timeout: cdk.Duration.seconds(180),
      bundling: nodejsBundling,
      environment: {
        TABLE_NAME: this.sessionsTable.tableName,
        BUCKET_NAME: this.fileStorageBucket.bucketName,
        USERS_TABLE_NAME: this.usersTable.tableName,
      },
    });

    // SubmitHandler Lambda
    this.submitHandler = new NodejsFunction(this, 'SubmitHandler', {
      functionName: 'resource-ai-submit-handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(handlersDir, 'submit.ts'),
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      bundling: nodejsBundling,
      environment: {
        TABLE_NAME: this.sessionsTable.tableName,
        BUCKET_NAME: this.fileStorageBucket.bucketName,
        PIPELINE_FUNCTION_NAME: this.pipelineOrchestrator.functionName,
        USERS_TABLE_NAME: this.usersTable.tableName,
      },
    });

    // PollHandler Lambda
    this.pollHandler = new NodejsFunction(this, 'PollHandler', {
      functionName: 'resource-ai-poll-handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(handlersDir, 'poll.ts'),
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      bundling: nodejsBundling,
      environment: {
        TABLE_NAME: this.sessionsTable.tableName,
        BUCKET_NAME: this.fileStorageBucket.bucketName,
        USERS_TABLE_NAME: this.usersTable.tableName,
      },
    });

    // UploadHandler Lambda
    this.uploadHandler = new NodejsFunction(this, 'UploadHandler', {
      functionName: 'resource-ai-upload-handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(handlersDir, 'upload.ts'),
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      bundling: nodejsBundling,
      environment: {
        TABLE_NAME: this.sessionsTable.tableName,
        BUCKET_NAME: this.fileStorageBucket.bucketName,
        USERS_TABLE_NAME: this.usersTable.tableName,
      },
    });

    // AuthHandler Lambda (register, login, profile)
    this.authHandler = new NodejsFunction(this, 'AuthHandler', {
      functionName: 'resource-ai-auth-handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(handlersDir, 'auth.ts'),
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      bundling: nodejsBundling,
      environment: {
        USERS_TABLE_NAME: this.usersTable.tableName,
        BUCKET_NAME: this.fileStorageBucket.bucketName,
        JWT_SECRET: this.node.tryGetContext('jwtSecret') || 'dev-jwt-secret-change-in-production',
        AUTH_MODE: this.authMode,
      },
    });

    // --- Task 4.4: Lambda Authorizer ---

    if (this.authMode === 'legacy') {
      const jwtSecret = this.node.tryGetContext('jwtSecret') || 'dev-jwt-secret-change-in-production';

      const authorizerFunction = new NodejsFunction(this, 'AuthorizerFunction', {
        functionName: 'resource-ai-authorizer',
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'handler',
        entry: path.join(handlersDir, 'authorizer.ts'),
        memorySize: 128,
        timeout: cdk.Duration.seconds(10),
        bundling: nodejsBundling,
        environment: {
          JWT_SECRET: jwtSecret,
        },
      });

      this.tokenAuthorizer = new apigateway.TokenAuthorizer(this, 'JwtAuthorizer', {
        handler: authorizerFunction,
        resultsCacheTtl: cdk.Duration.seconds(300),
      });
    }

    // AdminHandler Lambda
    this.adminHandler = new NodejsFunction(this, 'AdminHandler', {
      functionName: 'resource-ai-admin-handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(handlersDir, 'admin.ts'),
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      bundling: nodejsBundling,
      environment: {
        USERS_TABLE_NAME: this.usersTable.tableName,
        SESSIONS_TABLE_NAME: this.sessionsTable.tableName,
      },
    });

    // SessionsHandler Lambda (user's own sessions)
    this.sessionsHandler = new NodejsFunction(this, 'SessionsHandler', {
      functionName: 'resource-ai-sessions-handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(handlersDir, 'sessions.ts'),
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      bundling: nodejsBundling,
      environment: {
        TABLE_NAME: this.sessionsTable.tableName,
        USERS_TABLE_NAME: this.usersTable.tableName,
      },
    });

    // LeaderboardHandler Lambda (top users by points)
    this.leaderboardHandler = new NodejsFunction(this, 'LeaderboardHandler', {
      functionName: 'resource-ai-leaderboard-handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(handlersDir, 'leaderboard.ts'),
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      bundling: nodejsBundling,
      environment: {
        USERS_TABLE_NAME: this.usersTable.tableName,
      },
    });

    // GuideGenerateHandler Lambda (POST /guide/generate)
    this.guideGenerateHandler = new NodejsFunction(this, 'GuideGenerateHandler', {
      functionName: 'resource-ai-guide-generate-handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(handlersDir, 'guide-generate.ts'),
      memorySize: 512,
      timeout: cdk.Duration.seconds(90),
      bundling: nodejsBundling,
      environment: {
        PROJECTS_TABLE_NAME: this.projectsTable.tableName,
        BUCKET_NAME: this.fileStorageBucket.bucketName,
        USERS_TABLE_NAME: this.usersTable.tableName,
      },
    });

    // GuideChatHandler Lambda (POST /guide/chat)
    this.guideChatHandler = new NodejsFunction(this, 'GuideChatHandler', {
      functionName: 'resource-ai-guide-chat-handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(handlersDir, 'guide-chat.ts'),
      memorySize: 256,
      timeout: cdk.Duration.seconds(60),
      bundling: nodejsBundling,
      environment: {
        PROJECTS_TABLE_NAME: this.projectsTable.tableName,
      },
    });

    // ProjectSubmitHandler Lambda (POST /project/submit)
    this.projectSubmitHandler = new NodejsFunction(this, 'ProjectSubmitHandler', {
      functionName: 'resource-ai-project-submit-handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(handlersDir, 'project-submit.ts'),
      memorySize: 512,
      timeout: cdk.Duration.seconds(90),
      bundling: nodejsBundling,
      environment: {
        PROJECTS_TABLE_NAME: this.projectsTable.tableName,
        BUCKET_NAME: this.fileStorageBucket.bucketName,
        USERS_TABLE_NAME: this.usersTable.tableName,
      },
    });

    // ProjectsListHandler Lambda (GET /projects)
    this.projectsListHandler = new NodejsFunction(this, 'ProjectsListHandler', {
      functionName: 'resource-ai-projects-list-handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(handlersDir, 'projects-list.ts'),
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      bundling: nodejsBundling,
      environment: {
        PROJECTS_TABLE_NAME: this.projectsTable.tableName,
        USERS_TABLE_NAME: this.usersTable.tableName,
      },
    });

    // ProjectUpdateHandler Lambda (PATCH /projects/:projectId)
    this.projectUpdateHandler = new NodejsFunction(this, 'ProjectUpdateHandler', {
      functionName: 'resource-ai-project-update-handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(handlersDir, 'project-update.ts'),
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      bundling: nodejsBundling,
      environment: {
        PROJECTS_TABLE_NAME: this.projectsTable.tableName,
        USERS_TABLE_NAME: this.usersTable.tableName,
      },
    });

    // ProjectGetHandler Lambda (GET /projects/:projectId)
    this.projectGetHandler = new NodejsFunction(this, 'ProjectGetHandler', {
      functionName: 'resource-ai-project-get-handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(handlersDir, 'project-get.ts'),
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      bundling: nodejsBundling,
      environment: {
        PROJECTS_TABLE_NAME: this.projectsTable.tableName,
        USERS_TABLE_NAME: this.usersTable.tableName,
      },
    });

    // CommunityHandler Lambda (community posts, votes, comments)
    this.communityHandler = new NodejsFunction(this, 'CommunityHandler', {
      functionName: 'resource-ai-community-handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(handlersDir, 'community.ts'),
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      bundling: nodejsBundling,
      environment: {
        COMMUNITY_TABLE_NAME: this.communityTable.tableName,
        USERS_TABLE_NAME: this.usersTable.tableName,
        PROJECTS_TABLE_NAME: this.projectsTable.tableName,
        BUCKET_NAME: this.fileStorageBucket.bucketName,
      },
    });

    // --- IAM Permissions (least-privilege, no wildcard resource ARNs) ---

    // SubmitHandler: DynamoDB write + Lambda invoke (async invocation of PipelineOrchestrator)
    this.sessionsTable.grantWriteData(this.submitHandler);
    this.usersTable.grantReadData(this.submitHandler);
    this.pipelineOrchestrator.grantInvoke(this.submitHandler);

    // PollHandler: DynamoDB read + S3 getObject (for pre-signed URLs)
    this.sessionsTable.grantReadData(this.pollHandler);
    this.usersTable.grantReadData(this.pollHandler);
    this.fileStorageBucket.grantRead(this.pollHandler);

    // UploadHandler: S3 putObject + DynamoDB read (to check file count per session)
    this.fileStorageBucket.grantPut(this.uploadHandler);
    this.sessionsTable.grantReadData(this.uploadHandler);
    this.usersTable.grantReadData(this.uploadHandler);

    // PipelineOrchestrator: DynamoDB read/write + S3 read/write + Bedrock InvokeModel
    this.sessionsTable.grantReadWriteData(this.pipelineOrchestrator);
    this.fileStorageBucket.grantReadWrite(this.pipelineOrchestrator);

    // AdminHandler: DynamoDB read/write on users table + read on sessions table
    this.usersTable.grantReadWriteData(this.adminHandler);
    this.sessionsTable.grantReadData(this.adminHandler);

    // AuthHandler: DynamoDB read/write on users table + read on sessions table (for stats/session count)
    this.usersTable.grantReadWriteData(this.authHandler);
    this.sessionsTable.grantReadData(this.authHandler);
    this.fileStorageBucket.grantReadWrite(this.authHandler);

    // SessionsHandler: DynamoDB read on sessions table
    this.sessionsTable.grantReadData(this.sessionsHandler);
    this.usersTable.grantReadData(this.sessionsHandler);

    // LeaderboardHandler: DynamoDB read on users table
    this.usersTable.grantReadData(this.leaderboardHandler);

    // PipelineOrchestrator: read/write on users table (for gamification updates)
    this.usersTable.grantReadWriteData(this.pipelineOrchestrator);

    // --- Gamification Lambda Permissions ---

    // GuideGenerateHandler: DynamoDB read/write on projects table + S3 read + Bedrock
    this.projectsTable.grantReadWriteData(this.guideGenerateHandler);
    this.fileStorageBucket.grantRead(this.guideGenerateHandler);
    this.usersTable.grantReadData(this.guideGenerateHandler);

    // GuideChatHandler: DynamoDB read on projects table + Bedrock
    this.projectsTable.grantReadData(this.guideChatHandler);

    // ProjectSubmitHandler: DynamoDB read/write on projects table + S3 read + users table + Bedrock
    this.projectsTable.grantReadWriteData(this.projectSubmitHandler);
    this.fileStorageBucket.grantRead(this.projectSubmitHandler);
    this.usersTable.grantReadWriteData(this.projectSubmitHandler);

    // ProjectsListHandler: DynamoDB read on projects table
    this.projectsTable.grantReadData(this.projectsListHandler);
    this.usersTable.grantReadData(this.projectsListHandler);

    // ProjectUpdateHandler: DynamoDB read/write on projects table
    this.projectsTable.grantReadWriteData(this.projectUpdateHandler);
    this.usersTable.grantReadData(this.projectUpdateHandler);

    // ProjectGetHandler: DynamoDB read on projects table
    this.projectsTable.grantReadData(this.projectGetHandler);
    this.usersTable.grantReadData(this.projectGetHandler);

    // CommunityHandler: DynamoDB read/write on community table + read projects + read/write users + S3 read
    this.communityTable.grantReadWriteData(this.communityHandler);
    this.projectsTable.grantReadData(this.communityHandler);
    this.usersTable.grantReadWriteData(this.communityHandler);
    this.fileStorageBucket.grantRead(this.communityHandler);

    // Bedrock InvokeModel permission - Amazon Nova Pro via APAC cross-region inference
    const bedrockNovaPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['bedrock:InvokeModel'],
      resources: [
        // APAC cross-region inference profile for Nova Pro
        `arn:aws:bedrock:${this.region}:${this.account}:inference-profile/apac.amazon.nova-pro-v1:0`,
        // Foundation model in destination regions
        `arn:aws:bedrock:*::foundation-model/amazon.nova-pro-v1:0`,
        // Titan Image Generator
        `arn:aws:bedrock:*::foundation-model/amazon.titan-image-generator-v1`,
      ],
    });

    // Apply Nova Pro policy to pipeline orchestrator
    this.pipelineOrchestrator.addToRolePolicy(bedrockNovaPolicy);

    // Apply Nova Pro policy to gamification handlers
    this.guideGenerateHandler.addToRolePolicy(bedrockNovaPolicy);
    this.guideChatHandler.addToRolePolicy(bedrockNovaPolicy);
    this.projectSubmitHandler.addToRolePolicy(bedrockNovaPolicy);

    // --- Task 2.2: API Gateway REST API ---

    this.api = new apigateway.RestApi(this, 'ResourceAiApi', {
      restApiName: 'ReSource AI API',
      description: 'REST API for ReSource AI e-waste triage system',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Api-Key', 'x-api-key', 'Authorization', 'x-session-id', 'X-Session-Id'],
      },
      deployOptions: { stageName: 'prod' },
      apiKeySourceType: apigateway.ApiKeySourceType.HEADER,
    });

    if (this.authMode === 'cognito') {
      const callbackUrls = parseStringArrayContext(
        this.node.tryGetContext('cognitoCallbackUrls'),
        ['http://localhost:5173/auth/callback']
      );
      const logoutUrls = parseStringArrayContext(
        this.node.tryGetContext('cognitoLogoutUrls'),
        ['http://localhost:5173/login']
      );

      const cognitoPreSignUpHandler = new NodejsFunction(this, 'CognitoPreSignUpHandler', {
        functionName: 'resource-ai-cognito-pre-signup-handler',
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'handler',
        entry: path.join(handlersDir, 'cognito-pre-signup.ts'),
        memorySize: 128,
        timeout: cdk.Duration.seconds(10),
        bundling: nodejsBundling,
      });

      this.cognitoUserPool = new cognito.UserPool(this, 'ResourceAiUserPool', {
        userPoolName: 'resource-ai-user-pool',
        selfSignUpEnabled: true,
        signInAliases: { email: true },
        autoVerify: { email: true },
        standardAttributes: {
          email: { required: true, mutable: true },
          fullname: { required: false, mutable: true },
        },
        passwordPolicy: {
          minLength: 8,
          requireDigits: true,
          requireLowercase: true,
          requireUppercase: true,
          requireSymbols: false,
        },
        lambdaTriggers: {
          preSignUp: cognitoPreSignUpHandler,
        },
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });

      const supportedIdentityProviders = [cognito.UserPoolClientIdentityProvider.COGNITO];

      const googleClientId = this.node.tryGetContext('googleClientId') as string | undefined;
      const googleClientSecret = this.node.tryGetContext('googleClientSecret') as string | undefined;
      let googleProvider: cognito.UserPoolIdentityProviderGoogle | undefined;
      if (googleClientId && googleClientSecret) {
        googleProvider = new cognito.UserPoolIdentityProviderGoogle(this, 'GoogleIdentityProvider', {
          userPool: this.cognitoUserPool,
          clientId: googleClientId,
          clientSecretValue: cdk.SecretValue.unsafePlainText(googleClientSecret),
          scopes: ['openid', 'email', 'profile'],
          attributeMapping: {
            email: cognito.ProviderAttribute.GOOGLE_EMAIL,
            fullname: cognito.ProviderAttribute.GOOGLE_NAME,
            profilePicture: cognito.ProviderAttribute.GOOGLE_PICTURE,
          },
        });
        supportedIdentityProviders.push(cognito.UserPoolClientIdentityProvider.GOOGLE);
      }

      const appleClientId = this.node.tryGetContext('appleClientId') as string | undefined;
      const appleTeamId = this.node.tryGetContext('appleTeamId') as string | undefined;
      const appleKeyId = this.node.tryGetContext('appleKeyId') as string | undefined;
      const applePrivateKey = this.node.tryGetContext('applePrivateKey') as string | undefined;
      let appleProvider: cognito.UserPoolIdentityProviderApple | undefined;
      if (appleClientId && appleTeamId && appleKeyId && applePrivateKey) {
        appleProvider = new cognito.UserPoolIdentityProviderApple(this, 'AppleIdentityProvider', {
          userPool: this.cognitoUserPool,
          clientId: appleClientId,
          teamId: appleTeamId,
          keyId: appleKeyId,
          privateKey: applePrivateKey,
          scopes: ['name', 'email'],
          attributeMapping: {
            email: cognito.ProviderAttribute.APPLE_EMAIL,
            fullname: cognito.ProviderAttribute.APPLE_NAME,
          },
        });
        supportedIdentityProviders.push(cognito.UserPoolClientIdentityProvider.APPLE);
      }

      this.cognitoUserPoolClient = this.cognitoUserPool.addClient('ResourceAiUserPoolClient', {
        userPoolClientName: 'resource-ai-web-client',
        authFlows: { userPassword: true, userSrp: true },
        generateSecret: false,
        oAuth: {
          callbackUrls,
          logoutUrls,
          flows: {
            authorizationCodeGrant: true,
          },
          scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.PROFILE],
        },
        supportedIdentityProviders,
      });

      if (googleProvider) {
        this.cognitoUserPoolClient.node.addDependency(googleProvider);
      }
      if (appleProvider) {
        this.cognitoUserPoolClient.node.addDependency(appleProvider);
      }
      this.authHandler.addEnvironment('COGNITO_APP_CLIENT_ID', this.cognitoUserPoolClient.userPoolClientId);

      const userPoolDomainPrefix =
        (this.node.tryGetContext('cognitoDomainPrefix') as string | undefined) ??
        `resource-ai-auth-${this.region.replace(/[^a-z0-9-]/g, '').slice(0, 20)}`;

      this.cognitoUserPoolDomain = this.cognitoUserPool.addDomain('ResourceAiUserPoolDomain', {
        cognitoDomain: { domainPrefix: userPoolDomainPrefix },
      });

      this.cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
        cognitoUserPools: [this.cognitoUserPool],
      });

      new cognito.CfnUserPoolGroup(this, 'ResourceAiUserGroup', {
        userPoolId: this.cognitoUserPool.userPoolId,
        groupName: 'user',
      });
      new cognito.CfnUserPoolGroup(this, 'ResourceAiManagerGroup', {
        userPoolId: this.cognitoUserPool.userPoolId,
        groupName: 'manager',
      });
    }

    // Gateway Responses: Add CORS headers to API Gateway error responses (4xx/5xx)
    // that bypass Lambda (e.g., authorizer denials, missing API keys, throttling).
    this.api.addGatewayResponse('Default4xx', {
      type: apigateway.ResponseType.DEFAULT_4XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers': "'Content-Type,X-Api-Key,x-api-key,Authorization,x-session-id,X-Session-Id'",
        'Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
      },
    });

    this.api.addGatewayResponse('Default5xx', {
      type: apigateway.ResponseType.DEFAULT_5XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers': "'Content-Type,X-Api-Key,x-api-key,Authorization,x-session-id,X-Session-Id'",
        'Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
      },
    });

    // API Key for authentication (Requirement 15.1)
    this.apiKey = this.api.addApiKey('ResourceAiApiKey', {
      apiKeyName: 'resource-ai-api-key',
      description: 'API key for ReSource AI frontend access',
    });

    // Usage plan to associate the API key with the API stage
    const usagePlan = this.api.addUsagePlan('ResourceAiUsagePlan', {
      name: 'resource-ai-usage-plan',
      description: 'Usage plan for ReSource AI API',
      throttle: { rateLimit: 50, burstLimit: 100 },
    });
    usagePlan.addApiKey(this.apiKey);
    usagePlan.addApiStage({ stage: this.api.deploymentStage });

    // Lambda integrations for API Gateway endpoints
    const methodOptions: apigateway.MethodOptions = { apiKeyRequired: true };

    // Protected method options: API key + Lambda Authorizer (for authenticated endpoints)
    const protectedMethodOptions: apigateway.MethodOptions =
      this.authMode === 'cognito' && this.cognitoAuthorizer
        ? {
            apiKeyRequired: true,
            authorizer: this.cognitoAuthorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
          }
        : {
            apiKeyRequired: true,
            authorizer: this.tokenAuthorizer!,
            authorizationType: apigateway.AuthorizationType.CUSTOM,
          };

    // POST /upload — Upload device evidence file (protected)
    const uploadResource = this.api.root.addResource('upload');
    uploadResource.addMethod('POST', new apigateway.LambdaIntegration(this.uploadHandler, {
      proxy: true,
      timeout: cdk.Duration.seconds(29),
    }), protectedMethodOptions);

    // /sessions resource
    const sessionsResource = this.api.root.addResource('sessions');

    // POST /sessions — Create new triage session (protected)
    sessionsResource.addMethod('POST', new apigateway.LambdaIntegration(this.submitHandler, {
      proxy: true,
      timeout: cdk.Duration.seconds(29),
    }), protectedMethodOptions);

    // GET /sessions — List current user's sessions (protected)
    sessionsResource.addMethod('GET', new apigateway.LambdaIntegration(this.sessionsHandler, {
      proxy: true,
      timeout: cdk.Duration.seconds(29),
    }), protectedMethodOptions);

    // GET /sessions/{sessionId} — Get session status and results (protected)
    const sessionByIdResource = sessionsResource.addResource('{sessionId}');
    sessionByIdResource.addMethod('GET', new apigateway.LambdaIntegration(this.pollHandler, {
      proxy: true,
      timeout: cdk.Duration.seconds(29),
    }), protectedMethodOptions);

    // --- Auth endpoints ---

    // /auth resource
    const authResource = this.api.root.addResource('auth');

    // POST /auth/register — Public (API key only, no authorizer)
    const authRegisterResource = authResource.addResource('register');
    authRegisterResource.addMethod('POST', new apigateway.LambdaIntegration(this.authHandler), methodOptions);

    // POST /auth/login — Public (API key only, no authorizer)
    const authLoginResource = authResource.addResource('login');
    authLoginResource.addMethod('POST', new apigateway.LambdaIntegration(this.authHandler), methodOptions);

    // GET/PUT /auth/profile — Protected (API key + authorizer)
    const authProfileResource = authResource.addResource('profile');
    authProfileResource.addMethod('GET', new apigateway.LambdaIntegration(this.authHandler), protectedMethodOptions);
    authProfileResource.addMethod('PUT', new apigateway.LambdaIntegration(this.authHandler), protectedMethodOptions);
    const authProfileAvatarUploadResource = authProfileResource.addResource('avatar-upload');
    authProfileAvatarUploadResource.addMethod('POST', new apigateway.LambdaIntegration(this.authHandler), protectedMethodOptions);

    // GET /auth/stats — Protected (API key + authorizer)
    const authStatsResource = authResource.addResource('stats');
    authStatsResource.addMethod('GET', new apigateway.LambdaIntegration(this.authHandler), protectedMethodOptions);

    // --- Admin endpoints ---

    // /admin resource
    const adminResource = this.api.root.addResource('admin');

    // GET /admin/users — Protected (manager only, enforced in handler)
    const adminUsersResource = adminResource.addResource('users');
    adminUsersResource.addMethod('GET', new apigateway.LambdaIntegration(this.adminHandler), protectedMethodOptions);

    // PUT /admin/users/{userId}/role — Protected (manager only)
    const adminUserByIdResource = adminUsersResource.addResource('{userId}');
    const adminUserRoleResource = adminUserByIdResource.addResource('role');
    adminUserRoleResource.addMethod('PUT', new apigateway.LambdaIntegration(this.adminHandler), protectedMethodOptions);

    // GET /admin/sessions — Protected (manager only)
    const adminSessionsResource = adminResource.addResource('sessions');
    adminSessionsResource.addMethod('GET', new apigateway.LambdaIntegration(this.adminHandler), protectedMethodOptions);

    // --- Leaderboard endpoint ---

    // GET /leaderboard — Protected (API key + authorizer)
    const leaderboardResource = this.api.root.addResource('leaderboard');
    leaderboardResource.addMethod('GET', new apigateway.LambdaIntegration(this.leaderboardHandler, {
      proxy: true,
      timeout: cdk.Duration.seconds(29),
    }), protectedMethodOptions);

    // --- Gamification API routes ---

    // /guide resource
    const guideResource = this.api.root.addResource('guide');

    // POST /guide/generate — Generate implementation guide (protected)
    const guideGenerateResource = guideResource.addResource('generate');
    guideGenerateResource.addMethod('POST', new apigateway.LambdaIntegration(this.guideGenerateHandler, {
      proxy: true,
      timeout: cdk.Duration.seconds(29),
    }), protectedMethodOptions);

    // POST /guide/chat — Chat about current project (protected)
    const guideChatResource = guideResource.addResource('chat');
    guideChatResource.addMethod('POST', new apigateway.LambdaIntegration(this.guideChatHandler, {
      proxy: true,
      timeout: cdk.Duration.seconds(29),
    }), protectedMethodOptions);

    // /project resource
    const projectResource = this.api.root.addResource('project');

    // POST /project/submit — Submit project photos for grading (protected)
    const projectSubmitResource = projectResource.addResource('submit');
    projectSubmitResource.addMethod('POST', new apigateway.LambdaIntegration(this.projectSubmitHandler, {
      proxy: true,
      timeout: cdk.Duration.seconds(29),
    }), protectedMethodOptions);

    // /projects resource
    const projectsResource = this.api.root.addResource('projects');

    // GET /projects — List user's projects (protected)
    projectsResource.addMethod('GET', new apigateway.LambdaIntegration(this.projectsListHandler, {
      proxy: true,
      timeout: cdk.Duration.seconds(29),
    }), protectedMethodOptions);

    // PATCH /projects/{projectId} — Update project (abandon/delete) (protected)
    const projectByIdResource = projectsResource.addResource('{projectId}');
    projectByIdResource.addMethod('PATCH', new apigateway.LambdaIntegration(this.projectUpdateHandler, {
      proxy: true,
      timeout: cdk.Duration.seconds(29),
    }), protectedMethodOptions);

    // GET /projects/{projectId} — Get a single project by ID (protected)
    projectByIdResource.addMethod('GET', new apigateway.LambdaIntegration(this.projectGetHandler, {
      proxy: true,
      timeout: cdk.Duration.seconds(29),
    }), protectedMethodOptions);

    // --- Community API routes ---

    // /community resource
    const communityResource = this.api.root.addResource('community');
    const communityPostsResource = communityResource.addResource('posts');

    // POST /community/posts — Create a community post (protected)
    communityPostsResource.addMethod('POST', new apigateway.LambdaIntegration(this.communityHandler, {
      proxy: true,
      timeout: cdk.Duration.seconds(29),
    }), protectedMethodOptions);

    // GET /community/posts — Get community feed (protected)
    communityPostsResource.addMethod('GET', new apigateway.LambdaIntegration(this.communityHandler, {
      proxy: true,
      timeout: cdk.Duration.seconds(29),
    }), protectedMethodOptions);

    // /community/posts/{postId}
    const communityPostByIdResource = communityPostsResource.addResource('{postId}');

    // POST /community/posts/{postId}/vote — Vote on a post (protected)
    const communityVoteResource = communityPostByIdResource.addResource('vote');
    communityVoteResource.addMethod('POST', new apigateway.LambdaIntegration(this.communityHandler, {
      proxy: true,
      timeout: cdk.Duration.seconds(29),
    }), protectedMethodOptions);

    // /community/posts/{postId}/comments
    const communityCommentsResource = communityPostByIdResource.addResource('comments');

    // POST /community/posts/{postId}/comments — Add a comment (protected)
    communityCommentsResource.addMethod('POST', new apigateway.LambdaIntegration(this.communityHandler, {
      proxy: true,
      timeout: cdk.Duration.seconds(29),
    }), protectedMethodOptions);

    // GET /community/posts/{postId}/comments — Get comments (protected)
    communityCommentsResource.addMethod('GET', new apigateway.LambdaIntegration(this.communityHandler, {
      proxy: true,
      timeout: cdk.Duration.seconds(29),
    }), protectedMethodOptions);

    // --- Task 2.4: CloudFront Distribution ---

    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'FrontendOAI', {
      comment: 'OAI for ReSource AI frontend bucket',
    });
    this.frontendBucket.grantRead(originAccessIdentity);

    this.distribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(this.frontendBucket, { originAccessIdentity }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html', ttl: cdk.Duration.minutes(5) },
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html', ttl: cdk.Duration.minutes(5) },
      ],
    });

    // --- Stack Outputs (Requirement 14.7) ---

    // --- Task 11.1: Frontend S3 Deployment with CloudFront Invalidation ---

    new s3deploy.BucketDeployment(this, 'FrontendDeployment', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '..', '..', 'frontend', 'dist'))],
      destinationBucket: this.frontendBucket,
      distribution: this.distribution,
      distributionPaths: ['/*'],
    });

    // --- Stack Outputs ---

    new cdk.CfnOutput(this, 'BackendApiUrl', {
      value: this.api.url,
      description: 'Backend API Gateway endpoint URL',
    });

    new cdk.CfnOutput(this, 'FrontendUrl', {
      value: `https://${this.distribution.distributionDomainName}`,
      description: 'Frontend CloudFront distribution URL',
    });

    new cdk.CfnOutput(this, 'ApiKeyId', {
      value: this.apiKey.keyId,
      description: 'API Key ID (retrieve value from AWS Console or CLI)',
    });

    new cdk.CfnOutput(this, 'AuthMode', {
      value: this.authMode,
      description: 'Active authentication mode for this stack (legacy or cognito)',
    });

    if (this.authMode === 'cognito' && this.cognitoUserPool && this.cognitoUserPoolClient) {
      new cdk.CfnOutput(this, 'CognitoUserPoolId', {
        value: this.cognitoUserPool.userPoolId,
        description: 'Cognito User Pool ID',
      });
      new cdk.CfnOutput(this, 'CognitoUserPoolClientId', {
        value: this.cognitoUserPoolClient.userPoolClientId,
        description: 'Cognito User Pool Client ID',
      });
      if (this.cognitoUserPoolDomain) {
        new cdk.CfnOutput(this, 'CognitoHostedUiDomain', {
          value: this.cognitoUserPoolDomain.baseUrl(),
          description: 'Cognito hosted UI base URL',
        });
      }
    }

    // --- CloudWatch Dashboard ---
    this.buildDashboard();
  }

  private buildDashboard(): void {
    // ── Helpers ──────────────────────────────────────────────────────────────

    const fn = (f: NodejsFunction) => f.functionName!;

    const lambdaInvocations = (f: NodejsFunction, label: string) =>
      new cloudwatch.Metric({
        namespace: 'AWS/Lambda',
        metricName: 'Invocations',
        dimensionsMap: { FunctionName: fn(f) },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
        label,
      });

    const lambdaErrors = (f: NodejsFunction, label: string) =>
      new cloudwatch.Metric({
        namespace: 'AWS/Lambda',
        metricName: 'Errors',
        dimensionsMap: { FunctionName: fn(f) },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
        label,
        color: '#d62728',
      });

    const lambdaDuration = (f: NodejsFunction, label: string) =>
      new cloudwatch.Metric({
        namespace: 'AWS/Lambda',
        metricName: 'Duration',
        dimensionsMap: { FunctionName: fn(f) },
        statistic: 'p99',
        period: cdk.Duration.minutes(5),
        label,
      });

    const lambdaThrottles = (f: NodejsFunction, label: string) =>
      new cloudwatch.Metric({
        namespace: 'AWS/Lambda',
        metricName: 'Throttles',
        dimensionsMap: { FunctionName: fn(f) },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
        label,
        color: '#ff7f0e',
      });

    const apiMetric = (metricName: string, stat: string, label: string, color?: string) =>
      new cloudwatch.Metric({
        namespace: 'AWS/ApiGateway',
        metricName,
        dimensionsMap: { ApiName: 'ReSource AI API', Stage: 'prod' },
        statistic: stat,
        period: cdk.Duration.minutes(5),
        label,
        ...(color ? { color } : {}),
      });

    const dynamoMetric = (tableName: string, metricName: string, stat: string, label: string, color?: string) =>
      new cloudwatch.Metric({
        namespace: 'AWS/DynamoDB',
        metricName,
        dimensionsMap: { TableName: tableName },
        statistic: stat,
        period: cdk.Duration.minutes(5),
        label,
        ...(color ? { color } : {}),
      });

    const cfMetric = (metricName: string, stat: string, label: string, color?: string) =>
      new cloudwatch.Metric({
        namespace: 'AWS/CloudFront',
        metricName,
        dimensionsMap: { DistributionId: this.distribution.distributionId, Region: 'Global' },
        statistic: stat,
        period: cdk.Duration.minutes(5),
        label,
        ...(color ? { color } : {}),
      });

    // ── Section header helper ─────────────────────────────────────────────────

    const header = (title: string): cloudwatch.TextWidget =>
      new cloudwatch.TextWidget({
        markdown: `## ${title}`,
        width: 24,
        height: 1,
      });

    // ── Row 0: Title ──────────────────────────────────────────────────────────

    const titleWidget = new cloudwatch.TextWidget({
      markdown: [
        '# 🌿 ReSource AI — Operations Dashboard',
        `**Region:** ${this.region} &nbsp;|&nbsp; **Auth mode:** ${this.authMode} &nbsp;|&nbsp; **API:** [prod](https://console.aws.amazon.com/apigateway)`,
        '',
        'Refresh: 1 min &nbsp;|&nbsp; All Lambda durations are **p99** &nbsp;|&nbsp; Errors shown in red, throttles in orange',
      ].join('\n'),
      width: 24,
      height: 2,
    });

    // ── Row 1: API Gateway overview ───────────────────────────────────────────

    const apiRequestsWidget = new cloudwatch.GraphWidget({
      title: 'API — Requests / 5 min',
      left: [apiMetric('Count', 'Sum', 'Requests', '#1f77b4')],
      width: 8,
      height: 6,
    });

    const apiLatencyWidget = new cloudwatch.GraphWidget({
      title: 'API — Latency p99 (ms)',
      left: [
        apiMetric('Latency', 'p99', 'p99 Latency', '#2ca02c'),
        apiMetric('IntegrationLatency', 'p99', 'Integration p99', '#9467bd'),
      ],
      width: 8,
      height: 6,
    });

    const api4xxWidget = new cloudwatch.GraphWidget({
      title: 'API — 4xx / 5xx Errors',
      left: [
        apiMetric('4XXError', 'Sum', '4xx', '#ff7f0e'),
        apiMetric('5XXError', 'Sum', '5xx', '#d62728'),
      ],
      width: 8,
      height: 6,
    });

    // ── Row 2: CloudFront ─────────────────────────────────────────────────────

    const cfRequestsWidget = new cloudwatch.GraphWidget({
      title: 'CloudFront — Requests / 5 min',
      left: [cfMetric('Requests', 'Sum', 'Requests', '#1f77b4')],
      width: 8,
      height: 6,
    });

    const cfBytesWidget = new cloudwatch.GraphWidget({
      title: 'CloudFront — Bytes Downloaded',
      left: [cfMetric('BytesDownloaded', 'Sum', 'Bytes', '#17becf')],
      width: 8,
      height: 6,
    });

    const cfErrorWidget = new cloudwatch.GraphWidget({
      title: 'CloudFront — Error Rate %',
      left: [
        cfMetric('4xxErrorRate', 'Average', '4xx Rate', '#ff7f0e'),
        cfMetric('5xxErrorRate', 'Average', '5xx Rate', '#d62728'),
      ],
      width: 8,
      height: 6,
    });

    // ── Row 3: Core Lambda — Invocations ─────────────────────────────────────

    const coreInvocationsWidget = new cloudwatch.GraphWidget({
      title: 'Core Lambdas — Invocations / 5 min',
      left: [
        lambdaInvocations(this.submitHandler, 'Submit'),
        lambdaInvocations(this.pollHandler, 'Poll'),
        lambdaInvocations(this.uploadHandler, 'Upload'),
        lambdaInvocations(this.authHandler, 'Auth'),
        lambdaInvocations(this.sessionsHandler, 'Sessions'),
      ],
      width: 12,
      height: 6,
    });

    const coreErrorsWidget = new cloudwatch.GraphWidget({
      title: 'Core Lambdas — Errors / 5 min',
      left: [
        lambdaErrors(this.submitHandler, 'Submit'),
        lambdaErrors(this.pollHandler, 'Poll'),
        lambdaErrors(this.uploadHandler, 'Upload'),
        lambdaErrors(this.authHandler, 'Auth'),
        lambdaErrors(this.sessionsHandler, 'Sessions'),
      ],
      width: 12,
      height: 6,
    });

    // ── Row 4: Core Lambda — Duration & Throttles ─────────────────────────────

    const coreDurationWidget = new cloudwatch.GraphWidget({
      title: 'Core Lambdas — p99 Duration (ms)',
      left: [
        lambdaDuration(this.submitHandler, 'Submit'),
        lambdaDuration(this.pollHandler, 'Poll'),
        lambdaDuration(this.uploadHandler, 'Upload'),
        lambdaDuration(this.authHandler, 'Auth'),
        lambdaDuration(this.sessionsHandler, 'Sessions'),
      ],
      width: 12,
      height: 6,
    });

    const coreThrottlesWidget = new cloudwatch.GraphWidget({
      title: 'Core Lambdas — Throttles / 5 min',
      left: [
        lambdaThrottles(this.submitHandler, 'Submit'),
        lambdaThrottles(this.pollHandler, 'Poll'),
        lambdaThrottles(this.uploadHandler, 'Upload'),
        lambdaThrottles(this.authHandler, 'Auth'),
        lambdaThrottles(this.sessionsHandler, 'Sessions'),
      ],
      width: 12,
      height: 6,
    });

    // ── Row 5: Pipeline ───────────────────────────────────────────────────────

    const pipelineWidget = new cloudwatch.GraphWidget({
      title: 'Pipeline Orchestrator — Invocations & Errors',
      left: [lambdaInvocations(this.pipelineOrchestrator, 'Invocations')],
      right: [lambdaErrors(this.pipelineOrchestrator, 'Errors')],
      width: 12,
      height: 6,
    });

    const pipelineDurationWidget = new cloudwatch.GraphWidget({
      title: 'Pipeline Orchestrator — p99 Duration (ms)',
      left: [lambdaDuration(this.pipelineOrchestrator, 'Duration p99')],
      width: 12,
      height: 6,
    });

    // ── Row 6: Gamification Lambdas ───────────────────────────────────────────

    const gamificationInvocationsWidget = new cloudwatch.GraphWidget({
      title: 'Gamification Lambdas — Invocations / 5 min',
      left: [
        lambdaInvocations(this.guideGenerateHandler, 'Guide Generate'),
        lambdaInvocations(this.guideChatHandler, 'Guide Chat'),
        lambdaInvocations(this.projectSubmitHandler, 'Project Submit'),
        lambdaInvocations(this.projectsListHandler, 'Projects List'),
        lambdaInvocations(this.projectUpdateHandler, 'Project Update'),
        lambdaInvocations(this.projectGetHandler, 'Project Get'),
      ],
      width: 12,
      height: 6,
    });

    const gamificationErrorsWidget = new cloudwatch.GraphWidget({
      title: 'Gamification Lambdas — Errors / 5 min',
      left: [
        lambdaErrors(this.guideGenerateHandler, 'Guide Generate'),
        lambdaErrors(this.guideChatHandler, 'Guide Chat'),
        lambdaErrors(this.projectSubmitHandler, 'Project Submit'),
        lambdaErrors(this.projectsListHandler, 'Projects List'),
        lambdaErrors(this.projectUpdateHandler, 'Project Update'),
        lambdaErrors(this.projectGetHandler, 'Project Get'),
      ],
      width: 12,
      height: 6,
    });

    // ── Row 7: Gamification Duration ──────────────────────────────────────────

    const gamificationDurationWidget = new cloudwatch.GraphWidget({
      title: 'Gamification Lambdas — p99 Duration (ms)',
      left: [
        lambdaDuration(this.guideGenerateHandler, 'Guide Generate'),
        lambdaDuration(this.guideChatHandler, 'Guide Chat'),
        lambdaDuration(this.projectSubmitHandler, 'Project Submit'),
      ],
      width: 12,
      height: 6,
    });

    const communityWidget = new cloudwatch.GraphWidget({
      title: 'Community Lambda — Invocations & Errors',
      left: [lambdaInvocations(this.communityHandler, 'Invocations')],
      right: [lambdaErrors(this.communityHandler, 'Errors')],
      width: 12,
      height: 6,
    });

    // ── Row 8: DynamoDB ───────────────────────────────────────────────────────

    const dynamoReadWidget = new cloudwatch.GraphWidget({
      title: 'DynamoDB — Consumed Read Capacity',
      left: [
        dynamoMetric('resource-ai-sessions', 'ConsumedReadCapacityUnits', 'Sum', 'Sessions', '#1f77b4'),
        dynamoMetric('resource-ai-users', 'ConsumedReadCapacityUnits', 'Sum', 'Users', '#2ca02c'),
        dynamoMetric('resource-ai-projects', 'ConsumedReadCapacityUnits', 'Sum', 'Projects', '#9467bd'),
        dynamoMetric('resource-ai-community', 'ConsumedReadCapacityUnits', 'Sum', 'Community', '#8c564b'),
      ],
      width: 12,
      height: 6,
    });

    const dynamoWriteWidget = new cloudwatch.GraphWidget({
      title: 'DynamoDB — Consumed Write Capacity',
      left: [
        dynamoMetric('resource-ai-sessions', 'ConsumedWriteCapacityUnits', 'Sum', 'Sessions', '#1f77b4'),
        dynamoMetric('resource-ai-users', 'ConsumedWriteCapacityUnits', 'Sum', 'Users', '#2ca02c'),
        dynamoMetric('resource-ai-projects', 'ConsumedWriteCapacityUnits', 'Sum', 'Projects', '#9467bd'),
        dynamoMetric('resource-ai-community', 'ConsumedWriteCapacityUnits', 'Sum', 'Community', '#8c564b'),
      ],
      width: 12,
      height: 6,
    });

    // ── Row 9: DynamoDB Errors & Latency ─────────────────────────────────────

    const dynamoErrorWidget = new cloudwatch.GraphWidget({
      title: 'DynamoDB — System Errors',
      left: [
        dynamoMetric('resource-ai-sessions', 'SystemErrors', 'Sum', 'Sessions', '#d62728'),
        dynamoMetric('resource-ai-users', 'SystemErrors', 'Sum', 'Users', '#ff7f0e'),
        dynamoMetric('resource-ai-projects', 'SystemErrors', 'Sum', 'Projects', '#9467bd'),
        dynamoMetric('resource-ai-community', 'SystemErrors', 'Sum', 'Community', '#8c564b'),
      ],
      width: 12,
      height: 6,
    });

    const dynamoLatencyWidget = new cloudwatch.GraphWidget({
      title: 'DynamoDB — Successful Request Latency (ms)',
      left: [
        dynamoMetric('resource-ai-sessions', 'SuccessfulRequestLatency', 'p99', 'Sessions p99', '#1f77b4'),
        dynamoMetric('resource-ai-users', 'SuccessfulRequestLatency', 'p99', 'Users p99', '#2ca02c'),
      ],
      width: 12,
      height: 6,
    });

    // ── Row 10: Admin & Leaderboard ───────────────────────────────────────────

    const adminLeaderboardWidget = new cloudwatch.GraphWidget({
      title: 'Admin & Leaderboard — Invocations & Errors',
      left: [
        lambdaInvocations(this.adminHandler, 'Admin'),
        lambdaInvocations(this.leaderboardHandler, 'Leaderboard'),
      ],
      right: [
        lambdaErrors(this.adminHandler, 'Admin Errors'),
        lambdaErrors(this.leaderboardHandler, 'Leaderboard Errors'),
      ],
      width: 12,
      height: 6,
    });

    const adminLeaderboardDurationWidget = new cloudwatch.GraphWidget({
      title: 'Admin & Leaderboard — p99 Duration (ms)',
      left: [
        lambdaDuration(this.adminHandler, 'Admin'),
        lambdaDuration(this.leaderboardHandler, 'Leaderboard'),
      ],
      width: 12,
      height: 6,
    });

    // ── Assemble dashboard ────────────────────────────────────────────────────

    const dashboardName = `${this.stackName}-Operations`;
    new cloudwatch.Dashboard(this, 'ResourceAiDashboard', {
      dashboardName,
      defaultInterval: cdk.Duration.hours(3),
      widgets: [
        // Title
        [titleWidget],

        // API Gateway
        [header('🌐 API Gateway')],
        [apiRequestsWidget, apiLatencyWidget, api4xxWidget],

        // CloudFront
        [header('☁️ CloudFront (Frontend CDN)')],
        [cfRequestsWidget, cfBytesWidget, cfErrorWidget],

        // Core Lambdas
        [header('⚡ Core Lambda Functions')],
        [coreInvocationsWidget, coreErrorsWidget],
        [coreDurationWidget, coreThrottlesWidget],

        // Pipeline
        [header('🔬 AI Pipeline (Bedrock)')],
        [pipelineWidget, pipelineDurationWidget],

        // Gamification
        [header('🎮 Gamification & Projects')],
        [gamificationInvocationsWidget, gamificationErrorsWidget],
        [gamificationDurationWidget, communityWidget],

        // Admin & Leaderboard
        [header('🛡️ Admin & Leaderboard')],
        [adminLeaderboardWidget, adminLeaderboardDurationWidget],

        // DynamoDB
        [header('🗄️ DynamoDB')],
        [dynamoReadWidget, dynamoWriteWidget],
        [dynamoErrorWidget, dynamoLatencyWidget],
      ],
    });

    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${dashboardName}`,
      description: 'CloudWatch Operations Dashboard URL',
    });
  }
}
