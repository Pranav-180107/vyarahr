import React from 'react';
import { cn } from './Card'; // Reuse cn utility

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'green' | 'red' | 'amber' | 'neutral' | 'blue';
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'neutral', ...props }, ref) => {
    const variants = {
      green: "bg-emerald-100 text-emerald-800 border-emerald-200",
      red: "bg-red-100 text-red-800 border-red-200",
      amber: "bg-amber-100 text-amber-800 border-amber-200",
      neutral: "bg-gray-100 text-gray-800 border-gray-200",
      blue: "bg-blue-100 text-blue-800 border-blue-200"
    };

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold max-w-fit",
          variants[variant],
          className
        )}
        {...props}
      />
    )
  }
)
Badge.displayName = "Badge"
