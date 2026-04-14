import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import HomeScreen from '../../screens/home/HomeScreen';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
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
    name: 'Home',
    key: 'home-key',
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

jest.mock('@/src/polyfills/flash-list', () => {
  const { FlatList } = require('react-native');
  return { FlashList: FlatList };
});

jest.mock('@/src/polyfills/expo-linear-gradient', () => {
  const { View } = require('react-native');
  const MockLinearGradient = (props) => <View {...props} />;
  MockLinearGradient.displayName = 'LinearGradient';
  return { LinearGradient: MockLinearGradient, default: MockLinearGradient };
});

const mockFetchProfileCompletion = jest.fn().mockResolvedValue(undefined);
const mockFetchWeather = jest.fn().mockResolvedValue(undefined);
const mockDismissBanner = jest.fn();

jest.mock('../../stores/homeStore', () => ({
  useHomeStore: jest.fn((selector) => {
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

jest.mock('../../stores/recommendationFeedStore', () => ({
  useRecommendationFeedStore: jest.fn((selector) => {
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

jest.mock('../../stores/index', () => ({
  useAuthStore: jest.fn((selector) => {
    const state = {
      user: { nickname: 'TestUser', email: 'test@example.com' },
      token: 'mock-token',
      isAuthenticated: true,
    };
    return selector ? selector(state) : state;
  }),
}));

jest.mock('../../components/ErrorBoundary', () => ({
  withErrorBoundary: (Component) => Component,
}));

jest.mock('../../components/recommendations/RecommendationFeedCard', () => ({
  RecommendationCard: ({ item, onPress }) => null,
}));

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders home screen layout', () => {
    const { getByText } = render(<HomeScreen />);
    expect(getByText('搜索穿搭、单品、风格...')).toBeTruthy();
  });

  it('shows greeting section', async () => {
    const { getByText } = render(<HomeScreen />);
    await waitFor(() => {
      expect(getByText(/好$/)).toBeTruthy();
    });
  });

  it('shows search bar', () => {
    const { getByText } = render(<HomeScreen />);
    expect(getByText('搜索穿搭、单品、风格...')).toBeTruthy();
  });

  it('navigates to Explore when search bar is pressed', () => {
    const { getByText } = render(<HomeScreen />);
    fireEvent.press(getByText('搜索穿搭、单品、风格...'));
    expect(mockNavigate).toHaveBeenCalledWith('Explore');
  });

  it('shows recommendation header', () => {
    const { getByText } = render(<HomeScreen />);
    expect(getByText('为你推荐')).toBeTruthy();
  });

  it('shows view all link in recommendation header', () => {
    const { getByText } = render(<HomeScreen />);
    expect(getByText('查看全部')).toBeTruthy();
  });

  it('fetches data on mount', () => {
    render(<HomeScreen />);
    expect(mockFetchProfileCompletion).toHaveBeenCalledTimes(1);
    expect(mockFetchWeather).toHaveBeenCalledTimes(1);
    expect(mockFetchFeed).toHaveBeenCalledTimes(1);
  });

  it('shows profile completion banner when profile is incomplete', () => {
    const { queryByText } = render(<HomeScreen />);
    expect(queryByText(/完成画像/)).toBeTruthy();
  });

  it('dismisses banner when dismiss is called', () => {
    const { getByText } = render(<HomeScreen />);
    const dismissBtn = getByText(/跳过|稍后|关闭|dismiss/i);
    if (dismissBtn) {
      fireEvent.press(dismissBtn);
      expect(mockDismissBanner).toHaveBeenCalled();
    }
  });

  it('displays user greeting with nickname', async () => {
    const { getByText } = render(<HomeScreen />);
    await waitFor(() => {
      expect(getByText(/TestUser/)).toBeTruthy();
    });
  });

  it('falls back to email prefix when no nickname', () => {
    const { useAuthStore } = require('../../stores/index');
    useAuthStore.mockImplementation((selector) => {
      const state = {
        user: { email: 'fallback@example.com' },
        token: 'mock-token',
        isAuthenticated: true,
      };
      return selector ? selector(state) : state;
    });

    const { getByText } = render(<HomeScreen />);
    expect(getByText(/fallback/)).toBeTruthy();
  });

  it('falls back to default user name when no user data', () => {
    const { useAuthStore } = require('../../stores/index');
    useAuthStore.mockImplementation((selector) => {
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

  it('shows weather loading state', () => {
    const { useHomeStore } = require('../../stores/homeStore');
    useHomeStore.mockImplementation((selector) => {
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
    expect(queryByTestId('weather-loading')).toBeTruthy();
  });

  it('shows weather data when loaded', () => {
    const { useHomeStore } = require('../../stores/homeStore');
    useHomeStore.mockImplementation((selector) => {
      const state = {
        profileCompletionPercent: 100,
        isProfileComplete: true,
        isBannerDismissed: false,
        weatherData: {
          temperature: 25,
          description: 'Sunny',
          icon: 'sunny',
          suggestion: 'Wear light clothes',
          city: 'Beijing',
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

  it('hides banner when profile is complete', () => {
    const { useHomeStore } = require('../../stores/homeStore');
    useHomeStore.mockImplementation((selector) => {
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
    expect(queryByText(/完成画像/)).toBeNull();
  });

  it('hides banner when dismissed', () => {
    const { useHomeStore } = require('../../stores/homeStore');
    useHomeStore.mockImplementation((selector) => {
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
    expect(queryByText(/完成画像/)).toBeNull();
  });
});
