import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { DISPLAY, MONO, NeonText } from '@/features/arcade/neon';
import { dayKey, lastDays, streak } from '@/features/daily/daily';
import { haptic } from '@/lib/haptics';
import { useDaily } from '@/lib/daily';

const CYAN = '#22e3ff';
const PINK = '#ff4fd8';
const weekday = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'narrow' });

/**
 * Today's tower on the cabinet wall: the same Stack for everyone today, one attempt, and the
 * week of days played under it, so a streak is something you can see.
 */
export function DailyCard() {
  const history = useDaily((s) => s.history);
  const today = dayKey();
  const played = history[today];
  const days = lastDays(today);
  const run = streak(history, today);
  const date = new Date(`${today}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase();

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={
        played === undefined
          ? `Daily tower, ${date}. Not played yet. ${run}-day streak.`
          : `Daily tower, ${date}. Built today: ${played}. ${run}-day streak.`
      }
      onPress={() => {
        haptic.light();
        router.push({ pathname: '/play/[game]', params: { game: 'stack', daily: '1' } });
      }}
      style={({ pressed }) => ({
        borderRadius: 22,
        borderWidth: 1.5,
        borderColor: `${CYAN}aa`,
        backgroundColor: '#120824',
        padding: 14,
        gap: 10,
        transform: [{ scale: pressed ? 0.98 : 1 }],
        boxShadow: `0 0 ${pressed ? 26 : 16}px ${CYAN}55`,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <NeonText colour={PINK} size={20}>
          DAILY TOWER
        </NeonText>
        <Text style={{ fontFamily: MONO, fontSize: 11, color: '#ffd23f', borderWidth: 1, borderColor: '#ffd23f88', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
          {date}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
        {played === undefined ? (
          <Text style={{ fontSize: 14, color: '#f4ecff' }}>Same tower for everyone today · one attempt</Text>
        ) : (
          <>
            <Text style={{ fontFamily: DISPLAY, fontSize: 26, color: CYAN }}>{played}</Text>
            <Text style={{ fontSize: 13, color: '#d9cdf0' }}>built today · back at midnight</Text>
          </>
        )}
      </View>
      <View style={{ flexDirection: 'row', gap: 5 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {days.map((day) => {
          const done = day in history;
          const isToday = day === today;
          return (
            <View
              key={day}
              style={{
                flex: 1,
                height: 24,
                borderRadius: 6,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: isToday ? PINK : done ? CYAN : `${CYAN}44`,
                backgroundColor: done ? `${CYAN}33` : 'transparent',
              }}
            >
              <Text style={{ fontFamily: MONO, fontSize: 10, color: isToday ? PINK : done ? CYAN : '#a99bc4' }}>{weekday(day)}</Text>
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: MONO, fontSize: 11, color: '#a99bc4' }}>{run ? `${run}-day streak` : 'start a streak'}</Text>
        <Text style={{ fontFamily: DISPLAY, fontSize: 13, color: played === undefined ? CYAN : '#a99bc4' }}>
          {played === undefined ? 'PLAY TODAY ›' : 'SEE TODAY ›'}
        </Text>
      </View>
    </Pressable>
  );
}
