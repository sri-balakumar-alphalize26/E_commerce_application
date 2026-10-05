import { RefObject, useEffect, useRef } from 'react';
import { Dimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { create } from 'zustand';
import { Img } from '../api/types';
import { neutral } from '../theme/tokens';
import { Photo } from './product';

/**
 * The demo's "fly to cart": tapping Add sends the product's picture from the
 * button to the cart, so it is plain where it went.
 */

const FLIGHT_MS = 520;
const SIZE = 36;

interface Flight {
  id: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
  image?: Img;
}

const useFlights = create<{ flights: Flight[] }>(() => ({ flights: [] }));

/** Every cart mark on screen, oldest first. The newest one is on the screen in front. */
const targets: RefObject<View | null>[] = [];
let nextId = 1;

/** Marks a view as where things fly to: the cart button, the cart tab. */
export function useCartTarget(): RefObject<View | null> {
  const ref = useRef<View>(null);
  useEffect(() => {
    targets.push(ref);
    return () => {
      const at = targets.indexOf(ref);
      if (at >= 0) targets.splice(at, 1);
    };
  }, []);
  return ref;
}

/** Send a product's picture from `from` to the cart. Does nothing if either end cannot be found. */
export function flyToCart(from: View | null, image?: Img): void {
  if (!from) return;
  const { width, height } = Dimensions.get('window');

  from.measureInWindow((x, y, w, h) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    // The newest cart mark that is actually on screen: a tab that is not
    // showing still has its cart button, measuring nothing.
    const tryTarget = (index: number) => {
      const target = targets[index]?.current;
      if (index < 0) return;
      if (!target) return tryTarget(index - 1);
      target.measureInWindow((tx, ty, tw, th) => {
        const showing = tw > 0 && th > 0 && tx >= 0 && ty >= 0 && tx < width && ty < height;
        if (!showing) return tryTarget(index - 1);
        const flight: Flight = {
          id: nextId++,
          from: { x: x + w / 2, y: y + h / 2 },
          to: { x: tx + tw / 2, y: ty + th / 2 },
          image,
        };
        useFlights.setState((s) => ({ flights: [...s.flights, flight] }));
        setTimeout(() => useFlights.setState((s) => ({ flights: s.flights.filter((f) => f.id !== flight.id) })), FLIGHT_MS + 80);
      });
    };
    tryTarget(targets.length - 1);
  });
}

function Flyer({ flight }: { flight: Flight }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(1, { duration: FLIGHT_MS, easing: Easing.bezier(0.22, 0.61, 0.36, 1) });
  }, [progress]);

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    // A shallow arc: up a little before it comes down on the cart.
    const lift = Math.sin(p * Math.PI) * 44;
    return {
      opacity: 1 - 0.35 * p,
      transform: [
        { translateX: flight.from.x + (flight.to.x - flight.from.x) * p - SIZE / 2 },
        { translateY: flight.from.y + (flight.to.y - flight.from.y) * p - SIZE / 2 - lift },
        { scale: 1 - 0.55 * p },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: 0,
          top: 0,
          width: SIZE,
          height: SIZE,
          borderRadius: 8,
          backgroundColor: '#fff',
          borderWidth: 1,
          borderColor: neutral.ln,
          padding: 3,
          boxShadow: '0 4px 10px rgba(0,0,0,0.18)',
        },
        style,
      ]}>
      <Photo source={flight.image} style={{ flex: 1 }} />
    </Animated.View>
  );
}

/** Draws the flights over everything. Mounted once, at the root. */
export function FlyLayer() {
  const flights = useFlights((s) => s.flights);
  const still = useReducedMotion();
  if (still || !flights.length) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}>
      {flights.map((f) => (
        <Flyer key={f.id} flight={f} />
      ))}
    </View>
  );
}
