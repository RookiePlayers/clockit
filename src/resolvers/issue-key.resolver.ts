export class IssueKeyResolver {
  static extract(input?: string | null): string | null {
    if (!input) {return null;}
    const match = input.match(/[A-Z]{2,10}-\d+/i);
    return match ? match[0].toUpperCase() : null;
  }

  static resolve(session: any): any {
    const keyFromBranch = this.extract(session.branch);
    if (keyFromBranch) {return { ...session, issueKey: keyFromBranch };}

    const keyFromComment = this.extract(session.comment);
    if (keyFromComment) {return { ...session, issueKey: keyFromComment };}

    return session;
  }
}