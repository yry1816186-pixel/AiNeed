const ReactNative = {
  StyleSheet: {
    create: (styles: Record<string, unknown>) => styles,
    flatten: (style: unknown) => {
      if (Array.isArray(style)) {
        return Object.assign({}, ...style.filter(Boolean));
      }
      return style;
    },
  },
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  ActivityIndicator: 'ActivityIndicator',
  Animated: {
    Value: jest.fn(() => ({
      interpolate: jest.fn(),
    })),
    View: 'AnimatedView',
    timing: jest.fn(() => ({
      start: jest.fn(),
    })),
    loop: jest.fn(() => ({
      start: jest.fn(),
      stop: jest.fn(),
    })),
    sequence: jest.fn(() => ({
      start: jest.fn(),
    })),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })),
  },
  Platform: {
    OS: 'android',
    select: jest.fn((obj: Record<string, unknown>) => obj.android || obj.default),
  },
  Easing: {
    ease: 'ease',
  },
  ScrollView: 'ScrollView',
  FlatList: 'FlatList',
  Image: 'Image',
  TextInput: 'TextInput',
};

module.exports = ReactNative;
