import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, invalid, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          "flex h-11 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground",
          "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          invalid && "border-accent focus-visible:ring-accent",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
