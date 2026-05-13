import { APIGatewayTokenAuthorizerEvent, APIGatewayAuthorizerResult } from 'aws-lambda';
import { verifyToken } from '../auth/jwt-service';

/**
 * Lambda Authorizer that validates JWT tokens from the Authorization header.
 * Extracts userId, email, and role from valid tokens and passes them
 * to downstream handlers via the authorizer context.
 */
export async function handler(
  event: APIGatewayTokenAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> {
  const token = event.authorizationToken?.replace('Bearer ', '');

  if (!token) {
    throw new Error('Unauthorized');
  }

  try {
    const decoded = verifyToken(token);
    const arnParts = event.methodArn.split('/');
    const apiStageArn = arnParts.slice(0, 2).join('/');

    return {
      principalId: decoded.userId,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: `${apiStageArn}/*/*`,
          },
        ],
      },
      context: {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      },
    };
  } catch (error) {
    throw new Error('Unauthorized');
  }
}
