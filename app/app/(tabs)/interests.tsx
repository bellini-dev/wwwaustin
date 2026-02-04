import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Calendar from 'expo-calendar';
import { Blue } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import type { Event } from '@/lib/api';
import { getInterestedEvents, removeRsvp } from '@/lib/api';
import React from 'react';

function formatSectionDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

function hasValidDatetime(event: Event): boolean {
  if (!event.datetime || typeof event.datetime !== 'string') return false;
  const t = new Date(event.datetime).getTime();
  return Number.isFinite(t);
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

type Section = { title: string; data: Event[] };

async function ensureCalendarPermission(): Promise<boolean> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === 'granted';
}

async function getWritableCalendarId(): Promise<string | null> {
  try {
    const defaultCal = await Calendar.getDefaultCalendarAsync();
    if (defaultCal?.allowsModifications) return defaultCal.id;
  } catch {
    // ignore
  }
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writable = calendars.find((c) => c.allowsModifications);
  return writable?.id ?? null;
}

async function addEventToCalendar(event: Event) {
  const ok = await ensureCalendarPermission();
  if (!ok) throw new Error('Calendar permission not granted');

  const calendarId = await getWritableCalendarId();
  if (!calendarId) throw new Error('No writable calendar found');

  const startDate = new Date(event.datetime);
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
  const notes = [event.description?.trim(), event.event_link?.trim()].filter(Boolean).join('\n\n');

  const eventDetails = {
    calendarId,
    title: event.what,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    location: event.where,
    notes: notes || undefined,
    timeZone: undefined,
  };
  console.log('[Calendar] createEventAsync details:', JSON.stringify(eventDetails, null, 2));

  await Calendar.createEventAsync(calendarId, {
    title: event.what,
    startDate,
    endDate,
    location: event.where,
    notes: notes || undefined,
    timeZone: undefined,
  });
}

function InterestCard({
  event,
  token,
  onRemoved,
}: {
  event: Event;
  token: string;
  onRemoved: (eventId: string) => void;
}) {
  const [busy, setBusy] = useState<'remove' | 'calendar' | null>(null);
  const canAddToCalendar = hasValidDatetime(event);
  const whenText = event.when?.trim() ? event.when.trim() : (canAddToCalendar ? formatTime(event.datetime) : event.datetime ?? 'No date');

  const onPressTrash = useCallback(async () => {
    if (busy) return;
    setBusy('remove');
    try {
      await removeRsvp(event.id, token);
      onRemoved(event.id);
    } finally {
      setBusy(null);
    }
  }, [busy, event.id, onRemoved, token]);

  const onPressCalendar = useCallback(async () => {
    if (busy) return;
    setBusy('calendar');
    try {
      await addEventToCalendar(event);
      Alert.alert('Added to Calendar', `${event.what} was added to your calendar.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not add to calendar';
      Alert.alert(
        'Could not add to calendar',
        message === 'Calendar permission not granted'
          ? 'Please allow calendar access in Settings to add events.'
          : message === 'No writable calendar found'
            ? 'No calendar that can be edited was found on this device.'
            : message
      );
    } finally {
      setBusy(null);
    }
  }, [busy, event]);

  return (
    <View style={styles.card}>
      <View style={styles.cardImageWrap}>
        <Image
          source={
            event.image_url ? { uri: event.image_url } : require('@/assets/images/austin_skyline.jpg')
          }
          style={styles.cardImage}
          resizeMode="contain"
        />
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.metaLabel}>When</Text>
        <Text style={styles.metaValue} numberOfLines={1}>
          {whenText}
        </Text>
        <Text style={[styles.metaLabel, { marginTop: 6 }]}>Where</Text>
        <Text style={styles.metaValue} numberOfLines={1}>
          {event.where}
        </Text>
        <Text style={[styles.metaLabel, { marginTop: 6 }]}>What</Text>
        <Text style={styles.metaValue} numberOfLines={1}>
          {event.what}
        </Text>
      </View>

      <View style={styles.cardActions}>
        <Pressable
          onPress={onPressCalendar}
          disabled={!!busy || !canAddToCalendar}
          style={({ pressed }) => [
            styles.iconBtn,
            pressed && canAddToCalendar && styles.iconBtnPressed,
            !canAddToCalendar && styles.iconBtnDisabled,
          ]}
          hitSlop={10}
        >
          <Ionicons
            name="calendar-outline"
            size={24}
            color={canAddToCalendar ? Blue.primaryDark : Blue.muted}
          />
        </Pressable>
        <Pressable
          onPress={onPressTrash}
          disabled={!!busy}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
          hitSlop={10}
        >
          <Ionicons name="trash-outline" size={24} color={Blue.primaryDark} />
        </Pressable>
      </View>
    </View>
  );
}

export default function InterestsScreen() {
  const { user, token } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const list = await getInterestedEvents(token);
      const sorted = [...list].sort(
        (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
      );
      setEvents(sorted);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load interests');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Reload whenever the Favorites tab is focused (e.g. after navigating back from Feed)
  useFocusEffect(
    useCallback(() => {
      if (user && token) load();
    }, [load, token, user])
  );

  const sections: Section[] = useMemo(() => {
    const withDate: Event[] = [];
    const withoutDate: Event[] = [];
    for (const ev of events) {
      if (hasValidDatetime(ev)) withDate.push(ev);
      else withoutDate.push(ev);
    }

    const byDay = new Map<string, Event[]>();
    for (const ev of withDate) {
      const key = new Date(ev.datetime).toDateString();
      const arr = byDay.get(key) ?? [];
      arr.push(ev);
      byDay.set(key, arr);
    }
    const out: Section[] = [];
    for (const arr of byDay.values()) {
      arr.sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
    }
    const sortedKeys = [...byDay.keys()].sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );
    for (const key of sortedKeys) {
      const arr = byDay.get(key) ?? [];
      out.push({ title: formatSectionDate(arr[0]?.datetime ?? key), data: arr });
    }
    if (withoutDate.length > 0) {
      out.push({ title: 'Others', data: withoutDate });
    }
    return out;
  }, [events]);

  const onRemoved = useCallback((eventId: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  }, []);

  if (!user || !token) return null;

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Interests</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Blue.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.error}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No interests yet</Text>
            </View>
          }
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/event/${item.id}`)}>
              <InterestCard event={item} token={token} onRemoved={onRemoved} />
            </Pressable>
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
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: Blue.text,
    marginTop: 10,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: Blue.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Blue.border,
    overflow: 'hidden',
    marginBottom: 12,
  },
  cardImageWrap: {
    width: 92,
    height: 128,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cardImage: {
    width: 102,
    height: 102,
  },
  cardBody: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Blue.textSecondary,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Blue.text,
  },
  cardActions: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingRight: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5FF',
    borderWidth: 1,
    borderColor: 'rgba(0,102,255,0.12)',
  },
  iconBtnPressed: {
    opacity: 0.7,
  },
  iconBtnDisabled: {
    opacity: 0.6,
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

