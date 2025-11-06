// Runs a series of async/sync middlewares to shape a Session.
import type { Session } from './types';

export type SessionMiddleware = (s: Session) => Promise<Session> | Session;

export class Pipeline {
  private middlewares: SessionMiddleware[] = [];

  use(mw: SessionMiddleware) {
    this.middlewares.push(mw);
    return this;
  }

  async run(session: Session): Promise<Session> {
    let cur = session;
    for (const mw of this.middlewares) {
      cur = await mw(cur);
    }
    return cur;
  }
}