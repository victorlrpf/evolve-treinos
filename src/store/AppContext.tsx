import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, ThemeMode, TrainingReminder, User, Workout } from '../types';

const STORAGE_KEY = '@evolve/state/v1';

export const DEFAULT_TRAINING_REMINDER: TrainingReminder = {
  enabled: false,
  weekdays: [1, 2, 3, 4, 5],
  time: '18:00',
  message: 'Hora de cuidar de você. Separe um tempo para treinar hoje!',
};

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

interface AppContextValue extends PersistedState {
  ready: boolean;
  setUserName: (name: string) => void;
  skipSignup: () => void;
  logout: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  setTrainingReminder: (reminder: TrainingReminder) => void;
  saveWorkout: (workout: Workout) => void;
  deleteWorkout: (id: string) => void;
  addSession: (session: Session) => void;
  clearAll: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState>(initialState);
  const [ready, setReady] = useState(false);

  // Carrega os dados salvos no aparelho
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setState({ ...initialState, ...JSON.parse(raw) });
      } catch {
        // dados corrompidos: começa do zero
      }
      setReady(true);
    })();
  }, []);

  // Salva a cada alteração
  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state, ready]);

  const setUserName = useCallback((name: string) => {
    setState((s) => ({ ...s, user: { name }, onboarded: true }));
  }, []);

  const skipSignup = useCallback(() => {
    setState((s) => ({ ...s, onboarded: true }));
  }, []);

  const logout = useCallback(() => {
    setState((s) => ({ ...s, user: null, onboarded: false }));
  }, []);

  const setThemeMode = useCallback((themeMode: ThemeMode) => {
    setState((s) => ({ ...s, themeMode }));
  }, []);

  const setTrainingReminder = useCallback((trainingReminder: TrainingReminder) => {
    setState((s) => ({ ...s, trainingReminder }));
  }, []);

  const saveWorkout = useCallback((workout: Workout) => {
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

  const deleteWorkout = useCallback((id: string) => {
    // O histórico (sessions) é mantido para não perder a evolução
    setState((s) => ({ ...s, workouts: s.workouts.filter((w) => w.id !== id) }));
  }, []);

  const addSession = useCallback((session: Session) => {
    setState((s) => ({ ...s, sessions: [session, ...s.sessions] }));
  }, []);

  const clearAll = useCallback(() => {
    setState((s) => ({ ...initialState, themeMode: s.themeMode }));
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      ...state,
      ready,
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
