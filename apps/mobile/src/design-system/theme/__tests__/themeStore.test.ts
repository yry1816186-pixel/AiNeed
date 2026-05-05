import {
  useThemeStore,
  startAppearanceListener,
  stopAppearanceListener,
  useTheme,
} from "../themeStore";
import { resolveColors, lightColors, darkColors } from "../color-resolver";
import { Appearance } from "react-native";

jest.mock("react-native", () => ({
  Appearance: {
    getColorScheme: jest.fn(() => "light"),
    addChangeListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

describe("ThemeStore", () => {
  afterEach(() => {
    useThemeStore.getState().setMode("light");
  });

  describe("mode switching", () => {
    it("setMode('dark') sets mode to dark", () => {
      useThemeStore.getState().setMode("dark");
      const state = useThemeStore.getState();
      expect(state.mode).toBe("dark");
      expect(state.isDark).toBe(true);
    });

    it("setMode('light') sets mode to light", () => {
      useThemeStore.getState().setMode("light");
      const state = useThemeStore.getState();
      expect(state.mode).toBe("light");
      expect(state.isDark).toBe(false);
    });

    it("toggleMode switches between light and dark", () => {
      useThemeStore.getState().setMode("light");
      useThemeStore.getState().toggleMode();
      expect(useThemeStore.getState().mode).toBe("dark");
      useThemeStore.getState().toggleMode();
      expect(useThemeStore.getState().mode).toBe("light");
    });
  });

  describe("color resolver", () => {
    it("resolveColors('light') returns light palette", () => {
      const colors = resolveColors("light");
      expect(colors.surface.primary).toBe("#FFFFFF");
      expect(colors.interactive.primary).toBe("#C44536");
    });

    it("resolveColors('dark') returns dark palette", () => {
      const colors = resolveColors("dark");
      expect(colors.surface.primary).toBe("#1A1A18");
      expect(colors.interactive.primary).toBe("#FF9090");
    });
  });

  describe("dark surface values", () => {
    it("dark surface.primary is #1A1A18 (D-20 warm gray black)", () => {
      expect(darkColors.surface.primary).toBe("#1A1A18");
    });
  });

  describe("no Web API calls", () => {
    it("color-resolver has no window/document references", () => {
      const fs = require("fs");
      const path = require("path");
      const content = fs.readFileSync(path.resolve(__dirname, "..", "color-resolver.ts"), "utf-8");
      expect(content).not.toContain("window.");
      expect(content).not.toContain("document.");
    });

    it("themeStore has no window/document references", () => {
      const fs = require("fs");
      const path = require("path");
      const content = fs.readFileSync(path.resolve(__dirname, "..", "themeStore.ts"), "utf-8");
      expect(content).not.toContain("window.");
      expect(content).not.toContain("document.");
    });
  });

  describe("Appearance listener", () => {
    it("startAppearanceListener registers listener", () => {
      stopAppearanceListener();
      jest.clearAllMocks();
      startAppearanceListener();
      expect(Appearance.addChangeListener).toHaveBeenCalled();
    });

    it("stopAppearanceListener cleans up", () => {
      startAppearanceListener();
      stopAppearanceListener();
    });
  });
});
