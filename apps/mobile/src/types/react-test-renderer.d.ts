declare module "react-test-renderer" {
  import type { ReactElement } from "react";

  interface TestInstance {
    props: Record<string, unknown>;
    children: (string | TestInstance)[];
    type: string | (() => null);
    findByType(type: unknown): TestInstance;
    findAllByType(type: unknown): TestInstance[];
    findByProps(props: Record<string, unknown>): TestInstance;
    findAllByProps(props: Record<string, unknown>): TestInstance[];
    find(predicate: (instance: TestInstance) => boolean): TestInstance;
    findAll(predicate: (instance: TestInstance) => boolean): TestInstance[];
  }

  interface ReactTestRenderer {
    JSON: unknown;
    getInstance(): TestInstance | null;
    root: TestInstance;
    toJSON(): unknown[] | null;
    toTree(): unknown;
    unmount(nextElement?: ReactElement): void;
    update(nextElement: ReactElement): void;
  }

  export function create(
    element: ReactElement,
    options?: { createNodeMock?: (element: ReactElement) => unknown }
  ): ReactTestRenderer;

  export function act(callback: () => void): void;
}
