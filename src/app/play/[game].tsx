import { Redirect, useLocalSearchParams } from 'expo-router';

import { gameById } from '@/features/arcade/catalogue';
import { GameShell } from '@/features/arcade/GameShell';
import { dayKey, rulesFor } from '@/features/daily/daily';

export default function PlayScreen() {
  const { game, daily } = useLocalSearchParams<{ game: string; daily?: string }>();
  const meta = gameById(game);
  if (!meta) return <Redirect href="/" />;
  // ?daily=1 on Stack is today's tower; the day is the player's own calendar day.
  if (daily && meta.id === 'stack') {
    const day = dayKey();
    return <GameShell key={day} meta={meta} daily={{ day, rules: rulesFor(day) }} />;
  }
  return <GameShell meta={meta} />;
}
