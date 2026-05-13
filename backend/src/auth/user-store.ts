import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { User } from '@resource-ai/shared';

const TABLE_NAME = process.env.USERS_TABLE_NAME!;

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

/**
 * Normalizes an email address by trimming whitespace and converting to lowercase.
 */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export class UserStore {
  /**
   * Creates a new user in the table.
   * Uses a condition expression to ensure the userId doesn't already exist.
   */
  async createUser(user: User): Promise<void> {
    const item: User = {
      ...user,
      email: normalizeEmail(user.email),
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
        ConditionExpression: 'attribute_not_exists(userId)',
      })
    );
  }

  /**
   * Retrieves a user by email using the email-index GSI.
   * Returns null if no user is found with the given email.
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const normalizedEmail = normalizeEmail(email);

    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'email-index',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: {
          ':email': normalizedEmail,
        },
        Limit: 1,
      })
    );

    if (!result.Items || result.Items.length === 0) {
      return null;
    }

    return result.Items[0] as User;
  }

  /**
   * Retrieves a user by their userId (partition key).
   * Returns null if not found.
   */
  async getUserById(userId: string): Promise<User | null> {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { userId },
      })
    );

    return (result.Item as User) ?? null;
  }

  /**
   * Updates a user's attributes and returns the updated user.
   * Automatically sets updatedAt to the current timestamp.
   * Email is normalized if included in updates.
   */
  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    // Normalize email if it's being updated
    const normalizedUpdates = { ...updates };
    if (normalizedUpdates.email) {
      normalizedUpdates.email = normalizeEmail(normalizedUpdates.email);
    }

    // Always update the updatedAt timestamp
    normalizedUpdates.updatedAt = new Date().toISOString();

    // Remove userId from updates — it's the key and can't be updated
    delete normalizedUpdates.userId;

    const expressionParts: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, unknown> = {};

    Object.entries(normalizedUpdates).forEach(([key, value]) => {
      if (value !== undefined) {
        const attrName = `#${key}`;
        const attrValue = `:${key}`;
        expressionParts.push(`${attrName} = ${attrValue}`);
        expressionAttributeNames[attrName] = key;
        expressionAttributeValues[attrValue] = value;
      }
    });

    if (expressionParts.length === 0) {
      // Nothing to update, just return the current user
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    }

    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { userId },
        UpdateExpression: `SET ${expressionParts.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      })
    );

    return result.Attributes as User;
  }

  /**
   * Lists users with pagination using Scan.
   * Returns the paginated users and total count.
   */
  async listUsers(
    limit: number,
    offset: number
  ): Promise<{ users: User[]; total: number }> {
    // First, get the total count
    const countResult = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        Select: 'COUNT',
      })
    );

    const total = countResult.Count ?? 0;

    // Scan with pagination — skip `offset` items, return `limit` items
    const allItems: User[] = [];
    let lastEvaluatedKey: Record<string, unknown> | undefined;
    let scannedCount = 0;

    // Scan through items until we've skipped past the offset and collected enough
    while (true) {
      const scanResult = await docClient.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          ExclusiveStartKey: lastEvaluatedKey,
        })
      );

      const items = (scanResult.Items ?? []) as User[];

      for (const item of items) {
        if (scannedCount >= offset && allItems.length < limit) {
          allItems.push(item);
        }
        scannedCount++;

        if (allItems.length >= limit) {
          break;
        }
      }

      if (allItems.length >= limit || !scanResult.LastEvaluatedKey) {
        break;
      }

      lastEvaluatedKey = scanResult.LastEvaluatedKey;
    }

    return { users: allItems, total };
  }
}
