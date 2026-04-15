import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import HomeScreen from "../../screens/home/HomeScreen";

const mockNavigate = jest.fn();
jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: jest.fn(),
    reset: jest.fn(),
    setParams: jest.fn(),
    dispatch: jest.fn(),
    isFocused: () => true,
    canGoBack: () => true,
  }),
  useRoute: () => ({
    params: {},
    name: "Home",
    key: "home-key",
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

jest.mock("@/src/polyfills/flash-list", () => {
  const React = require("react");
  const { ScrollView } = require("react-native");
  // Mock FlashList as a ScrollView that manually renders all items
  const FlashListMock = ({ data, renderItem, contentContainerStyle, ...props }: any) => {
    return (
      <ScrollView contentContainerStyle={contentContainerStyle} {...props}>
        {data
          ? data.map((item: any, index: number) => (
              <React.Fragment key={item.type + "-" + index}>
                {renderItem({ item, index })}
              </React.Fragment>
            ))
          : null}
      </ScrollView>
    );
  };
  return { FlashList: FlashListMock };
});

jest.mock("@/src/polyfills/expo-linear-gradient", () => {
  const { View } = require("react-native");
  const MockLinearGradient = (props: Record<string, unknown>) => <View {...props} />;
  MockLinearGradient.displayName = "LinearGradient";
  return { LinearGradient: MockLinearGradient, default: MockLinearGradient };
});

jest.mock("@react-native-community/geolocation", () => ({
  __esModule: true,
  default: {
    getCurrentPosition: jest.fn((success: Function) =>
      success({ coords: { latitude: 39.9, longitude: 116.4 } })
    ),
  },
}));

jest.mock("../../services/api/recommendation-feed.api", () => ({}));

const mockFetchProfileCompletion = jest.fn().mockResolvedValue(undefined);
const mockFetchWeather = jest.fn().mockResolvedValue(undefined);
const mockDismissBanner = jest.fn();

jest.mock("../../stores/homeStore", () => ({
  useHomeStore: jest.fn((selector: Function) => {
    const state = {
      profileCompletionPercent: 40,
      isProfileComplete: false,
      isBannerDismissed: false,
      weatherData: null,
      isLoadingWeather: false,
      dismissBanner: mockDismissBanner,
      fetchWeather: mockFetchWeather,
      fetchProfileCompletion: mockFetchProfileCompletion,
    };
    return selector ? selector(state) : state;
  }),
}));

const mockFetchFeed = jest.fn().mockResolvedValue(undefined);
const mockLoadMore = jest.fn().mockResolvedValue(undefined);

jest.mock("../../stores/recommendationFeedStore", () => ({
  useRecommendationFeedStore: jest.fn((selector: Function) => {
    const state = {
      items: [],
      isLoading: false,
      fetchFeed: mockFetchFeed,
      loadMore: mockLoadMore,
      hasMore: true,
    };
    return selector ? selector(state) : state;
  }),
}));

jest.mock("../../stores/index", () => ({
  useAuthStore: jest.fn((selector: Function) => {
    const state = {
      user: { nickname: "TestUser", email: "test@example.com" },
      token: "mock-token",
      isAuthenticated: true,
    };
    return selector ? selector(state) : state;
  }),
}));

jest.mock("../../shared/components/ErrorBoundary", () => ({
  withErrorBoundary: (Component: React.ComponentType) => Component,
}));

jest.mock("../../components/recommendations/RecommendationFeedCard", () => ({
  RecommendationCard: ({ item, onPress }: { _item: unknown; _onPress: () => void }) => null,
}));

jest.mock("../../theme/tokens/design-tokens", () => ({
  DesignTokens: {
    colors: {
      brand: {
        terracotta: "#C67B5C",
        terracottaLight: "#D4917A",
        camel: "#B5A08C",
        sage: "#8B9A7D",
        slate: "#7B8FA2",
      },
      neutral: { 200: "#E5E5E5", 900: "#171717" },
      text: { primary: "#1C1917", secondary: "#57534E", tertiary: "#A8A29E", inverse: "#FFFFFF" },
      backgrounds: { primary: "#FFFFFF", secondary: "#FAFAF8", elevated: "#FFFFFF" },
      borders: { light: "#E7E5E4" },
      semantic: {
        success: "#22C55E",
        successLight: "#DCFCE7",
        error: "#EF4444",
        errorLight: "#FEE2E2",
      },
      primary: { 500: "#C67B5C" },
    },
    typography: {
      sizes: { sm: 12, md: 14, lg: 18 },
      fontWeights: { regular: "400", medium: "500", semibold: "600", bold: "700" },
    },
    spacing: { 1: 4, 2: 8, 3: 12, 4: 16 },
    borderRadius: { sm: 6, md: 8, lg: 12, xl: 16, "2xl": 20, "3xl": 24, full: 9999 },
    shadows: { sm: {}, md: {}, lg: {}, xl: {} },
  },
}));

jest.mock("../../screens/home/components/WeatherGreeting", () => ({
  WeatherGreeting: ({
    userName,
    weatherData,
    isLoading,
  }: {
    userName: string;
    weatherData: unknown;
    isLoading: boolean;
  }) => {
    const { View, Text } = require("react-native");
    return (
      <View>
        <Text testID={isLoading ? "weather-loading" : "weather-loaded"}>
          {isLoading ? "Loading..." : `Hi, ${userName}`}
        </Text>
        {weatherData && <Text>{(weatherData as Record<string, unknown>).temperature}°</Text>}
      </View>
    );
  },
}));

jest.mock("../../screens/home/components/ProfileCompletionBanner", () => ({
  ProfileCompletionBanner: ({
    completionPercent,
    isComplete,
    onDismiss,
    onContinue,
  }: {
    completionPercent: number;
    isComplete: boolean;
    onDismiss: () => void;
    onContinue: () => void;
  }) => {
    const { View, Text, TouchableOpacity } = require("react-native");
    if (isComplete) {
      return null;
    }
    return (
      <View>
        <Text>完善画像解锁个性化推荐</Text>
        <Text>{completionPercent}% 已完成</Text>
        <TouchableOpacity onPress={onDismiss}>
          <Text>关闭</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onContinue}>
          <Text>继续完善</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

jest.mock("../../screens/home/components/QuickActions", () => ({
  __esModule: true,
  default: () => {
    const { View, Text } = require("react-native");
    return (
      <View>
        <Text>AI 造型师</Text>
        <Text>虚拟试衣</Text>
      </View>
    );
  },
}));

describe("HomeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders home screen layout", () => {
    const { getByText } = render(<HomeScreen />);
    expect(getByText("搜索穿搭、单品、风格...")).toBeTruthy();
  });

  it("shows greeting section", async () => {
    const { getByText } = render(<HomeScreen />);
    await waitFor(() => {
      expect(getByText(/TestUser/)).toBeTruthy();
    });
  });

  it("shows search bar", () => {
    const { getByText } = render(<HomeScreen />);
    expect(getByText("搜索穿搭、单品、风格...")).toBeTruthy();
  });

  it("navigates to Search when search bar is pressed", () => {
    const { getByText } = render(<HomeScreen />);
    fireEvent.press(getByText("搜索穿搭、单品、风格..."));
    expect(mockNavigate).toHaveBeenCalledWith("Search");
  });

  it("shows recommendation header", () => {
    const { getByText } = render(<HomeScreen />);
    expect(getByText("为你推荐")).toBeTruthy();
  });

  it("shows view all link in recommendation header", () => {
    const { getByText } = render(<HomeScreen />);
    expect(getByText("查看全部")).toBeTruthy();
  });

  it("fetches data on mount", () => {
    render(<HomeScreen />);
    expect(mockFetchProfileCompletion).toHaveBeenCalled();
    expect(mockFetchFeed).toHaveBeenCalled();
  });

  it("shows profile completion banner when profile is incomplete", () => {
    const { queryByText } = render(<HomeScreen />);
    expect(queryByText(/完善画像/)).toBeTruthy();
  });

  it("dismisses banner when dismiss is called", () => {
    const { getByText } = render(<HomeScreen />);
    const dismissBtn = getByText(/关闭/);
    if (dismissBtn) {
      fireEvent.press(dismissBtn);
      expect(mockDismissBanner).toHaveBeenCalled();
    }
  });

  it("displays user greeting with nickname", async () => {
    const { getByText } = render(<HomeScreen />);
    await waitFor(() => {
      expect(getByText(/TestUser/)).toBeTruthy();
    });
  });

  it("falls back to email prefix when no nickname", () => {
    const { useAuthStore } = require("../../stores/index");
    useAuthStore.mockImplementation((selector: Function) => {
      const state = {
        user: { email: "fallback@example.com" },
        token: "mock-token",
        isAuthenticated: true,
      };
      return selector ? selector(state) : state;
    });

    const { getByText } = render(<HomeScreen />);
    expect(getByText(/fallback/)).toBeTruthy();
  });

  it("falls back to default user name when no user data", () => {
    const { useAuthStore } = require("../../stores/index");
    useAuthStore.mockImplementation((selector: Function) => {
      const state = {
        user: null,
        token: null,
        isAuthenticated: false,
      };
      return selector ? selector(state) : state;
    });

    const { getByText } = render(<HomeScreen />);
    expect(getByText(/用户/)).toBeTruthy();
  });

  it("shows weather loading state", () => {
    const { useHomeStore } = require("../../stores/homeStore");
    useHomeStore.mockImplementation((selector: Function) => {
      const state = {
        profileCompletionPercent: 40,
        isProfileComplete: false,
        isBannerDismissed: false,
        weatherData: null,
        isLoadingWeather: true,
        dismissBanner: mockDismissBanner,
        fetchWeather: mockFetchWeather,
        fetchProfileCompletion: mockFetchProfileCompletion,
      };
      return selector ? selector(state) : state;
    });

    const { queryByTestId } = render(<HomeScreen />);
    expect(queryByTestId("weather-loading")).toBeTruthy();
  });

  it("shows weather data when loaded", () => {
    const { useHomeStore } = require("../../stores/homeStore");
    useHomeStore.mockImplementation((selector: Function) => {
      const state = {
        profileCompletionPercent: 100,
        isProfileComplete: true,
        isBannerDismissed: false,
        weatherData: {
          temperature: 25,
          description: "Sunny",
          icon: "sunny",
          suggestion: "Wear light clothes",
          city: "Beijing",
          cachedAt: Date.now(),
        },
        isLoadingWeather: false,
        dismissBanner: mockDismissBanner,
        fetchWeather: mockFetchWeather,
        fetchProfileCompletion: mockFetchProfileCompletion,
      };
      return selector ? selector(state) : state;
    });

    const { getByText } = render(<HomeScreen />);
    expect(getByText(/25/)).toBeTruthy();
  });

  it("hides banner when profile is complete", () => {
    const { useHomeStore } = require("../../stores/homeStore");
    useHomeStore.mockImplementation((selector: Function) => {
      const state = {
        profileCompletionPercent: 100,
        isProfileComplete: true,
        isBannerDismissed: false,
        weatherData: null,
        isLoadingWeather: false,
        dismissBanner: mockDismissBanner,
        fetchWeather: mockFetchWeather,
        fetchProfileCompletion: mockFetchProfileCompletion,
      };
      return selector ? selector(state) : state;
    });

    const { queryByText } = render(<HomeScreen />);
    expect(queryByText(/完善画像/)).toBeNull();
  });

  it("hides banner when dismissed", () => {
    const { useHomeStore } = require("../../stores/homeStore");
    useHomeStore.mockImplementation((selector: Function) => {
      const state = {
        profileCompletionPercent: 40,
        isProfileComplete: false,
        isBannerDismissed: true,
        weatherData: null,
        isLoadingWeather: false,
        dismissBanner: mockDismissBanner,
        fetchWeather: mockFetchWeather,
        fetchProfileCompletion: mockFetchProfileCompletion,
      };
      return selector ? selector(state) : state;
    });

    const { queryByText } = render(<HomeScreen />);
    expect(queryByText(/完善画像/)).toBeNull();
  });
});
