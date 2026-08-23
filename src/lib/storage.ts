import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

export interface UploadResult {
  downloadUrl: string;
  storagePath: string;
  sizeBytes: number;
}

/**
 * Uploads a video or audio File/Blob to Firebase Storage with progress tracking.
 * Falls back to an Object URL if Firebase Storage is offline or unprovisioned.
 */
export async function uploadFileToStorage(
  file: File | Blob,
  path: string,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  const sizeBytes = file.size;

  try {
    const storageRef = ref(storage, path);
    const contentType = file.type || (path.endsWith('.mp4') ? 'video/mp4' : path.endsWith('.wav') ? 'audio/wav' : 'application/octet-stream');
    
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType,
    });

    return await new Promise<UploadResult>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (snapshot.totalBytes > 0) {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (onProgress) {
              onProgress(Math.round(progress));
            }
          }
        },
        (error) => {
          console.warn(`[Firebase Storage] Upload error for path "${path}":`, error);
          // Fallback to local Object URL so app execution never crashes
          try {
            const fallbackUrl = URL.createObjectURL(file);
            resolve({
              downloadUrl: fallbackUrl,
              storagePath: path,
              sizeBytes,
            });
          } catch {
            reject(error);
          }
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            if (onProgress) onProgress(100);
            resolve({
              downloadUrl,
              storagePath: path,
              sizeBytes,
            });
          } catch (urlError) {
            console.warn('[Firebase Storage] getDownloadURL error, using object URL:', urlError);
            const fallbackUrl = URL.createObjectURL(file);
            resolve({
              downloadUrl: fallbackUrl,
              storagePath: path,
              sizeBytes,
            });
          }
        }
      );
    });
  } catch (err) {
    console.warn(`[Firebase Storage] Direct upload exception for "${path}", falling back:`, err);
    const fallbackUrl = URL.createObjectURL(file);
    if (onProgress) onProgress(100);
    return {
      downloadUrl: fallbackUrl,
      storagePath: path,
      sizeBytes,
    };
  }
}

/**
 * Storage Path Generators
 */
export function getStoragePaths(sessionId: string) {
  return {
    originalVideoPath: `videos/${sessionId}/original.mp4`,
    voiceSamplePath: `voices/${sessionId}/sample.wav`,
    extractedAudioPath: `audio/${sessionId}/extracted.wav`,
    convertedAudioPath: `audio/${sessionId}/converted.wav`,
    finalOutputPath: `outputs/${sessionId}/final_output.mp4`,
  };
}
