declare module "react-navigation-shared-element" {
  import { ComponentType } from "react";

  export interface SharedElementProps {
    id: string;
    children?: React.ReactNode;
    style?: import("react-native").ViewStyle;
  }

  export const SharedElement: ComponentType<SharedElementProps>;

  export function createSharedElementScreen<P extends object>(
    Component: ComponentType<P>
  ): ComponentType<P>;

  export function SharedElementRenderer({ children }: { children: React.ReactNode }): JSX.Element;
}
