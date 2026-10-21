import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';
import { DEFAULT_TRAINING_REMINDER } from './localDefaults';
import { Session, ThemeMode, TrainingReminder, User, Workout } from '../types';

const DATABASE_NAME = 'evolve.db';
const LEGACY_STORAGE_KEY = '@evolve/state/v1';
const LEGACY_IMPORT_KEY = 'legacy_import_v1';
const DATABASE_VERSION = 1;

export interface LocalAppData {
  user: User | null;
  onboarded: boolean;
  themeMode: ThemeMode;
  workouts: Workout[];
  trainingReminder: TrainingReminder;
  sessions: Session[];
}

interface WorkoutRow {
  id: string;
  name: string;
  weekday: number | null;
  reminder_time: string | null;
  notes: string;
  created_at: string;
}

interface ExerciseRow {
  id: string;
  workout_id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
}

interface SessionRow {
  id: string;
  workout_id: string;
  workout_name: string;
  date: string;
  volume: number;
  sets_done: number;
  exercises_done: number;
  duration_min: number;
}

const DEFAULT_DATA: LocalAppData = {
  user: null,
  onboarded: false,
  themeMode: 'system',
  workouts: [],
  trainingReminder: DEFAULT_TRAINING_REMINDER,
  sessions: [],
};

let initialization: Promise<SQLite.SQLiteDatabase> | null = null;
let writeQueue: Promise<void> = Promise.resolve();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isWorkout(value: unknown): value is Workout {
  if (!isRecord(value) || !Array.isArray(value.exercises)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    (typeof value.weekday === 'number' || value.weekday === null) &&
    (typeof value.reminderTime === 'string' || value.reminderTime === null) &&
    typeof value.notes === 'string' &&
    typeof value.createdAt === 'string' &&
    value.exercises.every(
      (exercise) =>
        isRecord(exercise) &&
        typeof exercise.id === 'string' &&
        typeof exercise.name === 'string' &&
        typeof exercise.sets === 'number' &&
        typeof exercise.reps === 'number' &&
        typeof exercise.weight === 'number',
    )
  );
}

function isSession(value: unknown): value is Session {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.workoutId === 'string' &&
    typeof value.workoutName === 'string' &&
    typeof value.date === 'string' &&
    typeof value.volume === 'number' &&
    typeof value.setsDone === 'number' &&
    typeof value.exercisesDone === 'number' &&
    typeof value.durationMin === 'number'
  );
}

function isUser(value: unknown): value is User {
  return isRecord(value) && typeof value.name === 'string';
}

function isTrainingReminder(value: unknown): value is TrainingReminder {
  return (
    isRecord(value) &&
    typeof value.enabled === 'boolean' &&
    Array.isArray(value.weekdays) &&
    value.weekdays.every((day) => typeof day === 'number') &&
    typeof value.time === 'string' &&
    typeof value.message === 'string'
  );
}

function parseLegacyData(raw: string): LocalAppData {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error('Os dados antigos do aplicativo não estão em um formato JSON válido.');
  }

  if (!isRecord(value)) {
    throw new Error('Os dados antigos do aplicativo possuem um formato inválido.');
  }

  const workouts = value.workouts ?? [];
  const sessions = value.sessions ?? [];
  const user = value.user ?? null;
  const themeMode = value.themeMode ?? DEFAULT_DATA.themeMode;
  const reminder = value.trainingReminder ?? DEFAULT_TRAINING_REMINDER;

  if (!Array.isArray(workouts) || !workouts.every(isWorkout)) {
    throw new Error('Não foi possível validar os treinos salvos anteriormente.');
  }
  if (!Array.isArray(sessions) || !sessions.every(isSession)) {
    throw new Error('Não foi possível validar o histórico salvo anteriormente.');
  }
  if (user !== null && !isUser(user)) {
    throw new Error('Não foi possível validar o perfil salvo anteriormente.');
  }
  if (themeMode !== 'light' && themeMode !== 'dark' && themeMode !== 'system') {
    throw new Error('Não foi possível validar o tema salvo anteriormente.');
  }
  if (!isTrainingReminder(reminder)) {
    throw new Error('Não foi possível validar os lembretes salvos anteriormente.');
  }

  return {
    user,
    onboarded: typeof value.onboarded === 'boolean' ? value.onboarded : false,
    themeMode,
    workouts,
    trainingReminder: reminder,
    sessions,
  };
}

async function createSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  if ((version?.user_version ?? 0) > DATABASE_VERSION) {
    throw new Error('O banco de dados foi criado por uma versão mais recente do aplicativo.');
  }
  if ((version?.user_version ?? 0) === DATABASE_VERSION) return;

  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS workouts (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        weekday INTEGER,
        reminder_time TEXT,
        notes TEXT NOT NULL,
        created_at TEXT NOT NULL,
        position INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS workout_exercises (
        id TEXT PRIMARY KEY NOT NULL,
        workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        sets INTEGER NOT NULL,
        reps INTEGER NOT NULL,
        weight REAL NOT NULL,
        position INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS workout_exercises_workout_id_idx
        ON workout_exercises(workout_id, position);
      CREATE TABLE IF NOT EXISTS workout_sessions (
        id TEXT PRIMARY KEY NOT NULL,
        workout_id TEXT NOT NULL,
        workout_name TEXT NOT NULL,
        date TEXT NOT NULL,
        volume REAL NOT NULL,
        sets_done INTEGER NOT NULL,
        exercises_done INTEGER NOT NULL,
        duration_min INTEGER NOT NULL,
        position INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS local_settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
      PRAGMA user_version = 1;
    `);
  });
}

async function importLegacyData(db: SQLite.SQLiteDatabase): Promise<void> {
  const imported = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM local_settings WHERE key = ?',
    LEGACY_IMPORT_KEY,
  );
  if (imported) {
    await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
    return;
  }

  const raw = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
  const data = raw === null ? DEFAULT_DATA : parseLegacyData(raw);

  await db.withTransactionAsync(async () => {
    for (let index = 0; index < data.workouts.length; index += 1) {
      const workout = data.workouts[index];
      await insertWorkout(db, workout, data.workouts.length - index);
    }
    for (let index = 0; index < data.sessions.length; index += 1) {
      await insertSession(db, data.sessions[index], data.sessions.length - index);
    }

    const settings: [string, unknown][] = [
      ['user', data.user],
      ['onboarded', data.onboarded],
      ['themeMode', data.themeMode],
      ['trainingReminder', data.trainingReminder],
      [LEGACY_IMPORT_KEY, true],
    ];
    for (const [key, value] of settings) {
      await writeSetting(db, key, value);
    }
  });
  await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
}

async function openAndInitialize(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  try {
    await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    await createSchema(db);
    await importLegacyData(db);
    return db;
  } catch (error) {
    await db.closeAsync();
    throw error;
  }
}

async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!initialization) {
    initialization = openAndInitialize().catch((error: unknown) => {
      initialization = null;
      throw error;
    });
  }
  return initialization;
}

async function write<T>(
  operation: (db: SQLite.SQLiteDatabase) => Promise<T>,
): Promise<T> {
  const pending = writeQueue.then(async () => {
    const db = await getDatabase();
    let result!: T;
    await db.withTransactionAsync(async () => {
      result = await operation(db);
    });
    return result;
  });
  writeQueue = pending.then(
    () => undefined,
    () => undefined,
  );
  return pending;
}

async function writeSetting(
  db: SQLite.SQLiteDatabase,
  key: string,
  value: unknown,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO local_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    key,
    JSON.stringify(value),
  );
}

async function insertWorkout(
  db: SQLite.SQLiteDatabase,
  workout: Workout,
  position: number,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO workouts (id, name, weekday, reminder_time, notes, created_at, position)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    workout.id,
    workout.name,
    workout.weekday,
    workout.reminderTime,
    workout.notes,
    workout.createdAt,
    position,
  );
  for (let index = 0; index < workout.exercises.length; index += 1) {
    const exercise = workout.exercises[index];
    await db.runAsync(
      `INSERT INTO workout_exercises
       (id, workout_id, name, sets, reps, weight, position)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      exercise.id,
      workout.id,
      exercise.name,
      exercise.sets,
      exercise.reps,
      exercise.weight,
      index,
    );
  }
}

async function insertSession(
  db: SQLite.SQLiteDatabase,
  session: Session,
  position: number,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO workout_sessions
     (id, workout_id, workout_name, date, volume, sets_done, exercises_done, duration_min, position)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    session.id,
    session.workoutId,
    session.workoutName,
    session.date,
    session.volume,
    session.setsDone,
    session.exercisesDone,
    session.durationMin,
    position,
  );
}

async function getSetting<T>(
  db: SQLite.SQLiteDatabase,
  key: string,
  fallback: T,
): Promise<T> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM local_settings WHERE key = ?',
    key,
  );
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    throw new Error(`A configuração local "${key}" está corrompida.`);
  }
}

export async function loadLocalAppData(): Promise<LocalAppData> {
  const db = await getDatabase();
  const [workoutRows, exerciseRows, sessionRows, user, onboarded, themeMode, trainingReminder] =
    await Promise.all([
      db.getAllAsync<WorkoutRow>('SELECT * FROM workouts ORDER BY position DESC'),
      db.getAllAsync<ExerciseRow>('SELECT * FROM workout_exercises ORDER BY position'),
      db.getAllAsync<SessionRow>(
        'SELECT * FROM workout_sessions ORDER BY position DESC',
      ),
      getSetting<User | null>(db, 'user', null),
      getSetting<boolean>(db, 'onboarded', false),
      getSetting<ThemeMode>(db, 'themeMode', 'system'),
      getSetting<TrainingReminder>(
        db,
        'trainingReminder',
        DEFAULT_TRAINING_REMINDER,
      ),
    ]);

  const exercisesByWorkout = new Map<string, Workout['exercises']>();
  for (const row of exerciseRows) {
    const exercises = exercisesByWorkout.get(row.workout_id) ?? [];
    exercises.push({
      id: row.id,
      name: row.name,
      sets: row.sets,
      reps: row.reps,
      weight: row.weight,
    });
    exercisesByWorkout.set(row.workout_id, exercises);
  }

  return {
    user,
    onboarded,
    themeMode,
    trainingReminder,
    workouts: workoutRows.map((row) => ({
      id: row.id,
      name: row.name,
      weekday: row.weekday,
      reminderTime: row.reminder_time,
      notes: row.notes,
      createdAt: row.created_at,
      exercises: exercisesByWorkout.get(row.id) ?? [],
    })),
    sessions: sessionRows.map((row) => ({
      id: row.id,
      workoutId: row.workout_id,
      workoutName: row.workout_name,
      date: row.date,
      volume: row.volume,
      setsDone: row.sets_done,
      exercisesDone: row.exercises_done,
      durationMin: row.duration_min,
    })),
  };
}

export async function saveLocalSettings(
  settings: Partial<Pick<LocalAppData, 'user' | 'onboarded' | 'themeMode' | 'trainingReminder'>>,
): Promise<void> {
  await write(async (db) => {
    for (const [key, value] of Object.entries(settings)) {
      await writeSetting(db, key, value);
    }
  });
}

export async function saveLocalWorkout(workout: Workout): Promise<void> {
  await write(async (db) => {
    const existing = await db.getFirstAsync<{ position: number }>(
      'SELECT position FROM workouts WHERE id = ?',
      workout.id,
    );
    const maximum = await db.getFirstAsync<{ position: number | null }>(
      'SELECT MAX(position) AS position FROM workouts',
    );
    const position = existing?.position ?? (maximum?.position ?? 0) + 1;

    await db.runAsync(
      `INSERT INTO workouts (id, name, weekday, reminder_time, notes, created_at, position)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         weekday = excluded.weekday,
         reminder_time = excluded.reminder_time,
         notes = excluded.notes,
         created_at = excluded.created_at`,
      workout.id,
      workout.name,
      workout.weekday,
      workout.reminderTime,
      workout.notes,
      workout.createdAt,
      position,
    );
    await db.runAsync('DELETE FROM workout_exercises WHERE workout_id = ?', workout.id);
    for (let index = 0; index < workout.exercises.length; index += 1) {
      const exercise = workout.exercises[index];
      await db.runAsync(
        `INSERT INTO workout_exercises
         (id, workout_id, name, sets, reps, weight, position)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        exercise.id,
        workout.id,
        exercise.name,
        exercise.sets,
        exercise.reps,
        exercise.weight,
        index,
      );
    }
  });
}

export async function deleteLocalWorkout(id: string): Promise<void> {
  await write(async (db) => {
    await db.runAsync('DELETE FROM workouts WHERE id = ?', id);
  });
}

export async function saveLocalSession(session: Session): Promise<void> {
  await write(async (db) => {
    const maximum = await db.getFirstAsync<{ position: number | null }>(
      'SELECT MAX(position) AS position FROM workout_sessions',
    );
    await insertSession(db, session, (maximum?.position ?? 0) + 1);
  });
}

export async function clearLocalData(themeMode: ThemeMode): Promise<void> {
  await write(async (db) => {
    await db.runAsync('DELETE FROM workouts');
    await db.runAsync('DELETE FROM workout_sessions');
    await db.runAsync(
      "DELETE FROM local_settings WHERE key NOT IN ('themeMode', ?)",
      LEGACY_IMPORT_KEY,
    );
    await writeSetting(db, 'themeMode', themeMode);
  });
}
