import { useNavigation } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking as RNLinking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapErrorBoundary } from '@/components/map-error-boundary';
import { InterestedAvatars } from '@/components/interested-avatars';
import { useAuth } from '@/context/auth-context';
import { Blue } from '@/constants/theme';
import type { Event } from '@/lib/api';
import { getEvent, rsvpEvent, removeRsvp } from '@/lib/api';
import { geocodeAddress } from '@/lib/geocode';

function formatDate(iso: string) {
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

function getMapsUrl(address: string): string {
  const encoded = encodeURIComponent(address);
  if (Platform.OS === 'ios') {
    return `https://maps.apple.com/?q=${encoded}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encoded}`;
}

// Austin, TX fallback when geocoding fails; stable ref so fetchEvent doesn't re-run every render
const DEFAULT_REGION = { latitude: 30.2672, longitude: -97.7431, latitudeDelta: 0.05, longitudeDelta: 0.05 };

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [region, setRegion] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>(null);
  const [hasRealCoords, setHasRealCoords] = useState(false);

  const fetchEvent = useCallback(async (skipGeocode = false) => {
    if (!id) return;
    try {
      const data = await getEvent(id, token ?? undefined);
      setEvent(data);
      setError('');
      setLoading(false);
      if (skipGeocode) return;
      if (!data.where) {
        setRegion(DEFAULT_REGION);
        setHasRealCoords(false);
      } else {
        setRegion(null);
        setHasRealCoords(false);
        geocodeAddress(data.where).then((coords) => {
          if (coords) {
            setRegion({
              latitude: coords.latitude,
              longitude: coords.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            });
            setHasRealCoords(true);
          } else {
            setRegion(DEFAULT_REGION);
            setHasRealCoords(false);
          }
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load event');
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  const openNavigation = useCallback(() => {
    if (!event?.where) return;
    const url = getMapsUrl(event.where);
    RNLinking.openURL(url);
  }, [event?.where]);

  const shareEvent = useCallback(() => {
    if (!id || !event) return;
    const url = Linking.createURL(`event/${id}`);
    const message = Platform.OS === 'ios'
      ? `${event.what} – ${event.where}\n${url}`
      : undefined;
    Share.share({
      message: message ?? url,
      url: Platform.OS === 'ios' ? url : undefined,
      title: event.what,
    }).catch(() => {});
  }, [id, event]);

  const closeModal = useCallback(() => {
    if (navigation.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }, [router, navigation]);

  const myRsvp = event?.rsvps?.find((r) => r.user_id === user?.id);

  const setInterested = useCallback(async () => {
    if (!id || !token || rsvpLoading) return;
    setRsvpLoading(true);
    try {
      await rsvpEvent(id, token);
      await fetchEvent(true);
    } finally {
      setRsvpLoading(false);
    }
  }, [id, token, rsvpLoading, fetchEvent]);

  const clearRsvp = useCallback(async () => {
    if (!id || !token || rsvpLoading) return;
    setRsvpLoading(true);
    try {
      await removeRsvp(id, token);
      await fetchEvent(true);
    } finally {
      setRsvpLoading(false);
    }
  }, [id, token, rsvpLoading, fetchEvent]);

  if (!id) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.error}>Invalid event</Text>
        <Pressable style={styles.closeBtn} onPress={closeModal}>
          <Text style={styles.closeBtnText}>Close</Text>
        </Pressable>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Blue.primary} />
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.error}>{error || 'Event not found'}</Text>
        <Pressable style={styles.closeBtn} onPress={closeModal}>
          <Text style={styles.closeBtnText}>Close</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Event details</Text>
        <View style={styles.headerActions} pointerEvents="box-none">
          <Pressable onPress={shareEvent} hitSlop={12} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>Share</Text>
          </Pressable>
          <Pressable onPress={closeModal} hitSlop={12} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>Close</Text>
          </Pressable>
        </View>
      </View>

      {/* Top half: details */}
      <View style={styles.detailsHalf}>
        <ScrollView
          style={styles.detailsScroll}
          contentContainerStyle={styles.detailsScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.detailCard}>
            <Text style={styles.label}>When</Text>
            <Text style={styles.value}>
              {event.when?.trim() ? event.when.trim() : formatDate(event.datetime)}
            </Text>
            {event.when?.trim() ? (
              <>
                <Text style={[styles.label, styles.labelSpaced]}>Date & time</Text>
                <Text style={styles.value}>{formatDate(event.datetime)}</Text>
              </>
            ) : null}

            <Text style={[styles.label, styles.labelSpaced]}>Where</Text>
            <Text style={styles.value}>{event.where}</Text>

            <Text style={[styles.label, styles.labelSpaced]}>What</Text>
            <Text style={styles.value}>{event.what}</Text>

            {event.event_link ? (
              <>
                <Text style={[styles.label, styles.labelSpaced]}>Event link</Text>
                <Pressable onPress={() => event.event_link && RNLinking.openURL(event.event_link)}>
                  <Text style={styles.eventLink}>{event.event_link}</Text>
                </Pressable>
              </>
            ) : null}

            <View style={styles.rsvpRow}>
              {user && token ? (
                <Pressable
                  style={[
                    styles.rsvpBtn,
                    myRsvp?.status === 'interested' && styles.rsvpBtnActive,
                    rsvpLoading && styles.rsvpBtnDisabled,
                  ]}
                  onPress={() => (myRsvp?.status === 'interested' ? clearRsvp() : setInterested())}
                  disabled={rsvpLoading}
                >
                  <Text style={[styles.rsvpBtnText, myRsvp?.status === 'interested' && styles.rsvpBtnTextActive]}>
                    {myRsvp?.status === 'interested' ? "I'm Interested" : 'Interested'}
                  </Text>
                </Pressable>
              ) : (
                <View style={styles.rsvpBtnPlaceholder} />
              )}
              <View style={styles.perksList}>
                {event.free_food && <Text style={styles.perkText}>Free Food!</Text>}
                {event.free_drinks && <Text style={styles.perkText}>Free Drinks!</Text>}
                {event.free_entry && <Text style={styles.perkText}>Free Entry!</Text>}
              </View>
            </View>
            <InterestedAvatars rsvps={event.rsvps ?? []} token={token ?? null} />
          </View>
        </ScrollView>
      </View>

      {/* Bottom half: map (shows loading until region is ready). Skip MapView on iOS Simulator to avoid GeoServices "default.csv" error. */}
      <View style={styles.mapHalf}>
        {Platform.OS !== 'web' && !!region ? (
          <MapErrorBoundary
            fallback={
              <Pressable style={styles.mapPlaceholder} onPress={openNavigation}>
                <Text style={styles.mapIcon}>📍</Text>
                <Text style={styles.mapTitle}>Open in Maps</Text>
                <Text style={styles.mapSubtitle}>Tap to open navigation to {event.where}</Text>
              </Pressable>
            }
          >
            <View style={styles.mapWrapper}>
              <MapView
                style={styles.map}
                region={{
                  latitude: region.latitude,
                  longitude: region.longitude,
                  latitudeDelta: region.latitudeDelta,
                  longitudeDelta: region.longitudeDelta,
                }}
                scrollEnabled
                zoomEnabled
                mapType="standard"
              >
                {hasRealCoords && (
                  <Marker
                    coordinate={{ latitude: region.latitude, longitude: region.longitude }}
                    title={event.where}
                  />
                )}
              </MapView>
              <Pressable style={styles.mapOverlay} onPress={openNavigation}>
                <Text style={styles.mapOverlayText}>Tap to open navigation</Text>
              </Pressable>
            </View>
          </MapErrorBoundary>
        ) : region === null && event.where ? (
          <View style={styles.mapLoading}>
            <ActivityIndicator size="large" color={Blue.primary} />
            <Text style={styles.mapLoadingText}>Loading map…</Text>
          </View>
        ) : (
          <Pressable style={styles.mapPlaceholder} onPress={openNavigation}>
            <Text style={styles.mapIcon}>📍</Text>
            <Text style={styles.mapTitle}>Open in Maps</Text>
            <Text style={styles.mapSubtitle}>Tap to open navigation to {event.where}</Text>
          </Pressable>
        )}
      </View>
    </View>
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
    padding: 24,
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
    color: Blue.primary,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: Blue.primary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBtnText: {
    fontSize: 16,
    color: Blue.primary,
    fontWeight: '600',
  },
  closeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    color: Blue.primary,
    fontWeight: '600',
  },
  detailsHalf: {
    flex: 1,
    minHeight: 0,
  },
  detailsScroll: {
    flex: 1,
  },
  detailsScrollContent: {
    padding: 20,
    paddingBottom: 24,
  },
  detailCard: {
    backgroundColor: Blue.primary,
    borderRadius: 16,
    padding: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  labelSpaced: {
    marginTop: 16,
  },
  value: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 22,
  },
  eventLink: {
    fontSize: 16,
    color: '#fff',
    textDecorationLine: 'underline',
    lineHeight: 22,
  },
  counts: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  countText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  rsvpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 20,
  },
  rsvpBtnPlaceholder: {
    minWidth: 100,
  },
  perksList: {
    flexDirection: 'column',
    gap: 2,
    alignItems: 'flex-end',
  },
  perkText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
  },
  rsvpBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.8)',
    minWidth: 80,
    alignItems: 'center',
  },
  rsvpBtnActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  rsvpBtnDisabled: {
    opacity: 0.6,
  },
  rsvpBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  rsvpBtnTextActive: {
    color: Blue.primary,
  },
  mapHalf: {
    flex: 1,
    minHeight: 0,
    backgroundColor: Blue.surface,
    overflow: 'hidden',
  },
  mapLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  mapLoadingText: {
    fontSize: 16,
    color: Blue.textSecondary,
    fontWeight: '500',
  },
  mapWrapper: {
    flex: 1,
    width: '100%',
    minHeight: 0,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  mapOverlayText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  mapPlaceholder: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Blue.primary,
    marginBottom: 4,
  },
  mapSubtitle: {
    fontSize: 14,
    color: Blue.textSecondary,
    textAlign: 'center',
  },
  error: {
    fontSize: 16,
    color: '#DC2626',
    marginBottom: 16,
  },
});
