import { renderHook, act } from "@testing-library/react-native";
import { useDisclosure } from "../useDisclosure";

describe("useDisclosure", () => {
  it("should default to closed", () => {
    const { result } = renderHook(() => useDisclosure());
    expect(result.current.isOpen).toBe(false);
  });

  it("should accept initial state", () => {
    const { result } = renderHook(() => useDisclosure(true));
    expect(result.current.isOpen).toBe(true);
  });

  it("should open with onOpen", () => {
    const { result } = renderHook(() => useDisclosure(false));

    act(() => {
      result.current.onOpen();
    });

    expect(result.current.isOpen).toBe(true);
  });

  it("should close with onClose", () => {
    const { result } = renderHook(() => useDisclosure(true));

    act(() => {
      result.current.onClose();
    });

    expect(result.current.isOpen).toBe(false);
  });

  it("should toggle with onToggle", () => {
    const { result } = renderHook(() => useDisclosure(false));

    act(() => {
      result.current.onToggle();
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.onToggle();
    });
    expect(result.current.isOpen).toBe(false);
  });

  it("should maintain stable callback references", () => {
    const { result, rerender } = renderHook(() => useDisclosure(false));

    const { onOpen, onClose, onToggle } = result.current;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rerender({} as any);

    // Callbacks should be referentially stable (wrapped in useCallback)
    expect(result.current.onOpen).toBe(onOpen);
    expect(result.current.onClose).toBe(onClose);
    expect(result.current.onToggle).toBe(onToggle);
  });
});
