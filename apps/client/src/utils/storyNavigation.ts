import { useRouter } from 'expo-router';
type Router = ReturnType<typeof useRouter>;
import { sceneRoutePath } from '../constants/storyRegistry';

export const STORY_SCENE_AUTO_ADVANCE_MS = 1500;

export function resolveStorySceneRoute(sceneCode: string, sceneType?: string): string {
  const type = sceneType?.toLowerCase() === 'parallel' ? 'parallel' : sceneType || 'mixed';
  return sceneRoutePath(sceneCode, type);
}

export function navigateToNextStoryScene(
  router: Router,
  nextSceneCode?: string,
  nextSceneType?: string,
): void {
  if (!nextSceneCode) {
    router.replace('/story');
    return;
  }

  router.replace(resolveStorySceneRoute(nextSceneCode, nextSceneType) as never);
}
