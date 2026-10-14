import { Exercise, Session } from '../types';

export const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const WEEKDAYS_LONG = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const pad = (n: number) => String(n).padStart(2, '0');

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  const x = startOfDay(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatDayMonth(d: Date): string {
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${formatDayMonth(d)}/${d.getFullYear()}`;
}

export function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1).replace('.', ',')} t`;
  return `${Math.round(kg)} kg`;
}

export function workoutVolume(exercises: Exercise[]): number {
  return exercises.reduce((acc, e) => acc + e.sets * e.reps * e.weight, 0);
}

export interface ChartPoint {
  label: string;
  value: number;
}

/** Quantidade de treinos por dia nos últimos `days` dias (inclui hoje) */
export function sessionsPerDay(sessions: Session[], days = 7): ChartPoint[] {
  const counts = new Map<string, number>();
  sessions.forEach((s) => {
    const k = dayKey(new Date(s.date));
    counts.set(k, (counts.get(k) ?? 0) + 1);
  });
  const today = startOfDay(new Date());
  const out: ChartPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = addDays(today, -i);
    out.push({ label: WEEKDAYS_SHORT[day.getDay()], value: counts.get(dayKey(day)) ?? 0 });
  }
  return out;
}

/** Volume total (kg) por bloco de 7 dias nas últimas `weeks` semanas */
export function volumePerWeek(sessions: Session[], weeks = 6): ChartPoint[] {
  const today = startOfDay(new Date());
  const out: ChartPoint[] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const end = addDays(today, -w * 7);
    const start = addDays(end, -6);
    const value = sessions.reduce((acc, s) => {
      const t = startOfDay(new Date(s.date)).getTime();
      return t >= start.getTime() && t <= end.getTime() ? acc + s.volume : acc;
    }, 0);
    out.push({ label: formatDayMonth(start), value });
  }
  return out;
}

/** Dias seguidos com treino (hoje ainda não precisa ter treinado) */
export function currentStreak(sessions: Session[]): number {
  const keys = new Set(sessions.map((s) => dayKey(new Date(s.date))));
  let cursor = startOfDay(new Date());
  if (!keys.has(dayKey(cursor))) cursor = addDays(cursor, -1);
  let streak = 0;
  while (keys.has(dayKey(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
