import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BarChart } from '../components/BarChart';
import { useAppDialog } from '../components/AppDialog';
import { Button, Card, SectionTitle } from '../components/ui';
import { useApp } from '../store/AppContext';
import { useTheme } from '../theme/useTheme';
import { Session } from '../types';
import {
  WEEKDAYS_LONG,
  formatDayMonth,
  formatVolume,
  uid,
  workoutVolume,
} from '../utils/helpers';

export default function WorkoutViewScreen() {
  const { workouts, sessions, addSession } = useApp();
  const { showDialog } = useAppDialog();
  const { colors } = useTheme();
  const { id: workoutId } = useLocalSearchParams<{ id: string }>();

  const workout = workouts.find((w) => w.id === workoutId);
  const [running, setRunning] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [done, setDone] = useState<Record<string, boolean>>({});

  const history = useMemo(
    () => sessions.filter((s) => s.workoutId === workoutId),
    [sessions, workoutId],
  );

  if (!workout) return null;

  const totalVolume = workoutVolume(workout.exercises);
  const totalSets = workout.exercises.reduce((acc, e) => acc + e.sets, 0);
  const doneCount = workout.exercises.filter((e) => done[e.id]).length;
  const bestVolume = history.reduce((max, s) => Math.max(max, s.volume), 0);
  const chartData = history
    .slice(0, 6)
    .reverse()
    .map((s) => ({ label: formatDayMonth(new Date(s.date)), value: s.volume }));

  const start = () => {
    setDone({});
    setStartedAt(Date.now());
    setRunning(true);
  };

  const cancel = () => {
    setRunning(false);
    setStartedAt(null);
    setDone({});
  };

  const finish = async (finishedAt: number) => {
    const checked = workout.exercises.filter((e) => done[e.id]);
    if (checked.length === 0) {
      showDialog({
        title: 'Nenhum exercício concluído',
        message: 'Marque ao menos um exercício para registrar o treino.',
        tone: 'danger',
      });
      return;
    }
    const session: Session = {
      id: uid(),
      workoutId: workout.id,
      workoutName: workout.name,
      date: new Date().toISOString(),
      volume: workoutVolume(checked),
      setsDone: checked.reduce((acc, e) => acc + e.sets, 0),
      exercisesDone: checked.length,
      durationMin: Math.max(1, Math.round((finishedAt - (startedAt ?? finishedAt)) / 60000)),
    };
    setFinishing(true);
    try {
      await addSession(session);
      cancel();
      showDialog({
        title: 'Treino registrado!',
        message: `Volume: ${formatVolume(session.volume)} · ${session.durationMin} min. Veja a evolução no Dashboard.`,
        tone: 'success',
      });
    } catch (error) {
      showDialog({
        title: 'Não foi possível registrar o treino',
        message: error instanceof Error
          ? `A sessão não foi gravada no aparelho: ${error.message}`
          : 'A sessão não foi gravada no aparelho. Tente novamente.',
        tone: 'danger',
      });
    } finally {
      setFinishing(false);
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      <Stack.Screen
        options={{
          title: workout.name,
          headerRight: () => (
            <Pressable
              onPress={() => router.push({ pathname: '/workout/form', params: { id: workout.id } })}
              hitSlop={10}
            >
              <Ionicons name="create-outline" size={22} color={colors.primary} />
            </Pressable>
          ),
        }}
      />
      <Card>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {workout.exercises.length}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>exercícios</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{totalSets}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>séries</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {formatVolume(totalVolume)}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>volume</Text>
          </View>
        </View>
        {workout.weekday !== null || workout.notes ? (
          <View style={{ marginTop: 14 }}>
            {workout.weekday !== null ? (
              <Text style={{ color: colors.primaryText, fontWeight: '600' }}>
                {WEEKDAYS_LONG[workout.weekday]}
              </Text>
            ) : null}
            {workout.notes ? (
              <Text style={{ color: colors.textMuted, marginTop: 4, lineHeight: 20 }}>
                {workout.notes}
              </Text>
            ) : null}
          </View>
        ) : null}
      </Card>

      <SectionTitle>{running ? `Em andamento · ${doneCount}/${workout.exercises.length}` : 'Exercícios'}</SectionTitle>
      <Card style={{ paddingVertical: 4 }}>
        {workout.exercises.map((e, i) => {
          const checked = !!done[e.id];
          return (
            <Pressable
              key={e.id}
              disabled={!running}
              onPress={() => setDone((d) => ({ ...d, [e.id]: !d[e.id] }))}
              style={[
                styles.exerciseRow,
                i < workout.exercises.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              {running ? (
                <Ionicons
                  name={checked ? 'checkmark-circle' : 'ellipse-outline'}
                  size={26}
                  color={checked ? colors.success : colors.textMuted}
                  style={{ marginRight: 12 }}
                />
              ) : (
                <View style={[styles.index, { backgroundColor: colors.primarySoft }]}>
                  <Text style={{ color: colors.primaryText, fontWeight: '700', fontSize: 12 }}>
                    {i + 1}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.exerciseName,
                    { color: colors.text },
                    checked && { textDecorationLine: 'line-through', opacity: 0.6 },
                  ]}
                >
                  {e.name}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>
                  {e.sets} × {e.reps} · {e.weight > 0 ? `${e.weight} kg` : 'peso corporal'}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </Card>

      <View style={{ marginTop: 16, gap: 10 }}>
        {running ? (
          <>
            <Button
              title="Finalizar treino"
              icon="checkmark-done"
              onPress={() => void finish(Date.now())}
              disabled={finishing}
            />
            <Button title="Cancelar" variant="ghost" onPress={cancel} />
          </>
        ) : (
          <Button title="Iniciar treino" icon="play" onPress={start} />
        )}
      </View>

      {history.length > 0 ? (
        <>
          <SectionTitle>Evolução deste treino</SectionTitle>
          <Card>
            <BarChart data={chartData} />
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 12 }}>
              {history.length} {history.length === 1 ? 'execução' : 'execuções'} · melhor volume:{' '}
              {formatVolume(bestVolume)} · última com {history[0].exercisesDone} exerc.
            </Text>
          </Card>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 48,
  },
  summaryRow: {
    flexDirection: 'row',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  summaryLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '600',
  },
  index: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
});
