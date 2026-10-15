import React, { useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Chip, IconName, Input, SectionTitle } from '../components/ui';
import { DEFAULT_TRAINING_REMINDER, useApp } from '../store/AppContext';
import { useTheme } from '../theme/useTheme';
import { ThemeMode } from '../types';
import { WEEKDAYS_SHORT } from '../utils/helpers';
import { cancelAllTrainingReminders, syncPersonalTrainingReminder } from '../utils/notifications';

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: IconName }[] = [
  { mode: 'light', label: 'Claro', icon: 'sunny-outline' },
  { mode: 'dark', label: 'Noturno', icon: 'moon-outline' },
  { mode: 'system', label: 'Automático', icon: 'phone-portrait-outline' },
];

export default function ProfileScreen() {
  const {
    user,
    themeMode,
    trainingReminder,
    setThemeMode,
    setTrainingReminder,
    setUserName,
    logout,
    clearAll,
  } = useApp();
  const { colors } = useTheme();
  const [name, setName] = useState(user?.name ?? '');
  const [reminderDraft, setReminderDraft] = useState(trainingReminder);
  const [savingReminder, setSavingReminder] = useState(false);

  const saveName = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Nome vazio', 'Digite como você quer ser chamado.');
      return;
    }
    setUserName(trimmed);
    Alert.alert('Pronto!', 'Seu nome foi atualizado.');
  };

  const confirmLogout = () =>
    Alert.alert('Trocar usuário', 'Você voltará à tela inicial. Seus treinos e histórico serão mantidos.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Continuar', onPress: logout },
    ]);

  const saveReminder = async () => {
    if (reminderDraft.enabled && reminderDraft.weekdays.length === 0) {
      Alert.alert('Escolha os dias', 'Selecione pelo menos um dia para receber o lembrete.');
      return;
    }
    if (reminderDraft.enabled && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(reminderDraft.time)) {
      Alert.alert('Horário inválido', 'Informe o horário no formato HH:MM.');
      return;
    }
    if (reminderDraft.enabled && !reminderDraft.message.trim()) {
      Alert.alert('Mensagem vazia', 'Escreva uma mensagem para o seu lembrete.');
      return;
    }

    setSavingReminder(true);
    try {
      const scheduled = await syncPersonalTrainingReminder(reminderDraft);
      if (reminderDraft.enabled && !scheduled) {
        const disabledReminder = { ...reminderDraft, enabled: false };
        setReminderDraft(disabledReminder);
        setTrainingReminder(disabledReminder);
        Alert.alert(
          'Notificações não permitidas',
          Platform.OS === 'web'
            ? 'Os lembretes estão disponíveis nos aplicativos Android e iOS.'
            : 'Ative as notificações do Evolve nas configurações do aparelho e tente novamente.',
        );
        return;
      }
      setTrainingReminder(reminderDraft);
      Alert.alert(
        'Lembrete salvo',
        reminderDraft.enabled
          ? 'Você receberá uma notificação nos dias e horários escolhidos.'
          : 'O lembrete personalizado foi desativado.',
      );
    } catch (error) {
      Alert.alert(
        'Não foi possível salvar',
        error instanceof Error
          ? `O lembrete não foi atualizado: ${error.message}`
          : 'O lembrete não foi atualizado. Verifique as permissões de notificação e tente novamente.',
      );
    } finally {
      setSavingReminder(false);
    }
  };

  const confirmClear = () =>
    Alert.alert(
      'Apagar todos os dados',
      'Isso remove treinos, histórico e cadastro deste aparelho. Não dá para desfazer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar tudo',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelAllTrainingReminders();
              clearAll();
              setReminderDraft(DEFAULT_TRAINING_REMINDER);
            } catch (error) {
              Alert.alert(
                'Não foi possível apagar os dados',
                error instanceof Error
                  ? `As notificações não puderam ser canceladas: ${error.message}`
                  : 'As notificações não puderam ser canceladas. Tente novamente.',
              );
            }
          },
        },
      ],
    );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: colors.text }]}>Perfil</Text>

        <Card>
          <View style={styles.avatarRow}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>{(user?.name?.[0] ?? '?').toUpperCase()}</Text>
            </View>
            <Text style={[styles.userName, { color: colors.text }]}>
              {user?.name ?? 'Sem nome'}
            </Text>
          </View>
          <Input
            label={user ? 'Como você quer ser chamado' : 'Cadastre um nome (opcional)'}
            value={name}
            onChangeText={setName}
            placeholder="Seu nome ou apelido"
            autoCapitalize="words"
          />
          <Button title="Salvar nome" variant="secondary" onPress={saveName} />
        </Card>

        <SectionTitle>Lembrete para treinar</SectionTitle>
        <Card>
          <View style={styles.reminderHeader}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={[styles.reminderTitle, { color: colors.text }]}>
                Notificação personalizada
              </Text>
              <Text style={[styles.reminderDescription, { color: colors.textMuted }]}>
                Escolha os dias, o horário e a mensagem que vai te motivar.
              </Text>
            </View>
            <Switch
              value={reminderDraft.enabled}
              onValueChange={(enabled) =>
                setReminderDraft((current) => ({ ...current, enabled }))
              }
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          <Text style={[styles.reminderLabel, { color: colors.textMuted }]}>
            Dias da semana
          </Text>
          <View style={styles.weekdayRow}>
            {WEEKDAYS_SHORT.map((day, weekday) => {
              const selected = reminderDraft.weekdays.includes(weekday);
              return (
                <Chip
                  key={day}
                  label={day}
                  selected={selected}
                  onPress={() =>
                    setReminderDraft((current) => ({
                      ...current,
                      weekdays: selected
                        ? current.weekdays.filter((value) => value !== weekday)
                        : [...current.weekdays, weekday].sort((a, b) => a - b),
                    }))
                  }
                />
              );
            })}
          </View>
          <Input
            label="Horário"
            value={reminderDraft.time}
            onChangeText={(time) => setReminderDraft((current) => ({ ...current, time }))}
            keyboardType="numbers-and-punctuation"
            maxLength={5}
            placeholder="18:00"
          />
          <Input
            label="Sua mensagem"
            value={reminderDraft.message}
            onChangeText={(message) =>
              setReminderDraft((current) => ({ ...current, message }))
            }
            placeholder="Ex.: Vamos treinar? Você consegue!"
            maxLength={120}
            multiline
            style={{ minHeight: 72, textAlignVertical: 'top' }}
          />
          <Button
            title="Salvar lembrete"
            icon="notifications-outline"
            onPress={saveReminder}
            disabled={savingReminder}
          />
        </Card>

        <SectionTitle>Aparência</SectionTitle>
        <View style={styles.themeRow}>
          {THEME_OPTIONS.map((opt) => {
            const selected = themeMode === opt.mode;
            return (
              <Pressable
                key={opt.mode}
                onPress={() => setThemeMode(opt.mode)}
                style={[
                  styles.themeOption,
                  {
                    backgroundColor: selected ? colors.primary : colors.card,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name={opt.icon}
                  size={22}
                  color={selected ? colors.onPrimary : colors.primaryText}
                />
                <Text
                  style={{
                    marginTop: 6,
                    fontSize: 13,
                    fontWeight: '600',
                    color: selected ? colors.onPrimary : colors.text,
                  }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <SectionTitle>Conta e dados</SectionTitle>
        <View style={{ gap: 10 }}>
          <Button title="Trocar usuário / sair" icon="log-out-outline" variant="secondary" onPress={confirmLogout} />
          <Button title="Apagar todos os dados" icon="trash-outline" variant="ghost" onPress={confirmClear} />
        </View>

        <Text style={[styles.footer, { color: colors.textMuted }]}>
          Todos os dados ficam salvos somente neste aparelho. Nada é enviado para a internet.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 16,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  reminderDescription: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  reminderLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  weekdayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  footer: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 18,
  },
});
