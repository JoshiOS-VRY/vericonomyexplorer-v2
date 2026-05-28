"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useHydrated } from "@/hooks/useHydrated";
import { getDigitRollParts, type DigitRollParts } from "@/lib/animatedStatRoll";
import { cn } from "@/lib/utils";

const DIGIT_ROLL_DURATION = 0.9;
const DIGIT_ROLL_EASE = [0.33, 1, 0.32, 1] as const;
const PULSE_SCALE = 1.012;
const PULSE_DURATION = 0.95;

function DigitRoll({ fromDigit, toDigit }: { fromDigit: string; toDigit: string }) {
  return (
    <span className="animated-stat-digit-roll" aria-hidden>
      <motion.span
        className="animated-stat-digit-roll__track"
        initial={{ y: 0 }}
        animate={{ y: "-50%" }}
        transition={{ duration: DIGIT_ROLL_DURATION, ease: DIGIT_ROLL_EASE }}
      >
        <span className="animated-stat-digit-roll__digit">{fromDigit}</span>
        <span className="animated-stat-digit-roll__digit">{toDigit}</span>
      </motion.span>
    </span>
  );
}

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
  const hydrated = useHydrated();
  const reducedMotion = useReducedMotion();
  const prevNumericRef = useRef(numericValue);
  const formatFnRef = useRef(formatFn);
  formatFnRef.current = formatFn;
  const [display, setDisplay] = useState(value);
  const [roll, setRoll] = useState<DigitRollParts | null>(null);
  const [flash, setFlash] = useState(false);

  const format = (n: number) => (formatFnRef.current ?? ((v: number) => v.toLocaleString()))(n);

  useEffect(() => {
    if (numericValue == null || reducedMotion) {
      setDisplay(value);
      setRoll(null);
      return;
    }

    const from = prevNumericRef.current ?? numericValue;
    prevNumericRef.current = numericValue;

    const nextDisplay = format(numericValue);
    setDisplay(nextDisplay);

    if (from === numericValue) {
      setRoll(null);
      return;
    }

    const parts = getDigitRollParts(from, numericValue, format);
    if (parts) {
      setRoll(parts);
      setFlash(true);
      const timer = window.setTimeout(() => {
        setRoll(null);
        setFlash(false);
      }, DIGIT_ROLL_DURATION * 1000 + 80);
      return () => window.clearTimeout(timer);
    }

    setRoll(null);
    setFlash(true);
    const timer = window.setTimeout(() => setFlash(false), PULSE_DURATION * 1000);
    return () => window.clearTimeout(timer);
  }, [numericValue, reducedMotion, value]);

  useEffect(() => {
    if (numericValue != null) {
      return;
    }

    setDisplay(value);
    setRoll(null);
    if (!reducedMotion && value !== display) {
      setFlash(true);
      const timer = window.setTimeout(() => setFlash(false), PULSE_DURATION * 1000);
      return () => window.clearTimeout(timer);
    }
  }, [display, numericValue, reducedMotion, value]);

  if (!hydrated) {
    return <span className={className}>{value}</span>;
  }

  const shouldPulse = !reducedMotion && (flash || pulse);

  if (roll && !reducedMotion) {
    return (
      <motion.span
        className={cn(className, "inline-flex items-baseline tabular-nums")}
        animate={shouldPulse ? { scale: [1, PULSE_SCALE, 1] } : { scale: 1 }}
        transition={
          shouldPulse
            ? { duration: PULSE_DURATION, ease: DIGIT_ROLL_EASE }
            : undefined
        }
      >
        <span>{roll.prefix}</span>
        <DigitRoll
          key={`${roll.fromDigit}-${roll.toDigit}-${numericValue}`}
          fromDigit={roll.fromDigit}
          toDigit={roll.toDigit}
        />
        <span>{roll.staticSuffix}</span>
      </motion.span>
    );
  }

  return (
    <motion.span
      className={cn(className, shouldPulse && !className?.includes("text-") && "text-accent")}
      animate={shouldPulse ? { scale: [1, PULSE_SCALE, 1] } : { scale: 1 }}
      transition={
        shouldPulse
          ? { duration: PULSE_DURATION, ease: DIGIT_ROLL_EASE }
          : undefined
      }
    >
      {display}
    </motion.span>
  );
}
