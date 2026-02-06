'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'

type CheckboxProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Checkbox({ className, ...props }: CheckboxProps) {
  return (
    <input
      type="checkbox"
      className={cn(
        'h-4 w-4 rounded border-gray-300 text-primary-500',
        'focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
        'disabled:opacity-50 disabled:pointer-events-none',
        className
      )}
      {...props}
    />
  )
}
