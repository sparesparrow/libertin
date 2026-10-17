import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { nativeTheme } from '@libertin/theme/native';
import { initI18n } from '@libertin/i18n';
import { AuthFlow } from './AuthFlow';
import { readBuildRuntimeConfig, type RuntimeConfig } from './runtimeConfig';

export default function App() {
  const [ready, setReady] = useState(false);
  const [config, setConfig] = useState<RuntimeConfig | null>(null);
  const [startupError, setStartupError] = useState(false);
  const [startupAttempt, setStartupAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    let closeMockServer: (() => void) | undefined;

    const start = async () => {
      setStartupError(false);
      setReady(false);
      setConfig(null);
      try {
        const appConfig = readBuildRuntimeConfig();
        if (appConfig.networkMode === 'mock') {
          const { server } = await import('./mocks/native');
          if (!active) return;

          closeMockServer = () => server.close();
          // Mock preview builds must be hermetic. An unhandled request is a test
          // failure, not permission to leak onto a guessed or production host.
          server.listen({ onUnhandledRequest: 'error' });
        }

        await initI18n('cs');
        if (active) {
          setConfig(appConfig);
          setReady(true);
        }
      } catch {
        // Do not log startup exceptions: native module errors can include
        // implementation details. The fallback screen offers an explicit retry.
        try {
          closeMockServer?.();
        } catch {
          // Preserve the visible startup failure even if interceptor cleanup fails.
        }
        closeMockServer = undefined;
        if (active) setStartupError(true);
      }
    };

    void start();
    return () => {
      active = false;
      closeMockServer?.();
    };
  }, [startupAttempt]);

  if (startupError) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.startupError}>
          <Text accessibilityRole="alert" style={styles.startupErrorText}>
            Aplikaci se nepodařilo spustit.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Zkusit znovu"
            onPress={() => {
              setReady(false);
              setStartupAttempt((attempt) => attempt + 1);
            }}
            style={styles.retryButton}
          >
            <Text style={styles.retryButtonText}>Zkusit znovu</Text>
          </Pressable>
        </View>
        <StatusBar style="dark" />
      </SafeAreaView>
    );
  }

  if (!ready || config === null) return null;

  return (
    <SafeAreaView style={styles.root}>
      <AuthFlow config={config} />
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: nativeTheme.colors.bg },
  startupError: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: nativeTheme.spacing[4],
  },
  startupErrorText: { color: nativeTheme.colors.text, fontSize: nativeTheme.fontSize.lg },
  retryButton: { marginTop: nativeTheme.spacing[3], padding: nativeTheme.spacing[3] },
  retryButtonText: { color: nativeTheme.colors.primary, fontSize: nativeTheme.fontSize.base },
});
