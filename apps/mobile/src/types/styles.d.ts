import "react-native";

declare module "react-native" {
  interface StyleSheet {
    create<T extends Record<string, unknown>>(
      styles: T
    ): {
      [K in keyof T]: T[K];
    };
  }
}
