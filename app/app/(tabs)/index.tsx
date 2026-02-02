import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/auth-context';
import { Blue } from '@/constants/theme';
import type { Event } from '@/lib/api';
import { getEvents, rsvpEvent, removeRsvp } from '@/lib/api';

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function EventCard({
  event,
  token,
  userId,
  onRsvpChange,
  onPressDetails,
}: {
  event: Event;
  token: string;
  userId: string;
  onRsvpChange: () => void;
  onPressDetails: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const myRsvp = event.rsvps?.find((r) => r.user_id === userId);
  const yesCount = event.rsvps?.filter((r) => r.status === 'yes').length ?? 0;
  const maybeCount = event.rsvps?.filter((r) => r.status === 'maybe').length ?? 0;

  const setRsvp = useCallback(
    async (status: 'yes' | 'maybe') => {
      if (loading) return;
      setLoading(true);
      try {
        await rsvpEvent(event.id, status, token);
        onRsvpChange();
      } finally {
        setLoading(false);
      }
    },
    [event.id, token, loading, onRsvpChange]
  );

  const clearRsvp = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      await removeRsvp(event.id, token);
      onRsvpChange();
    } finally {
      setLoading(false);
    }
  }, [event.id, token, loading, onRsvpChange]);

  return (
    <View style={styles.card}>
      <Pressable onPress={onPressDetails} style={styles.cardDetails}>
        <Text style={styles.what}>{event.what}</Text>
        <Text style={styles.where}>{event.where}</Text>
        <Text style={styles.datetime}>{formatDate(event.datetime)}</Text>
      </Pressable>
      <View style={styles.rsvpRow}>
        <View style={styles.rsvpButtons}>
          <Pressable
            style={[
              styles.rsvpBtn,
              myRsvp?.status === 'yes' && styles.rsvpBtnActive,
              loading && styles.rsvpBtnDisabled,
            ]}
            onPress={() => (myRsvp?.status === 'yes' ? clearRsvp() : setRsvp('yes'))}
            disabled={loading}
          >
            <Text style={[styles.rsvpBtnText, myRsvp?.status === 'yes' && styles.rsvpBtnTextActive]}>
              Yes{yesCount > 0 ? ` ${yesCount}` : ''}
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.rsvpBtn,
              myRsvp?.status === 'maybe' && styles.rsvpBtnActive,
              loading && styles.rsvpBtnDisabled,
            ]}
            onPress={() => (myRsvp?.status === 'maybe' ? clearRsvp() : setRsvp('maybe'))}
            disabled={loading}
          >
            <Text style={[styles.rsvpBtnText, myRsvp?.status === 'maybe' && styles.rsvpBtnTextActive]}>
              Maybe{maybeCount > 0 ? ` ${maybeCount}` : ''}
            </Text>
          </Pressable>
        </View>
        {(event.free_food || event.free_drinks) && (
          <View style={styles.perks}>
            {event.free_food && <Text style={styles.perkEmoji}>🍕</Text>}
            {event.free_drinks && <Text style={styles.perkEmoji}>🍺</Text>}
          </View>
        )}
      </View>
    </View>
  );
}

export default function FeedScreen() {
  const { user, token, logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchEvents = useCallback(async () => {
    try {
      const list = await getEvents(token ?? undefined);
      setEvents(list);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load events');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEvents();
  }, [fetchEvents]);

  if (!user || !token) {
    return null;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Text style={styles.title}>WWW Austin</Text>
        <Pressable onPress={() => logout().then(() => router.replace('/(auth)/login'))} hitSlop={12}>
          <Text style={styles.logout}>Log out</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Blue.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.error}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={fetchEvents}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Blue.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No events yet</Text>
            </View>
          }
          renderItem={({ item }) => (
            <EventCard
              event={item}
              token={token}
              userId={user.id}
              onRsvpChange={fetchEvents}
              onPressDetails={() => router.push(`/event/${item.id}`)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Blue.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  logout: {
    fontSize: 15,
    color: Blue.primary,
    fontWeight: '500',
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: Blue.primary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Blue.border,
  },
  cardDetails: {
    marginBottom: 4,
  },
  what: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  where: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  datetime: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 4,
    paddingBottom: 12,
  },
  rsvpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rsvpButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  perks: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  perkEmoji: {
    fontSize: 22,
  },
  rsvpBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Blue.border,
    minWidth: 80,
    alignItems: 'center',
  },
  rsvpBtnActive: {
    backgroundColor: Blue.primary,
    borderColor: Blue.primary,
  },
  rsvpBtnDisabled: {
    opacity: 0.6,
  },
  rsvpBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Blue.text,
  },
  rsvpBtnTextActive: {
    color: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  error: {
    color: '#DC2626',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: Blue.primary,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  empty: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Blue.textSecondary,
  },
});
