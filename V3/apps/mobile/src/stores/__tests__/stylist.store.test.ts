import { useStylistStore } from '../stylist.store';
import type { StylistSession, StylistMessage, StylistOutfit } from '../../types';

describe('useStylistStore', () => {
  beforeEach(() => {
    useStylistStore.getState().resetAll();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = useStylistStore.getState();
      expect(state.currentSession).toBeNull();
      expect(state.messages).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.step).toBe('select');
      expect(state.selectedOccasion).toBeNull();
      expect(state.selectedBudget).toBeNull();
      expect(state.selectedStyles).toEqual([]);
      expect(state.currentOutfits).toEqual([]);
      expect(state.currentOutfitIndex).toBe(0);
      expect(state.streamingText).toBe('');
      expect(state.outfitImage).toBeNull();
      expect(state.error).toBeNull();
      expect(state.retryCount).toBe(0);
    });
  });

  describe('setSession', () => {
    it('should set current session', () => {
      const session: StylistSession = {
        id: 'session-1',
        userId: 'user-1',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };

      useStylistStore.getState().setSession(session);
      expect(useStylistStore.getState().currentSession).toEqual(session);
    });

    it('should clear session when set to null', () => {
      const session: StylistSession = {
        id: 'session-1',
        userId: 'user-1',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };

      useStylistStore.getState().setSession(session);
      useStylistStore.getState().setSession(null);
      expect(useStylistStore.getState().currentSession).toBeNull();
    });
  });

  describe('messages', () => {
    it('should set messages', () => {
      const messages: StylistMessage[] = [
        { id: 'm1', sessionId: 's1', role: 'user', content: 'Hello', createdAt: '2026-01-01' },
      ];

      useStylistStore.getState().setMessages(messages);
      expect(useStylistStore.getState().messages).toEqual(messages);
    });

    it('should add a message to existing list', () => {
      const msg1: StylistMessage = {
        id: 'm1', sessionId: 's1', role: 'user', content: 'Hello', createdAt: '2026-01-01',
      };
      const msg2: StylistMessage = {
        id: 'm2', sessionId: 's1', role: 'assistant', content: 'Hi', createdAt: '2026-01-01',
      };

      useStylistStore.getState().setMessages([msg1]);
      useStylistStore.getState().addMessage(msg2);

      expect(useStylistStore.getState().messages).toHaveLength(2);
      expect(useStylistStore.getState().messages[1]).toEqual(msg2);
    });

    it('should add message to empty list', () => {
      const msg: StylistMessage = {
        id: 'm1', sessionId: 's1', role: 'user', content: 'Hello', createdAt: '2026-01-01',
      };

      useStylistStore.getState().addMessage(msg);
      expect(useStylistStore.getState().messages).toEqual([msg]);
    });
  });

  describe('selection methods', () => {
    it('should select occasion', () => {
      useStylistStore.getState().selectOccasion('work');
      expect(useStylistStore.getState().selectedOccasion).toBe('work');
    });

    it('should clear occasion selection', () => {
      useStylistStore.getState().selectOccasion('work');
      useStylistStore.getState().selectOccasion(null);
      expect(useStylistStore.getState().selectedOccasion).toBeNull();
    });

    it('should select budget', () => {
      useStylistStore.getState().selectBudget('under200');
      expect(useStylistStore.getState().selectedBudget).toBe('under200');
    });

    it('should toggle style on and off', () => {
      useStylistStore.getState().toggleStyle('minimal');
      expect(useStylistStore.getState().selectedStyles).toContain('minimal');

      useStylistStore.getState().toggleStyle('minimal');
      expect(useStylistStore.getState().selectedStyles).not.toContain('minimal');
    });

    it('should support multiple style selections', () => {
      useStylistStore.getState().toggleStyle('minimal');
      useStylistStore.getState().toggleStyle('korean');

      const styles = useStylistStore.getState().selectedStyles;
      expect(styles).toContain('minimal');
      expect(styles).toContain('korean');
      expect(styles).toHaveLength(2);
    });
  });

  describe('outfits', () => {
    it('should set outfits', () => {
      const outfits: StylistOutfit[] = [
        { id: 'o1', name: 'Casual Look', styleTags: ['minimal'], items: [] },
      ];

      useStylistStore.getState().setOutfits(outfits);
      expect(useStylistStore.getState().currentOutfits).toEqual(outfits);
    });

    it('should set current outfit index', () => {
      useStylistStore.getState().setCurrentOutfitIndex(2);
      expect(useStylistStore.getState().currentOutfitIndex).toBe(2);
    });
  });

  describe('streaming text', () => {
    it('should set streaming text', () => {
      useStylistStore.getState().setStreamingText('Hello');
      expect(useStylistStore.getState().streamingText).toBe('Hello');
    });

    it('should append to streaming text', () => {
      useStylistStore.getState().setStreamingText('Hello');
      useStylistStore.getState().appendStreamingText(' World');
      expect(useStylistStore.getState().streamingText).toBe('Hello World');
    });

    it('should append to empty streaming text', () => {
      useStylistStore.getState().appendStreamingText('Start');
      expect(useStylistStore.getState().streamingText).toBe('Start');
    });
  });

  describe('error and loading', () => {
    it('should set error', () => {
      useStylistStore.getState().setError('Something went wrong');
      expect(useStylistStore.getState().error).toBe('Something went wrong');
    });

    it('should clear error', () => {
      useStylistStore.getState().setError('Error');
      useStylistStore.getState().setError(null);
      expect(useStylistStore.getState().error).toBeNull();
    });

    it('should set loading state', () => {
      useStylistStore.getState().setLoading(true);
      expect(useStylistStore.getState().isLoading).toBe(true);

      useStylistStore.getState().setLoading(false);
      expect(useStylistStore.getState().isLoading).toBe(false);
    });

    it('should increment retry count', () => {
      useStylistStore.getState().incrementRetry();
      expect(useStylistStore.getState().retryCount).toBe(1);

      useStylistStore.getState().incrementRetry();
      expect(useStylistStore.getState().retryCount).toBe(2);
    });
  });

  describe('reset methods', () => {
    it('should reset selections only', () => {
      useStylistStore.getState().selectOccasion('work');
      useStylistStore.getState().selectBudget('under100');
      useStylistStore.getState().toggleStyle('minimal');
      useStylistStore.getState().setError('some error');

      useStylistStore.getState().resetSelections();

      const state = useStylistStore.getState();
      expect(state.selectedOccasion).toBeNull();
      expect(state.selectedBudget).toBeNull();
      expect(state.selectedStyles).toEqual([]);
      expect(state.error).toBe('some error');
    });

    it('should reset results only', () => {
      const outfits: StylistOutfit[] = [
        { id: 'o1', name: 'Look', styleTags: [], items: [] },
      ];
      useStylistStore.getState().setOutfits(outfits);
      useStylistStore.getState().setStreamingText('text');
      useStylistStore.getState().setError('error');
      useStylistStore.getState().incrementRetry();
      useStylistStore.getState().selectOccasion('work');

      useStylistStore.getState().resetResults();

      const state = useStylistStore.getState();
      expect(state.currentOutfits).toEqual([]);
      expect(state.currentOutfitIndex).toBe(0);
      expect(state.streamingText).toBe('');
      expect(state.outfitImage).toBeNull();
      expect(state.error).toBeNull();
      expect(state.retryCount).toBe(0);
      expect(state.selectedOccasion).toBe('work');
    });

    it('should reset all state', () => {
      useStylistStore.getState().selectOccasion('work');
      useStylistStore.getState().selectBudget('under100');
      useStylistStore.getState().toggleStyle('minimal');
      useStylistStore.getState().setOutfits([{ id: 'o1', name: 'Look', styleTags: [], items: [] }]);
      useStylistStore.getState().setStreamingText('text');
      useStylistStore.getState().setError('error');
      useStylistStore.getState().incrementRetry();
      useStylistStore.getState().setLoading(true);
      useStylistStore.getState().setStep('result');

      useStylistStore.getState().resetAll();

      const state = useStylistStore.getState();
      expect(state.currentSession).toBeNull();
      expect(state.messages).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.step).toBe('select');
      expect(state.selectedOccasion).toBeNull();
      expect(state.selectedBudget).toBeNull();
      expect(state.selectedStyles).toEqual([]);
      expect(state.currentOutfits).toEqual([]);
      expect(state.currentOutfitIndex).toBe(0);
      expect(state.streamingText).toBe('');
      expect(state.outfitImage).toBeNull();
      expect(state.error).toBeNull();
      expect(state.retryCount).toBe(0);
    });
  });

  describe('step management', () => {
    it('should transition between steps', () => {
      useStylistStore.getState().setStep('loading');
      expect(useStylistStore.getState().step).toBe('loading');

      useStylistStore.getState().setStep('result');
      expect(useStylistStore.getState().step).toBe('result');

      useStylistStore.getState().setStep('select');
      expect(useStylistStore.getState().step).toBe('select');
    });
  });

  describe('outfitImage', () => {
    it('should set outfit image', () => {
      const image = { id: 'img-1', status: 'completed' as const, imageUrl: 'https://example.com/img.png' };
      useStylistStore.getState().setOutfitImage(image);
      expect(useStylistStore.getState().outfitImage).toEqual(image);
    });

    it('should clear outfit image', () => {
      const image = { id: 'img-1', status: 'completed' as const };
      useStylistStore.getState().setOutfitImage(image);
      useStylistStore.getState().setOutfitImage(null);
      expect(useStylistStore.getState().outfitImage).toBeNull();
    });
  });
});
