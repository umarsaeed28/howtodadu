/**
 * The custom-plan drafting queue: CAPACITY plans start each week (weeks start Monday). A plan bought this week
 * joins this week's batch if there is room, otherwise the first week with a free slot. Plans are ready by the
 * Friday of the week they start (the "under a week" promise).
 */
export const CAPACITY = 5;

/** The Monday (local, midnight) of the week containing `d`, as YYYY-MM-DD. */
export function weekOf(d: Date): string {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = x.getDay(); // 0 Sun .. 6 Sat
  x.setDate(x.getDate() - ((day + 6) % 7));
  return ymd(x);
}

export const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const parse = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const addDays = (s: string, n: number) => {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
};

export type Slot = {
  /** Monday of the week the plan starts. */
  week: string;
  /** Friday of that week: when the plan is ready. */
  readyBy: string;
  /** True when this week is full and the slot is a later week. */
  booked: boolean;
};

/**
 * The slot a new order gets. `countsByWeek` maps a Monday (YYYY-MM-DD) to the plans already in it. From Saturday
 * on, this week's batch has closed, so the search starts next Monday.
 */
export function slotFor(now: Date, countsByWeek: Record<string, number>, capacity = CAPACITY): Slot {
  const thisWeek = weekOf(now);
  const weekend = now.getDay() === 6 || now.getDay() === 0;
  let week = weekend ? addDays(thisWeek, 7) : thisWeek;
  let booked = false;
  for (let i = 0; i < 104 && (countsByWeek[week] ?? 0) >= capacity; i++) {
    week = addDays(week, 7);
    booked = true;
  }
  return { week, readyBy: addDays(week, 4), booked };
}

export const dayLabel = (s: string) => parse(s).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
