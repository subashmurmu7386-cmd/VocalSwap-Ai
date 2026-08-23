import { analyzeAudioAndScript, isGeminiConfigured } from '../../../../lib/gemini';

export async function GET() {
  const configured = isGeminiConfigured();
  return Response.json({
    status: 'ok',
    configured,
    model: 'gemini-3.6-flash',
    message: configured
      ? 'Gemini API is active and configured.'
      : 'GEMINI_API_KEY / NEXT_PUBLIC_GEMINI_API_KEY is missing or unconfigured.',
  });
}

export async function POST(req: Request) {
  try {
    const apiKey =
      (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY || process.env?.NEXT_PUBLIC_GEMINI_API_KEY : '') || '';

    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || !isGeminiConfigured()) {
      return Response.json(
        {
          success: false,
          error: 'GEMINI_API_KEY environment variable is not configured on the server.',
          code: 'UNCONFIGURED_API_KEY',
        },
        { status: 401 }
      );
    }

    let audioBuffer: Buffer | null = null;
    let customPrompt: string | undefined = undefined;

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('audio') || formData.get('file');
      if (file && typeof file !== 'string') {
        const bytes = await (file as Blob).arrayBuffer();
        audioBuffer = Buffer.from(bytes);
      }
      const promptVal = formData.get('prompt');
      if (promptVal && typeof promptVal === 'string') {
        customPrompt = promptVal;
      }
    } else if (contentType.includes('application/json')) {
      const body = (await req.json()) as { audioBase64?: string; prompt?: string };
      if (body.audioBase64) {
        audioBuffer = Buffer.from(body.audioBase64, 'base64');
      }
      if (body.prompt) {
        customPrompt = body.prompt;
      }
    } else {
      const arrayBuffer = await req.arrayBuffer();
      if (arrayBuffer.byteLength > 0) {
        audioBuffer = Buffer.from(arrayBuffer);
      }
    }

    if (!audioBuffer) {
      return Response.json(
        {
          success: false,
          error: 'Missing required audio file or audioBase64 payload in request.',
        },
        { status: 400 }
      );
    }

    const analysis = await analyzeAudioAndScript(audioBuffer, customPrompt);

    return Response.json({
      success: true,
      analysis,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[API /api/gemini/analyze] Server Error:', errorMsg);

    const isQuota =
      errorMsg.includes('429') ||
      errorMsg.toLowerCase().includes('quota') ||
      errorMsg.includes('RESOURCE_EXHAUSTED') ||
      errorMsg.toLowerCase().includes('rate limit');

    if (isQuota) {
      return Response.json(
        {
          success: false,
          error: 'Gemini API quota limit reached or rate limit exceeded. Please try again later.',
          code: 'QUOTA_EXHAUSTED',
          details: errorMsg,
        },
        { status: 429 }
      );
    }

    return Response.json(
      {
        success: false,
        error: 'Failed to complete audio analysis with Gemini API.',
        details: errorMsg,
      },
      { status: 500 }
    );
  }
}
