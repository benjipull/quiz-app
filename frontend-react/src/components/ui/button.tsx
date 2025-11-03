import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// ✅ Preload the sound file
const clickSound = new Audio("/clicksound.m4a");
clickSound.volume = 0.3; // adjust as needed

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-green-500 to-green-600 text-white hover:shadow-lg hover:scale-105 active:scale-95",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 active:scale-95",
        outline:
          "border-2 border-green-500 text-green-600 bg-transparent hover:bg-green-500 hover:text-white hover:shadow-md",
        secondary:
          "bg-gradient-to-r from-green-400 to-green-500 text-white hover:shadow-lg hover:scale-105 active:scale-95",
        ghost: "hover:bg-green-100 hover:text-green-700 dark:hover:bg-green-900/20",
        link: "text-green-600 underline-offset-4 hover:underline",
        quiz: "bg-green-600 border-2 border-green-500 text-white hover:bg-green-700 hover:scale-105 active:scale-95",
        success:
          "bg-gradient-to-r from-green-500 to-green-600 text-white hover:shadow-lg hover:scale-105 active:scale-95",
        warning:
          "bg-gradient-to-r from-yellow-400 to-yellow-500 text-black hover:shadow-lg hover:scale-105 active:scale-95",
        hero:
          "bg-gradient-to-r from-green-400 via-green-500 to-green-600 text-white hover:shadow-2xl hover:shadow-green-500/25 hover:scale-110 active:scale-95 animate-pulse-glow",
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
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, onClick, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      try {
        // ✅ Play the sound
        clickSound.currentTime = 0;
        clickSound.play().catch(() => {});
      } catch (error) {
        console.warn("Button sound error:", error);
      }

      // ✅ Call any user-provided onClick as well
      onClick?.(e);
    };

    return (
      <Comp
        ref={ref}
        onClick={handleClick}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
