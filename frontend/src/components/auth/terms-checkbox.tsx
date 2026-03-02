'use client';

import React from 'react';
import Link from 'next/link';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Control, FieldPath, FieldValues } from 'react-hook-form';

interface TermsCheckboxProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  termsUrl?: string;
  privacyUrl?: string;
}

export function TermsCheckbox<T extends FieldValues>({
  control,
  name,
  termsUrl = '/docs/terms',
  privacyUrl = '/docs/privacy',
}: TermsCheckboxProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState: { error } }) => (
        <FormItem>
          <FormControl>
            <div className="flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={!!field.value}
                onCheckedChange={field.onChange}
                aria-describedby={error ? 'terms-error' : undefined}
              />
              <label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                I agree to the{' '}
                <Link
                  href={termsUrl}
                  className="font-medium text-primary hover:underline focus-ring rounded"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Terms of Service
                </Link>
                {' '}and{' '}
                <Link
                  href={privacyUrl}
                  className="font-medium text-primary hover:underline focus-ring rounded"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Privacy Policy
                </Link>
              </label>
            </div>
          </FormControl>
          {error && <FormMessage id="terms-error" />}
        </FormItem>
      )}
    />
  );
}
