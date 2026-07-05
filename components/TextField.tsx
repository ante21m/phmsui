'use client';
import { forwardRef } from 'react';
import { TextInput, type TextInputProps } from '@mantine/core';

export interface TextFieldProps extends TextInputProps {}

const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ required, withAsterisk, ...props }, ref) => (
    <TextInput
      ref={ref}
      required={required}
      withAsterisk={withAsterisk ?? required}
      {...props}
    />
  )
);
TextField.displayName = 'TextField';

export default TextField;
