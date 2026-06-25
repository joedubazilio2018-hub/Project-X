export type Habit = {
  id: string;
  user_id: string;
  name: string;
  frequency: "daily" | "weekly";
  target_days: number[] | null;
  color: string;
  created_at: string;
  archived: boolean;
};

export type HabitLog = {
  id: string;
  habit_id: string;
  user_id: string;
  date: string;
  done: boolean;
  created_at: string;
};

export type HabitWithLogs = Habit & {
  logs: HabitLog[];
};

export type GoalStatus = "not_started" | "in_progress" | "done";

export type Goal = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  status: GoalStatus;
  created_at: string;
};

export type Mood = "great" | "good" | "neutral" | "hard";

export type JournalEntry = {
  id: string;
  user_id: string;
  content: string;
  mood: Mood | null;
  entry_date: string;
  created_at: string;
};
