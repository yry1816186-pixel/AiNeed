// extend-expect moved to afterFramework in jest-native 5+; 
// for jest-native 4 with Jest 29, conditionally import
try {
  require('@testing-library/jest-native/extend-expect');
} catch (e) {
  // Silently skip if not available in this environment
}

jest.mock('react-native-reanimated', () => {
  // Cannot use the actual mock because it requires react-native internals
  // that are not available in our test environment. Provide a minimal mock instead.
  const React = require('react');
  const { View, Text, Image, ScrollView, FlatList } = require('react-native');
  const createAnimatedComponent = (component) => component;
  const AnimatedComponent = React.forwardRef((props, ref) => React.createElement('AnimatedComponent', { ...props, ref }, props.children));
  const Reanimated = {
    __esModule: true,
    default: Object.assign(AnimatedComponent, {
      View,
      Text,
      Image,
      ScrollView,
      FlatList,
      createAnimatedComponent,
    }),
    View,
    Text: require('react-native').Text,
    Image: require('react-native').Image,
    ScrollView: require('react-native').ScrollView,
    FlatList: require('react-native').FlatList,
    createAnimatedComponent: (component) => component,
    interpolate: jest.fn(),
    Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
    Extrapolate: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
    useSharedValue: jest.fn((initial) => ({ value: initial })),
    useAnimatedStyle: jest.fn((cb) => cb()),
    useAnimatedProps: jest.fn((cb) => cb()),
    useAnimatedScrollHandler: jest.fn((handlers) => jest.fn()),
    useAnimatedGestureHandler: jest.fn((handlers) => jest.fn()),
    useDerivedValue: jest.fn((cb) => ({ value: cb() })),
    useAnimatedReaction: jest.fn(),
    withTiming: jest.fn((toValue) => toValue),
    withSpring: jest.fn((toValue) => toValue),
    withDecay: jest.fn((config) => 0),
    withRepeat: jest.fn((animation) => animation),
    withSequence: jest.fn((...animations) => animations[0]),
    withDelay: jest.fn((delay, animation) => animation),
    cancelAnimation: jest.fn(),
    runOnJS: jest.fn((fn) => fn),
    runOnUI: jest.fn((fn) => fn),
    Easing: {
      linear: jest.fn(),
      ease: jest.fn(),
      quad: jest.fn(),
      cubic: jest.fn(),
      poly: jest.fn(),
      sin: jest.fn(),
      circle: jest.fn(),
      exp: jest.fn(),
      elastic: jest.fn(),
      back: jest.fn(),
      bounce: jest.fn(),
      bezier: jest.fn(),
      in: jest.fn(),
      out: jest.fn(),
      inOut: jest.fn(),
    },
    Clock: jest.fn(),
    Value: jest.fn(),
    Node: jest.fn(),
    cond: jest.fn(),
    block: jest.fn(),
    call: jest.fn(),
    debug: jest.fn(),
    set: jest.fn(),
    startClock: jest.fn(),
    stopClock: jest.fn(),
    clockRunning: jest.fn(),
    timing: jest.fn(),
    spring: jest.fn(),
    decay: jest.fn(),
    add: jest.fn(),
    sub: jest.fn(),
    multiply: jest.fn(),
    divide: jest.fn(),
    pow: jest.fn(),
    modulo: jest.fn(),
    sqrt: jest.fn(),
    log: jest.fn(),
    and: jest.fn(),
    or: jest.fn(),
    not: jest.fn(),
    defined: jest.fn(),
    lessThan: jest.fn(),
    eq: jest.fn(),
    greaterThan: jest.fn(),
    lessOrEq: jest.fn(),
    greaterOrEq: jest.fn(),
    neq: jest.fn(),
    onChange: jest.fn(),
    abs: jest.fn(),
    min: jest.fn(),
    max: jest.fn(),
    acc: jest.fn(),
    color: jest.fn(),
    diff: jest.fn(),
    concat: jest.fn(),
    interpolateColor: jest.fn(),
    Transition: { In: {}, Out: {} },
    Layout: jest.fn(),
    FadeIn: jest.fn(),
    FadeOut: jest.fn(),
    SlideInRight: jest.fn(),
    SlideOutRight: jest.fn(),
    SlideInLeft: jest.fn(),
    SlideOutLeft: jest.fn(),
    SlideInUp: jest.fn(),
    SlideOutUp: jest.fn(),
    SlideInDown: jest.fn(),
    SlideOutDown: jest.fn(),
    ZoomIn: jest.fn(),
    ZoomOut: jest.fn(),
    PinchGestureHandler: View,
    PanGestureHandler: View,
    TapGestureHandler: View,
    LongPressGestureHandler: View,
    RotationGestureHandler: View,
    ForceTouchGestureHandler: View,
    FlingGestureHandler: View,
    GestureHandlerRootView: View,
    GestureDetector: ({ children }) => children,
    Gesture: {
      Pan: () => ({
        enabled: jest.fn().mockReturnThis(),
        onUpdate: jest.fn().mockReturnThis(),
        onEnd: jest.fn().mockReturnThis(),
        onStart: jest.fn().mockReturnThis(),
        minDistance: jest.fn().mockReturnThis(),
        activeOffsetX: jest.fn().mockReturnThis(),
        activeOffsetY: jest.fn().mockReturnThis(),
      }),
      Tap: () => ({
        enabled: jest.fn().mockReturnThis(),
        numberOfTaps: jest.fn().mockReturnThis(),
        onEnd: jest.fn().mockReturnThis(),
      }),
      LongPress: () => ({
        enabled: jest.fn().mockReturnThis(),
        onEnd: jest.fn().mockReturnThis(),
      }),
      Pinch: () => ({
        enabled: jest.fn().mockReturnThis(),
        onUpdate: jest.fn().mockReturnThis(),
      }),
      Race: () => jest.fn().mockReturnThis(),
      Simultaneous: () => jest.fn().mockReturnThis(),
      Exclusive: () => jest.fn().mockReturnThis(),
      Composition: () => jest.fn().mockReturnThis(),
    },
  };
  return Reanimated;
});

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const { View } = require('react-native');
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaConsumer: ({ children }) => children(inset),
    SafeAreaView: View,
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
    initialWindowMetrics: { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: inset },
  };
});

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      reset: jest.fn(),
      setParams: jest.fn(),
      dispatch: jest.fn(),
      isFocused: () => true,
      canGoBack: () => true,
    }),
    useRoute: () => ({
      params: {},
      name: 'TestScreen',
      key: 'test-key',
    }),
    useFocusEffect: jest.fn(),
    useIsFocused: () => true,
    useNavigationState: jest.fn(),
    NavigationContainer: ({ children }) => children,
    createNavigationContainerRef: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      reset: jest.fn(),
      isReady: () => true,
    }),
  };
});

jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  const gestureHandler = {
    GestureHandlerRootView: View,
    PanGestureHandler: View,
    TapGestureHandler: View,
    LongPressGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    RawButton: View,
    BaseButton: View,
    RectButton: View,
    BorderlessButton: View,
    FlatList: require('react-native').FlatList,
    ScrollView: require('react-native').ScrollView,
    Switch: require('react-native').Switch,
    TextInput: require('react-native').TextInput,
    DrawerLayout: View,
    State: {
      UNDETERMINED: 0,
      FAILED: 1,
      BEGAN: 2,
      CANCELLED: 3,
      ACTIVE: 4,
      END: 5,
      RUNNING: 6,
      BLOCKED: 8,
    },
    Directions: {},
    Gesture: {
      Pan: () => ({
        enabled: jest.fn().mockReturnThis(),
        onUpdate: jest.fn().mockReturnThis(),
        onEnd: jest.fn().mockReturnThis(),
        onStart: jest.fn().mockReturnThis(),
        onFinalize: jest.fn().mockReturnThis(),
        minDistance: jest.fn().mockReturnThis(),
        maxDistance: jest.fn().mockReturnThis(),
        activeOffsetX: jest.fn().mockReturnThis(),
        activeOffsetY: jest.fn().mockReturnThis(),
        failOffsetX: jest.fn().mockReturnThis(),
        failOffsetY: jest.fn().mockReturnThis(),
      }),
      Tap: () => ({
        enabled: jest.fn().mockReturnThis(),
        numberOfTaps: jest.fn().mockReturnThis(),
        onEnd: jest.fn().mockReturnThis(),
      }),
      LongPress: () => ({
        enabled: jest.fn().mockReturnThis(),
        onEnd: jest.fn().mockReturnThis(),
      }),
      Pinch: () => ({
        enabled: jest.fn().mockReturnThis(),
        onUpdate: jest.fn().mockReturnThis(),
        onEnd: jest.fn().mockReturnThis(),
      }),
      Race: () => jest.fn().mockReturnThis(),
      Simultaneous: () => jest.fn().mockReturnThis(),
      Exclusive: () => jest.fn().mockReturnThis(),
    },
    GestureDetector: ({ children }) => children,
  };
  return gestureHandler;
});

jest.mock('react-native-svg', () => {
  const View = require('react-native').View;
  const Text = require('react-native').Text;
  return {
    default: View,
    Svg: View,
    Circle: View,
    Ellipse: View,
    G: View,
    Text: Text,
    TSpan: Text,
    TextPath: Text,
    Path: View,
    Polygon: View,
    Polyline: View,
    Line: View,
    Rect: View,
    Use: View,
    Image: View,
    Symbol: View,
    Defs: View,
    LinearGradient: View,
    RadialGradient: View,
    Stop: View,
    ClipPath: View,
    Pattern: View,
    Mask: View,
    Marker: View,
    ForeignObject: View,
    SvgXml: View,
    SvgUri: View,
    Css: View,
  };
});

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  usePathname: () => '/',
  useGlobalSearchParams: () => ({}),
  Link: 'Link',
  Stack: { Screen: 'Screen' },
  Tabs: { Screen: 'Screen' },
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(),
}));

jest.mock('expo-font', () => ({
  loadAsync: jest.fn(),
  isLoaded: jest.fn(() => true),
}));

jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        API_URL: 'http://localhost:3001/api/v1',
        AI_SERVICE_URL: 'http://localhost:8001',
      },
    },
  },
}));

jest.mock('expo-blur', () => {
  const View = require('react-native').View;
  return {
    BlurView: View,
    BlurViewPropTypes: {},
  };
});

jest.mock('react-native-linear-gradient', () => {
  const View = require('react-native').View;
  const LinearGradientMock = (props) => props.children;
  LinearGradientMock.displayName = 'LinearGradient';
  return LinearGradientMock;
});

jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
  default: { trigger: jest.fn() },
}));

const originalWarn = console.warn;
const originalError = console.error;

global.console = {
  ...console,
  warn: (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('componentWillMount') ||
        args[0].includes('componentWillReceiveProps') ||
        args[0].includes('componentWillUpdate') ||
        args[0].includes('Accessing the internal'))
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  },
  error: (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('The above error occurred') ||
        args[0].includes('Not implemented: HTMLFormElement.prototype.submit') ||
        args[0].includes('act('))
    ) {
      return;
    }
    originalError.call(console, ...args);
  },
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
};
