import crypto from 'crypto';
import { TOKEN_PREFIX } from '@/config/constants';

export class CryptoService {
  static async hashToken(token: string): Promise<string> {
    const hash = crypto.createHash('sha256');
    hash.update(token);
    return hash.digest('hex');
  }

  static generateToken(): string {
    const uuid = crypto.randomUUID();
    const random = crypto.randomBytes(3).toString('hex');
    return `${TOKEN_PREFIX}${uuid}_${random}`;
  }

  static getLastFour(token: string): string {
    return token.slice(-4);
  }
}
