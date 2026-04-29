import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { EdgeTTSService } from "../tts.service";

export interface TtsFallbackResult {
  audioUrl: string | null;
  status: "audio_ready" | "audio_unavailable";
  text: string;
}

@Injectable()
export class TtsFallbackService {
  private readonly logger = new Logger(TtsFallbackService.name);
  private readonly ttsTimeoutMs: number;

  constructor(
    private readonly ttsService: EdgeTTSService,
    private readonly configService: ConfigService
  ) {
    this.ttsTimeoutMs = parseInt(this.configService.get<string>("TTS_TIMEOUT_MS", "3000"), 10);
  }

  async synthesizeWithFallback(text: string): Promise<TtsFallbackResult> {
    try {
      const audioUrl = await this.ttsService.synthesizeAndUpload(text);

      if (audioUrl) {
        return { audioUrl, status: "audio_ready", text };
      }

      this.logger.warn(
        `[TTS_FALLBACK] Edge-TTS returned null, falling back to text-only for phrase key`
      );
      return { audioUrl: null, status: "audio_unavailable", text };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `[TTS_FALLBACK] Edge-TTS failed: ${errorMessage}. Serving text-only response.`
      );
      return { audioUrl: null, status: "audio_unavailable", text };
    }
  }

  async getCachedAudioWithFallback(textKey: string): Promise<TtsFallbackResult> {
    try {
      const audioUrl = await this.ttsService.getCachedAudio(textKey);

      if (audioUrl) {
        return { audioUrl, status: "audio_ready", text: textKey };
      }

      this.logger.debug(`[TTS_FALLBACK] No cached audio for key: ${textKey}, returning text-only`);
      return { audioUrl: null, status: "audio_unavailable", text: textKey };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(`[TTS_FALLBACK] Cache lookup failed for ${textKey}: ${errorMessage}`);
      return { audioUrl: null, status: "audio_unavailable", text: textKey };
    }
  }
}
