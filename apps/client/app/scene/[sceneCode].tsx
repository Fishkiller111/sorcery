import { useLocalSearchParams } from 'expo-router';
import { SceneContainer } from '../../src/components/scene/SceneContainer';
import { getSceneConfig } from '../../src/constants/storyRegistry';

export default function DynamicSceneScreen() {
  const params = useLocalSearchParams();
  const sceneCode = Array.isArray(params.sceneCode) ? params.sceneCode[0] : params.sceneCode;
  const fresh = Array.isArray(params.fresh) ? params.fresh[0] : params.fresh;
  const replay = Array.isArray(params.replay) ? params.replay[0] : params.replay;
  const config = getSceneConfig(sceneCode || 's0_01');

  return (
    <SceneContainer
      config={config}
      forceNewEnter={fresh === '1'}
      replayEnter={replay === '1'}
    />
  );
}
