import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/auth-context';
import { Blue } from '@/constants/theme';

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Email and password required');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await signUp(email.trim(), password, name.trim() || undefined);
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]}
    >
      <View style={styles.header}>
        <Text style={styles.brand}>When Where What Austin</Text>
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Sign up to RSVP to events</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Name (optional)"
          placeholderTextColor={Blue.textSecondary}
          value={name}
          onChangeText={setName}
          autoComplete="name"
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={Blue.textSecondary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="Password (min 6 characters)"
          placeholderTextColor={Blue.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password-new"
          editable={!loading}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={handleSignUp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign up</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account? </Text>
        <Link href="/(auth)/login" asChild>
          <Pressable>
            <Text style={styles.link}>Sign in</Text>
          </Pressable>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Blue.background,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  header: {
    marginBottom: 32,
  },
  brand: {
    fontSize: 42,
    fontWeight: '700',
    color: Blue.primary,
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Blue.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: Blue.textSecondary,
    marginTop: 8,
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: Blue.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Blue.text,
    borderWidth: 1,
    borderColor: Blue.border,
  },
  error: {
    color: '#DC2626',
    fontSize: 14,
  },
  button: {
    backgroundColor: Blue.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: Blue.textSecondary,
    fontSize: 15,
  },
  link: {
    color: Blue.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});
