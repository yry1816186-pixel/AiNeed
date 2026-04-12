import { useState, useCallback } from 'react';
import type { ValidatorFn, ValidationResult } from '../utils/validation';

type FormFieldValue = string | number | boolean | string[] | null | undefined;

interface UseFormOptions<T extends Record<string, FormFieldValue>> {
  initialValues: T;
  validators?: Partial<Record<keyof T, ValidatorFn>>;
  onSubmit: (values: T) => Promise<void> | void;
}

interface UseFormReturn<T extends Record<string, FormFieldValue>> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  setField: <K extends keyof T>(key: K, value: T[K]) => void;
  validateAll: () => boolean;
  isSubmitting: boolean;
  handleSubmit: () => Promise<void>;
  resetForm: () => void;
}

export function useForm<T extends Record<string, FormFieldValue>>({
  initialValues,
  validators,
  onSubmit,
}: UseFormOptions<T>): UseFormReturn<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      setValues((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    [],
  );

  const validateAll = useCallback((): boolean => {
    if (!validators) return true;
    const newErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    for (const key of Object.keys(validators) as Array<keyof T>) {
      const validator = validators[key];
      if (validator) {
        const result: ValidationResult = validator(values[key]);
        if (!result.valid) {
          newErrors[key] = result.message ?? '验证失败';
          isValid = false;
        }
      }
    }

    setErrors(newErrors);
    return isValid;
  }, [validators, values]);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;

    const isValid = validateAll();
    if (!isValid) return;

    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, validateAll, onSubmit, values]);

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setIsSubmitting(false);
  }, [initialValues]);

  return {
    values,
    errors,
    setField,
    validateAll,
    isSubmitting,
    handleSubmit,
    resetForm,
  };
}
