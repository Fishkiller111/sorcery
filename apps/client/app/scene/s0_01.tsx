import { useLocalSearchParams } from 'expo-router';
import { SceneContainer } from '../../src/components/scene/SceneContainer';
import { SCENE_S0_01 } from '../../src/data/s0_01/scene';
import { BeatId } from '../../src/engine/types';

export default function SceneS0_01() {
  const params = useLocalSearchParams();
  const beatParam = Array.isArray(params.beat) ? params.beat[0] : params.beat;
  const jumpToBeat = beatParam ? (beatParam as BeatId) : undefined;

  return <SceneContainer config={SCENE_S0_01} jumpToBeat={jumpToBeat} />;
}
