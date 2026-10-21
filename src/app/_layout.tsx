import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Button } from '../components/ui';
import { AppProvider, useApp } from '../store/AppContext';
import { AppDialogProvider } from '../components/AppDialog';
import { useTheme } from '../theme/useTheme';

function RootStack() {
  const { ready, onboarded, initializationError, retryInitialization } = useApp();
  const { isDark, colors } = useTheme();

  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (initializationError) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          backgroundColor: colors.background,
        }}
      >
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' }}>
          Não foi possível carregar seus dados
        </Text>
        <Text style={{ color: colors.textMuted, marginVertical: 12, textAlign: 'center' }}>
          {initializationError}
        </Text>
        <Button title="Tentar novamente" onPress={() => void retryInitialization()} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.text },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Protected guard={!onboarded}>
          <Stack.Screen name="welcome" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={onboarded}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="workout/form"
            options={{
              title: 'Treino',
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen name="workout/[id]" options={{ title: 'Treino' }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <AppDialogProvider>
          <RootStack />
        </AppDialogProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}
