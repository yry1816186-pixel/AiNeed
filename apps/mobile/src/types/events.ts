/**
 * React Native 事件类型定义
 */

import { NativeSyntheticEvent } from "react-native";

// 滚动事件
export interface ScrollEvent {
  nativeEvent: {
    contentOffset: {
      x: number;
      y: number;
    };
    contentSize: {
      width: number;
      height: number;
    };
    layoutMeasurement: {
      width: number;
      height: number;
    };
    zoomScale?: number;
  };
}

export type ScrollEventHandler = (event: NativeSyntheticEvent<ScrollEvent["nativeEvent"]>) => void;

// 触摸事件
export interface TouchEvent {
  nativeEvent: {
    locationX: number;
    locationY: number;
    pageX: number;
    pageY: number;
    identifier: number;
    target: number;
    timestamp: number;
    touches: {
      identifier: number;
      locationX: number;
      locationY: number;
      pageX: number;
      pageY: number;
      target: number;
    }[];
    changedTouches: {
      identifier: number;
      locationX: number;
      locationY: number;
      pageX: number;
      pageY: number;
      target: number;
    }[];
  };
}

export type TouchEventHandler = (event: NativeSyntheticEvent<TouchEvent["nativeEvent"]>) => void;

// 输入框事件
export interface InputFocusEvent {
  nativeEvent: {
    text: string;
    eventCount: number;
    target: number;
  };
}

export type InputFocusEventHandler = (
  event: NativeSyntheticEvent<InputFocusEvent["nativeEvent"]>
) => void;

// 布局事件
export interface LayoutEvent {
  nativeEvent: {
    layout: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    target: number;
  };
}

export type LayoutEventHandler = (event: NativeSyntheticEvent<LayoutEvent["nativeEvent"]>) => void;

// 键盘事件
export interface KeyboardEvent {
  nativeEvent: {
    key: string;
    eventCount: number;
    target: number;
  };
}

// 图片加载事件
export interface ImageLoadEvent {
  nativeEvent: {
    source: {
      uri: string;
      width: number;
      height: number;
    };
    target: number;
  };
}

export interface ImageErrorEvent {
  nativeEvent: {
    error: string;
    target: number;
  };
}

// 动画事件
export interface AnimationEndEvent {
  nativeEvent: {
    finished: boolean;
    value: number;
  };
}
