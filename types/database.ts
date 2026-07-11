export type HabitCategory = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
};
export type Habit = {
  id: string;
  user_id: string;
  name: string;
  frequency: "daily" | "weekly";
  target_days: number[] | null; // 0=domingo ... 6=sábado, null = todo dia
  color: string;
  category_id: string | null;
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
export type GoalCategory = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
};
export type GoalStatus = "not_started" | "in_progress" | "done";
export type Goal = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  deadline: string | null; // YYYY-MM-DD
  status: GoalStatus;
  category_id: string | null;
  created_at: string;
  status_changed_at: string;
};
export type GoalItem = {
  id: string;
  goal_id: string;
  user_id: string;
  content: string;
  done: boolean;
  position: number;
  created_at: string;
};
export type Mood = "great" | "good" | "neutral" | "hard";
export type JournalEntry = {
  id: string;
  user_id: string;
  content: string;
  mood: Mood | null;
  entry_date: string; // YYYY-MM
