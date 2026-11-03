import type { GalleryBranchDef, GalleryCellDef } from '../constants/storyGalleryCatalog';
import type { StoryGalleryItem } from '../types/story';
import { resolveStoryImageSource } from './assets';
import { resolveLocalized } from '../i18n/utils';
import type { Lang } from '../i18n/types';

export interface GalleryCellView {
  id: string;
  label: string;
  unlocked: boolean;
  hasImage: boolean;
  imageSource?: ReturnType<typeof resolveStoryImageSource>;
  isMature: boolean;
}

export interface GalleryBranchView {
  id: string;
  type: GalleryBranchDef['type'];
  title: string;
  subtitle: string;
  unlocked: boolean;
  collectedCount: number;
  totalImageCells: number;
  cells: GalleryCellView[];
}

function pickPresetImage(
  cell: GalleryCellDef,
  matureEnabled: boolean,
): { path?: string; isMature: boolean } {
  if (matureEnabled && cell.matureImage) {
    return { path: cell.matureImage, isMature: true };
  }
  if (cell.standardImage) {
    return { path: cell.standardImage, isMature: false };
  }
  if (cell.matureImage) {
    return { path: cell.matureImage, isMature: true };
  }
  return { path: undefined, isMature: false };
}

function galleryItemForCell(items: StoryGalleryItem[], cellId: string): StoryGalleryItem | undefined {
  return items.find((i) => i.branch_id === cellId);
}

export function buildBranchViews(
  branches: GalleryBranchDef[],
  flags: Record<string, boolean>,
  galleryItems: StoryGalleryItem[],
  lang: Lang,
  matureEnabled: boolean,
): GalleryBranchView[] {
  return branches.map((branch) => {
    const unlocked = !!flags[branch.seenFlag];
    const cells: GalleryCellView[] = branch.cells.map((cell) => {
      const label = cell.label ? resolveLocalized(cell.label, lang) : cell.id;
      const preset = pickPresetImage(cell, matureEnabled);
      const remote = galleryItemForCell(galleryItems, cell.id);
      const remotePath = remote?.image_url;
      const imagePath = remotePath || preset.path;
      const imageSource = imagePath ? resolveStoryImageSource(imagePath) : undefined;
      const hasImage = !!imagePath;
      const isMature = remote?.content_tier === 'mature' || preset.isMature;

      return {
        id: cell.id,
        label,
        unlocked,
        hasImage,
        imageSource,
        isMature,
      };
    });

    const imageCells = cells.filter((c) => c.hasImage);
    const collectedCount = unlocked ? imageCells.length : 0;

    return {
      id: branch.id,
      type: branch.type,
      title: resolveLocalized(branch.title, lang),
      subtitle: branch.subtitle ? resolveLocalized(branch.subtitle, lang) : '',
      unlocked,
      collectedCount,
      totalImageCells: imageCells.length,
      cells,
    };
  });
}
