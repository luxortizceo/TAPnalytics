import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 shrink-0",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-foreground hover:bg-[var(--color-racing-red-600)]",
        secondary:
          "bg-surface-2 text-foreground border border-border hover:bg-[var(--color-graphite-700)]",
        outline:
          "border border-border bg-transparent text-foreground hover:bg-surface-2",
        ghost: "text-foreground hover:bg-surface-2",
        positive: "bg-positive text-positive-foreground hover:opacity-90",
        link: "text-foreground underline-offset-4 hover:underline p-0 h-auto",
        destructive: "bg-accent text-accent-foreground hover:bg-[var(--color-racing-red-600)]",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-5",
        lg: "h-13 px-7 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
