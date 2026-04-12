import React, { useState, useCallback } from 'react';
import {
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
  type TextInput as TextInputType,
} from 'react-native';
import { Input } from './Input';
import type { ValidatorFn } from '../../utils/validation';

interface FormInputProps extends Omit<TextInputProps, 'style' | 'onChange'> {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  validators?: ValidatorFn[];
  error?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  onRef?: (ref: TextInputType | null) => void;
}

export const FormInput: React.FC<FormInputProps> = ({
  label,
  value,
  onChange,
  validators,
  error: externalError,
  leftIcon,
  rightElement,
  containerStyle,
  inputStyle,
  onRef,
  onBlur: externalOnBlur,
  ...rest
}) => {
  const [internalError, setInternalError] = useState<string | undefined>(undefined);
  const [hasBlurred, setHasBlurred] = useState(false);

  const displayError = hasBlurred ? (externalError ?? internalError) : undefined;

  const runValidators = useCallback(
    (val: string): string | undefined => {
      if (!validators || validators.length === 0) return undefined;
      for (const validator of validators) {
        const result = validator(val);
        if (!result.valid) return result.message;
      }
      return undefined;
    },
    [validators],
  );

  const handleBlur = useCallback(() => {
    setHasBlurred(true);
    const errMsg = runValidators(value);
    setInternalError(errMsg);
    externalOnBlur?.({ nativeEvent: { text: value } } as never);
  }, [runValidators, value, externalOnBlur]);

  const handleChangeText = useCallback(
    (newValue: string) => {
      if (hasBlurred) {
        const errMsg = runValidators(newValue);
        setInternalError(errMsg);
      }
      onChange(newValue);
    },
    [hasBlurred, runValidators, onChange],
  );

  return (
    <Input
      label={label}
      value={value}
      onChangeText={handleChangeText}
      onBlur={handleBlur}
      error={displayError}
      leftIcon={leftIcon}
      rightElement={rightElement}
      containerStyle={containerStyle}
      inputStyle={inputStyle}
      onRef={onRef}
      {...rest}
    />
  );
};
