export type Habit = {
  id: string;
  user_id: string;
  name: string;
  frequency: "daily" | "weekly";
  target_days: number[] | null; // 0=domingo ... 6=sábado, null = todo dia
  color: string;
  created_at: string;
  archived: boolean;
};

export type HabitLog = {
  id: string;
  habit_id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  done: boolean;
  created_at: string;
};

export type HabitWithLogs = Habit & {
  logs: HabitLog[];
};
