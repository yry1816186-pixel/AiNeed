import { useState, useEffect } from 'react';
import { Keyboard, KeyboardEventListener } from 'react-native';

interface KeyboardState {
  isKeyboardVisible: boolean;
  keyboardHeight: number;
}

/**
 * useKeyboard - 键盘状态 Hook
 * 用于需要感知键盘弹出/收起的场景（如聊天输入框、表单底部定位）
 *
 * @returns  键盘可见状态和键盘高度
 */
export function useKeyboard(): KeyboardState {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const onShow: KeyboardEventListener = (event) => {
      setIsKeyboardVisible(true);
      setKeyboardHeight(event.endCoordinates.height);
    };

    const onHide: KeyboardEventListener = () => {
      setIsKeyboardVisible(false);
      setKeyboardHeight(0);
    };

    const showSub = Keyboard.addListener('keyboardDidShow', onShow);
    const hideSub = Keyboard.addListener('keyboardDidHide', onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return { isKeyboardVisible, keyboardHeight };
}
