import { useNavigation } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking as RNLinking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
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

  const interestedCount = event.rsvps?.filter((r) => r.status === 'interested').length ?? 0;
  const whatText = event.description?.trim() || event.what;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header: white, Event details | Share, Close (blue) */}
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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 + 56 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Event image with category pill */}
        <View style={styles.imageWrap}>
          <Image
            source={
              event.image_url
                ? { uri: event.image_url }
                : require('@/assets/images/austin_skyline.jpg')
            }
            style={styles.heroImage}
            resizeMode="cover"
          />
          {event.category ? (
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>{event.category}</Text>
            </View>
          ) : null}
        </View>

        {/* Interested avatars + count */}
        <View style={styles.interestedRow}>
          <View style={styles.interestedAvatarsWrap}>
            <InterestedAvatars rsvps={event.rsvps ?? []} token={token ?? null} />
          </View>
          <Text style={styles.interestedCount}>{interestedCount.toLocaleString()} interested</Text>
        </View>

        {/* Blue block: WHEN, WHERE, WHAT */}
        <View style={styles.blueBlock}>
          <Text style={styles.blockLabel}>WHEN</Text>
          <Text style={styles.blockValue}>
            {event.when?.trim() ? event.when.trim() : formatDate(event.datetime)}
          </Text>

          <Text style={[styles.blockLabel, styles.blockLabelSpaced]}>WHERE</Text>
          <Text style={styles.blockValue}>{event.where}</Text>

          <Text style={[styles.blockLabel, styles.blockLabelSpaced]}>WHAT</Text>
          <Text style={styles.blockValue}>{whatText}</Text>

          {event.event_link ? (
            <>
              <Text style={[styles.blockLabel, styles.blockLabelSpaced]}>Event link</Text>
              <Pressable onPress={() => event.event_link && RNLinking.openURL(event.event_link)}>
                <Text style={styles.eventLink}>{event.event_link}</Text>
              </Pressable>
            </>
          ) : null}
        </View>

        {/* Map section */}
        <View style={styles.mapSection}>
          {Platform.OS !== 'web' && !!region ? (
            <MapErrorBoundary
              fallback={
                <Pressable style={styles.mapPlaceholder} onPress={openNavigation}>
                  <Ionicons name="location" size={32} color={Blue.primary} />
                  <Text style={styles.mapPlaceholderText}>Tap to open in Maps</Text>
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
                  scrollEnabled={false}
                  zoomEnabled={false}
                  mapType="standard"
                >
                  {hasRealCoords && (
                    <Marker
                      coordinate={{ latitude: region.latitude, longitude: region.longitude }}
                      title={event.where}
                    />
                  )}
                </MapView>
              </View>
            </MapErrorBoundary>
          ) : region === null && event.where ? (
            <View style={styles.mapLoading}>
              <ActivityIndicator size="small" color={Blue.primary} />
              <Text style={styles.mapLoadingText}>Loading map…</Text>
            </View>
          ) : (
            <Pressable style={styles.mapPlaceholder} onPress={openNavigation}>
              <Ionicons name="location" size={32} color={Blue.primary} />
              <Text style={styles.mapPlaceholderText}>Tap to open in Maps</Text>
            </Pressable>
          )}

          {/* Location row: venue + get directions */}
          <Pressable style={styles.locationRow} onPress={openNavigation}>
            <Ionicons name="location-outline" size={20} color={Blue.text} />
            <View style={styles.locationTextWrap}>
              <Text style={styles.locationName}>{event.where}</Text>
              <Text style={styles.locationHint}>Tap for directions</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Blue.primary} />
          </Pressable>
        </View>
      </ScrollView>

      {/* Fixed bottom: I'm Interested button */}
      <View style={[styles.fixedBottom, { paddingBottom: 16 + insets.bottom }]}>
        {user && token ? (
          <Pressable
            style={[styles.interestedBtn, rsvpLoading && styles.interestedBtnDisabled]}
            onPress={() => (myRsvp?.status === 'interested' ? clearRsvp() : setInterested())}
            disabled={rsvpLoading}
          >
            <Ionicons
              name={myRsvp?.status === 'interested' ? 'star' : 'star-outline'}
              size={22}
              color="#fff"
            />
            <Text style={styles.interestedBtnText}>
              {myRsvp?.status === 'interested' ? "I'm Interested" : "I'm Interested"}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Blue.border,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0d1b2a',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  imageWrap: {
    width: '100%',
    height: 400,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  categoryPill: {
    position: 'absolute',
    top: 12,
    right: 16,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  categoryPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: Blue.primary,
  },
  blueBlock: {
    backgroundColor: Blue.primary,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  blockLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  blockLabelSpaced: {
    marginTop: 16,
  },
  blockValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 22,
  },
  eventLink: {
    fontSize: 16,
    color: '#fff',
    textDecorationLine: 'underline',
    lineHeight: 22,
  },
  interestedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 4,
    backgroundColor: '#fff',
  },
  interestedAvatarsWrap: {
    flex: 1,
    marginRight: 12,
  },
  interestedCount: {
    fontSize: 14,
    color: Blue.textSecondary,
    fontWeight: '500',
  },
  mapSection: {
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Blue.border,
  },
  mapWrapper: {
    width: '100%',
    height: 200,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapPlaceholder: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    gap: 8,
  },
  mapPlaceholderText: {
    fontSize: 14,
    color: Blue.textSecondary,
    fontWeight: '500',
  },
  mapLoading: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    gap: 8,
  },
  mapLoadingText: {
    fontSize: 14,
    color: Blue.textSecondary,
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    gap: 12,
  },
  locationTextWrap: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: Blue.text,
  },
  locationHint: {
    fontSize: 13,
    color: Blue.textSecondary,
    marginTop: 2,
  },
  fixedBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: Blue.border,
  },
  interestedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Blue.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  interestedBtnDisabled: {
    opacity: 0.6,
  },
  interestedBtnText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  error: {
    fontSize: 16,
    color: '#DC2626',
    marginBottom: 16,
  },
});
