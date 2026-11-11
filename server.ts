import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));

// Initialize Google Gemini Client (Server-side only)
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// 1. Diagnostic Vocal & Rack Tuning Route
app.post('/api/ai/diagnose-vocal', async (req, res) => {
  try {
    const { key, scale, peakDb, rmsDb, lufsDb, currentKnobs, userGoal } = req.body;

    const prompt = `You are SAUC3 AGENT, an elite studio mastering sound engineer and DSP audio rack expert.
Analyze the following live vocal and rack telemetry:
- Detected Key: ${key || 'C'} ${scale || 'Major'}
- Peak Level: ${peakDb || '-18'} dBFS
- RMS Power: ${rmsDb || '-22'} dBFS
- Estimated LUFS: ${lufsDb || '-25'} LUFS
- Current Module Settings:
  * Preamp Gain: ${currentKnobs?.preampGain ?? 6} dB, Drive: ${currentKnobs?.preampDrive ?? 25}%, HPF: ${currentKnobs?.preampHpf ?? 80} Hz
  * Opto Compressor: Thresh ${currentKnobs?.compThresh ?? -18} dB, Ratio ${currentKnobs?.compRatio ?? 4}:1, Attack ${currentKnobs?.compAttack ?? 20} ms, Makeup ${currentKnobs?.compMakeup ?? 3} dB
  * 4-Band Parametric EQ: Low Cut(250Hz) ${currentKnobs?.eqLow ?? -3} dB, Mid Presence(1.5kHz) ${currentKnobs?.eqMid ?? 2} dB, High Shine(5kHz) ${currentKnobs?.eqHigh ?? 4} dB, Air Shelf(12kHz) ${currentKnobs?.eqAir ?? 3} dB
  * Space & Delay: Reverb Time ${currentKnobs?.spaceDecay ?? 2.5}s, Reverb Mix ${currentKnobs?.spaceVerbMix ?? 20}%, Delay FB ${currentKnobs?.spaceDelayFb ?? 30}%, Delay Mix ${currentKnobs?.spaceDelayMix ?? 15}%
  * Master Limiter: Ceiling ${currentKnobs?.masterCeiling ?? -0.1} dB, Boost ${currentKnobs?.masterGain ?? 2} dB, Soft Clipper ${currentKnobs?.masterClip ?? 40}%, Width ${currentKnobs?.masterWidth ?? 110}%
${userGoal ? `- Producer Vocal Goal: "${userGoal}"` : ''}

Provide a concise, professional diagnosis for mixing this vocal to sit flawlessly in the mix, plus concrete recommended knob adjustment settings in JSON format.
Output strictly JSON matching this structure:
{
  "summary": "Short 1-sentence assessment of the vocal frequency profile and gain staging",
  "recommendations": [
    "Specific actionable mixing recommendation 1",
    "Specific actionable mixing recommendation 2",
    "Specific actionable mixing recommendation 3"
  ],
  "recommendedKnobs": {
    "preampGain": number,
    "preampDrive": number,
    "preampHpf": number,
    "compThresh": number,
    "compRatio": number,
    "compAttack": number,
    "compMakeup": number,
    "eqLow": number,
    "eqMid": number,
    "eqHigh": number,
    "eqAir": number,
    "spaceDecay": number,
    "spaceVerbMix": number,
    "spaceDelayFb": number,
    "spaceDelayMix": number,
    "masterCeiling": number,
    "masterGain": number,
    "masterClip": number,
    "masterWidth": number
  }
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text);
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/ai/diagnose-vocal:', error);
    // Graceful fallback response
    return res.json({
      summary: 'Signal is within usable operational range. Tube saturation and high-frequency presence can be tailored for enhanced vocal articulation.',
      recommendations: [
        'Engage High Pass Filter at 90Hz to eliminate mechanical low-end rumble.',
        'Apply moderate optical compression (-18dB threshold, 4:1 ratio) to level dynamic spikes.',
        'Boost Air Shelf (12kHz) by +3.5dB for modern polished pop sheen.',
      ],
      recommendedKnobs: {
        preampGain: 6,
        preampDrive: 28,
        preampHpf: 90,
        compThresh: -18,
        compRatio: 4,
        compAttack: 20,
        compMakeup: 3,
        eqLow: -3.5,
        eqMid: 2,
        eqHigh: 4,
        eqAir: 3.5,
        spaceDecay: 2.2,
        spaceVerbMix: 18,
        spaceDelayFb: 25,
        spaceDelayMix: 12,
        masterCeiling: -0.1,
        masterGain: 2,
        masterClip: 35,
        masterWidth: 110,
      },
    });
  }
});

// 2. Interactive Studio Assistant Chat Route
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { messages, context } = req.body;

    const chatHistory = Array.isArray(messages) ? messages : [];
    const formattedContents = chatHistory.map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const systemInstruction = `You are SAUC3 AGENT, an elite studio audio engineer, vocal producer, and analog rack DSP hardware specialist.
You assist music producers, audio engineers, recording artists, and sound designers with:
- Vocal recording chains (preamp gain staging, tube warmth, optical compression vs VCA)
- Harmonic key detection, pitch correction, autotune retune speed, formant shifting
- Frequency carving, sibilance control, air shelf boosts, mud cleanups
- Spatial effects: stereo ping-pong delays, algorithmic hall & plate reverbs
- Master brickwall limiting, true peak ceilings, soft clipping, loudness LUFS targets (-14 LUFS streaming vs -9 LUFS club)

Live Context:
- Detected Key: ${context?.key || 'C'} ${context?.scale || 'Major'}
- Peak: ${context?.peakDb || '-18'} dBFS
- RMS: ${context?.rmsDb || '-22'} dBFS

Keep answers concise, direct, technically accurate, and studio-ready. Use bullet points where helpful.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: formattedContents,
      config: {
        systemInstruction,
      },
    });

    const reply = response.text || 'Keep high pass filtering around 80-100Hz and aim for -18 dBFS nominal recording levels.';
    return res.json({ reply });
  } catch (error: any) {
    console.error('Error in /api/ai/chat:', error);
    return res.json({
      reply: 'Optimal vocal chain confirmed: Preamp -> Optical Compressor -> 4-Band EQ -> Space Delay -> Peak Limiter. Ensure at least 6dB of headroom before final master clipping.',
    });
  }
});

// Mount Vite or serve static
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SAUC3 AGENT Studio server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
