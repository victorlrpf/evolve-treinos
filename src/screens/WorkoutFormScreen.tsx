import React, { useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppDialog } from '../components/AppDialog';
import { Button, Card, Chip, Input, SectionTitle } from '../components/ui';
import { useApp } from '../store/AppContext';
import { useTheme } from '../theme/useTheme';
import { Workout } from '../types';
import { WEEKDAYS_SHORT, uid } from '../utils/helpers';
import { NotificationsUnavailableError, syncWorkoutReminder } from '../utils/notifications';

interface FormExercise {
  id: string;
  name: string;
  sets: string;
  reps: string;
  weight: string;
}

const newExercise = (): FormExercise => ({
  id: uid(),
  name: '',
  sets: '3',
  reps: '12',
  weight: '',
});

const toInt = (s: string) => Math.max(0, parseInt(s, 10) || 0);
const toFloat = (s: string) => Math.max(0, parseFloat(s.replace(',', '.')) || 0);

export default function WorkoutFormScreen() {
  const { workouts, saveWorkout, deleteWorkout } = useApp();
  const { showDialog } = useAppDialog();
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollView>(null);

  const { id: workoutId } = useLocalSearchParams<{ id?: string }>();
  const editing = workoutId ? workouts.find((w) => w.id === workoutId) : undefined;

  const [name, setName] = useState(editing?.name ?? '');
  const [weekday, setWeekday] = useState<number | null>(editing?.weekday ?? null);
  const [reminderTime, setReminderTime] = useState<string | null>(
    editing?.reminderTime ?? null,
  );
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [exercises, setExercises] = useState<FormExercise[]>(
    editing
      ? editing.exercises.map((e) => ({
          id: e.id,
          name: e.name,
          sets: String(e.sets),
          reps: String(e.reps),
          weight: e.weight ? String(e.weight) : '',
        }))
      : [newExercise()],
  );

  const updateExercise = (id: string, patch: Partial<FormExercise>) =>
    setExercises((list) => list.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  const animateExerciseList = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  const removeExercise = (id: string) => {
    animateExerciseList();
    setExercises((list) => (list.length > 1 ? list.filter((e) => e.id !== id) : list));
  };

  const onSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      showDialog({
        title: 'Nome obrigatório',
        message: 'Dê um nome ao treino (ex.: Treino A – Peito e tríceps).',
        tone: 'danger',
      });
      return;
    }
    const valid = exercises.filter((e) => e.name.trim());
    if (valid.length === 0) {
      showDialog({
        title: 'Adicione exercícios',
        message: 'Inclua pelo menos um exercício com nome.',
        tone: 'danger',
      });
      return;
    }
    if (reminderTime && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(reminderTime)) {
      showDialog({
        title: 'Horário inválido',
        message: 'Informe o horário do lembrete no formato HH:MM.',
        tone: 'danger',
      });
      return;
    }
    const workout: Workout = {
      id: editing?.id ?? uid(),
      name: trimmed,
      weekday,
      reminderTime,
      notes: notes.trim(),
      exercises: valid.map((e) => ({
        id: e.id,
        name: e.name.trim(),
        sets: toInt(e.sets),
        reps: toInt(e.reps),
        weight: toFloat(e.weight),
      })),
      createdAt: editing?.createdAt ?? new Date().toISOString(),
    };
    setSaving(true);
    try {
      await saveWorkout(workout);
    } catch (error) {
      setSaving(false);
      showDialog({
        title: 'Não foi possível salvar o treino',
        message: error instanceof Error
          ? `O treino não foi gravado no aparelho: ${error.message}`
          : 'O treino não foi gravado no aparelho. Tente novamente.',
        tone: 'danger',
      });
      return;
    }

    try {
      const scheduled = await syncWorkoutReminder(workout);
      if (reminderTime && !scheduled) {
        await saveWorkout({ ...workout, reminderTime: null });
        router.back();
        showDialog({
          title: 'Treino salvo sem lembrete',
          message: Platform.OS === 'web'
            ? 'Os lembretes estão disponíveis nos aplicativos Android e iOS.'
            : 'Ative as notificações do Evolve nas configurações do aparelho para programar um lembrete.',
          tone: 'info',
        });
        return;
      }
      router.back();
    } catch (error) {
      if (error instanceof NotificationsUnavailableError && reminderTime) {
        try {
          await saveWorkout({ ...workout, reminderTime: null });
        } catch (saveError) {
          showDialog({
            title: 'Não foi possível atualizar o lembrete',
            message: saveError instanceof Error
              ? `O treino está salvo, mas a preferência do lembrete não foi atualizada: ${saveError.message}`
              : 'O treino está salvo, mas a preferência do lembrete não foi atualizada.',
            tone: 'danger',
          });
          router.back();
          return;
        }
      }
      showDialog({
        title: 'Treino salvo, mas lembrete não atualizado',
        message: error instanceof NotificationsUnavailableError
          ? error.message
          : error instanceof Error
            ? `O treino foi salvo, mas o lembrete não foi configurado: ${error.message}`
            : 'O treino foi salvo, mas não foi possível configurar o lembrete. Tente novamente.',
        tone: 'danger',
      });
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const onDelete = () => {
    if (!editing) return;
    showDialog({
      title: 'Excluir treino?',
      message: `Deseja excluir "${editing.name}"? O histórico será mantido.`,
      tone: 'danger',
      actions: [
        { label: 'Cancelar', variant: 'secondary' },
        {
          label: 'Excluir',
          variant: 'danger',
          onPress: async () => {
            try {
              await syncWorkoutReminder({ ...editing, reminderTime: null });
            } catch (error) {
              showDialog({
                title: 'Não foi possível cancelar o lembrete',
                message: error instanceof Error
                  ? `O lembrete não pôde ser cancelado: ${error.message}`
                  : 'O lembrete não pôde ser cancelado. Tente novamente.',
                tone: 'danger',
              });
              return;
            }
            try {
              await deleteWorkout(editing.id);
              router.dismissAll();
            } catch (error) {
              showDialog({
                title: 'Não foi possível excluir o treino',
                message: error instanceof Error
                  ? `O treino continua salvo: ${error.message}`
                  : 'O treino continua salvo. Tente novamente.',
                tone: 'danger',
              });
            }
          },
        },
      ],
    });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Stack.Screen options={{ title: editing ? 'Editar treino' : 'Novo treino' }} />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.content, { flexGrow: 1 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        <Input
          label="Nome do treino"
          value={name}
          onChangeText={setName}
          placeholder="Ex.: Treino A – Peito e tríceps"
        />

        <Text style={[styles.label, { color: colors.textMuted }]}>Dia da semana (opcional)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Chip
              label="Livre"
              selected={weekday === null}
              onPress={() => {
                setWeekday(null);
                setReminderTime(null);
              }}
            />
            {WEEKDAYS_SHORT.map((d, i) => (
              <Chip key={d} label={d} selected={weekday === i} onPress={() => setWeekday(i)} />
            ))}
          </View>
        </ScrollView>

        <Card style={{ marginBottom: 16 }}>
          <View style={styles.reminderRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>
                Lembrete deste treino
              </Text>
              <Text style={{ color: colors.textMuted, marginTop: 4, lineHeight: 18 }}>
                {weekday === null
                  ? 'Escolha um dia da semana para programar um lembrete.'
                  : 'Receba uma notificação no dia programado.'}
              </Text>
            </View>
            <Switch
              value={reminderTime !== null}
              onValueChange={(enabled) => setReminderTime(enabled ? '18:00' : null)}
              disabled={weekday === null}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
          {reminderTime !== null ? (
            <Input
              label="Horário do lembrete"
              value={reminderTime}
              onChangeText={setReminderTime}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              placeholder="18:00"
              containerStyle={{ marginTop: 12, marginBottom: 0 }}
            />
          ) : null}
        </Card>

        <Input
          label="Observações (opcional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Descanso, técnica, aquecimento..."
          multiline
          style={{ minHeight: 70, textAlignVertical: 'top' }}
        />

        <SectionTitle>Exercícios</SectionTitle>
        {exercises.map((e, index) => (
          <Card key={e.id} style={{ marginBottom: 12 }}>
            <View style={styles.exerciseHeader}>
              <Text style={{ color: colors.primaryText, fontWeight: '700' }}>
                Exercício {index + 1}
              </Text>
              {exercises.length > 1 ? (
                <Pressable onPress={() => removeExercise(e.id)} hitSlop={10}>
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </Pressable>
              ) : null}
            </View>
            <Input
              value={e.name}
              onChangeText={(v) => updateExercise(e.id, { name: v })}
              placeholder="Ex.: Supino reto"
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Input
                label="Séries"
                containerStyle={{ flex: 1, marginBottom: 0 }}
                value={e.sets}
                onChangeText={(v) => updateExercise(e.id, { sets: v })}
                keyboardType="number-pad"
              />
              <Input
                label="Reps"
                containerStyle={{ flex: 1, marginBottom: 0 }}
                value={e.reps}
                onChangeText={(v) => updateExercise(e.id, { reps: v })}
                keyboardType="number-pad"
              />
              <Input
                label="Carga (kg)"
                containerStyle={{ flex: 1, marginBottom: 0 }}
                value={e.weight}
                onChangeText={(v) => updateExercise(e.id, { weight: v })}
                keyboardType="decimal-pad"
                placeholder="0"
              />
            </View>
          </Card>
        ))}

        <Button
          title="Adicionar exercício"
          icon="add-circle-outline"
          variant="secondary"
          onPress={() => {
            Keyboard.dismiss();
            animateExerciseList();
            setExercises((list) => [...list, newExercise()]);
            requestAnimationFrame(() => {
              scrollRef.current?.scrollToEnd({ animated: true });
            });
          }}
        />

        <View style={{ marginTop: 24, gap: 10 }}>
          <Button
            title={editing ? 'Salvar alterações' : 'Salvar treino'}
            icon="checkmark"
            onPress={onSave}
            disabled={saving}
          />
          {editing ? (
            <Button
              title="Excluir treino"
              icon="trash-outline"
              variant="ghost"
              onPress={onDelete}
            />
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 48,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
