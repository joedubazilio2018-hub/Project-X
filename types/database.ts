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
  entry_date: string; // YYYY-MM-DD
  created_at: string;
};
export type Category = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
};
export type TransactionType = "income" | "expense";
export type Transaction = {
  id: string;
  user_id: string;
  category_id: string | null;
  type: TransactionType;
  amount: number;
  description: string | null;
  date: string; // YYYY-MM-DD
  created_at: string;
  // Recorrência / parcelamento
  recurrence_group_id: string | null; // agrupa todas as parcelas de um mesmo lançamento
  installment_number: number | null; // ex: 1, 2, 3...
  installment_total: number | null; // ex: 3 (total de parcelas)
  paid: boolean; // se a conta/lançamento já foi pago (ou recebido)
};
export type FinancialGoal = {
  id: string;
  user_id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  created_at: string;
};
export type Task = {
  id: string;
  user_id: string;
  title: string;
  due_date: string | null; // YYYY-MM-DD, null = sem prazo
  done: boolean;
  completed_at: string | null;
  created_at: string;
};
export type Workout = {
  id: string;
  user_id: string;
  name: string;
  notes: string | null;
  position: number;
  archived: boolean;
  created_at: string;
};
export type WorkoutExercise = {
  id: string;
  workout_id: string;
  user_id: string;
  name: string;
  sets: number;
  reps: string;
  load: string | null;
  position: number;
  created_at: string;
};
export type WorkoutSession = {
  id: string;
  user_id: string;
  workout_id: string | null;
  workout_name: string;
  started_at: string;
  finished_at: string | null;
};
export type Sex = "m" | "f";
export type ActivityLevel = "sedentario" | "leve" | "moderado" | "intenso" | "muito_intenso";
export type BodyMetrics = {
  user_id: string;
  weight_kg: number;
  height_cm: number;
  age: number;
  sex: Sex;
  activity_level: ActivityLevel;
  updated_at: string;
};
export type Meal = {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  name: string;
  created_at: string;
};
export type MealItem = {
  id: string;
  meal_id: string;
  user_id: string;
  name: string;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  created_at: string;
};
export type NoteColor = "default" | "teal" | "amber" | "coral" | "blue" | "purple";
export type Note = {
  id: string;
  user_id: string;
  title: string | null;
  content: string | null;
  color: NoteColor;
  pinned: boolean;
  created_at: string;
  updated_at: string;
};
