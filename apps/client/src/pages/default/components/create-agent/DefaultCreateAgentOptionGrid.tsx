import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';

const GAP = 12;
const CARD_WIDTH = 150;
const LARGE_CARD_MIN = 220;

function nativeColStyle(columns: number): object {
  // Leave room for `gap` between equals-width columns.
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

type DefaultCreateAgentOptionGridProps = {
  children: React.ReactNode;
  large?: boolean;
  nativeColumns?: number;
};

export function DefaultCreateAgentOptionGrid({
  children,
  large = false,
  nativeColumns,
}: DefaultCreateAgentOptionGridProps) {
  const isWeb = Platform.OS === 'web';
  const minWidth = large ? LARGE_CARD_MIN : CARD_WIDTH;
  const nativeColumnStyle =
    nativeColumns && nativeColumns > 1 ? nativeColStyle(nativeColumns) : undefined;

  const webGridStyle =
    isWeb &&
    ({
      display: 'grid',
      gridTemplateColumns:
        nativeColumns && nativeColumns > 1
          ? `repeat(${nativeColumns}, minmax(0, 1fr))`
          : large
            ? `repeat(auto-fit, minmax(${LARGE_CARD_MIN}px, 1fr))`
            : `repeat(auto-fit, minmax(${CARD_WIDTH}px, 1fr))`,
      justifyContent: 'center',
    } as object);

  return (
    <View style={[styles.grid, webGridStyle]}>
      {isWeb
        ? children
        : React.Children.map(children, (child) =>
            React.isValidElement(child)
              ? React.cloneElement(child as React.ReactElement<{ style?: object }>, {
                  style:
                    nativeColumnStyle != null
                      ? nativeColumnStyle
                      : { width: minWidth, maxWidth: '100%', flexGrow: large ? 1 : 0 },
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
    marginBottom: 12,
    justifyContent: 'center',
    width: '100%',
  },
});
