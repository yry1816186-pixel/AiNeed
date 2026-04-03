import "react-native";

declare module "react-native" {
  interface StyleSheet {
    create<T extends Record<string, any>>(
      styles: T,
    ): {
      [K in keyof T]: T[K];
    };
  }
}
