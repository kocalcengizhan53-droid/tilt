import { Redirect, useLocalSearchParams } from 'expo-router';

import { gameById } from '@/features/arcade/catalogue';
import { GameShell } from '@/features/arcade/GameShell';

export default function PlayScreen() {
  const { game } = useLocalSearchParams<{ game: string }>();
  const meta = gameById(game);
  if (!meta) return <Redirect href="/" />;
  return <GameShell meta={meta} />;
}
