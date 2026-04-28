export type ThemeMode = "light" | "dark" | "system";
export type ResolvedMode = "light" | "dark";

export interface SemanticColorPalette {
  surface: {
    primary: string;
    secondary: string;
    tertiary: string;
    elevated: string;
    overlay: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
    brand: string;
    link: string;
  };
  interactive: {
    primary: string;
    secondary: string;
    hover: string;
    pressed: string;
    disabled: string;
  };
  status: {
    success: string;
    successLight: string;
    warning: string;
    warningLight: string;
    error: string;
    errorLight: string;
    info: string;
    infoLight: string;
  };
  border: {
    light: string;
    default: string;
    strong: string;
    brand: string;
  };
}

export interface ThemeColors extends SemanticColorPalette {
  background: {
    modal: string;
    card: string;
    sheet: string;
    input: string;
  };
}
