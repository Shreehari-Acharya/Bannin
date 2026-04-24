export const getSingleQueryValue = (value: unknown): string | undefined => {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
};

export const parseDateInput = (value: unknown): Date | null => {
  if (typeof value !== "string") return null;
  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

export const parseBooleanInput = (value: unknown): boolean | null => {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return null;

  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return null;
};

export const parsePositiveIntInput = (
  value: unknown,
  options?: { max?: number },
): number | null => {
  if (value === undefined) return null;
  if (typeof value !== "string") return null;

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return null;

  if (!options?.max) return parsed;
  return Math.min(parsed, options.max);
};
