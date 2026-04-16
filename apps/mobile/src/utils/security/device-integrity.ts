import { Platform } from "react-native";
import { Sentry } from "../../services/sentry";

export interface DeviceSecurityStatus {
  isCompromised: boolean;
  isJailbroken: boolean;
  isRooted: boolean;
  isTampered: boolean;
  riskLevel: "none" | "low" | "medium" | "high";
  checksPerformed: string[];
  timestamp: Date;
}

export interface SecurityEvent {
  type: "jailbreak" | "root" | "tamper" | "integrity" | "other";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  details?: Record<string, unknown>;
}

const _IOS_JAILBREAK_PATHS = [
  "/Applications/Cydia.app",
  "/Library/MobileSubstrate/MobileSubstrate.dylib",
  "/bin/bash",
  "/usr/sbin/sshd",
  "/etc/apt",
  "/private/var/lib/apt",
  "/private/var/lib/cydia",
  "/private/var/tmp/cydia.log",
  "/System/Library/LaunchDaemons/com.keychaind.plist",
  "/System/Library/LaunchDaemons/com.saurik.Cydia.Startup.plist",
  "/var/lib/cydia",
  "/var/cache/apt",
  "/var/lib/apt",
  "/usr/bin/sshd",
  "/usr/libexec/sftp-server",
] as const;

const _IOS_JAILBREAK_URL_SCHEMES = ["cydia://", "undecimus://"] as const;

const _ANDROID_ROOT_PATHS = [
  "/system/app/Superuser.apk",
  "/sbin/su",
  "/system/bin/su",
  "/system/xbin/su",
  "/data/local/xbin/su",
  "/data/local/bin/su",
  "/system/sd/xbin/su",
  "/system/bin/failsafe/su",
  "/data/local/su",
  "/su/bin/su",
  "/magisk/.core/bin/su",
  "/system/app/Magisk.apk",
  "/data/adb/magisk",
] as const;

const _ANDROID_ROOT_PACKAGES = [
  "com.noshufou.android.su",
  "com.noshufou.android.su.elite",
  "eu.chainfire.supersu",
  "com.koushikdutta.superuser",
  "com.thirdparty.superuser",
  "com.yellowes.su",
  "com.topjohnwu.magisk",
] as const;

let cachedStatus: DeviceSecurityStatus | null = null;

function reportSecurityEvent(event: SecurityEvent): void {
  Sentry.captureMessage(`[Device-Integrity] ${event.type}: ${event.message}`, {
    level:
      event.severity === "critical" ? "fatal" : event.severity === "high" ? "error" : "warning",
    tags: {
      security: "device-integrity",
      eventType: event.type,
      platform: Platform.OS,
      severity: event.severity,
    },
    extra: { ...event.details, eventMessage: event.message },
  });
}

async function checkIOSJailbreak(): Promise<{ detected: boolean; checks: string[] }> {
  const checks: string[] = [];
  let detected = false;

  // Real jailbreak detection requires a native module (e.g., react-native-jailbreak-detection)
  // that can perform filesystem checks and URL scheme checks from the native layer.
  // The following are mock implementations that demonstrate the interface.

  try {
    const JailbreakDetection = require("react-native-jailbreak-detection").default;
    const isJailbroken = await JailbreakDetection.isJailbroken();
    checks.push("native_jailbreak_module");
    if (isJailbroken) {
      detected = true;
      reportSecurityEvent({
        type: "jailbreak",
        severity: "critical",
        message: "Native jailbreak detection reported device is jailbroken",
        details: { check: "native_jailbreak_module" },
      });
    }
  } catch (error) {
    console.error('Device integrity check failed:', error);
    checks.push("filesystem_check_mock");

    // Mock: In production, a native module would use NSFileManager.fileExistsAtPath
    // to check IOS_JAILBREAK_PATHS. JS layer cannot access the filesystem directly.
    if (__DEV__) {
      console.warn(
        "[Device-Integrity] react-native-jailbreak-detection not available. " +
          "Install the native module for production jailbreak detection."
      );
    }

    checks.push("url_scheme_check_mock");

    // Mock: In production, a native module would use UIApplication.canOpenURL
    // to check IOS_JAILBREAK_URL_SCHEMES. JS layer cannot do this directly.
  }

  return { detected, checks };
}

async function checkAndroidRoot(): Promise<{ detected: boolean; checks: string[] }> {
  const checks: string[] = [];
  let detected = false;

  try {
    const RootDetection = require("react-native-root-detection").default;
    const isRooted = await RootDetection.isRooted();
    checks.push("native_root_module");
    if (isRooted) {
      detected = true;
      reportSecurityEvent({
        type: "root",
        severity: "critical",
        message: "Native root detection reported device is rooted",
        details: { check: "native_root_module" },
      });
    }
  } catch (error) {
    console.error('Device integrity check failed:', error);
    checks.push("su_binary_check_mock");

    // Mock: In production, a native module would check for su binary existence
    // using File.exists() for each path in ANDROID_ROOT_PATHS.

    checks.push("build_tags_check_mock");

    // Mock: In production, a native module would check Build.TAGS for "test-keys".

    checks.push("package_check_mock");

    // Mock: In production, a native module would use PackageManager
    // to check if any package in ANDROID_ROOT_PACKAGES is installed.

    checks.push("writable_system_check_mock");

    // Mock: In production, a native module would check if /system is writable
    // by attempting to write a test file.

    if (__DEV__) {
      console.warn(
        "[Device-Integrity] react-native-root-detection not available. " +
          "Install the native module for production root detection."
      );
    }
  }

  return { detected, checks };
}

async function checkAppTampered(): Promise<{ detected: boolean; checks: string[] }> {
  const checks: string[] = [];
  let detected = false;

  try {
    const TamperDetection = require("react-native-tamper-detection").default;
    const isTampered = await TamperDetection.isTampered();
    checks.push("native_tamper_module");
    if (isTampered) {
      detected = true;
      reportSecurityEvent({
        type: "tamper",
        severity: "critical",
        message: "Native tamper detection reported app has been modified",
        details: { check: "native_tamper_module" },
      });
    }
  } catch (error) {
    console.error('Device integrity check failed:', error);
    checks.push("signature_check_mock");

    // Mock: In production, a native module would verify the APK/IPA signature
    // against the expected signing certificate hash.

    checks.push("package_name_check_mock");

    // Mock: In production, a native module would verify the package name
    // matches the expected identifier (e.g., com.xuno.app).

    checks.push("checksum_check_mock");

    // Mock: In production, a native module would compute checksums of critical
    // files (DEX, SO, assets) and compare against known-good values.

    if (__DEV__) {
      console.warn(
        "[Device-Integrity] react-native-tamper-detection not available. " +
          "Install the native module for production tamper detection."
      );
    }
  }

  return { detected, checks };
}

function calculateRiskLevel(
  status: Omit<DeviceSecurityStatus, "riskLevel">
): DeviceSecurityStatus["riskLevel"] {
  if (status.isJailbroken || status.isRooted || status.isTampered) {
    return "high";
  }
  if (status.isCompromised) {
    return "medium";
  }
  if (status.checksPerformed.some((c) => c.endsWith("_mock"))) {
    return "low";
  }
  return "none";
}

async function performFullCheck(): Promise<DeviceSecurityStatus> {
  const allChecks: string[] = [];
  let isJailbroken = false;
  let isRooted = false;
  let isTampered = false;

  if (Platform.OS === "ios") {
    const jailbreakResult = await checkIOSJailbreak();
    isJailbroken = jailbreakResult.detected;
    allChecks.push(...jailbreakResult.checks);
  } else if (Platform.OS === "android") {
    const rootResult = await checkAndroidRoot();
    isRooted = rootResult.detected;
    allChecks.push(...rootResult.checks);
  }

  const tamperResult = await checkAppTampered();
  isTampered = tamperResult.detected;
  allChecks.push(...tamperResult.checks);

  const isCompromised = isJailbroken || isRooted || isTampered;

  const status: DeviceSecurityStatus = {
    isCompromised,
    isJailbroken,
    isRooted,
    isTampered,
    riskLevel: "none",
    checksPerformed: allChecks,
    timestamp: new Date(),
  };

  status.riskLevel = calculateRiskLevel(status);

  if (status.riskLevel !== "none") {
    reportSecurityEvent({
      type: "integrity",
      severity:
        status.riskLevel === "high"
          ? "critical"
          : status.riskLevel === "medium"
          ? "high"
          : "medium",
      message: `Device security risk detected: level=${status.riskLevel}`,
      details: {
        isJailbroken,
        isRooted,
        isTampered,
        isCompromised,
        checksPerformed: allChecks,
      },
    });
  }

  return status;
}

export async function isDeviceCompromised(): Promise<boolean> {
  const status = await getDeviceSecurityStatus();
  return status.isCompromised;
}

export async function isJailbroken(): Promise<boolean> {
  if (Platform.OS !== "ios") {
    return false;
  }
  const result = await checkIOSJailbreak();
  return result.detected;
}

export async function isRooted(): Promise<boolean> {
  if (Platform.OS !== "android") {
    return false;
  }
  const result = await checkAndroidRoot();
  return result.detected;
}

export async function isAppTampered(): Promise<boolean> {
  const result = await checkAppTampered();
  return result.detected;
}

export async function getDeviceSecurityStatus(): Promise<DeviceSecurityStatus> {
  cachedStatus = await performFullCheck();
  return cachedStatus;
}

export { reportSecurityEvent };

export const deviceIntegrity = {
  isDeviceCompromised,
  isJailbroken,
  isRooted,
  isAppTampered,
  getDeviceSecurityStatus,
  reportSecurityEvent,
} as const;
