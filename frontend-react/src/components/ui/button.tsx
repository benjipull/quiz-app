"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// ✅ Preload the click sound
const clickSound = typeof Audio !== "undefined" ? new Audio("/clicksound.m4a") : null;
if (clickSound) clickSound.volume = 0.5;

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-bold transition-all duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 font-poppins shadow-sm hover:shadow-md hover:scale-105 active:scale-95",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-b from-[#00ff41] via-[#00ee00] to-[#00cc00] text-white [color:#FFFFFF] focus-visible:ring-[#00ff41] border-2 border-[#00ff41]",
        secondary: "bg-gradient-to-b from-[#00ff41] via-[#00ee00] to-[#00cc00] text-white [color:#00ff41] focus-visible:ring-[#00ff41] border-2 border-[#00ff41]",
        destructive: "bg-gradient-to-b from-[#ff00ff] via-[#ff00cc] to-[#cc0099] text-white [color:#ff00ff] focus-visible:ring-[#ff00ff] border-2 border-[#ff00ff]",
        blue: "bg-gradient-to-b from-[#00ffff] via-[#00ccff] to-[#0099ff] text-white [color:#00ffff] focus-visible:ring-[#00ffff] border-2 border-[#00ffff]",
        purple: "bg-gradient-to-b from-[#dd00ff] via-[#cc00ff] to-[#9900cc] text-white [color:#dd00ff] focus-visible:ring-[#dd00ff] border-2 border-[#dd00ff]",
        warning: "bg-gradient-to-b from-[#ff4d4d] via-[#ff1a1a] to-[#d60000] text-white [color:#ff4d4d] focus-visible:ring-[#ff4d4d] border-2 border-[#ff4d4d]",
        outline: "bg-transparent text-[#00ff41] focus-visible:ring-[#00ff41] border-2 border-[#00ff41]",
        ghost: "bg-gradient-to-b from-[#00ff41] via-[#00ee00] to-[#00cc00] text-white [color:#00ff41] focus-visible:ring-[#00ff41] border-2 border-[#00ff41]",
        link: "bg-gradient-to-b from-[#00ff41] via-[#00ee00] to-[#00cc00] text-white [color:#00ff41] shadow-none hover:shadow-[0_0_15px_currentColor] focus-visible:ring-[#00ff41] border-2 border-[#00ff41]"
      },
      size: {
        default: "h-12 px-6 py-3 text-sm",
        sm: "h-9 px-4 text-sm",
        lg: "h-14 px-8 text-base",
        xl: "h-16 px-10 text-lg",
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
        // ✅ Play click sound
        if (clickSound) {
          clickSound.currentTime = 0;
          clickSound.play().catch(() => {});
        }

        // ✅ Short vibration (30ms)
        if (navigator.vibrate) {
          navigator.vibrate(30);
        }
      } catch (error) {
        console.warn("Button feedback error:", error);
      }

      // ✅ Trigger any user-provided onClick
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