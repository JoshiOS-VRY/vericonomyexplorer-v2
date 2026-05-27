"use client";

import { animate, useReducedMotion } from "motion/react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AnimatedStatValueProps {
  value: string;
  numericValue?: number;
  formatFn?: (value: number) => string;
  className?: string;
  pulse?: boolean;
}

export function AnimatedStatValue({
  value,
  numericValue,
  formatFn,
  className,
  pulse = false,
}: AnimatedStatValueProps) {
  const reducedMotion = useReducedMotion();
  const prevNumericRef = useRef(numericValue);
  const prevValueRef = useRef(value);
  const formatFnRef = useRef(formatFn);
  formatFnRef.current = formatFn;
  const [display, setDisplay] = useState(value);
  const [flash, setFlash] = useState(false);

  const format = (n: number) => (formatFnRef.current ?? ((v: number) => v.toLocaleString()))(n);

  useEffect(() => {
    if (numericValue == null || reducedMotion) {
      setDisplay(value);
      return;
    }

    const from = prevNumericRef.current ?? numericValue;
    prevNumericRef.current = numericValue;

    if (from === numericValue) {
      setDisplay(format(numericValue));
      return;
    }

    const controls = animate(from, numericValue, {
      type: "spring",
      stiffness: 120,
      damping: 18,
      mass: 0.8,
      onUpdate: (v) => setDisplay(format(v)),
    });

    return () => controls.stop();
  }, [numericValue, reducedMotion, value]);

  useEffect(() => {
    if (numericValue != null) return;

    if (prevValueRef.current !== value) {
      prevValueRef.current = value;
      setDisplay(value);
      if (!reducedMotion) {
        setFlash(true);
        const timer = window.setTimeout(() => setFlash(false), 650);
        return () => window.clearTimeout(timer);
      }
    }
  }, [value, numericValue, reducedMotion]);

  useEffect(() => {
    if (numericValue == null || reducedMotion) return;
    if (prevValueRef.current !== value) {
      prevValueRef.current = value;
      setFlash(true);
      const timer = window.setTimeout(() => setFlash(false), 650);
      return () => window.clearTimeout(timer);
    }
  }, [value, numericValue, reducedMotion]);

  return (
    <motion.span
      className={cn(className, (flash || pulse) && !className?.includes("text-") && "text-accent")}
      animate={
        reducedMotion
          ? undefined
          : flash || pulse
            ? { scale: [1, 1.04, 1] }
            : { scale: 1 }
      }
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
    >
      {display}
    </motion.span>
  );
}
