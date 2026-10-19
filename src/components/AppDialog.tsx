import React, { createContext, useCallback, useContext, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, IconName } from './ui';
import { useTheme } from '../theme/useTheme';

export type DialogButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export interface DialogAction {
  label: string;
  variant?: DialogButtonVariant;
  onPress?: () => void | Promise<void>;
}

export interface DialogOptions {
  title: string;
  message: string;
  tone?: 'success' | 'info' | 'danger';
  dismissible?: boolean;
  actions?: DialogAction[];
}

interface DialogContextValue {
  showDialog: (options: DialogOptions) => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

const TONE_ICONS: Record<NonNullable<DialogOptions['tone']>, IconName> = {
  success: 'checkmark-circle',
  info: 'information-circle',
  danger: 'alert-circle',
};

export function AppDialogProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogOptions | null>(null);
  const { colors } = useTheme();
  const showDialog = useCallback((options: DialogOptions) => setDialog(options), []);
  const closeDialog = useCallback(() => setDialog(null), []);
  const tone = dialog?.tone ?? 'info';
  const iconColor = tone === 'danger' ? colors.danger : colors.primaryText;
  const actions = dialog?.actions ?? [{ label: 'Entendi' }];
  const dismissible = dialog?.dismissible ?? true;

  return (
    <DialogContext.Provider value={{ showDialog }}>
      {children}
      <Modal
        visible={dialog !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          if (dismissible) closeDialog();
        }}
      >
        {dialog ? (
          <View style={styles.overlay}>
            <View
              accessibilityViewIsModal
              accessibilityRole="alert"
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={[styles.iconWrap, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name={TONE_ICONS[tone]} size={30} color={iconColor} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>{dialog.title}</Text>
              <Text style={[styles.message, { color: colors.textMuted }]}>
                {dialog.message}
              </Text>
              <View style={styles.actions}>
                {actions.map((action, index) => (
                  <Button
                    key={`${action.label}-${index}`}
                    title={action.label}
                    variant={action.variant ?? (actions.length > 1 && index === 0 ? 'secondary' : 'primary')}
                    onPress={() => {
                      closeDialog();
                      void action.onPress?.();
                    }}
                    style={styles.action}
                  />
                ))}
              </View>
            </View>
          </View>
        ) : null}
      </Modal>
    </DialogContext.Provider>
  );
}

export function useAppDialog(): DialogContextValue {
  const context = useContext(DialogContext);
  if (!context) throw new Error('useAppDialog deve ser usado dentro de <AppDialogProvider>');
  return context;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(12, 8, 24, 0.58)',
  },
  card: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 26,
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 22,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 18,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
  },
  actions: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },
  action: {
    flex: 1,
  },
});
