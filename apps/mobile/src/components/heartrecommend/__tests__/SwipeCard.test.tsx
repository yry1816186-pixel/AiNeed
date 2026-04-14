import React from 'react';
import { render } from '@testing-library/react-native';
import { SwipeCard, type ProductItem } from '../SwipeCard';

jest.mock('@/src/polyfills/expo-linear-gradient', () => {
  const { View } = require('react-native');
  const MockLinearGradient = (props) => <View {...props} />;
  MockLinearGradient.displayName = 'LinearGradient';
  return { LinearGradient: MockLinearGradient, default: MockLinearGradient };
});

jest.mock('@/src/polyfills/expo-vector-icons', () => {
  const { Text } = require('react-native');
  const createIcon = (name) => (props) => <Text {...props}>{name}</Text>;
  return {
    Ionicons: createIcon('Ionicons'),
    MaterialCommunityIcons: createIcon('MaterialCommunityIcons'),
    Feather: createIcon('Feather'),
    AntDesign: createIcon('AntDesign'),
  };
});

const mockProductItem: ProductItem = {
  id: 'test-1',
  name: 'Test Product',
  description: 'A test product description',
  price: 299,
  originalPrice: 599,
  currency: 'CNY',
  images: ['https://example.com/image.jpg'],
  category: 'tops',
  colors: ['red', 'blue'],
  sizes: ['M', 'L'],
  brand: {
    id: 'brand-1',
    name: 'Test Brand',
  },
  tags: ['casual', 'summer'],
  score: 0.85,
  matchReasons: ['Matches your style', 'Good for your body type'],
};

const defaultProps = {
  item: mockProductItem,
  onSwipeLeft: jest.fn(),
  onSwipeRight: jest.fn(),
  onSwipeUp: jest.fn(),
  onSwipeDown: jest.fn(),
  isActive: true,
  index: 0,
};

describe('SwipeCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders card content', () => {
    const { getByText } = render(<SwipeCard {...defaultProps} />);
    expect(getByText('Test Product')).toBeTruthy();
  });

  it('shows product name', () => {
    const { getByText } = render(<SwipeCard {...defaultProps} />);
    expect(getByText('Test Product')).toBeTruthy();
  });

  it('shows product price', () => {
    const { getByText } = render(<SwipeCard {...defaultProps} />);
    expect(getByText('¥299')).toBeTruthy();
  });

  it('shows original price when present', () => {
    const { getByText } = render(<SwipeCard {...defaultProps} />);
    expect(getByText('¥599')).toBeTruthy();
  });

  it('shows brand name when present', () => {
    const { getByText } = render(<SwipeCard {...defaultProps} />);
    expect(getByText('Test Brand')).toBeTruthy();
  });

  it('shows match reasons', () => {
    const { getByText } = render(<SwipeCard {...defaultProps} />);
    expect(getByText('Matches your style')).toBeTruthy();
    expect(getByText('Good for your body type')).toBeTruthy();
  });

  it('renders without brand', () => {
    const itemNoBrand = { ...mockProductItem, brand: undefined };
    const { queryByText } = render(
      <SwipeCard {...defaultProps} item={itemNoBrand} />
    );
    expect(queryByText('Test Brand')).toBeNull();
  });

  it('renders without original price', () => {
    const itemNoOriginal = { ...mockProductItem, originalPrice: undefined };
    const { queryByText } = render(
      <SwipeCard {...defaultProps} item={itemNoOriginal} />
    );
    expect(queryByText('¥599')).toBeNull();
  });

  it('renders without match reasons', () => {
    const itemNoReasons = { ...mockProductItem, matchReasons: undefined };
    const { queryByText } = render(
      <SwipeCard {...defaultProps} item={itemNoReasons} />
    );
    expect(queryByText('Matches your style')).toBeNull();
  });

  it('renders as inactive card', () => {
    const { getByText } = render(
      <SwipeCard {...defaultProps} isActive={false} index={1} />
    );
    expect(getByText('Test Product')).toBeTruthy();
  });

  it('renders with fallback image when no images provided', () => {
    const itemNoImages = { ...mockProductItem, images: [] };
    const { getByText } = render(
      <SwipeCard {...defaultProps} item={itemNoImages} />
    );
    expect(getByText('Test Product')).toBeTruthy();
  });

  it('renders with more than 5 colors showing count', () => {
    const itemManyColors = {
      ...mockProductItem,
      colors: ['red', 'blue', 'green', 'yellow', 'black', 'white', 'pink'],
    };
    const { getByText } = render(
      <SwipeCard {...defaultProps} item={itemManyColors} />
    );
    expect(getByText('+2')).toBeTruthy();
  });

  it('renders with empty colors array', () => {
    const itemNoColors = { ...mockProductItem, colors: [] };
    const { getByText } = render(
      <SwipeCard {...defaultProps} item={itemNoColors} />
    );
    expect(getByText('Test Product')).toBeTruthy();
  });

  it('renders like indicator text', () => {
    const { getByText } = render(<SwipeCard {...defaultProps} />);
    expect(getByText('喜欢')).toBeTruthy();
  });

  it('renders nope indicator text', () => {
    const { getByText } = render(<SwipeCard {...defaultProps} />);
    expect(getByText('跳过')).toBeTruthy();
  });

  it('renders cart indicator text', () => {
    const { getByText } = render(<SwipeCard {...defaultProps} />);
    expect(getByText('加入购物车')).toBeTruthy();
  });

  it('renders skip indicator text', () => {
    const { getByText } = render(<SwipeCard {...defaultProps} />);
    expect(getByText('不喜欢')).toBeTruthy();
  });
});
