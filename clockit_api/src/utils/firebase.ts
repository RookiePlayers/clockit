import { DocumentData, Timestamp } from "firebase-admin/firestore";
import z from "zod";


export type WithTimestamps = {
    dateCreated?: number;
    lastUpdated?: number;
};


export const firebaseTimestampToMs = (timestamp: Timestamp | number): number => {
    if (typeof timestamp === "number") {
        return timestamp;
    }
    return timestamp.toMillis();
};

export const msToFirebaseTimestamp = (ms: number): Timestamp => {
    return Timestamp.fromMillis(ms);
};

export const firebaseDocTimestampWrapper = (data: DocumentData | undefined): DocumentData & WithTimestamps => {
    if (!data) {
        return {};
    }
    let dateCreated: Timestamp | number = 0;
    let lastUpdated: Timestamp | number = 0;
    let updatedAt: Timestamp | number = 0;
    if ('dateCreated' in data) {
        const timestampSchema = z.union([
            z.instanceof(Timestamp),
            z.number()
        ]);
        const created = timestampSchema.safeParse(data.dateCreated);
        if (created.success) {
            dateCreated = created.data;
        }
    }
    if ('lastUpdated' in data) {
        const timestampSchema = z.union([
            z.instanceof(Timestamp),
            z.number()
        ]);
        const updated = timestampSchema.safeParse(data.lastUpdated);
        if (updated.success) {
            lastUpdated = updated.data;
        }
    }

    if ('updatedAt' in data) {
        const timestampSchema = z.union([
            z.instanceof(Timestamp),
            z.number()
        ]);
        const updated = timestampSchema.safeParse(data.updatedAt);
        if (updated.success) {
            updatedAt = updated.data;
        }
    }

    

    return {
        ...data,
        dateCreated: dateCreated ? firebaseTimestampToMs(dateCreated) : 0,
        lastUpdated: lastUpdated ? firebaseTimestampToMs(lastUpdated) : 0,
        updatedAt: updatedAt ? firebaseTimestampToMs(updatedAt) : 0,
    };

};