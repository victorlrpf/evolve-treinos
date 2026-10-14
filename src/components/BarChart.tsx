import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { ChartPoint } from '../utils/helpers';

const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n)));

export function BarChart({
  data,
  height = 130,
  formatValue = compact,
}: {
  data: ChartPoint[];
  height?: number;
  formatValue?: (n: number) => string;
}) {
  const { colors } = useTheme();
  const max = Math.max(...data.map((d) => d.value), 1);
  const usable = height - 18;

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height, gap: 8 }}>
        {data.map((d, i) => {
          const barHeight = d.value > 0 ? Math.max((d.value / max) * usable, 6) : 4;
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
              <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 3 }}>
                {d.value > 0 ? formatValue(d.value) : ''}
              </Text>
              <View
                style={{
                  width: '100%',
                  maxWidth: 30,
                  height: barHeight,
                  borderRadius: 6,
                  backgroundColor: d.value > 0 ? colors.primary : colors.border,
                }}
              />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
        {data.map((d, i) => (
          <Text
            key={i}
            style={{ flex: 1, textAlign: 'center', fontSize: 11, color: colors.textMuted }}
          >
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}
