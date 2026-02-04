import { getAvatarDataUri } from '@/lib/api';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Blue } from '@/constants/theme';

const MAX_AVATARS = 8;
const AVATAR_SIZE = 36;
const OVERLAP = 10;

type Rsvp = { user_id: string; name: string | null; status: string };

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function getInitial(name: string | null, userId: string): string {
  if (name?.trim()) return name.trim().charAt(0).toUpperCase();
  return '?';
}

export function InterestedAvatars({
  rsvps = [],
  token,
}: {
  rsvps: Rsvp[];
  token: string | null;
}) {
  const interested = useMemo(
    () => rsvps.filter((r) => r.status === 'interested'),
    [rsvps]
  );
  const totalCount = interested.length;
  const toShow = useMemo(
    () => shuffle(interested).slice(0, MAX_AVATARS),
    [interested]
  );
  const [uris, setUris] = useState<Record<string, string | null>>({});

  const fetchAvatars = useCallback(async () => {
    if (!token || toShow.length === 0) return;
    const next: Record<string, string | null> = {};
    await Promise.all(
      toShow.map(async (r) => {
        const uri = await getAvatarDataUri(r.user_id, token);
        next[r.user_id] = uri;
      })
    );
    setUris((prev) => ({ ...prev, ...next }));
  }, [token, toShow]);

  useEffect(() => {
    fetchAvatars();
  }, [fetchAvatars]);

  if (totalCount === 0) return null;

  return (
    <View style={styles.row}>
      {toShow.map((r, i) => (
        <View
          key={r.user_id}
          style={[
            styles.avatarWrap,
            {
              marginLeft: i === 0 ? 0 : -OVERLAP,
              zIndex: toShow.length - i,
            },
          ]}
        >
          {uris[r.user_id] ? (
            <Image
              source={{ uri: uris[r.user_id]! }}
              style={styles.avatar}
              accessibilityLabel={r.name ?? 'Interested user'}
            />
          ) : (
            <View style={[styles.avatar, styles.placeholder]}>
              <Text style={styles.initial}>{getInitial(r.name, r.user_id)}</Text>
            </View>
          )}
        </View>
      ))}
      <View
        style={[
          styles.avatarWrap,
          styles.countWrap,
          { marginLeft: toShow.length > 0 ? -OVERLAP : 0, zIndex: 0 },
        ]}
      >
        <Text style={styles.countText} numberOfLines={1} adjustsFontSizeToFit>
          +{totalCount}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  avatarWrap: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: Blue.border,
    borderWidth: 2,
    borderColor: Blue.surface,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: AVATAR_SIZE - 4,
    height: AVATAR_SIZE - 4,
    borderRadius: (AVATAR_SIZE - 4) / 2,
  },
  placeholder: {
    backgroundColor: Blue.muted,
  },
  initial: {
    fontSize: 14,
    fontWeight: '600',
    color: Blue.surface,
  },
  countWrap: {
    backgroundColor: Blue.textSecondary,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: Blue.surface,
  },
});
