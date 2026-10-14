import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, IconName, Input, SectionTitle } from '../components/ui';
import { useApp } from '../store/AppContext';
import { useTheme } from '../theme/useTheme';
import { ThemeMode } from '../types';

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: IconName }[] = [
  { mode: 'light', label: 'Claro', icon: 'sunny-outline' },
  { mode: 'dark', label: 'Noturno', icon: 'moon-outline' },
  { mode: 'system', label: 'Automático', icon: 'phone-portrait-outline' },
];

export default function ProfileScreen() {
  const { user, themeMode, setThemeMode, setUserName, logout, clearAll } = useApp();
  const { colors } = useTheme();
  const [name, setName] = useState(user?.name ?? '');

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

  const confirmClear = () =>
    Alert.alert(
      'Apagar todos os dados',
      'Isso remove treinos, histórico e cadastro deste aparelho. Não dá para desfazer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Apagar tudo', style: 'destructive', onPress: clearAll },
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
