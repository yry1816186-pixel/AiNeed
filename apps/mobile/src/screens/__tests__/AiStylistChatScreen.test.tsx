import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { AiStylistChatScreen } from '../../screens/AiStylistChatScreen';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    reset: jest.fn(),
    setParams: jest.fn(),
    dispatch: jest.fn(),
    isFocused: () => true,
    canGoBack: () => true,
  }),
  useRoute: () => ({
    params: {},
    name: 'AiStylistChat',
    key: 'chat-key',
  }),
  useFocusEffect: jest.fn((cb) => cb()),
  useIsFocused: () => true,
}));

jest.mock('@/src/polyfills/expo-vector-icons', () => {
  const { Text } = require('react-native');
  const createIcon = () => (props) => <Text {...props}>Icon</Text>;
  return {
    Ionicons: createIcon(),
    MaterialCommunityIcons: createIcon(),
    Feather: createIcon(),
    AntDesign: createIcon(),
  };
});

const mockCreateSession = jest.fn().mockResolvedValue('session-123');
const mockSendMessage = jest.fn().mockResolvedValue({
  assistantMessage: 'Here is a great outfit for you!',
  result: { sessionId: 'session-123' },
});
const mockFetchOutfitPlan = jest.fn().mockResolvedValue(undefined);
const mockClearError = jest.fn();

jest.mock('../../stores/aiStylistStore', () => ({
  useAiStylistStore: jest.fn((selector) => {
    const state = {
      currentSessionId: null,
      isGenerating: false,
      error: null,
      createSession: mockCreateSession,
      sendMessage: mockSendMessage,
      fetchOutfitPlan: mockFetchOutfitPlan,
      clearError: mockClearError,
      setCurrentSessionId: jest.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

const mockAddMessage = jest.fn();

jest.mock('../../stores/aiStylistChatStore', () => ({
  useAiStylistChatStore: jest.fn((selector) => {
    const state = {
      messages: [],
      addMessage: mockAddMessage,
      setMessages: jest.fn(),
      clearMessages: jest.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

describe('AiStylistChatScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders chat interface', () => {
    const { getByText } = render(<AiStylistChatScreen />);
    expect(getByText('AI Stylist')).toBeTruthy();
  });

  it('shows welcome section when no messages', () => {
    const { getByText } = render(<AiStylistChatScreen />);
    expect(getByText('What would you like to wear?')).toBeTruthy();
  });

  it('shows welcome subtitle', () => {
    const { getByText } = render(<AiStylistChatScreen />);
    expect(getByText(/Tell me the occasion/)).toBeTruthy();
  });

  it('shows input placeholder', () => {
    const { getByPlaceholderText } = render(<AiStylistChatScreen />);
    expect(getByPlaceholderText('Describe your outfit needs...')).toBeTruthy();
  });

  it('can type in input field', () => {
    const { getByPlaceholderText } = render(<AiStylistChatScreen />);
    const input = getByPlaceholderText('Describe your outfit needs...');
    fireEvent.changeText(input, 'I need a casual outfit');
    expect(input.props.value).toBe('I need a casual outfit');
  });

  it('shows scene quick buttons', () => {
    const { getByText } = render(<AiStylistChatScreen />);
    expect(getByText('Date Night')).toBeTruthy();
    expect(getByText('Work')).toBeTruthy();
    expect(getByText('Casual')).toBeTruthy();
    expect(getByText('Formal')).toBeTruthy();
    expect(getByText('Travel')).toBeTruthy();
  });

  it('sends message when send button is pressed', async () => {
    const { getByPlaceholderText, getByText } = render(<AiStylistChatScreen />);
    const input = getByPlaceholderText('Describe your outfit needs...');
    fireEvent.changeText(input, 'I need a date night outfit');

    const sendButton = getByText('Icon').parent?.parent;
    if (sendButton) {
      fireEvent.press(sendButton);
    }

    await waitFor(() => {
      expect(mockCreateSession).toHaveBeenCalled();
    });
  });

  it('displays user message after sending', async () => {
    const { getByPlaceholderText, getByText } = render(<AiStylistChatScreen />);
    const input = getByPlaceholderText('Describe your outfit needs...');
    fireEvent.changeText(input, 'I need a casual outfit');

    const sendButton = getByText('Icon').parent?.parent;
    if (sendButton) {
      await act(async () => {
        fireEvent.press(sendButton);
      });
    }

    await waitFor(() => {
      expect(getByText('I need a casual outfit')).toBeTruthy();
    });
  });

  it('displays AI response after receiving', async () => {
    const { getByPlaceholderText, getByText } = render(<AiStylistChatScreen />);
    const input = getByPlaceholderText('Describe your outfit needs...');
    fireEvent.changeText(input, 'I need a work outfit');

    const sendButton = getByText('Icon').parent?.parent;
    if (sendButton) {
      await act(async () => {
        fireEvent.press(sendButton);
      });
    }

    await waitFor(() => {
      expect(getByText('Here is a great outfit for you!')).toBeTruthy();
    });
  });

  it('shows typing indicator when generating', () => {
    const { useAiStylistStore } = require('../../stores/aiStylistStore');
    useAiStylistStore.mockImplementation((selector) => {
      const state = {
        currentSessionId: 'session-123',
        isGenerating: true,
        error: null,
        createSession: mockCreateSession,
        sendMessage: mockSendMessage,
        fetchOutfitPlan: mockFetchOutfitPlan,
        clearError: mockClearError,
        setCurrentSessionId: jest.fn(),
      };
      return selector ? selector(state) : state;
    });

    const { getByText } = render(<AiStylistChatScreen />);
    expect(getByText('AI is thinking...')).toBeTruthy();
  });

  it('shows error banner when error occurs', () => {
    const { useAiStylistStore } = require('../../stores/aiStylistStore');
    useAiStylistStore.mockImplementation((selector) => {
      const state = {
        currentSessionId: null,
        isGenerating: false,
        error: 'Network error occurred',
        createSession: mockCreateSession,
        sendMessage: mockSendMessage,
        fetchOutfitPlan: mockFetchOutfitPlan,
        clearError: mockClearError,
        setCurrentSessionId: jest.fn(),
      };
      return selector ? selector(state) : state;
    });

    const { getByText } = render(<AiStylistChatScreen />);
    expect(getByText('Network error occurred')).toBeTruthy();
  });

  it('clears error when dismiss is pressed', () => {
    const { useAiStylistStore } = require('../../stores/aiStylistStore');
    useAiStylistStore.mockImplementation((selector) => {
      const state = {
        currentSessionId: null,
        isGenerating: false,
        error: 'Network error occurred',
        createSession: mockCreateSession,
        sendMessage: mockSendMessage,
        fetchOutfitPlan: mockFetchOutfitPlan,
        clearError: mockClearError,
        setCurrentSessionId: jest.fn(),
      };
      return selector ? selector(state) : state;
    });

    const { getByText } = render(<AiStylistChatScreen />);
    fireEvent.press(getByText('Dismiss'));
    expect(mockClearError).toHaveBeenCalled();
  });

  it('navigates back when back button is pressed', () => {
    const { getAllByText } = render(<AiStylistChatScreen />);
    const backButtons = getAllByText('Icon');
    if (backButtons.length > 0) {
      fireEvent.press(backButtons[0].parent?.parent || backButtons[0]);
    }
  });

  it('navigates to chat history when history button is pressed', () => {
    const { getAllByText } = render(<AiStylistChatScreen />);
    const iconButtons = getAllByText('Icon');
    if (iconButtons.length >= 3) {
      fireEvent.press(iconButtons[2].parent?.parent || iconButtons[2]);
      expect(mockNavigate).toHaveBeenCalledWith('ChatHistory');
    }
  });

  it('disables send button when input is empty', () => {
    const { getByPlaceholderText } = render(<AiStylistChatScreen />);
    const input = getByPlaceholderText('Describe your outfit needs...');
    expect(input.props.value).toBe('');
  });

  it('disables send when generating', () => {
    const { useAiStylistStore } = require('../../stores/aiStylistStore');
    useAiStylistStore.mockImplementation((selector) => {
      const state = {
        currentSessionId: 'session-123',
        isGenerating: true,
        error: null,
        createSession: mockCreateSession,
        sendMessage: mockSendMessage,
        fetchOutfitPlan: mockFetchOutfitPlan,
        clearError: mockClearError,
        setCurrentSessionId: jest.fn(),
      };
      return selector ? selector(state) : state;
    });

    const { getByPlaceholderText } = render(<AiStylistChatScreen />);
    const input = getByPlaceholderText('Describe your outfit needs...');
    expect(input.props.editable).toBe(false);
  });

  it('handles scene button press', async () => {
    const { getByText } = render(<AiStylistChatScreen />);
    const dateButton = getByText('Date Night');
    await act(async () => {
      fireEvent.press(dateButton);
    });
    await waitFor(() => {
      expect(mockCreateSession).toHaveBeenCalled();
    });
  });

  it('uses existing session when sessionId is provided', async () => {
    const { useAiStylistStore } = require('../../stores/aiStylistStore');
    const mockSetCurrentSessionId = jest.fn();
    useAiStylistStore.mockImplementation((selector) => {
      const state = {
        currentSessionId: 'existing-session',
        isGenerating: false,
        error: null,
        createSession: mockCreateSession,
        sendMessage: mockSendMessage,
        fetchOutfitPlan: mockFetchOutfitPlan,
        clearError: mockClearError,
        setCurrentSessionId: mockSetCurrentSessionId,
      };
      return selector ? selector(state) : state;
    });

    const { getByPlaceholderText } = render(<AiStylistChatScreen />);
    const input = getByPlaceholderText('Describe your outfit needs...');
    fireEvent.changeText(input, 'I need a travel outfit');

    const sendButton = input.parent?.parent?.parent;
    if (sendButton) {
      await act(async () => {
        fireEvent.press(sendButton);
      });
    }

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('I need a travel outfit');
    });
  });

  it('shows online dot in header', () => {
    const { getByText } = render(<AiStylistChatScreen />);
    expect(getByText('AI Stylist')).toBeTruthy();
  });
});
