import { TrainingReminder } from '../types';

export const DEFAULT_TRAINING_REMINDER: TrainingReminder = {
  enabled: false,
  weekdays: [1, 2, 3, 4, 5],
  time: '18:00',
  message: 'Hora de cuidar de você. Separe um tempo para treinar hoje!',
};
