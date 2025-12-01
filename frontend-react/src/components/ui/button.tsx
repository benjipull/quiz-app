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
    BUTTON STYLING — ALL UNIFORM SHAPE
------------------------------------------------------------------ */

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-5 whitespace-nowrap font-semibold \
   rounded-[12px] \
   transition-all duration-150 active:scale-95 hover:scale-105 \
   disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none \
   shadow-[0_2px_4px_rgba(0,0,0,0.18)] hover:shadow-[0_4px_8px_rgba(0,0,0,0.25)]",
  {
    variants: {
      variant: {
         default:
     "bg-[linear-gradient(to_bottom,#72a06f_0%,#639260_100%)] text-white",

 purple:
  "bg-[linear-gradient(135deg,hsl(var(--primary))_0%,hsl(var(--primary-glow))_100%)] text-white",
        destructive:
          "bg-[linear-gradient(to_bottom,hsl(var(--destructive)),hsl(var(--destructive)))] \
           text-[hsl(var(--destructive-foreground))]",

        blue:
          "bg-[linear-gradient(to_bottom,hsl(var(--info)),hsl(var(--info)))] \
          text-[hsl(var(--info-foreground))] border-none",


        warning:
          "bg-[linear-gradient(to_bottom,hsl(var(--warning)),hsl(var(--warning)))] \
           text-[hsl(var(--warning-foreground))]",

        outline:
  "bg-transparent border-2 border-white text-white shadow-none hover:shadow-none hover:bg-white/10 focus-visible:outline-none transition-colors duration-150",
        ghost:
          "bg-transparent text-white shadow-none \
           hover:bg-[rgba(255,255,255,0.1)] hover:shadow-none",

        link:
          "bg-transparent text-[hsl(var(--primary))] shadow-none \
           underline-offset-4 hover:underline hover:shadow-none \
           h-auto px-0 rounded-none",

        greenGradient:
          "bg-[linear-gradient(to_bottom,#7ba773_0%,#6b8f67_100%)] \
           text-white",
      },

      size: {
        default: "h-[72px] px-6 text-sm",
        sm: "h-[56px] px-5 text-sm",
        lg: "h-[80px] px-8 text-base",
        xl: "h-[88px] px-10 text-lg",
        icon: "h-[72px] w-[72px] px-0",
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