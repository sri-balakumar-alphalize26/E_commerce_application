import { Pressable, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { OrderLine, TimelineStep } from '../api/types';
import { money } from '../lib/format';
import { neutral, PAD, useTheme } from '../theme/tokens';
import { Photo } from './product';
import { T } from './T';

/** The steps an order goes through, the done ones green and the current one lit. */
export function Timeline({ steps }: { steps: TimelineStep[] }) {
  const t = useTheme();
  return (
    <View style={{ backgroundColor: neutral.sur, paddingHorizontal: PAD, paddingTop: 10, paddingBottom: 6 }}>
      {steps.map((step, i) => {
        const lit = step.state !== 'todo';
        return (
          <View key={step.label} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingTop: 4, paddingBottom: 10 }}>
            {i < steps.length - 1 ? (
              <View style={{ position: 'absolute', left: 4.75, top: 16, bottom: -2, width: 1.5, backgroundColor: neutral.ln }} />
            ) : null}
            <View
              style={{
                width: 11,
                height: 11,
                borderRadius: 6,
                marginTop: 3,
                backgroundColor: step.state === 'done' ? neutral.green : step.state === 'cur' ? t.acc : neutral.ln,
                boxShadow: step.state === 'cur' ? `0 0 0 3px ${t.accSoft}` : undefined,
              }}
            />
            <T w={500} s={12} c={lit ? neutral.ink : neutral.mut} style={{ flex: 1 }}>
              {step.label}
            </T>
            <T s={11} c={neutral.mut} tabular>
              {step.time}
            </T>
          </View>
        );
      })}
    </View>
  );
}

/** One row of an order's contents: thumbnail, name, quantity and price. */
export function OrderLineRow({ line, size = 48, showMode, onReview }: { line: OrderLine; size?: number; showMode?: boolean; onReview?: () => void }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 10, paddingVertical: 8, paddingHorizontal: PAD, borderBottomWidth: 1, borderBottomColor: neutral.ln }}>
      <Photo
        source={line.image}
        style={{ width: size, height: size, borderWidth: 1, borderColor: neutral.ln, borderRadius: 8, padding: 5, backgroundColor: '#fff' }}
      />
      <View style={{ flex: 1, minWidth: 0, justifyContent: 'center', gap: 3 }}>
        <T s={12} numberOfLines={1}>
          {line.name}
        </T>
        <T s={10.5} c={neutral.mut}>
          Qty {line.qty} · {money(line.price)}
          {showMode ? ` · ${line.mode === 'quick' ? 'Quick' : 'Express'}` : ''}
        </T>
      </View>
      {onReview ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Review ${line.name}`} hitSlop={8} onPress={onReview} style={{ justifyContent: 'center' }}>
          <T w={600} s={11.5} c={t.accInk}>
            Review
          </T>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * The design's sketch of the rider's route, shop to door. A drawing, not a
 * map: it is shown only while an order carries a rider.
 */
export function RouteSketch() {
  const t = useTheme();
  const xml = `<svg viewBox="0 0 360 180"><rect width="360" height="180" fill="#eef1ee"/><g fill="#e2e7e1"><rect x="0" y="0" width="120" height="60"/><rect x="140" y="0" width="100" height="40"/><rect x="260" y="0" width="100" height="70"/><rect x="0" y="80" width="90" height="100"/><rect x="110" y="100" width="130" height="80"/><rect x="260" y="90" width="100" height="90"/></g><rect x="150" y="110" width="80" height="60" fill="#d8ead9"/><g stroke="#fff" stroke-width="10" fill="none" stroke-linecap="round"><path d="M-10 70h380"/><path d="M130 -10v200"/><path d="M250 -10v200"/><path d="M-10 90h150"/></g><g stroke="#fff" stroke-width="5" fill="none"><path d="M60 -10v80M190 40v150M300 70v110"/></g><path d="M40 80h90v-10h120v10h50" stroke="${t.acc}" stroke-width="3.5" fill="none" stroke-linejoin="round" stroke-linecap="round"/><g><circle cx="40" cy="80" r="9" fill="#fff" stroke="#6b7684" stroke-width="2"/><rect x="36" y="76" width="8" height="8" fill="#6b7684"/></g><g><circle cx="300" cy="80" r="9" fill="#fff" stroke="${t.acc}" stroke-width="2"/><path d="M296 83v-4l4-3 4 3v4z" fill="${t.acc}"/></g><circle cx="190" cy="70" r="13" fill="${t.acc}" fill-opacity=".18"/><circle cx="190" cy="70" r="6" fill="${t.acc}" stroke="#fff" stroke-width="2"/></svg>`;
  return (
    <View accessibilityLabel="The rider is between the store and your home" style={{ height: 180, backgroundColor: '#eef1ee', overflow: 'hidden' }}>
      <SvgXml xml={xml} width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />
      <T s={10} style={{ position: 'absolute', left: '6%', top: 96 }}>
        Store
      </T>
      <T s={10} style={{ position: 'absolute', right: '10%', top: 96 }}>
        Home
      </T>
    </View>
  );
}
