import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

export type ConversionStatus = 'uploading' | 'processing' | 'completed' | 'failed';

export interface ConversionRecord {
  id: string;
  sessionId: string;
  originalVideoUrl: string;
  originalVideoName: string;
  voiceSampleUrl?: string | null;
  targetVoiceName: string;
  convertedVideoUrl?: string | null;
  convertedAudioUrl?: string | null;
  originalAudioUrl?: string | null;
  duration?: number;
  pitchShift?: number;
  timbreFidelity?: number;
  modelUsed?: string;
  status: ConversionStatus;
  error?: string | null;
  createdAt: any;
  updatedAt?: any;
}

const COLLECTION_NAME = 'conversions';

/**
 * Creates a new conversion record in Firestore with initial 'uploading' or 'processing' status
 */
export async function createConversionRecord(
  data: Omit<ConversionRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<string> {
  const recordId = data.id || `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const recordRef = doc(db, COLLECTION_NAME, recordId);

  try {
    const recordPayload = {
      ...data,
      id: recordId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(recordRef, recordPayload, { merge: true });
    return recordId;
  } catch (error) {
    console.warn('[Firestore] Error creating conversion document:', error);
    // Return recordId even if offline/fallback so execution continues
    return recordId;
  }
}

/**
 * Updates status and outputs for an active conversion
 */
export async function updateConversionStatus(
  id: string,
  status: ConversionStatus,
  updates: Partial<Omit<ConversionRecord, 'id' | 'createdAt'>> = {}
): Promise<void> {
  try {
    const recordRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(recordRef, {
      ...updates,
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.warn(`[Firestore] Error updating status for record ${id}:`, error);
  }
}

/**
 * Fetches recent conversions ordered by creation time descending
 */
export async function getRecentConversions(limitCount = 10): Promise<ConversionRecord[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    const results: ConversionRecord[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as ConversionRecord;
      results.push({
        ...data,
        id: docSnap.id,
      });
    });

    return results;
  } catch (error) {
    console.warn('[Firestore] Error fetching recent conversions:', error);
    return [];
  }
}

/**
 * Subscribes to real-time recent conversions
 */
export function subscribeRecentConversions(
  callback: (records: ConversionRecord[]) => void,
  limitCount = 10
): () => void {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const records: ConversionRecord[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as ConversionRecord;
          records.push({
            ...data,
            id: docSnap.id,
          });
        });
        callback(records);
      },
      (error) => {
        console.warn('[Firestore] onSnapshot error:', error);
        callback([]);
      }
    );
  } catch (error) {
    console.warn('[Firestore] subscribe error:', error);
    return () => {};
  }
}

/**
 * Deletes a conversion record from Firestore
 */
export async function deleteConversionRecord(id: string): Promise<boolean> {
  try {
    const recordRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(recordRef);
    return true;
  } catch (error) {
    console.warn(`[Firestore] Error deleting record ${id}:`, error);
    return false;
  }
}
