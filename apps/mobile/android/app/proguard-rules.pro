# React Native
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.react.** { *; }
-keep class com.facebook.react.bridge.** { *; }
-keep class com.facebook.react.uimanager.** { *; }
-keep class com.facebook.react.views.** { *; }
-keep class com.facebook.react.module.** { *; }
-keep class com.facebook.fbreact.** { *; }

# Reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.core.** { *; }

# Navigation
-keep class com.reactnativecommunity.** { *; }
-keep class com.swmansion.rnscreens.** { *; }

# Hermes
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.hermes.intl.** { *; }

# Async Storage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# Image Picker
-keep class com.reactnativecommunity.imagepicker.** { *; }

# Safe Area
-keep class com.th3rdwave.safeareacontext.** { *; }

# Gesture Handler
-keep class com.swmansion.gesturehandler.** { *; }

# SVG
-keep class com.horcrux.androidsvg.** { *; }

# Linear Gradient
-keep class com.BV.LinearGradient.** { *; }

# Bottom Sheet
-keep class com.gorhom.** { *; }

# Zustand
-keep class com.zustand.** { *; }

# App packages
-keep class com.xuno.app.** { *; }
-keep class com.xuno.app.BuildConfig { *; }

# OkHttp / Network
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep class okio.** { *; }

# Gson
-keep class com.google.gson.** { *; }

# ErrorProne annotations (used by crypto libraries)
-dontwarn com.google.errorprone.annotations.**

# Remove logging in release
-assumenosideeffects class android.util.Log {
    public static int v(...);
    public static int d(...);
    public static int i(...);
    public static int w(...);
    public static int e(...);
    public static int wtf(...);
}
-dontwarn org.checkerframework.**
-dontwarn org.conscrypt.**
-dontwarn org.intellij.**
