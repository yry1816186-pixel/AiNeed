import { useThemeStore, startAppearanceListener, stopAppearanceListener } from "../themeStore";
import { resolveColors, lightColors, darkColors } from "../color-resolver";
import type { ThemeColors } from "../types";
import { Appearance } from "react-native";

describe("ThemeStore", () => {
  afterEach(() => {
    useThemeStore.getState().setMode("system");
  });

  describe("mode switching", () => {
    it("setMode('dark') resolves to dark mode with warm dark colors", () => {
      useThemeStore.getState().setMode("dark");
      const state = useThemeStore.getState();
      expect(state.resolvedMode).toBe("dark");
      expect(state.colors.surface.primary).toBe("#1A1A18");
    });

    it("setMode('light') uses terracotta as interactive primary", () => {
      useThemeStore.getState().setMode("light");
      expect(useThemeStore.getState().colors.interactive.primary).toBe("#C44536");
    });

    it("setMode('dark') uses coral as interactive primary (NOT terracotta)", () => {
      useThemeStore.getState().setMode("dark");
      const primary = useThemeStore.getState().colors.interactive.primary;
      expect(primary).not.toBe("#C44536");
      expect(primary).toBe("#FF9090");
    });

    it("setMode('system') resolves based on Appearance", () => {
      useThemeStore.getState().setMode("system");
      const scheme = Appearance.getColorScheme();
      const expected = scheme === "dark" ? "dark" : "light";
      expect(useThemeStore.getState().resolvedMode).toBe(expected);
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
      startAppearanceListener();
      expect(Appearance.addChangeListener).toHaveBeenCalled();
    });

    it("stopAppearanceListener cleans up", () => {
      startAppearanceListener();
      stopAppearanceListener();
    });
  });
});
