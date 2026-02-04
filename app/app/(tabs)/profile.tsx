import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/auth-context';
import { getAvatarDataUri } from '@/lib/api';
import { Blue } from '@/constants/theme';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB

export default function ProfileScreen() {
  const router = useRouter();
  const { user, token, logout, updateProfile, uploadAvatar } = useAuth();
  const insets = useSafeAreaInsets();
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [email, setEmail] = useState(user?.email ?? '');
  const [name, setName] = useState(user?.name ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const loadAvatar = useCallback(async () => {
    if (!token || !user?.id) return;
    setAvatarLoading(true);
    try {
      const uri = await getAvatarDataUri(user.id, token);
      setAvatarUri(uri);
    } catch {
      setAvatarUri(null);
    } finally {
      setAvatarLoading(false);
    }
  }, [token, user?.id]);

  useEffect(() => {
    if (user && token) loadAvatar();
  }, [user?.id, token, loadAvatar]);

  useEffect(() => {
    if (user) {
      setEmail(user.email ?? '');
      setName(user.name ?? '');
    }
  }, [user?.id, user?.email, user?.name]);

  const processImageUri = useCallback(
    async (uri: string) => {
      let width = 1200;
      let compress = 0.8;
      let base64: string = '';
      let byteLength = Infinity;
      const minWidth = 128;
      const minCompress = 0.15;

      while (byteLength > MAX_AVATAR_BYTES) {
        const manipulated = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width } }],
          {
            compress,
            format: ImageManipulator.SaveFormat.JPEG,
            base64: true,
          }
        );
        base64 = (manipulated as { base64?: string }).base64 ?? '';
        byteLength = (base64.length * 3) / 4;

        if (byteLength <= MAX_AVATAR_BYTES) break;

        if (compress > minCompress) {
          compress = Math.max(minCompress, compress - 0.15);
        } else if (width > minWidth) {
          width = Math.max(minWidth, Math.floor(width * 0.7));
          compress = 0.8;
        } else {
          compress = Math.max(0.1, compress - 0.05);
        }
      }
      return base64;
    },
    []
  );

  const uploadFromUri = useCallback(
    async (uri: string) => {
      setUploadingAvatar(true);
      setError('');
      try {
        const base64 = await processImageUri(uri);
        await uploadAvatar(base64, 'image/jpeg');
        await loadAvatar();
        setSuccess('Profile picture updated.');
        setTimeout(() => setSuccess(''), 3000);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        const isHeicHdrError =
          message.includes('-50') ||
          message.includes('converthdrdata') ||
          message.includes('iio call');
        setError(
          isHeicHdrError
            ? "This photo format isn't supported. Try a different photo or take a new one."
            : message || 'Upload failed'
        );
      } finally {
        setUploadingAvatar(false);
      }
    },
    [processImageUri, uploadAvatar, loadAvatar]
  );

  const pickFromLibrary = useCallback(async () => {
    if (!token) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your photos to set a profile picture.');
      return;
    }
    // quality < 1 can trigger HEIC→JPEG on iOS and avoid Image I/O -50 / converthdrdata errors
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.99,
    });
    if (result.canceled || !result.assets[0]) return;
    await uploadFromUri(result.assets[0].uri);
  }, [token, uploadFromUri]);

  const takePhoto = useCallback(async () => {
    if (!token) return;
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow camera access to take a profile picture.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.99,
    });
    if (result.canceled || !result.assets[0]) return;
    await uploadFromUri(result.assets[0].uri);
  }, [token, uploadFromUri]);

  const pickAndUploadAvatar = useCallback(() => {
    Alert.alert('Profile photo', 'Choose a source', [
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Library', onPress: pickFromLibrary },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [takePhoto, pickFromLibrary]);

  const handleUpdate = useCallback(async () => {
    setError('');
    setSuccess('');
    if (!currentPassword.trim()) {
      setError('Current password is required to save changes');
      return;
    }
    setLoading(true);
    try {
      await updateProfile({
        currentPassword: currentPassword.trim(),
        email: email.trim() || undefined,
        name: name.trim() || undefined,
        newPassword: newPassword.trim() || undefined,
      });
      setSuccess('Profile updated.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setLoading(false);
    }
  }, [currentPassword, email, name, newPassword, updateProfile]);

  const handleLogout = useCallback(async () => {
    await logout();
    router.replace('/(auth)/login');
  }, [logout, router]);

  if (!user || !token) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.text}>Sign in to view your profile.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.avatarSection}>
          {avatarLoading ? (
            <View style={[styles.avatarCircle, styles.avatarPlaceholder]}>
              <ActivityIndicator color={Blue.textSecondary} />
            </View>
          ) : avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarCircle} />
          ) : (
            <View style={[styles.avatarCircle, styles.avatarPlaceholder]}>
              <Text style={styles.avatarPlaceholderText}>
                {user?.name?.charAt(0)?.toUpperCase() ?? user?.email?.charAt(0)?.toUpperCase() ?? '?'}
              </Text>
            </View>
          )}
          <Pressable
            style={({ pressed }) => [styles.changePhotoBtn, pressed && styles.buttonPressed]}
            onPress={pickAndUploadAvatar}
            disabled={uploadingAvatar}
          >
            {uploadingAvatar ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.changePhotoText}>Change Photo</Text>
            )}
          </Pressable>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
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
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Name"
            placeholderTextColor={Blue.textSecondary}
            value={name}
            onChangeText={setName}
            autoComplete="name"
            editable={!loading}
          />
          <Text style={styles.label}>New password (leave blank to keep current)</Text>
          <TextInput
            style={styles.input}
            placeholder="New password"
            placeholderTextColor={Blue.textSecondary}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoComplete="password-new"
            editable={!loading}
          />
          <Text style={styles.label}>Current password (required to save)</Text>
          <TextInput
            style={styles.input}
            placeholder="Current password"
            placeholderTextColor={Blue.textSecondary}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            autoComplete="password"
            editable={!loading}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {success ? <Text style={styles.success}>{success}</Text> : null}
          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={handleUpdate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Save changes</Text>
            )}
          </Pressable>
        </View>
        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Blue.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Blue.border,
    backgroundColor: Blue.surface,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Blue.text,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 48,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Blue.border,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 36,
    fontWeight: '600',
    color: Blue.textSecondary,
  },
  changePhotoBtn: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: Blue.primary,
    borderRadius: 12,
  },
  changePhotoText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  card: {
    backgroundColor: Blue.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Blue.border,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Blue.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: Blue.background,
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
    marginTop: 12,
  },
  success: {
    color: Blue.success,
    fontSize: 14,
    marginTop: 12,
  },
  button: {
    backgroundColor: Blue.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutBtn: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  logoutText: {
    color: Blue.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  text: {
    fontSize: 16,
    color: Blue.textSecondary,
  },
});
