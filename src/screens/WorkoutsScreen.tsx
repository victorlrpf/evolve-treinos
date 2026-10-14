import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, EmptyState } from '../components/ui';
import { useApp } from '../store/AppContext';
import { useTheme } from '../theme/useTheme';
import { WEEKDAYS_LONG, formatVolume, workoutVolume } from '../utils/helpers';

export default function WorkoutsScreen() {
  const { workouts } = useApp();
  const { colors } = useTheme();
  const today = new Date().getDay();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Meus treinos</Text>
          <Button
            title="Novo"
            icon="add"
            onPress={() => router.push('/workout/form')}
            style={{ paddingVertical: 10 }}
          />
        </View>

        {workouts.length === 0 ? (
          <Card>
            <EmptyState
              icon="barbell-outline"
              title="Nenhum treino ainda"
              subtitle="Crie seu primeiro treino com os exercícios, séries, repetições e cargas."
              actionTitle="Criar treino"
              onAction={() => router.push('/workout/form')}
            />
          </Card>
        ) : (
          workouts.map((w) => {
            const isToday = w.weekday === today;
            const preview = w.exercises
              .slice(0, 3)
              .map((e) => e.name)
              .join(' · ');
            return (
              <Pressable
                key={w.id}
                onPress={() => router.push(`/workout/${w.id}`)}
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, marginBottom: 12 })}
              >
                <Card>
                  <View style={styles.cardTop}>
                    <Text style={[styles.workoutName, { color: colors.text }]} numberOfLines={1}>
                      {w.name}
                    </Text>
                    {isToday ? (
                      <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                        <Text style={styles.badgeText}>Hoje</Text>
                      </View>
                    ) : null}
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </View>
                  <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 4 }}>
                    {w.weekday !== null ? `${WEEKDAYS_LONG[w.weekday]} · ` : ''}
                    {w.exercises.length} {w.exercises.length === 1 ? 'exercício' : 'exercícios'} ·{' '}
                    {formatVolume(workoutVolume(w.exercises))} de volume
                  </Text>
                  {preview ? (
                    <Text
                      style={{ color: colors.primaryText, fontSize: 13, marginTop: 8 }}
                      numberOfLines={1}
                    >
                      {preview}
                    </Text>
                  ) : null}
                </Card>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  workoutName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
