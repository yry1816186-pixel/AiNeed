import { Injectable, Logger } from "@nestjs/common";

/**
 * EdgeTTSService - Gateway to Python Edge-TTS endpoint.
 *
 * NestJS acts as the API gateway. Python FastAPI handles actual audio
 * generation via the edge-tts library. This service calls the Python
 * /tts/synthesize endpoint and returns the audio URL to the mobile client.
 *
 * Graceful degradation (WKS-04): If Python TTS endpoint is unreachable,
 * callers receive a null audioUrl -- mobile client shows text-only.
 */
@Injectable()
export class EdgeTTSService {
  private readonly logger = new Logger(EdgeTTSService.name);
  private readonly pythonBaseUrl: string;

  constructor() {
    this.pythonBaseUrl = process.env.PYTHON_AI_URL || "http://localhost:8000";
  }

  /**
   * Call Python FastAPI /tts/synthesize endpoint to generate audio.
   * Returns the audio URL served by Python (MinIO or local static).
   */
  async synthesizeAndUpload(text: string, voice = "zh-CN-XiaoxiaoNeural"): Promise<string | null> {
    try {
      const response = await fetch(`${this.pythonBaseUrl}/tts/synthesize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice, rate: "-10%" }),
      });

      if (!response.ok) {
        throw new Error(`TTS synthesis failed: ${response.status}`);
      }

      const data = (await response.json()) as { audio_url: string };
      return data.audio_url;
    } catch (error) {
      this.logger.warn(
        `TTS synthesis failed: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  }
}
