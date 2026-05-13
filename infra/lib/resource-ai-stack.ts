import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';
import * as path from 'path';

export class ResourceAiStack extends cdk.Stack {
  // Expose resources for use by subsequent tasks
  public readonly sessionsTable: dynamodb.Table;
  public readonly fileStorageBucket: s3.Bucket;
  public readonly frontendBucket: s3.Bucket;
  public readonly api: apigateway.RestApi;
  public readonly apiKey: apigateway.IApiKey;
  public readonly distribution: cloudfront.Distribution;

  // Lambda functions
  public readonly submitHandler: NodejsFunction;
  public readonly pollHandler: NodejsFunction;
  public readonly uploadHandler: NodejsFunction;
  public readonly pipelineOrchestrator: NodejsFunction;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // --- Task 2.1: DynamoDB Table and S3 Buckets ---

    // DynamoDB table for triage sessions
    this.sessionsTable = new dynamodb.Table(this, 'SessionsTable', {
      tableName: 'resource-ai-sessions',
      partitionKey: { name: 'sessionId', type: dynamodb.AttributeType.STRING },
      timeToLiveAttribute: 'expiresAt',
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // S3 bucket for file storage (uploads and generated images)
    this.fileStorageBucket = new s3.Bucket(this, 'FileStorageBucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [{ expiration: cdk.Duration.hours(24) }],
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
      },
    });

    // --- IAM Permissions (least-privilege, no wildcard resource ARNs) ---

    // SubmitHandler: DynamoDB write + Lambda invoke (async invocation of PipelineOrchestrator)
    this.sessionsTable.grantWriteData(this.submitHandler);
    this.pipelineOrchestrator.grantInvoke(this.submitHandler);

    // PollHandler: DynamoDB read + S3 getObject (for pre-signed URLs)
    this.sessionsTable.grantReadData(this.pollHandler);
    this.fileStorageBucket.grantRead(this.pollHandler);

    // UploadHandler: S3 putObject + DynamoDB read (to check file count per session)
    this.fileStorageBucket.grantPut(this.uploadHandler);
    this.sessionsTable.grantReadData(this.uploadHandler);

    // PipelineOrchestrator: DynamoDB read/write + S3 read/write + Bedrock InvokeModel
    this.sessionsTable.grantReadWriteData(this.pipelineOrchestrator);
    this.fileStorageBucket.grantReadWrite(this.pipelineOrchestrator);

    // Bedrock InvokeModel permission - scoped to specific model resources
    this.pipelineOrchestrator.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['bedrock:InvokeModel'],
      resources: [
        `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0`,
        `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-3-haiku-20240307-v1:0`,
        `arn:aws:bedrock:${this.region}::foundation-model/stability.stable-diffusion-xl-v1`,
        `arn:aws:bedrock:${this.region}::foundation-model/amazon.titan-image-generator-v1`,
      ],
    }));

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

    // POST /upload — Upload device evidence file
    const uploadResource = this.api.root.addResource('upload');
    uploadResource.addMethod('POST', new apigateway.LambdaIntegration(this.uploadHandler, {
      proxy: true,
      timeout: cdk.Duration.seconds(29),
    }), methodOptions);

    // /sessions resource
    const sessionsResource = this.api.root.addResource('sessions');

    // POST /sessions — Create new triage session
    sessionsResource.addMethod('POST', new apigateway.LambdaIntegration(this.submitHandler, {
      proxy: true,
      timeout: cdk.Duration.seconds(29),
    }), methodOptions);

    // GET /sessions/{sessionId} — Get session status and results
    const sessionByIdResource = sessionsResource.addResource('{sessionId}');
    sessionByIdResource.addMethod('GET', new apigateway.LambdaIntegration(this.pollHandler, {
      proxy: true,
      timeout: cdk.Duration.seconds(29),
    }), methodOptions);

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
  }
}
