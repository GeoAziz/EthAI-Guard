'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, Check, Circle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Control, FieldPath, FieldValues } from 'react-hook-form';

interface PasswordFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
  placeholder?: string;
  showRequirements?: boolean;
  aria_describedby?: string;
}

interface PasswordRequirement {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { id: 'min-length', label: 'At least 12 characters', test: (p) => p.length >= 12 },
  { id: 'uppercase', label: 'At least 1 uppercase letter (A-Z)', test: (p) => /[A-Z]/.test(p) },
  { id: 'number', label: 'At least 1 number (0-9)', test: (p) => /[0-9]/.test(p) },
];

export function PasswordField<T extends FieldValues>({
  control,
  name,
  label = 'Password',
  placeholder = '••••••••',
  showRequirements = false,
  aria_describedby,
}: PasswordFieldProps<T>) {
  const [showPassword, setShowPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');

  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState: { error } }) => (
        <FormItem>
          <FormLabel htmlFor={String(name)}>{label}</FormLabel>
          <FormControl>
            <div className="relative">
              <Input
                id={String(name)}
                type={showPassword ? 'text' : 'password'}
                placeholder={placeholder}
                autoComplete="new-password"
                aria-describedby={
                  error ? `${name}-error` : showRequirements ? `${name}-requirements` : aria_describedby
                }
                {...field}
                onChange={(e) => {
                  field.onChange(e);
                  setPasswordValue(e.target.value);
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 p-0 hover:bg-muted"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </FormControl>

          {showRequirements && (
            <div
              id={`${name}-requirements`}
              className="mt-3 space-y-2 p-3 rounded-md bg-muted/50 border border-muted"
            >
              <p className="text-xs font-medium text-muted-foreground">Password requirements:</p>
              <ul className="space-y-1">
                {PASSWORD_REQUIREMENTS.map((req) => {
                  const met = req.test(passwordValue);
                  return (
                    <li key={req.id} className="flex items-center gap-2 text-xs">
                      {met ? (
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className={cn(met && 'text-green-600 dark:text-green-400')}>
                        {req.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {error && <FormMessage id={`${name}-error`} />}
        </FormItem>
      )}
    />
  );
}
