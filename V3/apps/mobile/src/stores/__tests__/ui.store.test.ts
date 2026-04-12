import { useUIStore } from '../ui.store';

describe('useUIStore', () => {
  beforeEach(() => {
    useUIStore.setState({
      globalLoading: false,
      globalLoadingText: '',
      searchQuery: '',
      searchActive: false,
      activeTab: 'home',
      actionSheetVisible: false,
    });
  });

  describe('initial state', () => {
    it('should have correct default values', () => {
      const state = useUIStore.getState();
      expect(state.globalLoading).toBe(false);
      expect(state.globalLoadingText).toBe('');
      expect(state.searchQuery).toBe('');
      expect(state.searchActive).toBe(false);
      expect(state.activeTab).toBe('home');
      expect(state.actionSheetVisible).toBe(false);
    });
  });

  describe('globalLoading', () => {
    it('should set global loading to true', () => {
      useUIStore.getState().setGlobalLoading(true);
      expect(useUIStore.getState().globalLoading).toBe(true);
    });

    it('should set global loading with text', () => {
      useUIStore.getState().setGlobalLoading(true, 'Loading data...');
      const state = useUIStore.getState();
      expect(state.globalLoading).toBe(true);
      expect(state.globalLoadingText).toBe('Loading data...');
    });

    it('should clear loading text when set to false without text', () => {
      useUIStore.getState().setGlobalLoading(true, 'Loading...');
      useUIStore.getState().setGlobalLoading(false);
      const state = useUIStore.getState();
      expect(state.globalLoading).toBe(false);
      expect(state.globalLoadingText).toBe('');
    });

    it('should preserve text when setting loading without text param', () => {
      useUIStore.getState().setGlobalLoading(true, 'Loading...');
      useUIStore.getState().setGlobalLoading(true);
      expect(useUIStore.getState().globalLoadingText).toBe('');
    });
  });

  describe('searchQuery', () => {
    it('should set search query', () => {
      useUIStore.getState().setSearchQuery('dress');
      expect(useUIStore.getState().searchQuery).toBe('dress');
    });

    it('should clear search query', () => {
      useUIStore.getState().setSearchQuery('dress');
      useUIStore.getState().setSearchQuery('');
      expect(useUIStore.getState().searchQuery).toBe('');
    });
  });

  describe('searchActive', () => {
    it('should activate search', () => {
      useUIStore.getState().setSearchActive(true);
      expect(useUIStore.getState().searchActive).toBe(true);
    });

    it('should deactivate search', () => {
      useUIStore.getState().setSearchActive(true);
      useUIStore.getState().setSearchActive(false);
      expect(useUIStore.getState().searchActive).toBe(false);
    });
  });

  describe('activeTab', () => {
    it('should set active tab', () => {
      useUIStore.getState().setActiveTab('explore');
      expect(useUIStore.getState().activeTab).toBe('explore');
    });

    it('should switch between tabs', () => {
      useUIStore.getState().setActiveTab('wardrobe');
      expect(useUIStore.getState().activeTab).toBe('wardrobe');

      useUIStore.getState().setActiveTab('profile');
      expect(useUIStore.getState().activeTab).toBe('profile');
    });
  });

  describe('actionSheet', () => {
    it('should show action sheet', () => {
      useUIStore.getState().showActionSheet();
      expect(useUIStore.getState().actionSheetVisible).toBe(true);
    });

    it('should hide action sheet', () => {
      useUIStore.getState().showActionSheet();
      useUIStore.getState().hideActionSheet();
      expect(useUIStore.getState().actionSheetVisible).toBe(false);
    });

    it('should toggle action sheet visibility', () => {
      expect(useUIStore.getState().actionSheetVisible).toBe(false);

      useUIStore.getState().showActionSheet();
      expect(useUIStore.getState().actionSheetVisible).toBe(true);

      useUIStore.getState().hideActionSheet();
      expect(useUIStore.getState().actionSheetVisible).toBe(false);
    });
  });

  describe('state independence', () => {
    it('should not affect other state when updating one field', () => {
      useUIStore.getState().setGlobalLoading(true, 'Loading');
      useUIStore.getState().setSearchQuery('test');
      useUIStore.getState().setActiveTab('explore');

      const state = useUIStore.getState();
      expect(state.globalLoading).toBe(true);
      expect(state.globalLoadingText).toBe('Loading');
      expect(state.searchQuery).toBe('test');
      expect(state.activeTab).toBe('explore');
      expect(state.searchActive).toBe(false);
      expect(state.actionSheetVisible).toBe(false);
    });
  });
});
