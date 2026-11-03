import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { getRoleGridContainerStyle } from '../../utils/roleGrid';

type RoleGridContainerProps = {
  numColumns: number;
  availableWidth: number;
  gap: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function RoleGridContainer({
  numColumns,
  availableWidth,
  gap,
  children,
  style,
}: RoleGridContainerProps) {
  return (
    <View style={[getRoleGridContainerStyle(numColumns, gap, availableWidth), style]}>
      {children}
    </View>
  );
}
