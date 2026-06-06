'use client';

import * as React from 'react';
import { Input } from '@/shared/components/Input';
import {
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/shared/components/Select';
import { cn } from '@/shared/utils/cn';

// ============================================================================
// FormField — Label + error + field wrapper
// ============================================================================
interface FormFieldProps {
  label: string;
  name?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FormField({ label, error, hint, required, children, className }: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="text-sm font-medium leading-none">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ============================================================================
// TextField — Controlled text input with React Hook Form
// ============================================================================
interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, hint, required, className, ...props }, ref) => (
    <FormField label={label} error={error} hint={hint} required={required} className={className}>
      <Input ref={ref} error={error} {...props} />
    </FormField>
  ),
);
TextField.displayName = 'TextField';

// ============================================================================
// SelectField — Controlled select with React Hook Form
// ============================================================================
interface SelectFieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  placeholder?: string;
  options: { value: string; label: string }[];
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}

export function SelectField({
  label,
  error,
  hint,
  required,
  className,
  placeholder = 'Select...',
  options,
  value,
  onChange,
  disabled,
}: SelectFieldProps) {
  return (
    <FormField label={label} error={error} hint={hint} required={required} className={className}>
      <SelectRoot value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger error={error}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </SelectRoot>
    </FormField>
  );
}

// ============================================================================
// DateField — Date input
// ============================================================================
interface DateFieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  value?: string;
  onChange?: (value: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
}

export function DateField({
  label,
  error,
  hint,
  required,
  className,
  value,
  onChange,
  min,
  max,
  disabled,
}: DateFieldProps) {
  return (
    <FormField label={label} error={error} hint={hint} required={required} className={className}>
      <Input
        type="date"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        min={min}
        max={max}
        disabled={disabled}
        error={error}
      />
    </FormField>
  );
}

// ============================================================================
// TextAreaField — Multi-line text input
// ============================================================================
interface TextAreaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

export const TextAreaField = React.forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  ({ label, error, hint, required, className, ...props }, ref) => (
    <FormField label={label} error={error} hint={hint} required={required} className={className}>
      <textarea
        ref={ref}
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-destructive',
          className,
        )}
        {...props}
      />
    </FormField>
  ),
);
TextAreaField.displayName = 'TextAreaField';
