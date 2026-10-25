/**
 * Structured, redacting logger for middleware and other Edge runtime code.
 * The browser `clogger` is a "use client" module and the Node `logger` writes
 * to a stdout stream; neither is valid in the Edge middleware bundle.
 */
const LEVELS = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
} as const;

type Level = keyof typeof LEVELS;
type Fields = Record<string, unknown>;

const SENSITIVE_KEY =
  /authorization|cookie|token|secret|password|session|credential|signature|jwt/i;
const MAX_DEPTH = 4;

export function redact(value: unknown, depth = 0): unknown {
  if (value === null || typeof value !== "object") return value;
  if (depth >= MAX_DEPTH) return "[Truncated]";
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      SENSITIVE_KEY.test(key) ? "[Redacted]" : redact(item, depth + 1),
    ])
  );
}

function enabled(level: Level): boolean {
  const configured = process.env.LOG_LEVEL ?? process.env.NEXT_PUBLIC_LOG_LEVEL;
  const threshold =
    configured && configured in LEVELS
      ? LEVELS[configured as Level]
      : LEVELS.info;
  return LEVELS[level] >= threshold;
}

function write(level: Level, fields: Fields, message: string): void {
  if (!enabled(level)) return;
  const line = JSON.stringify({
    ...(redact(fields) as Fields),
    severity: level.toUpperCase(),
    timestamp: new Date().toISOString(),
    msg: message,
  });
  if (LEVELS[level] >= LEVELS.error) console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

const edgeLogger = Object.fromEntries(
  (Object.keys(LEVELS) as Level[]).map((level) => [
    level,
    (fields: Fields, message: string) => write(level, fields, message),
  ])
) as Record<Level, (fields: Fields, message: string) => void>;

export default edgeLogger;
