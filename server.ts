import express from 'express';
import path from 'path';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { convertVoiceServer } from './src/server/voiceConversionService';
import { analyzeAudioAndScript } from './src/lib/gemini';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB audio limit
  },
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Basic middlewares
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Set COOP and COEP headers for WebAssembly SharedArrayBuffer execution
  app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    next();
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'VocalSwap AI Audio Processing Server',
      hfConfigured: Boolean(process.env.HF_TOKEN && process.env.HF_TOKEN !== 'MY_HF_TOKEN'),
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
    });
  });

  // Gemini Audio Analysis & Transcription API Routes
  const handleGeminiAnalyze = async (req: express.Request, res: express.Response) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      const audioFile = req.file;

      let audioBuffer: Buffer | null = audioFile ? audioFile.buffer : null;
      let prompt: string | undefined = req.body?.prompt;

      if (!audioBuffer && req.body?.audioBase64) {
        audioBuffer = Buffer.from(req.body.audioBase64, 'base64');
      }

      if (!audioBuffer) {
        return res.status(400).json({
          success: false,
          error: 'Missing required "audio" WAV/MP3 file in form-data or "audioBase64" in JSON body.',
        });
      }

      console.log(`[API Gemini Analysis] Processing audio buffer of ${audioBuffer.byteLength} bytes...`);
      const analysis = await analyzeAudioAndScript(audioBuffer, prompt);

      return res.json({
        success: true,
        analysis,
      });
    } catch (err: unknown) {
      console.error('[API Gemini Analysis] Error:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      const isQuota =
        errMsg.includes('429') ||
        errMsg.toLowerCase().includes('quota') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.toLowerCase().includes('rate limit');

      if (isQuota) {
        return res.status(429).json({
          success: false,
          error: 'Gemini API quota limit reached. Please try again later.',
          code: 'QUOTA_EXHAUSTED',
          details: errMsg,
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to analyze audio with Gemini API.',
        details: errMsg,
      });
    }
  };

  app.post('/api/analyze-audio', upload.single('audio'), handleGeminiAnalyze);
  app.post('/api/gemini/analyze', upload.single('audio'), handleGeminiAnalyze);

  // Main Voice Conversion API Route
  app.post(
    '/api/convert-voice',
    upload.fields([
      { name: 'sourceAudio', maxCount: 1 },
      { name: 'targetVoiceSample', maxCount: 1 },
    ]),
    async (req, res) => {
      try {
        const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
        const sourceAudioFile = files?.['sourceAudio']?.[0];
        const targetVoiceFile = files?.['targetVoiceSample']?.[0];

        if (!sourceAudioFile) {
          return res.status(400).json({
            error: 'Missing required "sourceAudio" WAV file in form-data.',
          });
        }

        const pitchShift = req.body.pitchShift ? parseFloat(req.body.pitchShift) : 0;
        const timbreFidelity = req.body.timbreFidelity ? parseFloat(req.body.timbreFidelity) : 92;
        const preserveBackgroundMusic = req.body.preserveBackgroundMusic === 'true' || req.body.preserveBackgroundMusic === true;
        const backgroundMusicVolume = req.body.backgroundMusicVolume ? parseFloat(req.body.backgroundMusicVolume) : 15;
        const voicePresetName = req.body.voicePresetName || 'Morgan Vance';
        const duration = req.body.duration ? parseFloat(req.body.duration) : 8;
        const trimStart = req.body.trimStart ? parseFloat(req.body.trimStart) : undefined;
        const trimEnd = req.body.trimEnd ? parseFloat(req.body.trimEnd) : undefined;
        const genderMode = req.body.genderMode || 'custom';
        const targetGender = req.body.targetGender;

        const result = await convertVoiceServer(
          sourceAudioFile.buffer,
          targetVoiceFile ? targetVoiceFile.buffer : null,
          {
            pitchShift,
            timbreFidelity,
            preserveBackgroundMusic,
            backgroundMusicVolume,
            voicePresetName,
            duration,
            trimStart,
            trimEnd,
            genderMode,
            targetGender,
          }
        );

        res.setHeader('Content-Type', result.mimeType);
        res.setHeader('X-VocalSwap-Pipeline', result.pipelineUsed);
        res.setHeader('X-VocalSwap-Model', encodeURIComponent(result.modelDetails));
        if (result.transcript) {
          res.setHeader('X-VocalSwap-Transcript', encodeURIComponent(result.transcript.substring(0, 200)));
        }

        return res.send(result.audioBuffer);
      } catch (err: unknown) {
        console.error('[API /api/convert-voice] Error processing request:', err);
        const errMsg = err instanceof Error ? err.message : String(err);
        return res.status(500).json({
          error: 'Voice conversion pipeline failed.',
          details: errMsg,
        });
      }
    }
  );

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[VocalSwap Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
