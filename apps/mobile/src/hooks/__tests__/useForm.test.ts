import { renderHook, act } from "@testing-library/react-native";
import { useForm } from "../useForm";

type FormValues = {
  username: string;
  email: string;
  password: string;
};

const initialValues: FormValues = {
  username: "",
  email: "",
  password: "",
};

const validate = (values: FormValues) => {
  const errors: Partial<Record<keyof FormValues, string>> = {};
  if (!values.username) errors.username = "Username is required";
  if (!values.email) errors.email = "Email is required";
  if (values.password && values.password.length < 6) {
    errors.password = "Password must be at least 6 characters";
  }
  return errors;
};

describe("useForm", () => {
  it("should initialize with initial values", () => {
    const onSubmit = jest.fn();
    const { result } = renderHook(() =>
      useForm({ initialValues, onSubmit }),
    );

    expect(result.current.values).toEqual(initialValues);
    expect(result.current.errors).toEqual({});
    expect(result.current.touched).toEqual({});
    expect(result.current.isSubmitting).toBe(false);
  });

  it("should update values and set touched on handleChange", () => {
    const onSubmit = jest.fn();
    const { result } = renderHook(() =>
      useForm({ initialValues, onSubmit }),
    );

    act(() => {
      result.current.handleChange("username")("john");
    });

    expect(result.current.values.username).toBe("john");
    expect(result.current.touched.username).toBe(true);
  });

  it("should trigger validation on handleBlur", () => {
    const onSubmit = jest.fn();
    const { result } = renderHook(() =>
      useForm({ initialValues, validate, onSubmit }),
    );

    act(() => {
      result.current.handleBlur("username")();
    });

    expect(result.current.touched.username).toBe(true);
    expect(result.current.errors.username).toBe("Username is required");
  });

  it("should clear field error on handleBlur when validation passes", () => {
    const onSubmit = jest.fn();
    const { result } = renderHook(() =>
      useForm({ initialValues, validate, onSubmit }),
    );

    // First blur to set error
    act(() => {
      result.current.handleBlur("username")();
    });
    expect(result.current.errors.username).toBe("Username is required");

    // Change value to valid, then blur again
    act(() => {
      result.current.handleChange("username")("john");
    });
    act(() => {
      result.current.handleBlur("username")();
    });

    expect(result.current.errors.username).toBeUndefined();
  });

  it("should not submit when validation has errors", async () => {
    const onSubmit = jest.fn();
    const { result } = renderHook(() =>
      useForm({ initialValues, validate, onSubmit }),
    );

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(result.current.errors.username).toBe("Username is required");
  });

  it("should call onSubmit when validation passes", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const validValues: FormValues = {
      username: "john",
      email: "john@test.com",
      password: "123456",
    };
    const { result } = renderHook(() =>
      useForm({ initialValues: validValues, validate, onSubmit }),
    );

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(validValues);
  });

  it("should set isSubmitting during submission", async () => {
    let resolveSubmit: () => void;
    const onSubmit = jest.fn().mockImplementation(
      () => new Promise<void>((resolve) => { resolveSubmit = resolve; }),
    );
    const validValues: FormValues = {
      username: "john",
      email: "john@test.com",
      password: "123456",
    };
    const { result } = renderHook(() =>
      useForm({ initialValues: validValues, validate, onSubmit }),
    );

    const submitPromise = act(async () => {
      await result.current.handleSubmit();
    });

    // isSubmitting should be true during submission
    expect(result.current.isSubmitting).toBe(true);

    await act(async () => {
      resolveSubmit!();
    });

    await submitPromise;

    expect(result.current.isSubmitting).toBe(false);
  });

  it("should set field value with setFieldValue", () => {
    const onSubmit = jest.fn();
    const { result } = renderHook(() =>
      useForm({ initialValues, onSubmit }),
    );

    act(() => {
      result.current.setFieldValue("email", "test@example.com");
    });

    expect(result.current.values.email).toBe("test@example.com");
  });

  it("should set field error with setFieldError", () => {
    const onSubmit = jest.fn();
    const { result } = renderHook(() =>
      useForm({ initialValues, onSubmit }),
    );

    act(() => {
      result.current.setFieldError("email", "Invalid email");
    });

    expect(result.current.errors.email).toBe("Invalid email");
  });

  it("should merge values with setValues", () => {
    const onSubmit = jest.fn();
    const { result } = renderHook(() =>
      useForm({ initialValues, onSubmit }),
    );

    act(() => {
      result.current.setValues({ username: "john", email: "john@test.com" });
    });

    expect(result.current.values).toEqual({
      username: "john",
      email: "john@test.com",
      password: "",
    });
  });

  it("should reset form with resetForm", () => {
    const onSubmit = jest.fn();
    const { result } = renderHook(() =>
      useForm({ initialValues, validate, onSubmit }),
    );

    // Modify form state
    act(() => {
      result.current.handleChange("username")("john");
    });
    act(() => {
      result.current.setFieldError("email", "error");
    });

    // Reset
    act(() => {
      result.current.resetForm();
    });

    expect(result.current.values).toEqual(initialValues);
    expect(result.current.errors).toEqual({});
    expect(result.current.touched).toEqual({});
    expect(result.current.isSubmitting).toBe(false);
  });

  it("should compute isValid based on errors", () => {
    const onSubmit = jest.fn();
    const { result } = renderHook(() =>
      useForm({ initialValues, validate, onSubmit }),
    );

    // With validate and empty values, useEffect will set errors
    // isValid depends on errors object being empty
    expect(result.current.isValid).toBe(true);

    // Trigger validation error
    act(() => {
      result.current.handleBlur("username")();
    });
    expect(result.current.isValid).toBe(false);
  });
});
