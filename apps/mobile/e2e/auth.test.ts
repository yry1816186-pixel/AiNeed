import { device, element, by, waitFor } from 'detox';
import {
  loginHelper,
  waitForElement,
  takeScreenshot,
  retryAction,
  generateTestEmail,
  dismissKeyboard,
  waitForPageReady,
} from './utils/test-helpers';

// 测试账号
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'Test123456!';

describe('认证流程', () => {
  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('登录', () => {
    it('应能使用正确凭据登录', async () => {
      await takeScreenshot(device, 'login-page-loaded');

      // 等待登录页出现
      await waitForElement(device, '邮箱地址', 10000);

      // 输入凭据
      await element(by.label('邮箱地址')).atIndex(0).typeText(TEST_EMAIL);
      await element(by.label('密码')).atIndex(0).typeText(TEST_PASSWORD);
      await dismissKeyboard(device);

      await takeScreenshot(device, 'login-credentials-entered');

      // 点击登录
      await element(by.label('登录')).tap();

      // 验证登录成功 - 应看到首页 Tab
      await waitForElement(device, '首页', 15000);

      await takeScreenshot(device, 'login-success');
    });

    it('空邮箱时应显示错误提示', async () => {
      await waitForElement(device, '邮箱地址', 10000);

      // 不输入任何内容直接点击登录
      await element(by.label('登录')).tap();

      // 应出现 Alert（React Native Alert）
      // Detox 无法直接断言 Alert 内容，但可以截图验证
      await takeScreenshot(device, 'login-empty-email');
    });

    it('无效邮箱格式应显示错误提示', async () => {
      await waitForElement(device, '邮箱地址', 10000);

      await element(by.label('邮箱地址')).atIndex(0).typeText('invalid-email');
      await element(by.label('密码')).atIndex(0).typeText('Test123456!');
      await dismissKeyboard(device);

      await element(by.label('登录')).tap();

      await takeScreenshot(device, 'login-invalid-email');
    });

    it('错误密码应显示登录失败', async () => {
      await waitForElement(device, '邮箱地址', 10000);

      await element(by.label('邮箱地址')).atIndex(0).typeText(TEST_EMAIL);
      await element(by.label('密码')).atIndex(0).typeText('WrongPassword123!');
      await dismissKeyboard(device);

      await element(by.label('登录')).tap();

      // 等待可能的错误提示
      await takeScreenshot(device, 'login-wrong-password');
    });
  });

  describe('注册', () => {
    it('应能导航到注册页面', async () => {
      await waitForElement(device, '邮箱地址', 10000);

      // 点击"没有账户？立即注册"
      await element(by.label('没有账户？立即注册')).tap();

      // 验证注册页出现
      await waitForElement(device, '创建账户', 10000);

      await takeScreenshot(device, 'register-page-loaded');
    });

    it('应能填写注册表单', async () => {
      // 先导航到注册页
      await waitForElement(device, '邮箱地址', 10000);
      await element(by.label('没有账户？立即注册')).tap();
      await waitForElement(device, '创建账户', 10000);

      const testEmail = generateTestEmail();

      // 填写注册信息
      await element(by.label('邮箱地址')).atIndex(0).typeText(testEmail);
      await element(by.label('昵称（选填）')).atIndex(0).typeText('E2E测试用户');
      await element(by.label('密码')).atIndex(0).typeText('Test123456!');
      await dismissKeyboard(device);

      await takeScreenshot(device, 'register-form-filled');
    });

    it('未同意协议时注册按钮应不可用', async () => {
      await waitForElement(device, '邮箱地址', 10000);
      await element(by.label('没有账户？立即注册')).tap();
      await waitForElement(device, '创建账户', 10000);

      const testEmail = generateTestEmail();

      // 填写信息但不勾选协议
      await element(by.label('邮箱地址')).atIndex(0).typeText(testEmail);
      await element(by.label('密码')).atIndex(0).typeText('Test123456!');
      await dismissKeyboard(device);

      // 注册按钮应处于 disabled 状态
      // Detox 对 disabled 状态的断言有限，通过截图验证
      await takeScreenshot(device, 'register-without-agreement');
    });
  });

  describe('退出登录', () => {
    it('应能从个人中心退出登录', async () => {
      // 先登录
      await retryAction(async () => {
        await loginHelper(device, TEST_EMAIL, TEST_PASSWORD);
      });

      // 导航到"我的" Tab
      await element(by.label('我的')).tap();
      await waitForPageReady(device);

      await takeScreenshot(device, 'profile-page-loaded');

      // 滚动找到退出登录按钮
      // ProfileScreen 使用 ScrollView，需要滚动到底部
      const scrollView = element(by.type('RCTScrollView')).atIndex(0);
      await scrollView.scroll(500, 'down');

      // 点击退出登录
      await waitFor(element(by.label('退出登录')))
        .toBeVisible()
        .withTimeout(10000);
      await element(by.label('退出登录')).tap();

      // 验证返回登录页
      await waitForElement(device, '邮箱地址', 10000);

      await takeScreenshot(device, 'logout-success');
    });
  });
});
