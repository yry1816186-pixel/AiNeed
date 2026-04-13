# xuno APK 编译指南

## 📋 编译前准备

### 必需环境
- ✅ Node.js >= 20.0.0
- ✅ Android Studio（用于本地编译）
- ✅ Java JDK 17+
- ✅ Android SDK 35
- ✅ NDK 27.1.12297006

### 可选环境（云端编译）
- Expo账号（免费）

---

## 🚀 方法1：EAS云端编译（推荐）

### 优点
- ✅ 不需要配置本地环境
- ✅ 编译稳定，成功率高
- ✅ 自动处理签名

### 步骤

#### 1. 安装EAS CLI
```bash
npm install -g eas-cli
```

#### 2. 登录Expo账号
```bash
eas login
```
如果没有账号，会提示创建（免费）

#### 3. 配置项目
```bash
cd C:/xuno/apps/mobile
eas build:configure
```

#### 4. 开始编译
```bash
# 编译预览版APK（快速）
eas build --platform android --profile preview

# 或编译生产版APK（优化）
eas build --platform android --profile production
```

#### 5. 下载APK
编译完成后（约10-15分钟），会提供下载链接

---

## 🔧 方法2：本地Gradle编译

### 步骤

#### 1. 安装依赖
```bash
cd C:/xuno/apps/mobile
npm install
```

#### 2. 使用Android Studio编译（推荐）
1. 打开 Android Studio
2. 选择 `File → Open`
3. 选择路径：`C:/xuno/apps/mobile/android`
4. 等待Gradle Sync完成
5. 菜单：`Build → Build Bundle(s) / APK(s) → Build APK(s)`

#### 3. 使用命令行编译
```bash
cd C:/xuno/apps/mobile/android

# Windows
gradlew.bat assembleRelease

# macOS/Linux
./gradlew assembleRelease
```

#### 4. APK位置
```
C:/xuno/apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

---

## 📱 方法3：使用项目编译脚本

```bash
cd C:/xuno
compile-apk.bat
```

---

## 🧪 测试APK

### 安装到模拟器
```bash
# 确保模拟器正在运行
adb devices

# 安装APK
adb install C:/xuno/apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

### 安装到真机
1. 传输APK到手机
2. 在手机上打开APK文件
3. 允许安装未知来源应用
4. 完成安装

---

## 🐛 常见问题解决

### 问题1：Gradle编译失败
```bash
# 清理构建缓存
cd C:/xuno/apps/mobile/android
gradlew.bat clean

# 重新编译
gradlew.bat assembleRelease
```

### 问题2：SDK版本不匹配
```bash
# 打开Android Studio → SDK Manager
# 安装以下组件：
- Android SDK Platform 35
- Android SDK Build-Tools 35.0.1
- NDK 27.1.12297006
```

### 问题3：内存不足
编辑 `C:/xuno/apps/mobile/android/gradle.properties`：
```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m
```

### 问题4：EAS编译失败
```bash
# 更新EAS CLI
npm update -g eas-cli

# 重新配置
eas build:configure
```

---

## 📊 编译时间参考

| 方法 | 首次编译 | 后续编译 |
|------|---------|---------|
| EAS云端 | 10-15分钟 | 5-10分钟 |
| 本地Gradle | 5-10分钟 | 1-3分钟 |

---

## ✅ 编译成功检查

编译完成后，检查：
- [ ] APK文件已生成
- [ ] 文件大小约 30-50 MB
- [ ] 可以安装到模拟器
- [ ] 应用可以启动

---

## 🎯 下一步

1. ✅ 编译成功后，查看 [测试指南](./TEST-GUIDE.md)
2. 📱 安装到模拟器或真机
3. 🧪 执行功能测试
4. 📝 记录测试结果

---

## 📞 获取帮助

如果遇到问题：
1. 查看 Android Studio 的 Build Output
2. 检查 Gradle 错误日志
3. 搜索错误信息
4. 提交 Issue 到项目仓库

---

**推荐：第一次编译使用 EAS 云端编译，成功后再配置本地编译环境。**
