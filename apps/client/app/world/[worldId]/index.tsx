import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { DefaultWorldDetailScreen } from '../../../src/pages/default/WorldDetail';
import { isSimulatorCatalogId } from '../../../src/utils/exploreCatalogNavigation';

export default function WorldHomeScreen() {
  const router = useRouter();
  const { worldId: rawWorldId } = useLocalSearchParams<{ worldId: string | string[] }>();
  const worldId = String(Array.isArray(rawWorldId) ? rawWorldId[0] : rawWorldId || '');

  useEffect(() => {
    if (isSimulatorCatalogId(worldId)) {
      router.replace(`/simulator/${worldId}`);
    }
  }, [router, worldId]);

  if (isSimulatorCatalogId(worldId)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <DefaultWorldDetailScreen worldId={worldId} />;
}
