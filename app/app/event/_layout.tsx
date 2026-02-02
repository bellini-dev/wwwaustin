import { Stack } from 'expo-router';

export default function EventLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, presentation: 'modal' }}>
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
