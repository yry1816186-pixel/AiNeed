declare module "detox" {
  interface Device {
    reloadReactNative(): Promise<void>;
    takeScreenshot(name: string): Promise<string>;
    pressBack(): Promise<void>;
    waitForSynchronization(timeout: number): Promise<void>;
  }

  interface Element {
    tap(): Promise<void>;
    typeText(text: string): Promise<void>;
    scroll(amount: number, direction: "down" | "up" | "left" | "right"): Promise<void>;
    atIndex(index: number): Element;
  }

  interface By {
    label(text: string): ElementSelector;
    id(text: string): ElementSelector;
    type(componentType: string): ElementSelector;
  }

  interface ElementSelector {
    atIndex(index: number): Element;
  }

  interface WaitForResult {
    toBeVisible(): WaitForResult;
    not: { toBeVisible(): WaitForResult };
    withTimeout(ms: number): Promise<void>;
  }

  const device: Device;
  const element: (selector: ElementSelector) => Element;
  const by: By;
  function waitFor(selector: ElementSelector): WaitForResult;

  export { device, element, by, waitFor };
}
