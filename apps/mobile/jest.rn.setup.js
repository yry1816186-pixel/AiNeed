/**
 * React Native mock setup - must run before jest.setup.js
 * This provides a complete mock of react-native so that
 * jest.setup.js and test files can require('react-native') safely.
 */

// Mock react-native with all commonly used components and APIs
jest.mock('react-native', () => {
  const React = require('react');

  const mockComponent = (name) => {
    const Comp = (props) => React.createElement(name, props, props && props.children);
    Comp.displayName = name;
    return Comp;
  };

  const View = mockComponent('View');
  const Text = mockComponent('Text');
  const Image = mockComponent('Image');
  const ScrollView = mockComponent('ScrollView');
  const TextInput = mockComponent('TextInput');
  const FlatList = mockComponent('FlatList');
  const TouchableOpacity = mockComponent('TouchableOpacity');
  const TouchableHighlight = mockComponent('TouchableHighlight');
  const TouchableWithoutFeedback = mockComponent('TouchableWithoutFeedback');
  const Pressable = mockComponent('Pressable');
  const ActivityIndicator = mockComponent('ActivityIndicator');
  const Modal = mockComponent('Modal');
  const Switch = mockComponent('Switch');
  const RefreshControl = mockComponent('RefreshControl');
  const SafeAreaView = mockComponent('SafeAreaView');
  const KeyboardAvoidingView = mockComponent('KeyboardAvoidingView');
  const StatusBar = mockComponent('StatusBar');
  const VirtualizedList = mockComponent('VirtualizedList');

  return {
    // Components
    View,
    Text,
    Image,
    ScrollView,
    TextInput,
    FlatList,
    TouchableOpacity,
    TouchableHighlight,
    TouchableWithoutFeedback,
    Pressable,
    ActivityIndicator,
    Modal,
    Switch,
    RefreshControl,
    SafeAreaView,
    KeyboardAvoidingView,
    StatusBar,
    VirtualizedList,

    // APIs
    Platform: {
      OS: 'ios',
      Version: 16,
      select: jest.fn((obj) => obj.ios || obj.default),
      isTV: false,
    },

    StyleSheet: {
      create: (styles) => styles,
      flatten: (style) => {
        if (Array.isArray(style)) {
          return Object.assign({}, ...style.filter(Boolean));
        }
        return style;
      },
      absoluteFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
      absoluteFillObject: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
      hairlineWidth: 0.5,
    },

    Dimensions: {
      get: jest.fn(() => ({ width: 390, height: 844, scale: 1, fontScale: 1 })),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },

    Animated: {
      View,
      Text,
      Image,
      ScrollView,
      FlatList,
      Value: jest.fn(() => ({
        interpolate: jest.fn(),
        setValue: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
      })),
      ValueXY: jest.fn(() => ({
        x: new (jest.fn())(),
        y: new (jest.fn())(),
      })),
      timing: jest.fn(() => ({
        start: jest.fn((cb) => cb && cb({ finished: true })),
        stop: jest.fn(),
        reset: jest.fn(),
      })),
      spring: jest.fn(() => ({
        start: jest.fn((cb) => cb && cb({ finished: true })),
        stop: jest.fn(),
        reset: jest.fn(),
      })),
      decay: jest.fn(() => ({
        start: jest.fn((cb) => cb && cb({ finished: true })),
        stop: jest.fn(),
        reset: jest.fn(),
      })),
      sequence: jest.fn(() => ({
        start: jest.fn((cb) => cb && cb({ finished: true })),
        stop: jest.fn(),
        reset: jest.fn(),
      })),
      parallel: jest.fn(() => ({
        start: jest.fn((cb) => cb && cb({ finished: true })),
        stop: jest.fn(),
        reset: jest.fn(),
      })),
      stagger: jest.fn(() => ({
        start: jest.fn((cb) => cb && cb({ finished: true })),
        stop: jest.fn(),
        reset: jest.fn(),
      })),
      loop: jest.fn(() => ({
        start: jest.fn((cb) => cb && cb({ finished: true })),
        stop: jest.fn(),
        reset: jest.fn(),
      })),
      event: jest.fn(() => jest.fn()),
      createAnimatedComponent: jest.fn((component) => component),
      add: jest.fn(),
      multiply: jest.fn(),
      divide: jest.fn(),
      mod: jest.fn(),
      diff: jest.fn(),
      interpolate: jest.fn(),
      diffClamp: jest.fn(),
    },

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

    Keyboard: {
      dismiss: jest.fn(),
      addListener: jest.fn(() => ({ remove: jest.fn() })),
      removeListener: jest.fn(),
      isVisible: jest.fn(() => false),
    },

    Alert: {
      alert: jest.fn(),
    },

    AppState: {
      currentState: 'active',
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
      removeEventListener: jest.fn(),
    },

    BackHandler: {
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
      removeEventListener: jest.fn(),
      exitApp: jest.fn(),
    },

    Clipboard: {
      getString: jest.fn(() => Promise.resolve('')),
      setString: jest.fn(),
    },

    PixelRatio: {
      get: jest.fn(() => 2),
      getFontScale: jest.fn(() => 1),
      getPixelSizeForLayoutSize: jest.fn((size) => size * 2),
      roundToNearestPixel: jest.fn((size) => size),
    },

    I18nManager: {
      isRTL: false,
      allowRTL: jest.fn(),
      forceRTL: jest.fn(),
      swapLeftAndRightInRTL: jest.fn(),
    },

    InteractionManager: {
      runAfterInteractions: jest.fn((cb) => {
        if (cb) cb();
        return { then: jest.fn(), done: jest.fn(), cancel: jest.fn() };
      }),
      createInteractionHandle: jest.fn(() => 1),
      clearInteractionHandle: jest.fn(),
      setDeadline: jest.fn(),
    },

    LayoutAnimation: {
      configureNext: jest.fn(),
      create: jest.fn(),
      Types: { spring: 'spring', linear: 'linear', easeInEaseOut: 'easeInEaseOut', easeIn: 'easeIn', easeOut: 'easeOut', keyboard: 'keyboard' },
      Properties: { opacity: 'opacity', scaleX: 'scaleX', scaleY: 'scaleY', scaleXY: 'scaleXY' },
    },

    NativeModules: {
      StatusBarManager: {
        getHeight: jest.fn((cb) => cb(44)),
        setStyle: jest.fn(),
        setHidden: jest.fn(),
        setNetworkActivityIndicatorVisible: jest.fn(),
      },
      KeyboardAvoidingView: {},
      DevSettings: {
        addMenuItem: jest.fn(),
        reload: jest.fn(),
      },
    },

    NativeEventEmitter: jest.fn(() => ({
      addListener: jest.fn(() => ({ remove: jest.fn() })),
      removeSubscription: jest.fn(),
      removeAllListeners: jest.fn(),
    })),

    DeviceEventEmitter: {
      addListener: jest.fn(() => ({ remove: jest.fn() })),
      removeListener: jest.fn(),
      emit: jest.fn(),
    },

    Appearance: {
      getColorScheme: jest.fn(() => 'light'),
      addChangeListener: jest.fn(() => ({ remove: jest.fn() })),
    },

    AccessibilityInfo: {
      isBoldTextEnabled: jest.fn(() => Promise.resolve(false)),
      isGrayscaleEnabled: jest.fn(() => Promise.resolve(false)),
      isInvertColorsEnabled: jest.fn(() => Promise.resolve(false)),
      isReduceMotionEnabled: jest.fn(() => Promise.resolve(false)),
      isReduceTransparencyEnabled: jest.fn(() => Promise.resolve(false)),
      isScreenReaderEnabled: jest.fn(() => Promise.resolve(false)),
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
      announceForAccessibility: jest.fn(),
    },

    Vibration: {
      vibrate: jest.fn(),
      cancel: jest.fn(),
    },

    Linking: {
      openURL: jest.fn(() => Promise.resolve()),
      canOpenURL: jest.fn(() => Promise.resolve(true)),
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
      removeEventListener: jest.fn(),
      getInitialURL: jest.fn(() => Promise.resolve(null)),
    },

    Share: {
      share: jest.fn(() => Promise.resolve({ action: 'sharedAction' })),
    },

    ColorPropType: jest.fn(),
    PointPropType: jest.fn(),

    // Style types
    processColor: jest.fn((c) => c),
  };
});
