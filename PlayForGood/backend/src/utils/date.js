export function getMonthBounds(drawMonth) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(drawMonth)) {
    throw new Error("drawMonth must match YYYY-MM format.");
  }

  const [yearRaw, monthRaw] = drawMonth.split("-");
  const year = Number(yearRaw);
  const monthIndex = Number(monthRaw) - 1;
  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0));

  return { start, end };
}

export function getCurrentDrawMonth() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function getNextDrawMonth(drawMonth) {
  const { start } = getMonthBounds(drawMonth);
  const next = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
  const year = next.getUTCFullYear();
  const month = String(next.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}
