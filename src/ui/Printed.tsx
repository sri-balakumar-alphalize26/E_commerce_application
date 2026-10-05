import { ReactNode, useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { neutral } from '../theme/tokens';

const PRINT_MS = 1500;

/**
 * The demo's receipt printer: what is inside feeds out of a slot, line by
 * line, the way a till prints a bill. It plays once, when the screen opens.
 */
export function Printed({ children }: { children: ReactNode }) {
  const still = useReducedMotion();
  const [height, setHeight] = useState(0);
  const fed = useSharedValue(still ? 1 : 0);

  useEffect(() => {
    if (!height || still) return;
    // In short steps rather than a glide: paper advances a line at a time.
    fed.value = withDelay(250, withTiming(1, { duration: PRINT_MS, easing: Easing.steps(18, true) }));
  }, [height, still, fed]);

  const style = useAnimatedStyle(() => ({
    opacity: height ? 1 : 0,
    transform: [{ translateY: (fed.value - 1) * height }],
  }));

  return (
    <View>
      <View style={{ height: 8, backgroundColor: neutral.ink, borderRadius: 4, marginHorizontal: 10, zIndex: 1 }} />
      <View style={{ overflow: 'hidden', marginTop: -4 }}>
        <Animated.View style={style} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
          {children}
        </Animated.View>
      </View>
    </View>
  );
}
