import { renderHook, act } from "@testing-library/react-native";
import { usePagination } from "../usePagination";

describe("usePagination", () => {
  it("should have default values", () => {
    const { result } = renderHook(() => usePagination());

    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(10);
    expect(result.current.totalPages).toBe(0);
    expect(result.current.hasNext).toBe(false);
    expect(result.current.hasPrev).toBe(false);
  });

  it("should accept initial options", () => {
    const { result } = renderHook(() =>
      usePagination({ initialPage: 2, pageSize: 20, totalItems: 100 })
    );

    expect(result.current.page).toBe(2);
    expect(result.current.pageSize).toBe(20);
    expect(result.current.totalPages).toBe(5);
  });

  it("should go to next page with nextPage()", () => {
    const { result } = renderHook(() => usePagination({ pageSize: 10, totalItems: 30 }));

    expect(result.current.page).toBe(1);
    expect(result.current.hasNext).toBe(true);

    act(() => {
      result.current.nextPage();
    });

    expect(result.current.page).toBe(2);
    expect(result.current.hasNext).toBe(true);

    act(() => {
      result.current.nextPage();
    });

    expect(result.current.page).toBe(3);
    expect(result.current.hasNext).toBe(false);
  });

  it("should not go beyond last page with nextPage()", () => {
    const { result } = renderHook(() => usePagination({ pageSize: 10, totalItems: 20 }));

    act(() => {
      result.current.nextPage();
    });
    expect(result.current.page).toBe(2);

    // Already at last page
    act(() => {
      result.current.nextPage();
    });
    expect(result.current.page).toBe(2);
  });

  it("should go to previous page with prevPage()", () => {
    const { result } = renderHook(() =>
      usePagination({ initialPage: 3, pageSize: 10, totalItems: 50 })
    );

    expect(result.current.page).toBe(3);
    expect(result.current.hasPrev).toBe(true);

    act(() => {
      result.current.prevPage();
    });
    expect(result.current.page).toBe(2);
  });

  it("should not go below page 1 with prevPage()", () => {
    const { result } = renderHook(() => usePagination({ pageSize: 10, totalItems: 50 }));

    expect(result.current.page).toBe(1);
    expect(result.current.hasPrev).toBe(false);

    act(() => {
      result.current.prevPage();
    });
    expect(result.current.page).toBe(1);
  });

  it("should go to specific page with goToPage()", () => {
    const { result } = renderHook(() => usePagination({ pageSize: 10, totalItems: 50 }));

    act(() => {
      result.current.goToPage(3);
    });
    expect(result.current.page).toBe(3);
  });

  it("should clamp goToPage to valid range", () => {
    const { result } = renderHook(() => usePagination({ pageSize: 10, totalItems: 50 }));

    // Below minimum
    act(() => {
      result.current.goToPage(0);
    });
    expect(result.current.page).toBe(1);

    // Below minimum negative
    act(() => {
      result.current.goToPage(-5);
    });
    expect(result.current.page).toBe(1);

    // Above maximum
    act(() => {
      result.current.goToPage(100);
    });
    expect(result.current.page).toBe(5);
  });

  it("should reset to page 1 when setPageSize is called", () => {
    const { result } = renderHook(() => usePagination({ pageSize: 10, totalItems: 100 }));

    // Go to page 3
    act(() => {
      result.current.goToPage(3);
    });
    expect(result.current.page).toBe(3);

    // Change page size - should reset to page 1
    act(() => {
      result.current.setPageSize(20);
    });
    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(20);
  });

  it("should update total items with setTotalItems", () => {
    const { result } = renderHook(() => usePagination({ pageSize: 10, totalItems: 30 }));

    expect(result.current.totalPages).toBe(3);

    act(() => {
      result.current.setTotalItems(100);
    });
    expect(result.current.totalPages).toBe(10);
    expect(result.current.hasNext).toBe(true);
  });

  it("should reset to initial page with reset()", () => {
    const { result } = renderHook(() =>
      usePagination({ initialPage: 1, pageSize: 10, totalItems: 100 })
    );

    act(() => {
      result.current.goToPage(5);
    });
    expect(result.current.page).toBe(5);

    act(() => {
      result.current.reset();
    });
    expect(result.current.page).toBe(1);
  });

  it("should calculate totalPages correctly with rounding up", () => {
    const { result } = renderHook(() => usePagination({ pageSize: 10, totalItems: 25 }));

    expect(result.current.totalPages).toBe(3);
  });
});
