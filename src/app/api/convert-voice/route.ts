import { convertVoiceServer } from '../../../server/voiceConversionService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Next.js App Router Route Handler: POST /api/convert-voice
 * Uses standard Web Fetch API Request / Response (native to Next.js App Router 13/14/15)
 * Handles multipart/form-data containing sourceAudio (.wav) and targetVoiceSample (.wav)
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const formData = await request.formData();
    const sourceAudioFile = formData.get('sourceAudio') as File | null;
    const targetVoiceFile = formData.get('targetVoiceSample') as File | null;

    if (!sourceAudioFile) {
      return new Response(
        JSON.stringify({ error: 'Missing "sourceAudio" WAV file in formData payload.' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const pitchShift = parseFloat((formData.get('pitchShift') as string) || '0');
    const timbreFidelity = parseFloat((formData.get('timbreFidelity') as string) || '92');
    const preserveBackgroundMusic = formData.get('preserveBackgroundMusic') === 'true';
    const backgroundMusicVolume = parseFloat((formData.get('backgroundMusicVolume') as string) || '15');
    const voicePresetName = (formData.get('voicePresetName') as string) || 'Morgan Vance';
    const duration = parseFloat((formData.get('duration') as string) || '8');
    const trimStart = formData.get('trimStart') ? parseFloat(formData.get('trimStart') as string) : undefined;
    const trimEnd = formData.get('trimEnd') ? parseFloat(formData.get('trimEnd') as string) : undefined;

    // Convert Web File / Blob to Node Buffer
    const sourceArrayBuffer = await sourceAudioFile.arrayBuffer();
    const sourceBuffer = Buffer.from(sourceArrayBuffer);

    let targetBuffer: Buffer | null = null;
    if (targetVoiceFile) {
      const targetArrayBuffer = await targetVoiceFile.arrayBuffer();
      targetBuffer = Buffer.from(targetArrayBuffer);
    }

    const result = await convertVoiceServer(sourceBuffer, targetBuffer, {
      pitchShift,
      timbreFidelity,
      preserveBackgroundMusic,
      backgroundMusicVolume,
      voicePresetName,
      duration,
      trimStart,
      trimEnd,
    });

    const headers = new Headers();
    headers.set('Content-Type', result.mimeType);
    headers.set('X-VocalSwap-Pipeline', result.pipelineUsed);
    headers.set('X-VocalSwap-Model', encodeURIComponent(result.modelDetails));
    if (result.transcript) {
      headers.set('X-VocalSwap-Transcript', encodeURIComponent(result.transcript.substring(0, 200)));
    }

    return new Response(new Uint8Array(result.audioBuffer), {
      status: 200,
      headers,
    });
  } catch (error: unknown) {
    console.error('[Next.js Route /api/convert-voice] Error processing voice conversion:', error);
    const msg = error instanceof Error ? error.message : 'Unknown server voice conversion error';
    return new Response(
      JSON.stringify({ error: 'Voice conversion pipeline failed.', details: msg }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
