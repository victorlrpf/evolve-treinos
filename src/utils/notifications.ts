import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { TrainingReminder, Workout } from '../types';

const WORKOUT_REMINDER_PREFIX = 'evolve:workout:';
const PERSONAL_REMINDER_KEY = 'evolve:personal-training-reminder';
const ANDROID_CHANNEL_ID = 'training-reminders';

export function configureNotificationPresentation(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

function parseTime(time: string): { hour: number; minute: number } {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) throw new Error('Informe um horário válido no formato HH:MM.');
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Lembretes de treino',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  if (!current.canAskAgain) return false;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === 'granted';
}

async function getScheduledWithKey(key: string) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.filter((item) => item.content.data?.evolveReminderKey === key);
}

async function cancelScheduled(items: Awaited<ReturnType<typeof getScheduledWithKey>>) {
  await Promise.all(
    items.map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );
}

async function replaceWeeklyReminders(
  key: string,
  title: string,
  body: string,
  weekdays: number[],
  time: string,
): Promise<boolean> {
  const { hour, minute } = parseTime(time);
  const existing = await getScheduledWithKey(key);
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    await cancelScheduled(existing);
    return false;
  }

  const newIdentifiers: string[] = [];
  try {
    for (const weekday of weekdays) {
      newIdentifiers.push(
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: { evolveReminderKey: key },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: weekday + 1,
            hour,
            minute,
            ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
          },
        }),
      );
    }
  } catch (error) {
    await Promise.all(
      newIdentifiers.map((identifier) =>
        Notifications.cancelScheduledNotificationAsync(identifier),
      ),
    );
    throw error;
  }

  await cancelScheduled(existing);
  return true;
}

export async function syncWorkoutReminder(workout: Workout): Promise<boolean> {
  const key = `${WORKOUT_REMINDER_PREFIX}${workout.id}`;
  if (!workout.reminderTime) {
    await cancelScheduled(await getScheduledWithKey(key));
    return true;
  }

  if (workout.weekday === null) {
    throw new Error('Escolha um dia da semana para ativar o lembrete deste treino.');
  }
  if (!Number.isInteger(workout.weekday) || workout.weekday < 0 || workout.weekday > 6) {
    throw new Error('O dia da semana selecionado para o treino é inválido.');
  }

  return replaceWeeklyReminders(
    key,
    `Treino: ${workout.name}`,
    'Seu treino está na programação. Bora treinar?',
    [workout.weekday],
    workout.reminderTime,
  );
}

export async function syncPersonalTrainingReminder(
  reminder: TrainingReminder,
): Promise<boolean> {
  if (!reminder.enabled) {
    await cancelScheduled(await getScheduledWithKey(PERSONAL_REMINDER_KEY));
    return true;
  }
  if (reminder.weekdays.length === 0) {
    throw new Error('Escolha pelo menos um dia para receber o lembrete.');
  }
  if (reminder.weekdays.some((weekday) => !Number.isInteger(weekday) || weekday < 0 || weekday > 6)) {
    throw new Error('Um ou mais dias selecionados são inválidos.');
  }
  if (!reminder.message.trim()) {
    throw new Error('Escreva uma mensagem para o lembrete.');
  }

  return replaceWeeklyReminders(
    PERSONAL_REMINDER_KEY,
    'Lembrete para treinar',
    reminder.message.trim(),
    [...new Set(reminder.weekdays)].sort((a, b) => a - b),
    reminder.time,
  );
}

export async function cancelAllTrainingReminders(): Promise<void> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const reminders = scheduled.filter((item) => {
    const key = item.content.data?.evolveReminderKey;
    return typeof key === 'string' &&
      (key.startsWith(WORKOUT_REMINDER_PREFIX) || key === PERSONAL_REMINDER_KEY);
  });
  await cancelScheduled(reminders);
}
