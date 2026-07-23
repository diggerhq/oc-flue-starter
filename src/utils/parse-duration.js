/**
 * Parse duration strings and return milliseconds.
 * Supports: ms, s (seconds), m (minutes), h (hours)
 * Examples: "250ms" -> 250, "1s" -> 1000, "1s250ms" -> 1250
 */
export function parseDuration(duration) {
  if (!duration || typeof duration !== 'string') {
    throw new Error('Duration must be a non-empty string');
  }

  const trimmed = duration.trim();
  let totalMs = 0;

  // Match pattern: number + unit (ms, s, m, h)
  const regex = /(\d+(?:\.\d+)?)(ms|s|m|h)/g;
  let match;
  let lastMatchEnd = 0;

  while ((match = regex.exec(trimmed)) !== null) {
    // Check if there's unparsed content before this match
    const contentBefore = trimmed.substring(lastMatchEnd, match.index);
    if (contentBefore !== '') {
      throw new Error(`Invalid duration format: "${duration}"`);
    }

    const value = parseFloat(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'ms':
        totalMs += value;
        break;
      case 's':
        totalMs += value * 1000;
        break;
      case 'm':
        totalMs += value * 60 * 1000;
        break;
      case 'h':
        totalMs += value * 60 * 60 * 1000;
        break;
    }

    lastMatchEnd = match.index + match[0].length;
  }

  // Check if there's unparsed content after the last match
  const contentAfter = trimmed.substring(lastMatchEnd);
  if (contentAfter !== '') {
    throw new Error(`Invalid duration format: "${duration}"`);
  }

  if (totalMs === 0) {
    throw new Error(`Invalid duration format: "${duration}"`);
  }

  return totalMs;
}
