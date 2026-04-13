import { device, element, by, waitFor } from 'detox';

// Tab 名称与 accessibilityLabel 的映射
const TAB_ACCESSIBILITY_LABELS: Record<string, string> = {
  Home: '首页',
  Explore: '发现',
  Heart: '推荐',
  Cart: '购物车',
  Wardrobe: '衣橱',
  Profile: '我的',
};

/**
 * 自动完成登录流程
 * 使用 accessibilityLabel 定位元素（与项目现有代码一致）
 */
export async function loginHelper(
  testDevice: typeof device,
  email: string,
  password: string,
): Promise<void> {
  // 等待登录页加载
  await waitForElement(testDevice, '邮箱地址', 10000);

  // 输入邮箱
  await element(by.label('邮箱地址')).atIndex(0).typeText(email);

  // 输入密码
  await element(by.label('密码')).atIndex(0).typeText(password);

  // 收起键盘
  await dismissKeyboard(testDevice);

  // 点击登录按钮
  await element(by.label('登录')).tap();

  // 等待主页面加载（首页 tab）
  await waitForElement(testDevice, '首页', 15000);
}

/**
 * 导航到指定 Tab
 * @param tabName - Tab 名称: Home | Explore | Heart | Cart | Wardrobe | Profile
 */
export async function navigateToTab(
  testDevice: typeof device,
  tabName: string,
): Promise<void> {
  const label = TAB_ACCESSIBILITY_LABELS[tabName];
  if (!label) {
    throw new Error(`未知 Tab: ${tabName}，可选值: ${Object.keys(TAB_ACCESSIBILITY_LABELS).join(', ')}`);
  }

  await element(by.label(label)).tap();
  // 等待 Tab 内容渲染
  await testDevice.waitForSynchronization(2000);
}

/**
 * 等待指定 accessibilityLabel 的元素出现
 */
export async function waitForElement(
  testDevice: typeof device,
  accessibilityLabel: string,
  timeout: number = 10000,
): Promise<void> {
  await waitFor(element(by.label(accessibilityLabel)).atIndex(0))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * 等待指定 testID 的元素出现
 */
export async function waitForElementByTestId(
  testDevice: typeof device,
  testId: string,
  timeout: number = 10000,
): Promise<void> {
  await waitFor(element(by.id(testId)))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * 截图用于调试
 */
export async function takeScreenshot(
  testDevice: typeof device,
  name: string,
): Promise<void> {
  await testDevice.takeScreenshot(name);
}

/**
 * 重试可能不稳定的操作
 * @param action - 需要重试的异步操作
 * @param maxRetries - 最大重试次数，默认 3
 * @param delay - 重试间隔（毫秒），默认 1000
 */
export async function retryAction<T>(
  action: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await action();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * 生成唯一测试邮箱
 */
export function generateTestEmail(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `e2e.test.${timestamp}.${random}@xuno.dev`;
}

/**
 * 收起键盘
 */
export async function dismissKeyboard(
  testDevice: typeof device,
): Promise<void> {
  // Android 使用 back 按钮，iOS 使用 tap 空白区域
  try {
    await testDevice.pressBack();
  } catch {
    // iOS: 点击屏幕顶部安全区域收起键盘
    try {
      await element(by.label('寻裳')).atIndex(0).tap();
    } catch {
      // 如果都失败，尝试直接继续
    }
  }
}

/**
 * 滚动直到找到指定 accessibilityLabel 的元素
 */
export async function scrollToElement(
  testDevice: typeof device,
  accessibilityLabel: string,
  direction: 'down' | 'up' | 'left' | 'right' = 'down',
  maxScrolls: number = 10,
): Promise<void> {
  const scrollView = element(by.type('RCTScrollView')).atIndex(0);

  for (let i = 0; i < maxScrolls; i++) {
    try {
      await waitFor(element(by.label(accessibilityLabel)).atIndex(0))
        .toBeVisible()
        .withTimeout(2000);
      return;
    } catch {
      await scrollView.scroll(300, direction as 'down' | 'up' | 'left' | 'right');
    }
  }

  throw new Error(`滚动 ${maxScrolls} 次后仍未找到元素: ${accessibilityLabel}`);
}

/**
 * 等待页面完全加载（等待 loading 状态消失）
 */
export async function waitForPageReady(
  testDevice: typeof device,
  timeout: number = 15000,
): Promise<void> {
  // 等待 ActivityIndicator 消失
  try {
    await waitFor(element(by.type('RCTActivityIndicatorView')))
      .not.toBeVisible()
      .withTimeout(timeout);
  } catch {
    // 某些页面可能没有 loading 指示器，直接继续
  }
}
