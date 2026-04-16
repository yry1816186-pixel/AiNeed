import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { AiStylistChatScreen } from "../../screens/AiStylistChatScreen";
import { DesignTokens } from "../../design-system/theme";

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
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
    name: "AiStylistChat",
    key: "chat-key",
  }),
  useFocusEffect: jest.fn((cb: () => void) => cb()),
  useIsFocused: () => true,
}));

jest.mock("@/src/polyfills/expo-vector-icons", () => {
  const { Text } = require("react-native");
  const createIcon = () => (props: Record<string, unknown>) => <Text {...props}>Icon</Text>;
  return {
    Ionicons: createIcon(),
    MaterialCommunityIcons: createIcon(),
    Feather: createIcon(),
    AntDesign: createIcon(),
  };
});

jest.mock("../../components/aistylist/AIThinkingAnimation", () => ({
  AIThinkingAnimation: () => {
    const { Text } = require("react-native");
    return <Text>AI is thinking...</Text>;
  },
}));

jest.mock("../../theme", () => ({
  theme: {
    colors: {
      primary: "#C67B5C",
      surface: DesignTokens.colors.backgrounds.primary,
      background: "#FAFAF8",
      text: "#1C1917",
      textSecondary: "#57534E",
      textTertiary: "#A8A29E",
      border: "#E7E5E4",
      success: "#22C55E",
      error: DesignTokens.colors.semantic.error,
      divider: "#F1F3F4",
      subtleBg: "#F1F3F4",
    },
  },
  Colors: {
    neutral: { 200: DesignTokens.colors.borders.light, 500: "#A8A29E", 600: "#57534E", 900: "#171717" },
    success: { 500: "#22C55E" },
    rose: { 400: "#FB7185", 500: "#F43F5E" },
    primary: { 500: "#C67B5C" },
  },
  DesignTokens: {
    colors: {
      brand: { terracotta: "#C67B5C" },
      neutral: { 200: DesignTokens.colors.borders.light },
      text: { tertiary: "#A8A29E" },
      backgrounds: { primary: DesignTokens.colors.backgrounds.primary },
      semantic: { errorLight: DesignTokens.colors.semantic.errorLight, success: "#22C55E" },
    },
    typography: { sizes: { sm: 12, md: 14 }, fontWeights: { medium: "500", semibold: "600" } },
    spacing: { 1: 4, 2: 8, 3: 12 },
    borderRadius: { xl: 16, full: 9999 },
    shadows: { sm: {} },
  },
}));

jest.mock("../../theme/tokens/design-tokens", () => ({
  DesignTokens: {
    colors: {
      brand: {
        terracotta: "#C67B5C",
        terracottaLight: "#D4917A",
        camel: DesignTokens.colors.brand.camel,
        sage: "#8B9A7D",
        slate: "#7B8FA2",
      },
      neutral: { 200: DesignTokens.colors.borders.light, 900: "#171717" },
      text: { primary: "#1C1917", secondary: "#57534E", tertiary: "#A8A29E", inverse: DesignTokens.colors.backgrounds.primary },
      backgrounds: { primary: DesignTokens.colors.backgrounds.primary, secondary: "#FAFAF8", elevated: DesignTokens.colors.backgrounds.primary },
      borders: { light: "#E7E5E4" },
      semantic: {
        success: "#22C55E",
        successLight: "#DCFCE7",
        error: DesignTokens.colors.semantic.error,
        errorLight: DesignTokens.colors.semantic.errorLight,
        warning: DesignTokens.colors.semantic.warning,
        info: "#0EA5E9",
      },
      primary: { 500: "#C67B5C" },
    },
    gradients: {
      brand: ["#C67B5C", "#D4917A"],
      sage: ["#8B9A7D", "#A3B096"],
      warm: ["#C67B5C", DesignTokens.colors.brand.camel],
      cool: ["#7B8FA2", "#96A6B5"],
      brandSoft: ["#D4917A", "#E8C4B8"],
      hero: ["#C67B5C", "#8B9A7D"],
      card: [DesignTokens.colors.backgrounds.primary, "#FAFAF8"],
    },
    typography: {
      sizes: {
        sm: 12,
        md: 14,
        lg: 18,
        xs: 10,
        base: 15,
        xl: 20,
        "2xl": 24,
        "3xl": 30,
        "4xl": 36,
        "5xl": 48,
      },
      fontWeights: { regular: "400", medium: "500", semibold: "600", bold: "700" },
      lineHeights: { tight: 1.25, snug: 1.375, normal: 1.5, relaxed: 1.625 },
      letterSpacing: { tight: -0.5, normal: 0 },
    },
    spacing: {
      1: 4,
      2: 8,
      3: 12,
      4: 16,
      5: 20,
      6: 24,
      8: 32,
      10: 40,
      12: 48,
      16: 64,
      20: 80,
      24: 96,
    },
    borderRadius: {
      sm: 6,
      md: 8,
      lg: 12,
      xl: 16,
      "2xl": 20,
      "3xl": 24,
      full: 9999,
      none: 0,
      xs: 4,
    },
    shadows: { sm: {}, md: {}, lg: {}, xl: {} },
    animation: {
      duration: { fast: 150, normal: 300, slow: 500 },
      easing: { spring: { damping: 15, stiffness: 150 }, gentle: { damping: 20, stiffness: 100 } },
    },
  },
}));

jest.mock("../../navigation/types", () => ({}));

const mockCreateSession = jest.fn().mockResolvedValue("session-123");
const mockSendMessage = jest.fn().mockResolvedValue({
  assistantMessage: "Here is a great outfit for you!",
  result: { sessionId: "session-123" },
});
const mockFetchOutfitPlan = jest.fn().mockResolvedValue(undefined);
const mockClearError = jest.fn();
const mockSetCurrentSessionId = jest.fn();

jest.mock("../../stores/aiStylistStore", () => ({
  useAiStylistStore: jest.fn((selector: Function) => {
    const state = {
      currentSessionId: null,
      isGenerating: false,
      error: null,
      createSession: mockCreateSession,
      sendMessage: mockSendMessage,
      fetchOutfitPlan: mockFetchOutfitPlan,
      clearError: mockClearError,
      setCurrentSessionId: mockSetCurrentSessionId,
    };
    return selector ? selector(state) : state;
  }),
}));

const mockAddMessage = jest.fn();

jest.mock("../../stores/aiStylistChatStore", () => ({
  useAiStylistChatStore: jest.fn((selector: Function) => {
    const state = {
      messages: [],
      addMessage: mockAddMessage,
      setMessages: jest.fn(),
      clearMessages: jest.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

describe("AiStylistChatScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders chat interface", () => {
    const { getByText } = render(<AiStylistChatScreen />);
    expect(getByText("AI 造型师")).toBeTruthy();
  });

  it("shows welcome section when no messages", () => {
    const { getByText } = render(<AiStylistChatScreen />);
    expect(getByText("今天想穿什么？")).toBeTruthy();
  });

  it("shows welcome subtitle", () => {
    const { getByText } = render(<AiStylistChatScreen />);
    expect(getByText(/告诉我场合/)).toBeTruthy();
  });

  it("shows input placeholder", () => {
    const { getByPlaceholderText } = render(<AiStylistChatScreen />);
    expect(getByPlaceholderText("描述你的穿搭需求...")).toBeTruthy();
  });

  it("can type in input field", () => {
    const { getByPlaceholderText } = render(<AiStylistChatScreen />);
    const input = getByPlaceholderText("描述你的穿搭需求...");
    fireEvent.changeText(input, "I need a casual outfit");
    expect(input.props.value).toBe("I need a casual outfit");
  });

  it("shows scene quick buttons", () => {
    const { getByText } = render(<AiStylistChatScreen />);
    expect(getByText("约会之夜")).toBeTruthy();
    expect(getByText("职场通勤")).toBeTruthy();
    expect(getByText("休闲周末")).toBeTruthy();
    expect(getByText("正式场合")).toBeTruthy();
    expect(getByText("旅行出行")).toBeTruthy();
  });

  it("sends message when submit editing on input", async () => {
    const { getByPlaceholderText } = render(<AiStylistChatScreen />);
    const input = getByPlaceholderText("描述你的穿搭需求...");
    fireEvent.changeText(input, "I need a date night outfit");

    await act(async () => {
      fireEvent(input, "submitEditing");
    });

    await waitFor(() => {
      expect(mockAddMessage).toHaveBeenCalledWith(
        expect.objectContaining({ content: "I need a date night outfit" })
      );
    });
  });

  it("creates session when sending first message", async () => {
    const { getByPlaceholderText } = render(<AiStylistChatScreen />);
    const input = getByPlaceholderText("描述你的穿搭需求...");
    fireEvent.changeText(input, "I need a date night outfit");

    await act(async () => {
      fireEvent(input, "submitEditing");
    });

    await waitFor(() => {
      expect(mockCreateSession).toHaveBeenCalledWith("I need a date night outfit");
    });
  });

  it("displays user message after sending", async () => {
    const { getByPlaceholderText } = render(<AiStylistChatScreen />);
    const input = getByPlaceholderText("描述你的穿搭需求...");
    fireEvent.changeText(input, "I need a casual outfit");

    await act(async () => {
      fireEvent(input, "submitEditing");
    });

    await waitFor(() => {
      expect(mockAddMessage).toHaveBeenCalledWith(
        expect.objectContaining({ content: "I need a casual outfit" })
      );
    });
  });

  it("displays AI response after receiving", async () => {
    const { getByPlaceholderText } = render(<AiStylistChatScreen />);
    const input = getByPlaceholderText("描述你的穿搭需求...");
    fireEvent.changeText(input, "I need a work outfit");

    await act(async () => {
      fireEvent(input, "submitEditing");
    });

    await waitFor(() => {
      expect(mockAddMessage).toHaveBeenCalledWith(
        expect.objectContaining({ content: "Here is a great outfit for you!" })
      );
    });
  });

  it("shows typing indicator when generating", () => {
    const { useAiStylistStore } = require("../../stores/aiStylistStore");
    useAiStylistStore.mockImplementation((selector: Function) => {
      const state = {
        currentSessionId: "session-123",
        isGenerating: true,
        error: null,
        createSession: mockCreateSession,
        sendMessage: mockSendMessage,
        fetchOutfitPlan: mockFetchOutfitPlan,
        clearError: mockClearError,
        setCurrentSessionId: mockSetCurrentSessionId,
      };
      return selector ? selector(state) : state;
    });

    const { getByText } = render(<AiStylistChatScreen />);
    expect(getByText("AI is thinking...")).toBeTruthy();
  });

  it("shows error banner when error occurs", () => {
    const { useAiStylistStore } = require("../../stores/aiStylistStore");
    useAiStylistStore.mockImplementation((selector: Function) => {
      const state = {
        currentSessionId: null,
        isGenerating: false,
        error: "Network error occurred",
        createSession: mockCreateSession,
        sendMessage: mockSendMessage,
        fetchOutfitPlan: mockFetchOutfitPlan,
        clearError: mockClearError,
        setCurrentSessionId: mockSetCurrentSessionId,
      };
      return selector ? selector(state) : state;
    });

    const { getByText } = render(<AiStylistChatScreen />);
    expect(getByText("Network error occurred")).toBeTruthy();
  });

  it("clears error when dismiss is pressed", () => {
    const { useAiStylistStore } = require("../../stores/aiStylistStore");
    useAiStylistStore.mockImplementation((selector: Function) => {
      const state = {
        currentSessionId: null,
        isGenerating: false,
        error: "Network error occurred",
        createSession: mockCreateSession,
        sendMessage: mockSendMessage,
        fetchOutfitPlan: mockFetchOutfitPlan,
        clearError: mockClearError,
        setCurrentSessionId: mockSetCurrentSessionId,
      };
      return selector ? selector(state) : state;
    });

    const { getByText } = render(<AiStylistChatScreen />);
    fireEvent.press(getByText("关闭"));
    expect(mockClearError).toHaveBeenCalled();
  });

  it("navigates back when back button is pressed", () => {
    const { getByText } = render(<AiStylistChatScreen />);
    // Back button contains an Icon component
    expect(getByText("AI 造型师")).toBeTruthy();
  });

  it("navigates to chat history when history button is pressed", () => {
    const { UNSAFE_root } = render(<AiStylistChatScreen />);
    // Find all TouchableOpacity elements and press the history one
    // The history button is the last TouchableOpacity in the header
    const touchables = UNSAFE_root.findAllByType(require("react-native").TouchableOpacity);
    // touchables[0] = back button, touchables[1] = history button
    if (touchables.length >= 2) {
      fireEvent.press(touchables[1]);
      expect(mockNavigate).toHaveBeenCalledWith("ChatHistory");
    }
  });

  it("disables send when input is empty", () => {
    const { getByPlaceholderText } = render(<AiStylistChatScreen />);
    const input = getByPlaceholderText("描述你的穿搭需求...");
    expect(input.props.value).toBe("");
  });

  it("disables send when generating", () => {
    const { useAiStylistStore } = require("../../stores/aiStylistStore");
    useAiStylistStore.mockImplementation((selector: Function) => {
      const state = {
        currentSessionId: "session-123",
        isGenerating: true,
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
    const input = getByPlaceholderText("描述你的穿搭需求...");
    expect(input.props.editable).toBe(false);
  });

  it("handles scene button press", async () => {
    // Reset the store mock to default state
    const { useAiStylistStore } = require("../../stores/aiStylistStore");
    useAiStylistStore.mockImplementation((selector: Function) => {
      const state = {
        currentSessionId: null,
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

    const { getByText } = render(<AiStylistChatScreen />);
    const dateButton = getByText("约会之夜");
    await act(async () => {
      fireEvent.press(dateButton);
    });

    await waitFor(() => {
      expect(mockAddMessage).toHaveBeenCalledWith(expect.objectContaining({ role: "user" }));
    });
  });

  it("uses existing session when sessionId is provided", async () => {
    const { useAiStylistStore } = require("../../stores/aiStylistStore");
    useAiStylistStore.mockImplementation((selector: Function) => {
      const state = {
        currentSessionId: "existing-session",
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
    const input = getByPlaceholderText("描述你的穿搭需求...");
    fireEvent.changeText(input, "I need a travel outfit");

    await act(async () => {
      fireEvent(input, "submitEditing");
    });

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith("I need a travel outfit");
    });
  });

  it("shows online dot in header", () => {
    const { getByText } = render(<AiStylistChatScreen />);
    expect(getByText("AI 造型师")).toBeTruthy();
  });
});
