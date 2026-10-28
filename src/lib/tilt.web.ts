import { useEffect, useSyncExternalStore } from 'react';
import { useSharedValue, withSpring } from 'react-native-reanimated';

const FINE = '(pointer: fine)';
const subscribe = (notify: () => void) => {
  const mq = matchMedia(FINE);
  mq.addEventListener('change', notify);
  return () => mq.removeEventListener('change', notify);
};

/**
 * On the web the cabinet leans toward the pointer instead of the phone: where it sits in the
 * window, as two shared values in −1…1. Only for a mouse or trackpad; a touch screen has no
 * pointer to follow, and a browser's motion sensors need a permission prompt nobody wants.
 */
export function useTilt(enabled: boolean) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  // False in the exported HTML and on touch screens: the cards then render without the layers a
  // lean needs, so a phone hydrates the same light cabinet it always did.
  const fine = useSyncExternalStore(subscribe, () => matchMedia(FINE).matches, () => false);
  const live = enabled && fine;

  useEffect(() => {
    if (!live) return;
    const spring = { damping: 20, stiffness: 120 };
    const move = (e: PointerEvent) => {
      x.set(withSpring((e.clientX / innerWidth) * 2 - 1, spring));
      y.set(withSpring((e.clientY / innerHeight) * 2 - 1, spring));
    };
    const leave = () => {
      x.set(withSpring(0, spring));
      y.set(withSpring(0, spring));
    };
    addEventListener('pointermove', move);
    document.addEventListener('pointerleave', leave);
    return () => {
      removeEventListener('pointermove', move);
      document.removeEventListener('pointerleave', leave);
    };
  }, [live, x, y]);

  return { x, y, live };
}
