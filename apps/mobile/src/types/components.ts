/**
 * 组件通用类型定义
 */

import { ViewStyle, TextStyle, ImageStyle } from 'react-native';

// 样式类型
export type Style = ViewStyle | TextStyle | ImageStyle;
export type StyleProp<T = Style> = T | undefined | null | false | Array<T | undefined | null | false>;

// 组件基础 Props
export interface BaseComponentProps {
  style?: StyleProp;
  testID?: string;
  accessible?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: string;
}

// 列表项渲染
export interface ListRenderItemInfo<T> {
  item: T;
  index: number;
  separators: {
    highlight: () => void;
    unhighlight: () => void;
    updateProps: (select: 'leading' | 'trailing', newProps: object) => void;
  };
}

export type ListRenderItem<T> = (info: ListRenderItemInfo<T>) => React.ReactElement | null;

// 列表 Props
export interface ListProps<T> {
  data: T[];
  renderItem: ListRenderItem<T>;
  keyExtractor: (item: T, index: number) => string;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  ListHeaderComponent?: React.ComponentType | React.ReactElement | null;
  ListFooterComponent?: React.ComponentType | React.ReactElement | null;
  ListEmptyComponent?: React.ComponentType | React.ReactElement | null;
  showsVerticalScrollIndicator?: boolean;
  showsHorizontalScrollIndicator?: boolean;
}

// 卡片 Props
export interface CardProps extends BaseComponentProps {
  onPress?: () => void;
  onLongPress?: () => void;
  activeOpacity?: number;
  disabled?: boolean;
}

// 按钮 Props
export interface ButtonProps extends BaseComponentProps {
  title?: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'text';
  size?: 'small' | 'medium' | 'large';
  icon?: string;
  iconPosition?: 'left' | 'right';
}

// 输入框 Props
export interface InputProps extends BaseComponentProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad' | 'numeric' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  editable?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  error?: string;
  label?: string;
  leftIcon?: string;
  rightIcon?: string;
}

// 图片 Props
export interface ImageProps extends BaseComponentProps {
  source: { uri: string } | number;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  onLoad?: () => void;
  onError?: (error: { nativeEvent: { error: string } }) => void;
  defaultSource?: number;
  fadeDuration?: number;
}

// 模态框 Props
export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  animationType?: 'none' | 'slide' | 'fade';
  transparent?: boolean;
  presentationStyle?: 'fullScreen' | 'pageSheet' | 'formSheet' | 'overFullScreen';
  children: React.ReactNode;
}

// Toast Props
export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  position?: 'top' | 'bottom' | 'center';
  onClose?: () => void;
}

// 加载状态 Props
export interface LoadingProps extends BaseComponentProps {
  size?: 'small' | 'large';
  color?: string;
}

// 空状态 Props
export interface EmptyStateProps extends BaseComponentProps {
  title: string;
  message?: string;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
}
