import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppDialog } from '../components/AppDialog';
import { Button, Input } from '../components/ui';
import { useApp } from '../store/AppContext';
import { useTheme } from '../theme/useTheme';

export default function WelcomeScreen() {
  const { setUserName, skipSignup } = useApp();
  const { showDialog } = useAppDialog();
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const canStart = name.trim().length > 0;

  const start = async (userName?: string) => {
    setSaving(true);
    try {
      if (userName) {
        await setUserName(userName);
      } else {
        await skipSignup();
      }
    } catch (error) {
      showDialog({
        title: 'Não foi possível salvar',
        message: error instanceof Error
          ? `Seus dados não foram gravados: ${error.message}`
          : 'Seus dados não foram gravados. Tente novamente.',
        tone: 'danger',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={[styles.hero, { backgroundColor: colors.hero }]}>
          <View style={styles.logo}>
            <Ionicons name="barbell" size={42} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>Evolve</Text>
          <Text style={styles.subtitle}>
            Monte seus treinos e acompanhe sua evolução com relatórios e gráficos.
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={[styles.heading, { color: colors.text }]}>Como podemos te chamar?</Text>
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            O cadastro é opcional e serve só para personalizar o app. Tudo fica salvo apenas neste
            aparelho.
          </Text>

          <Input
            label="Seu nome ou apelido"
            value={name}
            onChangeText={setName}
            placeholder="Ex.: Victão"
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={() => canStart && void start(name.trim())}
          />

          <Button
            title="Começar"
            icon="arrow-forward"
            disabled={!canStart || saving}
            onPress={() => void start(name.trim())}
          />
          <Button
            title="Pular por agora"
            variant="ghost"
            disabled={saving}
            onPress={() => void start()}
            style={{ marginTop: 8 }}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingTop: 90,
    paddingBottom: 48,
    paddingHorizontal: 28,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  form: {
    padding: 24,
    paddingTop: 32,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  hint: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
});
