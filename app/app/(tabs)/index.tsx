import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
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

function formatDateHeader(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
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
  userName,
  onRsvpChange,
  onPressDetails,
}: {
  event: Event;
  token: string;
  userId: string;
  userName: string | null;
  onRsvpChange: (eventId: string, interested: boolean) => void;
  onPressDetails: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const myRsvp = event.rsvps?.find((r) => r.user_id === userId);

  const setInterested = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      await rsvpEvent(event.id, token);
      onRsvpChange(event.id, true);
    } finally {
      setLoading(false);
    }
  }, [event.id, token, loading, onRsvpChange]);

  const clearRsvp = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      await removeRsvp(event.id, token);
      onRsvpChange(event.id, false);
    } finally {
      setLoading(false);
    }
  }, [event.id, token, loading, onRsvpChange]);

  const interestedCount = event.rsvps?.filter((r) => r.status === 'interested').length ?? 0;
  const descriptionText = event.description?.trim() || event.what;

  const dateHeaderText = event.when?.trim()
    ? event.when.trim()
    : formatDateHeader(event.datetime);

  return (
    <View style={styles.card}>
      <Pressable onPress={onPressDetails} style={styles.cardPressable}>
        <View style={styles.cardDateBar}>
          <Text style={styles.cardDateBarText}>{dateHeaderText}</Text>
        </View>
        <View style={styles.cardImageWrap}>
          <Image
            source={
              event.image_url
                ? { uri: event.image_url }
                : require('@/assets/images/austin_skyline.jpg')
            }
            style={styles.cardImage}
            resizeMode="cover"
          />
        </View>
        <View style={styles.cardDetails}>
          <View style={styles.cardDetailsTop}>
            <Text style={styles.cardVenue} numberOfLines={1}>
              {event.where}
            </Text>
            <Pressable
              onPress={() => (myRsvp?.status === 'interested' ? clearRsvp() : setInterested())}
              disabled={loading}
              style={styles.starBtn}
              hitSlop={12}
            >
              <Ionicons
                name={myRsvp?.status === 'interested' ? 'star' : 'star-outline'}
                size={28}
                color="#fff"
              />
            </Pressable>
          </View>
          <Text style={styles.cardDescription} numberOfLines={6}>
            {descriptionText}
          </Text>
          <View style={styles.cardSeparator} />
          <Text style={styles.cardInterested}>
            {interestedCount.toLocaleString()} interested
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

const PAGE_SIZE = 15;

export default function FeedScreen() {
  const { user, token, logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');

  const fetchPage = useCallback(
    async (pageOffset: number, append: boolean) => {
      try {
        const list = await getEvents(token ?? undefined, {
          limit: PAGE_SIZE,
          offset: pageOffset,
        });
        const sorted = [...list].sort(
          (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
        );
        setEvents((prev) => (append ? [...prev, ...sorted] : sorted));
        setHasMore(list.length >= PAGE_SIZE);
        setError('');
      } catch (e) {
        if (!append) setError(e instanceof Error ? e.message : 'Failed to load events');
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  const fetchEvents = useCallback(() => {
    fetchPage(0, false);
  }, [fetchPage]);

  useEffect(() => {
    if (user && token) fetchPage(0, false);
  }, [token, user, user?.id, fetchPage]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore || events.length === 0) return;
    setLoadingMore(true);
    fetchPage(events.length, true);
  }, [events.length, fetchPage, hasMore, loading, loadingMore]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setHasMore(true);
    fetchPage(0, false);
  }, [fetchPage]);

  const onRsvpChange = useCallback(
    (eventId: string, interested: boolean) => {
      if (!user) return;
      setEvents((prev) =>
        prev.map((e) => {
          if (e.id !== eventId) return e;
          const rsvps = e.rsvps ?? [];
          const withoutMe = rsvps.filter((r) => r.user_id !== user.id);
          const withMe = interested
            ? [...withoutMe, { user_id: user.id, name: user.name ?? null, status: 'interested' as const }]
            : withoutMe;
          return { ...e, rsvps: withMe };
        })
      );
    },
    [user]
  );

  if (!user || !token) {
    return null;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Text style={styles.title}>When Where What</Text>
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
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={Blue.primary} />
              </View>
            ) : null
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
              userName={user.name ?? null}
              onRsvpChange={onRsvpChange}
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
    borderBottomColor: Blue.primaryDark,
    backgroundColor: Blue.primary,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  logout: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: Blue.primary,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Blue.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardPressable: {
    flex: 1,
  },
  cardDateBar: {
    backgroundColor: Blue.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  cardDateBarText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  cardImageWrap: {
    width: '100%',
    height: 350,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardDetails: {
    backgroundColor: Blue.primary,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
  },
  cardDetailsTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardVenue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    marginRight: 8,
  },
  cardDescription: {
    fontSize: 15,
    color: '#fff',
    lineHeight: 22,
    paddingBottom: 10,
  },
  cardSeparator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 10,
  },
  cardInterested: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },
  starBtn: {
    padding: 4,
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
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
