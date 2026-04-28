import type { ThemeColors, ResolvedMode } from "./types";

const lightColors: ThemeColors = {
  surface: {
    primary: "#FFFFFF",
    secondary: "#FAFAF8",
    tertiary: "#F5F5F3",
    elevated: "#FFFFFF",
    overlay: "rgba(0, 0, 0, 0.4)",
  },
  text: {
    primary: "#1A1A18",
    secondary: "#52524D",
    tertiary: "#686862",
    inverse: "#FFFFFF",
    brand: "#8A4E32",
    link: "#567080",
  },
  interactive: {
    primary: "#C44536",
    secondary: "#8B9A7D",
    hover: "#E8715B",
    pressed: "#A83528",
    disabled: "#D4D4D0",
  },
  status: {
    success: "#5B8A72",
    successLight: "#E8F3EE",
    warning: "#D9A441",
    warningLight: "#FDF5E6",
    error: "#DC3545",
    errorLight: "#FDECEA",
    info: "#7B8FA2",
    infoLight: "#EEF1F4",
  },
  border: {
    light: "rgba(0, 0, 0, 0.06)",
    default: "rgba(0, 0, 0, 0.1)",
    strong: "rgba(0, 0, 0, 0.2)",
    brand: "#C44536",
  },
  background: {
    modal: "#FFFFFF",
    card: "#FFFFFF",
    sheet: "#FFFFFF",
    input: "#FAFAF8",
  },
};

const darkColors: ThemeColors = {
  surface: {
    primary: "#1A1A18",
    secondary: "#161412",
    tertiary: "#201E1C",
    elevated: "#1F1B18",
    overlay: "rgba(0, 0, 0, 0.72)",
  },
  text: {
    primary: "#F5F2ED",
    secondary: "#B8B0A8",
    tertiary: "#9B958E",
    inverse: "#191613",
    brand: "#D68B6C",
    link: "#96A6B5",
  },
  interactive: {
    primary: "#FF9090",
    secondary: "#9AA88C",
    hover: "#FFA8A8",
    pressed: "#FF7F7F",
    disabled: "#3D3D39",
  },
  status: {
    success: "#6B9A82",
    successLight: "#1A2D22",
    warning: "#E8B451",
    warningLight: "#2D2418",
    error: "#D45546",
    errorLight: "#2D1818",
    info: "#96A6B5",
    infoLight: "#1A1D22",
  },
  border: {
    light: "rgba(255, 255, 255, 0.06)",
    default: "rgba(255, 255, 255, 0.1)",
    strong: "rgba(255, 255, 255, 0.18)",
    brand: "#D68B6C",
  },
  background: {
    modal: "#161412",
    card: "#1F1B18",
    sheet: "#161412",
    input: "#201E1C",
  },
};

export function resolveColors(mode: ResolvedMode): ThemeColors {
  return mode === "dark" ? darkColors : lightColors;
}

export { lightColors, darkColors };
