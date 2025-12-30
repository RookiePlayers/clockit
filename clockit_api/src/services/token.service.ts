import { Timestamp } from 'firebase-admin/firestore';
import { FirestoreService } from './firestore.service';
import { CryptoService } from './crypto.service';
import { COLLECTIONS } from '@/config/constants';
import { NotFoundError, AuthorizationError } from '@/utils/errors';
import {
  ApiTokenSchema,
  type ApiToken,
  type CreateTokenRequest,
  type CreateTokenResponse,
  type TokenListItem,
} from '@/models/token.model';

export class TokenService {
  static async createToken(
    uid: string,
    request: CreateTokenRequest
  ): Promise<CreateTokenResponse> {
    const rawToken = CryptoService.generateToken();
    const tokenHash = await CryptoService.hashToken(rawToken);
    const lastFour = CryptoService.getLastFour(rawToken);

    const expiresAt = request.expiresInDays
      ? Timestamp.fromDate(
          new Date(Date.now() + request.expiresInDays * 24 * 60 * 60 * 1000)
        )
      : null;

    const tokenData = {
      uid,
      name: request.name || 'API Token',
      tokenHash,
      lastFour,
      createdAt: FirestoreService.serverTimestamp(),
      expiresAt,
      lastUsedAt: null,
    };

    const id = await FirestoreService.createDocument(COLLECTIONS.API_TOKENS, tokenData);

    return {
      id,
      token: rawToken,
      name: tokenData.name,
      lastFour,
      createdAt: tokenData.createdAt.toDate().toISOString(),
      expiresAt: expiresAt?.toDate().toISOString() || null,
    };
  }

  static async listTokens(uid: string): Promise<TokenListItem[]> {
    const tokens = await FirestoreService.queryDocuments<ApiToken>(
      COLLECTIONS.API_TOKENS,
      [{ field: 'uid', operator: '==', value: uid }],
      'createdAt',
      'desc'
    );

    return tokens.map(token => this.formatTokenListItem(token));
  }

  static async getToken(tokenId: string, uid: string): Promise<TokenListItem> {
    const token = await FirestoreService.getDocument(
      COLLECTIONS.API_TOKENS,
      tokenId
    );

    if (!token) {
      throw new NotFoundError('Token');
    }

    const schema = ApiTokenSchema.safeParse(token);
    if (!schema.success) {
      throw new NotFoundError('Token');
    }
    const apiToken = schema.data;

    if (apiToken.uid !== uid) {
      throw new AuthorizationError('You do not have access to this token');
    }

    return this.formatTokenListItem(apiToken);
  }

  static async revokeToken(tokenId: string, uid: string): Promise<void> {
    const token = await FirestoreService.getDocument(
      COLLECTIONS.API_TOKENS,
      tokenId
    );

    if (!token) {
      throw new NotFoundError('Token');
    }

    const apiToken = token as unknown as ApiToken;
    if (apiToken.uid !== uid) {
      throw new AuthorizationError('You do not have access to this token');
    }

    await FirestoreService.deleteDocument(COLLECTIONS.API_TOKENS, tokenId);
  }

  private static formatTokenListItem(token: ApiToken): TokenListItem {
    const toISOString = (date: Timestamp | Date | null): string | null => {
      if (!date) {
return null;}
      if (date instanceof Timestamp) {
        return date.toDate().toISOString();
      }
      return date.toISOString();
    };

    return {
      id: token.id,
      name: token.name,
      lastFour: token.lastFour,
      createdAt: toISOString(token.createdAt) || new Date().toISOString(),
      expiresAt: toISOString(token.expiresAt),
      lastUsedAt: toISOString(token.lastUsedAt),
    };
  }
}
