export interface DigitRollParts {
  prefix: string;
  fromDigit: string;
  toDigit: string;
  staticSuffix: string;
}

export function getDigitRollParts(
  from: number,
  to: number,
  format: (value: number) => string,
): DigitRollParts | null {
  if (!Number.isFinite(from) || !Number.isFinite(to)) {
    return null;
  }

  if (Math.abs(to - from) > 9) {
    return null;
  }

  const fromStr = format(from);
  const toStr = format(to);
  if (fromStr === toStr) {
    return null;
  }

  let prefixLength = 0;
  const max = Math.min(fromStr.length, toStr.length);
  while (prefixLength < max && fromStr[prefixLength] === toStr[prefixLength]) {
    prefixLength += 1;
  }

  const fromSuffix = fromStr.slice(prefixLength);
  const toSuffix = toStr.slice(prefixLength);
  if (!fromSuffix || !toSuffix || fromSuffix.slice(1) !== toSuffix.slice(1)) {
    return null;
  }

  const fromDigit = fromSuffix[0] ?? "";
  const toDigit = toSuffix[0] ?? "";
  if (!/\d/.test(fromDigit) || !/\d/.test(toDigit)) {
    return null;
  }

  return {
    prefix: fromStr.slice(0, prefixLength),
    fromDigit,
    toDigit,
    staticSuffix: fromSuffix.slice(1),
  };
}
