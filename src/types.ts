export type ThemeMode = 'light' | 'dark' | 'system';

export interface User {
  name: string;
}

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  /** Carga em kg (0 = peso corporal) */
  weight: number;
}

export interface Workout {
  id: string;
  name: string;
  /** 0 = domingo ... 6 = sábado; null = sem dia fixo */
  weekday: number | null;
  notes: string;
  exercises: Exercise[];
  createdAt: string;
}

/** Registro de um treino realizado (alimenta o dashboard) */
export interface Session {
  id: string;
  workoutId: string;
  workoutName: string;
  date: string;
  /** Volume total = séries x repetições x carga (kg) */
  volume: number;
  setsDone: number;
  exercisesDone: number;
  durationMin: number;
}
