import { getFirestore } from '@/config/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export class FirestoreService {
  private static db = getFirestore;

  static collection(name: string) {
    return this.db().collection(name);
  }

  static batch() {
    return this.db().batch();
  }

  static doc(collectionName: string, docId: string) {
    return this.db().collection(collectionName).doc(docId);
  }

  static serverTimestamp() {
    return Timestamp.now();
  }

  /**
   * Get a document by full path (e.g., "Users/uid123") or by collection and ID
   */
  static async getDocument<T extends object>(
    pathOrCollection: string,
    docId?: string
  ): Promise<T | null> {
    const doc = docId
      ? await this.doc(pathOrCollection, docId).get()
      : await this.db().doc(pathOrCollection).get();

    if (!doc.exists) {
      return null;
    }
    return { id: doc.id, ...doc.data() } as T;
  }

  /**
   * Create a document in a collection (full path like "Users/uid123/Tokens")
   */
  static async createDocument(collectionPath: string, data: Record<string, unknown>): Promise<string> {
    const docRef = await this.db().collection(collectionPath).add(data);
    return docRef.id;
  }

  /**
   * Set/update a document at a specific path (e.g., "Users/uid123")
   */
  static async setDocument<T extends object>(
    documentPath: string,
    data: T,
    merge = false
  ): Promise<void> {
    await this.db().doc(documentPath).set(data, { merge });
  }

  /**
   * Update specific fields in a document
   */
  static async updateDocument(
    collectionName: string,
    docId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    await this.doc(collectionName, docId).update(data);
  }

  /**
   * Delete a document by full path (e.g., "Users/uid123/Tokens/token1") or by collection and ID
   */
  static async deleteDocument(pathOrCollection: string, docId?: string): Promise<void> {
    if (docId) {
      await this.doc(pathOrCollection, docId).delete();
    } else {
      await this.db().doc(pathOrCollection).delete();
    }
  }

  /**
   * Get all documents from a collection
   */
  static async getAllDocuments<T>(collectionPath: string): Promise<T[]> {
    const snapshot = await this.db().collection(collectionPath).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
  }

  /**
   * Query documents with filters, ordering, and limit
   */
  static async queryDocuments<T>(
    collectionName: string,
    filters: { field: string; operator: FirebaseFirestore.WhereFilterOp; value: unknown }[],
    orderByField?: string,
    orderDirection: 'asc' | 'desc' = 'desc',
    limitCount?: number
  ): Promise<T[]> {
    let query: FirebaseFirestore.Query = this.collection(collectionName);

    for (const filter of filters) {
      query = query.where(filter.field, filter.operator, filter.value);
    }

    if (orderByField) {
      query = query.orderBy(orderByField, orderDirection);
    }

    if (limitCount) {
      query = query.limit(limitCount);
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
  }
}
