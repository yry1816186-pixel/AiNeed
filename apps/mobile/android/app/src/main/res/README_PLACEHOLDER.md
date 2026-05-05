# App Icon Placeholder Resources

> **需设计确认后替换**

所有图标资源均为占位资源，最终应由品牌设计师提供正式图标：

- MD1 vector drawable (`drawable/ic_launcher_foreground.xml`)：衣架 + 面料矢量图形
- Adaptive icon XML (`mipmap-anydpi-v26/`)：引用 `@color/iconBackground` + `@mipmap/ic_launcher_foreground`
- 各密度 raster fallback (`mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/`)：.webp 格式占位图标

## Android 替换指南

1. 使用 Android Studio Image Asset Studio 或设计师提供的最终图标替换
2. 各密度 PNG/WebP 尺寸要求：
   - mdpi (48x48) | hdpi (72x72) | xhdpi (96x96) | xxhdpi (144x144) | xxxhdpi (192x192)
3. 如需修改 adaptive icon，更新 `drawable/ic_launcher_foreground.xml` (foreground layer) 和颜色值

## iOS 替换指南

1. 使用 Xcode Asset Catalog 添加新 AppIcon
2. 替换 `assets/brand/app-icon-ios.png` 为正式图标
