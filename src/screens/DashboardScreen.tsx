import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BarChart } from '../components/BarChart';
import { Card, EmptyState, IconName, SectionTitle } from '../components/ui';
import { useApp } from '../store/AppContext';
import { useTheme } from '../theme/useTheme';
import {
  WEEKDAYS_LONG,
  currentStreak,
  formatDate,
  formatVolume,
  sessionsPerDay,
  volumePerWeek,
} from '../utils/helpers';

function StatTile({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string;
}) {
  const { colors } = useTheme();
  return (
    <Card style={styles.tile}>
      <View style={[styles.tileIcon, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={18} color={colors.primaryText} />
      </View>
      <Text style={[styles.tileValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.tileLabel, { color: colors.textMuted }]}>{label}</Text>
    </Card>
  );
}

export default function DashboardScreen() {
  const { user, sessions } = useApp();
  const { colors } = useTheme();

  const perDay = useMemo(() => sessionsPerDay(sessions, 7), [sessions]);
  const perWeek = useMemo(() => volumePerWeek(sessions, 6), [sessions]);
  const streak = useMemo(() => currentStreak(sessions), [sessions]);

  const weekCount = perDay.reduce((acc, d) => acc + d.value, 0);
  const weekVolume = perWeek[perWeek.length - 1]?.value ?? 0;
  const recent = sessions.slice(0, 5);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.greeting, { color: colors.text }]}>
          {greeting}
          {user ? `, ${user.name}` : ''}!
        </Text>
        <Text style={[styles.date, { color: colors.textMuted }]}>
          {WEEKDAYS_LONG[now.getDay()]}, {formatDate(now.toISOString())}
        </Text>

        <View style={styles.grid}>
          <StatTile icon="calendar-outline" label="Treinos (7 dias)" value={String(weekCount)} />
          <StatTile icon="barbell-outline" label="Volume (7 dias)" value={formatVolume(weekVolume)} />
          <StatTile
            icon="flame-outline"
            label="Sequência"
            value={`${streak} ${streak === 1 ? 'dia' : 'dias'}`}
          />
          <StatTile icon="trophy-outline" label="Total de treinos" value={String(sessions.length)} />
        </View>

        {sessions.length === 0 ? (
          <Card style={{ marginTop: 8 }}>
            <EmptyState
              icon="stats-chart-outline"
              title="Seu dashboard está vazio"
              subtitle="Crie um treino, execute-o e finalize para ver seus relatórios e gráficos de evolução aqui."
              actionTitle="Ir para meus treinos"
              onAction={() => router.navigate('/workouts')}
            />
          </Card>
        ) : (
          <>
            <SectionTitle>Treinos nos últimos 7 dias</SectionTitle>
            <Card>
              <BarChart data={perDay} formatValue={(n) => String(n)} />
            </Card>

            <SectionTitle>Volume semanal (kg)</SectionTitle>
            <Card>
              <BarChart data={perWeek} />
              <Text style={[styles.caption, { color: colors.textMuted }]}>
                Soma de séries × repetições × carga das últimas 6 semanas.
              </Text>
            </Card>

            <SectionTitle>Histórico recente</SectionTitle>
            <Card style={{ paddingVertical: 4 }}>
              {recent.map((s, i) => (
                <View
                  key={s.id}
                  style={[
                    styles.historyRow,
                    i < recent.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.historyName, { color: colors.text }]}>
                      {s.workoutName}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                      {formatDate(s.date)} · {s.exercisesDone} exerc. · {s.durationMin} min
                    </Text>
                  </View>
                  <Text style={{ color: colors.primaryText, fontWeight: '700' }}>
                    {formatVolume(s.volume)}
                  </Text>
                </View>
              ))}
            </Card>
          </>
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
  greeting: {
    fontSize: 26,
    fontWeight: '800',
  },
  date: {
    fontSize: 14,
    marginTop: 2,
    marginBottom: 18,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tile: {
    width: '48%',
    flexGrow: 1,
    padding: 14,
  },
  tileIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  tileValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  tileLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  caption: {
    fontSize: 12,
    marginTop: 12,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  historyName: {
    fontSize: 15,
    fontWeight: '600',
  },
});
