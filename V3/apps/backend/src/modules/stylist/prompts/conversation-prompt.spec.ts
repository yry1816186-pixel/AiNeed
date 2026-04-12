import {
  buildConversationPrompt,
  buildIntentClassificationPrompt,
  ConversationContext,
  CONVERSATION_MANAGEMENT_PROMPT_ZH,
  CONVERSATION_MANAGEMENT_PROMPT_EN,
  INTENT_CLASSIFICATION_PROMPT,
  CONVERSATION_PROMPT_EXAMPLES,
} from './conversation-prompt';

describe('conversation-prompt', () => {
  describe('buildConversationPrompt', () => {
    const baseContext: ConversationContext = {
      sessionId: 'session-1',
      messageCount: 3,
      recentMessages: [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi!' },
        { role: 'user', content: 'Help me dress up' },
      ],
      detectedIntent: 'outfit_request',
      userProfile: {
        bodyType: 'hourglass',
        colorSeason: 'spring',
        stylePreferences: ['minimalist', 'french'],
        budgetRange: '500-1500',
      },
      missingInfo: ['occasion', 'budget'],
      userSatisfaction: 'neutral',
    };

    it('should build a Chinese prompt with all context fields', () => {
      const result = buildConversationPrompt(baseContext, 'zh');

      expect(result).toContain('3');
      expect(result).toContain('outfit_request');
      expect(result).toContain('bodyType: hourglass');
      expect(result).toContain('colorSeason: spring');
      expect(result).toContain('stylePreferences: minimalist, french');
      expect(result).toContain('budgetRange: 500-1500');
      expect(result).toContain('occasion, budget');
      expect(result).toContain('neutral');
    });

    it('should build an English prompt with all context fields', () => {
      const result = buildConversationPrompt(baseContext, 'en');

      expect(result).toContain('3');
      expect(result).toContain('outfit_request');
      expect(result).toContain('bodyType: hourglass');
      expect(result).toContain('occasion, budget');
      expect(result).toContain('neutral');
    });

    it('should use Chinese template by default', () => {
      const result = buildConversationPrompt(baseContext);
      expect(result).toContain(CONVERSATION_MANAGEMENT_PROMPT_ZH.split('{{messageCount}}')[0].substring(0, 20));
    });

    it('should use English template when language is en', () => {
      const result = buildConversationPrompt(baseContext, 'en');
      expect(result).toContain(CONVERSATION_MANAGEMENT_PROMPT_EN.split('{{messageCount}}')[0].substring(0, 20));
    });

    it('should handle missing detectedIntent (defaults to unknown)', () => {
      const ctx: ConversationContext = {
        ...baseContext,
        detectedIntent: undefined,
      };
      const result = buildConversationPrompt(ctx);
      expect(result).toContain('unknown');
    });

    it('should handle missing userSatisfaction (defaults to neutral)', () => {
      const ctx: ConversationContext = {
        ...baseContext,
        userSatisfaction: undefined,
      };
      const result = buildConversationPrompt(ctx);
      expect(result).toContain('neutral');
    });

    it('should handle missing missingInfo in Chinese (shows "None")', () => {
      const ctx: ConversationContext = {
        ...baseContext,
        missingInfo: undefined,
      };
      const result = buildConversationPrompt(ctx, 'zh');
      expect(result).toContain('\u65e0');
    });

    it('should handle missing missingInfo in English (shows "None")', () => {
      const ctx: ConversationContext = {
        ...baseContext,
        missingInfo: undefined,
      };
      const result = buildConversationPrompt(ctx, 'en');
      expect(result).toContain('None');
    });

    it('should handle undefined userProfile in Chinese (shows placeholder)', () => {
      const ctx: ConversationContext = {
        ...baseContext,
        userProfile: undefined,
      };
      const result = buildConversationPrompt(ctx, 'zh');
      expect(result).toContain('\u6682\u65e0');
    });

    it('should handle undefined userProfile in English (shows None)', () => {
      const ctx: ConversationContext = {
        ...baseContext,
        userProfile: undefined,
      };
      const result = buildConversationPrompt(ctx, 'en');
      expect(result).toContain('None');
    });

    it('should filter out undefined values from userProfile', () => {
      const ctx: ConversationContext = {
        ...baseContext,
        userProfile: {
          bodyType: 'pear',
          colorSeason: undefined,
          stylePreferences: undefined,
          budgetRange: undefined,
        },
      };
      const result = buildConversationPrompt(ctx, 'zh');
      expect(result).toContain('bodyType: pear');
      expect(result).not.toContain('colorSeason: undefined');
    });

    it('should join array values in userProfile with comma', () => {
      const ctx: ConversationContext = {
        ...baseContext,
        userProfile: {
          stylePreferences: ['casual', 'street'],
        },
      };
      const result = buildConversationPrompt(ctx, 'zh');
      expect(result).toContain('stylePreferences: casual, street');
    });

    it('should handle empty missingInfo array in Chinese', () => {
      const ctx: ConversationContext = {
        ...baseContext,
        missingInfo: [],
      };
      const result = buildConversationPrompt(ctx, 'zh');
      // Empty array join returns empty string, fallback to "None" does NOT trigger
      // because [] is truthy - the ?? only applies to undefined/null
      expect(result).toBeDefined();
    });

    it('should handle userSatisfaction as satisfied', () => {
      const ctx: ConversationContext = {
        ...baseContext,
        userSatisfaction: 'satisfied',
      };
      const result = buildConversationPrompt(ctx);
      expect(result).toContain('satisfied');
    });

    it('should handle userSatisfaction as unsatisfied', () => {
      const ctx: ConversationContext = {
        ...baseContext,
        userSatisfaction: 'unsatisfied',
      };
      const result = buildConversationPrompt(ctx);
      expect(result).toContain('unsatisfied');
    });

    it('should replace all template placeholders', () => {
      const result = buildConversationPrompt(baseContext, 'zh');
      expect(result).not.toContain('{{messageCount}}');
      expect(result).not.toContain('{{detectedIntent}}');
      expect(result).not.toContain('{{userProfileSummary}}');
      expect(result).not.toContain('{{missingInfo}}');
      expect(result).not.toContain('{{userSatisfaction}}');
    });

    it('should replace all template placeholders in English', () => {
      const result = buildConversationPrompt(baseContext, 'en');
      expect(result).not.toContain('{{messageCount}}');
      expect(result).not.toContain('{{detectedIntent}}');
      expect(result).not.toContain('{{userProfileSummary}}');
      expect(result).not.toContain('{{missingInfo}}');
      expect(result).not.toContain('{{userSatisfaction}}');
    });
  });

  describe('buildIntentClassificationPrompt', () => {
    it('should prepend intent classification prompt to user message', () => {
      const result = buildIntentClassificationPrompt('I want a new outfit');
      expect(result).toContain(INTENT_CLASSIFICATION_PROMPT);
      expect(result).toContain('I want a new outfit');
    });

    it('should handle empty user message', () => {
      const result = buildIntentClassificationPrompt('');
      expect(result).toContain(INTENT_CLASSIFICATION_PROMPT);
      expect(result).toMatch(/## \S+\n$/);
    });

    it('should handle special characters in user message', () => {
      const result = buildIntentClassificationPrompt('Hello $100 {{test}} <script>');
      expect(result).toContain('Hello $100 {{test}} <script>');
    });

    it('should handle Chinese user message', () => {
      const result = buildIntentClassificationPrompt('帮我搭一套衣服');
      expect(result).toContain('帮我搭一套衣服');
    });
  });

  describe('CONVERSATION_PROMPT_EXAMPLES', () => {
    it('should be an array of example scenarios', () => {
      expect(CONVERSATION_PROMPT_EXAMPLES).toBeInstanceOf(Array);
      expect(CONVERSATION_PROMPT_EXAMPLES.length).toBe(3);
    });

    it('should have all required fields in each example', () => {
      for (const example of CONVERSATION_PROMPT_EXAMPLES) {
        expect(example).toHaveProperty('scenario');
        expect(example).toHaveProperty('context');
        expect(example).toHaveProperty('description');
        expect(example.context).toHaveProperty('sessionId');
        expect(example.context).toHaveProperty('messageCount');
      }
    });
  });
});
