import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as fs from 'fs';
import * as path from 'path';

type SensitivityLevel = 'strict' | 'moderate' | 'loose';

interface FilterResult {
  passed: boolean;
  matchedKeywords: string[];
  sanitizedContent: string;
}

const SENSITIVITY_KEYWORD_RATIO: Record<SensitivityLevel, number> = {
  strict: 1.0,
  moderate: 0.7,
  loose: 0.4,
};

@Injectable()
export class ContentFilterService {
  private readonly logger = new Logger(ContentFilterService.name);
  private readonly keywords: string[] = [];
  private readonly sensitivity: SensitivityLevel;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.sensitivity = this.configService.get<SensitivityLevel>(
      'CONTENT_FILTER_SENSITIVITY',
      'moderate',
    );

    const keywordsFile = path.join(__dirname, 'banned-keywords.txt');
    try {
      const raw = fs.readFileSync(keywordsFile, 'utf-8');
      this.keywords = raw
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('#'));

      const ratio = SENSITIVITY_KEYWORD_RATIO[this.sensitivity];
      const cutoff = Math.ceil(this.keywords.length * ratio);
      this.keywords = this.keywords.slice(0, cutoff);

      this.logger.log(
        `Loaded ${this.keywords.length} keywords (sensitivity: ${this.sensitivity})`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to load banned-keywords.txt: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  filterContent(content: string): FilterResult {
    const matchedKeywords = this.findMatches(content);
    const passed = matchedKeywords.length === 0;
    const sanitizedContent = this.replaceMatches(content, matchedKeywords);

    if (!passed) {
      this.logger.warn(
        `Content blocked: ${matchedKeywords.length} keyword(s) matched`,
      );
      this.eventEmitter.emit('content.filtered', {
        matchedCount: matchedKeywords.length,
        sensitivity: this.sensitivity,
        timestamp: new Date().toISOString(),
      });
    }

    return { passed, matchedKeywords, sanitizedContent };
  }

  isContentSafe(content: string): boolean {
    return this.findMatches(content).length === 0;
  }

  sanitizeContent(content: string): string {
    const matchedKeywords = this.findMatches(content);
    return this.replaceMatches(content, matchedKeywords);
  }

  private findMatches(content: string): string[] {
    const lower = content.toLowerCase();
    const matched: string[] = [];

    for (const keyword of this.keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        matched.push(keyword);
      }
    }

    return matched;
  }

  private replaceMatches(content: string, keywords: string[]): string {
    let result = content;
    for (const keyword of keywords) {
      const pattern = new RegExp(this.escapeRegex(keyword), 'gi');
      result = result.replace(pattern, '*'.repeat(keyword.length));
    }
    return result;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
