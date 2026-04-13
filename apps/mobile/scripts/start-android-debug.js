const http = require("http");
const fs = require("fs");
const { spawn, spawnSync } = require("child_process");
const path = require("path");

const PACKAGER_URL = "http://127.0.0.1:8081/status";
const APP_ID = "com.xuno.app";

// Windows上需要完整路径
const adbPath = process.env.ANDROID_HOME
  ? path.join(process.env.ANDROID_HOME, "platform-tools", "adb.exe")
  : process.platform === "win32"
    ? path.join(process.env.LOCALAPPDATA, "Android", "Sdk", "platform-tools", "adb.exe")
    : "adb";
const isMetroOnly = process.argv.includes("--metro-only");
const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const gradleCommand = process.platform === "win32" ? ".\\gradlew.bat" : "./gradlew";
const androidDir = path.resolve(__dirname, "..", "android");
const workspaceRoot = path.resolve(__dirname, "..", "..", "..");
const pnpmStoreDir = path.join(workspaceRoot, "node_modules", ".pnpm");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(message) {
  process.stdout.write(`[android-debug] ${message}\n`);
}

function warn(message) {
  process.stderr.write(`[android-debug] ${message}\n`);
}

function requestPackagerStatus() {
  return new Promise((resolve) => {
    const req = http.get(PACKAGER_URL, (res) => {
      let body = "";

      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        resolve(body.trim());
      });
    });

    req.on("error", () => {
      resolve("");
    });

    req.setTimeout(2000, () => {
      req.destroy();
      resolve("");
    });
  });
}

async function waitForPackager(timeoutMs = 120000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const status = await requestPackagerStatus();
    if (status === "packager-status:running") {
      return true;
    }
    await sleep(1000);
  }

  return false;
}

function runAdb(args, options = {}) {
  return spawnSync(adbPath, args, {
    stdio: "inherit",
    ...options,
  });
}

function getConnectedDevices() {
  const result = spawnSync(adbPath, ["devices"], { encoding: "utf8" });

  if (result.error) {
    warn(`adb devices failed: ${result.error.message}`);
    return [];
  }

  return result.stdout
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line.endsWith("\tdevice"))
    .map((line) => line.split("\t")[0]);
}

function ensureAdbReverse() {
  const result = runAdb(["reverse", "tcp:8081", "tcp:8081"]);
  if (result.status !== 0) {
    warn("adb reverse tcp:8081 tcp:8081 failed; continuing anyway.");
  }
}

function findPackageNodeModulesRoot(packageName, matcher) {
  if (!fs.existsSync(pnpmStoreDir)) {
    return "";
  }

  const segments = packageName.split("/");
  const entries = fs
    .readdirSync(pnpmStoreDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .sort((left, right) => left.name.localeCompare(right.name));

  for (const entry of entries) {
    const nodeModulesRoot = path.join(pnpmStoreDir, entry.name, "node_modules");
    const packageDir = path.join(nodeModulesRoot, ...segments);
    const packageJson = path.join(packageDir, "package.json");

    if (!fs.existsSync(packageJson)) {
      continue;
    }

    if (matcher && !matcher(packageDir)) {
      continue;
    }

    return nodeModulesRoot;
  }

  return "";
}

function buildInstallNodePath() {
  const roots = [
    path.join(workspaceRoot, "node_modules"),
    path.join(workspaceRoot, "apps", "mobile", "node_modules"),
    findPackageNodeModulesRoot("expo"),
    findPackageNodeModulesRoot(
      "expo-modules-autolinking",
      (packageDir) => fs.existsSync(path.join(packageDir, "android", "expo-gradle-plugin"))
    ),
    findPackageNodeModulesRoot("react-native"),
    findPackageNodeModulesRoot("@react-native/gradle-plugin"),
  ].filter(Boolean);

  return Array.from(new Set(roots)).join(path.delimiter);
}

function isAppInstalled() {
  const result = spawnSync("adb", ["shell", "pm", "path", APP_ID], {
    encoding: "utf8",
  });

  if (result.error) {
    warn(`Failed to query installed package state: ${result.error.message}`);
    return false;
  }

  return result.stdout.includes("package:");
}

function installDebugApp() {
  log("Debug app is not installed. Running installDebug...");
  const nodePath = buildInstallNodePath();
  const result = spawnSync(gradleCommand, ["installDebug"], {
    cwd: androidDir,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      ...(nodePath
        ? {
            NODE_PATH: [nodePath, process.env.NODE_PATH]
              .filter(Boolean)
              .join(path.delimiter),
          }
        : {}),
    },
  });

  if (result.status !== 0) {
    throw new Error("gradlew installDebug failed.");
  }
}

function launchApp() {
  const result = runAdb([
    "shell",
    "monkey",
    "-p",
    APP_ID,
    "-c",
    "android.intent.category.LAUNCHER",
    "1",
  ]);

  if (result.status !== 0) {
    throw new Error("Failed to launch Android app via adb monkey.");
  }
}

async function main() {
  const devices = getConnectedDevices();

  if (devices.length === 0) {
    warn("No Android device or emulator is connected.");
  } else {
    log(`Connected target(s): ${devices.join(", ")}`);
    ensureAdbReverse();
  }

  const packagerStatus = await requestPackagerStatus();

  if (packagerStatus === "packager-status:running") {
    log("Metro is already running on port 8081.");

    if (!isMetroOnly && devices.length > 0) {
      if (!isAppInstalled()) {
        installDebugApp();
      } else {
        log("Debug app is already installed.");
      }

      launchApp();
    }

    return;
  }

  log("Starting Expo Metro on port 8081...");
  const metroProcess = spawn(
    pnpmCommand,
    ["exec", "expo", "start", "--port", "8081", "--clear"],
    {
      stdio: "inherit",
      shell: true,
      env: {
        ...process.env,
        EXPO_NO_TELEMETRY: "1",
      },
    },
  );

  const isReady = await waitForPackager();

  if (!isReady) {
    metroProcess.kill();
    throw new Error("Metro did not become ready on port 8081 within 120s.");
  }

  log("Metro is ready.");

  if (!isMetroOnly && devices.length > 0) {
    if (!isAppInstalled()) {
      installDebugApp();
    } else {
      log("Debug app is already installed.");
    }

    launchApp();
  }

  metroProcess.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  warn(error.message);
  process.exit(1);
});
