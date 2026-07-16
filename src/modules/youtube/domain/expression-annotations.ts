import type { KeyExpression } from "./youtube-material";

export type ExpressionRange = {
  start: number;
  end: number;
  expressionIndex: number;
};

export function findExpressionRanges(
  text: string,
  expressions: KeyExpression[],
): ExpressionRange[] {
  const candidates: ExpressionRange[] = [];

  expressions.forEach((expression, expressionIndex) => {
    const pattern = expressionPattern(expression.expressionEn);
    if (!pattern) return;

    const matcher = new RegExp(pattern, "giu");
    for (const match of text.matchAll(matcher)) {
      if (match.index === undefined || !match[0]) continue;
      candidates.push({
        start: match.index,
        end: match.index + match[0].length,
        expressionIndex,
      });
    }
  });

  candidates.sort(
    (left, right) =>
      left.start - right.start ||
      right.end - right.start - (left.end - left.start) ||
      left.expressionIndex - right.expressionIndex,
  );

  const accepted: ExpressionRange[] = [];
  let occupiedUntil = 0;
  for (const candidate of candidates) {
    if (candidate.start < occupiedUntil) continue;
    accepted.push(candidate);
    occupiedUntil = candidate.end;
  }
  return accepted;
}

function expressionPattern(value: string): string {
  let pattern = "";
  let pendingWhitespace = false;

  for (const character of value.trim()) {
    if (/\s/u.test(character)) {
      pendingWhitespace = true;
      continue;
    }
    if (pendingWhitespace && pattern) {
      pattern += "\\s+";
      pendingWhitespace = false;
    }

    if (["'", "’", "‘"].includes(character)) {
      pattern += "['’‘]";
    } else if (["-", "–", "—"].includes(character)) {
      pattern += "[-–—]";
    } else {
      pattern += escapeRegularExpression(character);
    }
  }

  return pattern;
}

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
