"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------
    ULTRA FAST AUDIO ENGINE (0ms latency)
------------------------------------------------------------------ */

let audioCtx: AudioContext | null = null;
let clickBuffer: AudioBuffer | null = null;

// Preload & decode the click sound once
async function loadClickSound() {
  try {
    if (!audioCtx) audioCtx = new window.AudioContext();

    const res = await fetch("/clicksound.m4a");
    const arrayBuffer = await res.arrayBuffer();
    clickBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  } catch (err) {
    console.warn("Failed loading click sound:", err);
  }
}

// Preload immediately
loadClickSound();

// Play instantly (no delay)
function playClick() {
  if (!audioCtx || !clickBuffer) return;

  const src = audioCtx.createBufferSource();
  src.buffer = clickBuffer;
  src.connect(audioCtx.destination);
  src.start(0);
}

/* ------------------------------------------------------------------
    BUTTON STYLING
------------------------------------------------------------------ */

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-bold transition-all duration-150 active:scale-95 hover:scale-105 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none",
  {
    variants: {
      variant: {
        default:
          "bg-secondary text-white border-radius border-secondary shadow-[0_4px_20px_rgba(0,255,0,0.3)] hover:shadow-[0_6px_30px_rgba(0,255,0,0.5)]",
        destructive:
          "bg-error text-white border-2 border-error",
        blue:
          "bg-accent text-white border-2 border-info",
        purple:
          "bg-primary text-white border-2 border-primary",
        warning:
          "bg-warning text-white border-2 border-warning",
        outline: "bg-transparent text-white border-2 border-[#00ff41]",
        ghost:
          "bg-error text-white border-2 border-[#00ff41]",
        link:
          "bg-transparent text-white border-2 border-[#00ff41] shadow-none",
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

/* ------------------------------------------------------------------
    BUTTON COMPONENT
------------------------------------------------------------------ */

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, onClick, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      // ⚡ Instant sound
      playClick();

      // ⚡ Instant vibration
      if (navigator.vibrate) navigator.vibrate(25);

      onClick?.(e);
    };

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        onClick={handleClick}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
