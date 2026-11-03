import { useLocalSearchParams } from 'expo-router';
import { ParallelSceneScreen } from '../../../src/components/scene/ParallelSceneScreen';

export default function ParallelSceneRoute() {
  const params = useLocalSearchParams();
  const sceneCode = Array.isArray(params.sceneCode) ? params.sceneCode[0] : params.sceneCode;
  const replay = Array.isArray(params.replay) ? params.replay[0] : params.replay;
  return <ParallelSceneScreen sceneCode={sceneCode || 's0_02'} replayEnter={replay === '1'} />;
}
