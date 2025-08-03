import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-primary to-accent text-primary-foreground hover:shadow-lg hover:scale-105 active:scale-95",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border-2 border-primary text-primary bg-background hover:bg-primary hover:text-primary-foreground",
        secondary: "bg-gradient-to-r from-secondary to-primary text-secondary-foreground hover:shadow-lg hover:scale-105 active:scale-95",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        quiz: "bg-quiz-card border-2 border-primary/20 text-foreground hover:border-primary hover:bg-gradient-to-r hover:from-primary/10 hover:to-accent/10 hover:scale-105 active:scale-95",
        success: "bg-gradient-to-r from-success to-success/80 text-success-foreground hover:shadow-lg hover:scale-105 active:scale-95",
        warning: "bg-gradient-to-r from-warning to-warning/80 text-warning-foreground hover:shadow-lg hover:scale-105 active:scale-95",
        hero: "bg-gradient-to-r from-primary via-accent to-secondary text-primary-foreground hover:shadow-2xl hover:shadow-primary/25 hover:scale-110 active:scale-95 animate-pulse-glow",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-9 rounded-lg px-4",
        lg: "h-14 rounded-xl px-8 text-base",
        xl: "h-16 rounded-2xl px-10 text-lg",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
