import { device, element, by, waitFor } from 'detox';
import {
  loginHelper,
  navigateToTab,
  waitForElement,
  takeScreenshot,
  retryAction,
  waitForPageReady,
} from './utils/test-helpers';

// 测试账号
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'Test123456!';

// 6 个 Tab 的 accessibilityLabel
const TABS = [
  { name: 'Home', label: '首页' },
  { name: 'Explore', label: '发现' },
  { name: 'Heart', label: '推荐' },
  { name: 'Cart', label: '购物车' },
  { name: 'Wardrobe', label: '衣橱' },
  { name: 'Profile', label: '我的' },
] as const;

describe('Tab 导航', () => {
  beforeAll(async () => {
    // 登录后进入主页面
    await retryAction(async () => {
      await loginHelper(device, TEST_EMAIL, TEST_PASSWORD);
    });
  });

  beforeEach(async () => {
    // 每个测试前重新加载，确保干净状态
    await device.reloadReactNative();
    await waitForElement(device, '首页', 10000);
  });

  it('应显示所有 6 个 Tab', async () => {
    for (const tab of TABS) {
      await waitFor(element(by.label(tab.label)))
        .toBeVisible()
        .withTimeout(5000);
    }

    await takeScreenshot(device, 'all-tabs-visible');
  });

  it('应能导航到首页 Tab', async () => {
    await navigateToTab(device, 'Home');
    await waitForPageReady(device);

    await takeScreenshot(device, 'tab-home');
  });

  it('应能导航到发现 Tab', async () => {
    await navigateToTab(device, 'Explore');
    await waitForPageReady(device);

    await takeScreenshot(device, 'tab-explore');
  });

  it('应能导航到推荐 Tab', async () => {
    await navigateToTab(device, 'Heart');
    await waitForPageReady(device);

    await takeScreenshot(device, 'tab-heart');
  });

  it('应能导航到购物车 Tab', async () => {
    await navigateToTab(device, 'Cart');
    await waitForPageReady(device);

    await takeScreenshot(device, 'tab-cart');
  });

  it('应能导航到衣橱 Tab', async () => {
    await navigateToTab(device, 'Wardrobe');
    await waitForPageReady(device);

    await takeScreenshot(device, 'tab-wardrobe');
  });

  it('应能导航到我的 Tab', async () => {
    await navigateToTab(device, 'Profile');
    await waitForPageReady(device);

    await takeScreenshot(device, 'tab-profile');
  });

  it('应能连续切换多个 Tab', async () => {
    // 依次切换: 首页 -> 发现 -> 推荐 -> 购物车 -> 衣橱 -> 我的
    for (const tab of TABS) {
      await navigateToTab(device, tab.name);
      await waitForPageReady(device);
    }

    // 最后停在"我的" Tab
    await waitFor(element(by.label('我的')))
      .toBeVisible()
      .withTimeout(5000);

    await takeScreenshot(device, 'tab-sequential-navigation');
  });

  it('应能来回切换 Tab', async () => {
    // 首页 -> 发现 -> 首页
    await navigateToTab(device, 'Explore');
    await waitForPageReady(device);

    await navigateToTab(device, 'Home');
    await waitForPageReady(device);

    await takeScreenshot(device, 'tab-back-and-forth');
  });
});

describe('页面导航（Stack 导航）', () => {
  beforeAll(async () => {
    await retryAction(async () => {
      await loginHelper(device, TEST_EMAIL, TEST_PASSWORD);
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await waitForElement(device, '首页', 10000);
  });

  it('应能从我的页面导航到设置页面并返回', async () => {
    await navigateToTab(device, 'Profile');
    await waitForPageReady(device);

    // 点击"设置"菜单项
    await waitFor(element(by.label('打开设置')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.label('打开设置')).tap();

    await takeScreenshot(device, 'settings-page');

    // 返回
    await element(by.label('返回')).tap();

    // 应回到个人中心
    await waitFor(element(by.label('打开设置')))
      .toBeVisible()
      .withTimeout(10000);

    await takeScreenshot(device, 'settings-back');
  });

  it('应能从我的页面导航到订单页面并返回', async () => {
    await navigateToTab(device, 'Profile');
    await waitForPageReady(device);

    // 点击"我的订单"
    await waitFor(element(by.label('查看我的订单')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.label('查看我的订单')).tap();

    await takeScreenshot(device, 'orders-page');

    // 返回
    await element(by.label('返回')).tap();

    await waitFor(element(by.label('查看我的订单')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('应能从我的页面导航到收藏页面并返回', async () => {
    await navigateToTab(device, 'Profile');
    await waitForPageReady(device);

    // 滚动以显示更多菜单项
    const scrollView = element(by.type('RCTScrollView')).atIndex(0);
    await scrollView.scroll(300, 'down');

    // 点击"我的收藏"
    await waitFor(element(by.label('查看我的收藏')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.label('查看我的收藏')).tap();

    await takeScreenshot(device, 'favorites-page');

    // 返回
    await element(by.label('返回')).tap();
  });
});
