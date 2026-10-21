import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Session, ThemeMode, TrainingReminder, User, Workout } from '../types';
import { DEFAULT_TRAINING_REMINDER } from './localDefaults';
import {
  clearLocalData,
  deleteLocalWorkout,
  loadLocalAppData,
  saveLocalSession,
  saveLocalSettings,
  saveLocalWorkout,
  type LocalAppData,
} from './localDatabase';

export { DEFAULT_TRAINING_REMINDER } from './localDefaults';

interface PersistedState {
  user: User | null;
  /** true depois que a pessoa criou o cadastro ou pulou a etapa */
  onboarded: boolean;
  themeMode: ThemeMode;
  workouts: Workout[];
  trainingReminder: TrainingReminder;
  /** mais recentes primeiro */
  sessions: Session[];
}

const initialState: PersistedState = {
  user: null,
  onboarded: false,
  themeMode: 'system',
  workouts: [],
  trainingReminder: DEFAULT_TRAINING_REMINDER,
  sessions: [],
};

async function readPersistedState(): Promise<{
  data: LocalAppData | null;
  error: string | null;
}> {
  try {
    return { data: await loadLocalAppData(), error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error
        ? error.message
        : 'Não foi possível abrir o banco de dados local.',
    };
  }
}

interface AppContextValue extends PersistedState {
  ready: boolean;
  initializationError: string | null;
  retryInitialization: () => Promise<void>;
  setUserName: (name: string) => Promise<void>;
  skipSignup: () => Promise<void>;
  logout: () => Promise<void>;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  setTrainingReminder: (reminder: TrainingReminder) => Promise<void>;
  saveWorkout: (workout: Workout) => Promise<void>;
  deleteWorkout: (id: string) => Promise<void>;
  addSession: (session: Session) => Promise<void>;
  clearAll: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState>(initialState);
  const [ready, setReady] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void readPersistedState().then(({ data, error }) => {
      if (!active) return;
      if (data) setState({ ...initialState, ...data });
      setInitializationError(error);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const retryInitialization = useCallback(async () => {
    setReady(false);
    setInitializationError(null);
    const { data, error } = await readPersistedState();
    if (data) setState({ ...initialState, ...data });
    setInitializationError(error);
    setReady(true);
  }, []);

  const setUserName = useCallback(async (name: string) => {
    const user = { name };
    await saveLocalSettings({ user, onboarded: true });
    setState((s) => ({ ...s, user, onboarded: true }));
  }, []);

  const skipSignup = useCallback(async () => {
    await saveLocalSettings({ onboarded: true });
    setState((s) => ({ ...s, onboarded: true }));
  }, []);

  const logout = useCallback(async () => {
    await saveLocalSettings({ user: null, onboarded: false });
    setState((s) => ({ ...s, user: null, onboarded: false }));
  }, []);

  const setThemeMode = useCallback(async (themeMode: ThemeMode) => {
    await saveLocalSettings({ themeMode });
    setState((s) => ({ ...s, themeMode }));
  }, []);

  const setTrainingReminder = useCallback(async (trainingReminder: TrainingReminder) => {
    await saveLocalSettings({ trainingReminder });
    setState((s) => ({ ...s, trainingReminder }));
  }, []);

  const saveWorkout = useCallback(async (workout: Workout) => {
    await saveLocalWorkout(workout);
    setState((s) => {
      const exists = s.workouts.some((w) => w.id === workout.id);
      return {
        ...s,
        workouts: exists
          ? s.workouts.map((w) => (w.id === workout.id ? workout : w))
          : [workout, ...s.workouts],
      };
    });
  }, []);

  const deleteWorkout = useCallback(async (id: string) => {
    await deleteLocalWorkout(id);
    setState((s) => ({ ...s, workouts: s.workouts.filter((w) => w.id !== id) }));
  }, []);

  const addSession = useCallback(async (session: Session) => {
    await saveLocalSession(session);
    setState((s) => ({ ...s, sessions: [session, ...s.sessions] }));
  }, []);

  const clearAll = useCallback(async () => {
    await clearLocalData(state.themeMode);
    setState((s) => ({ ...initialState, themeMode: s.themeMode }));
  }, [state.themeMode]);

  const value = useMemo<AppContextValue>(
    () => ({
      ...state,
      ready,
      initializationError,
      retryInitialization,
      setUserName,
      skipSignup,
      logout,
      setThemeMode,
      setTrainingReminder,
      saveWorkout,
      deleteWorkout,
      addSession,
      clearAll,
    }),
    [
      state,
      ready,
      initializationError,
      retryInitialization,
      setUserName,
      skipSignup,
      logout,
      setThemeMode,
      setTrainingReminder,
      saveWorkout,
      deleteWorkout,
      addSession,
      clearAll,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp deve ser usado dentro de <AppProvider>');
  return ctx;
}
