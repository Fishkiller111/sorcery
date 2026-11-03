import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';

const GAP = 10;
const CARD_WIDTH = 150;

function nativeColStyle(columns: number): object {
  const pct =
    columns === 4 ? '23%' : columns === 3 ? '31%' : columns === 2 ? '48%' : '100%';
  return {
    flexBasis: pct,
    width: pct,
    maxWidth: pct,
    flexGrow: 0,
    flexShrink: 0,
    minWidth: 0,
  };
}

type OptionGridProps = {
  children: React.ReactNode;
  /** Force N equal columns on native + CSS grid on web. */
  columns?: number;
};

export function OptionGrid({ children, columns }: OptionGridProps) {
  const isWeb = Platform.OS === 'web';
  const forcedCols = columns && columns > 1 ? columns : undefined;

  return (
    <View
      style={[
        styles.grid,
        isWeb &&
          ({
            display: 'grid',
            gridTemplateColumns: forcedCols
              ? `repeat(${forcedCols}, minmax(0, 1fr))`
              : `repeat(auto-fit, minmax(${CARD_WIDTH}px, 1fr))`,
            justifyContent: 'center',
          } as object),
      ]}
    >
      {isWeb
        ? children
        : React.Children.map(children, (child) =>
            React.isValidElement(child)
              ? React.cloneElement(child as React.ReactElement<{ style?: object }>, {
                  style: forcedCols
                    ? nativeColStyle(forcedCols)
                    : { width: CARD_WIDTH, maxWidth: CARD_WIDTH, flexGrow: 0 },
                })
              : child,
          )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
    marginBottom: 8,
    justifyContent: 'center',
    width: '100%',
  },
});
