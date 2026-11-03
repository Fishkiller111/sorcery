import { apiFetch, getAuthToken, ApiError } from './client';
import { getApiBase } from '../constants/config';
import type {
  ConfirmMediaRatingReq,
  CreateRoleReq,
  CreateRoleResp,
  ExploreRoleDetailResp,
  ExploreRoleListResp,
  ExploreCategoryListResp,
  ExploreRoleCategory,
  GenerateRolePreviewReq,
  GenerateRolePreviewResp,
  PostListResp,
  RolePreviewMetaResp,
  RolePreviewRecordItem,
  PublishRoleResp,
  RoleCommentItem,
  RoleCommentLikeResp,
  RoleCommentListResp,
  RoleCommunityStats,
  RoleDetailResp,
  RoleLikeResp,
  RoleListResp,
  RoleItem,
  RoleMediaItem,
  RoleMediaListResp,
  RoleRevisionListResp,
  UnlockMediaResp,
  UnlockMediaBundleResp,
  UnlockGalleryResp,
  RoleMediaBundleListResp,
  RoleMediaBundleView,
  CreateRoleMediaBundleReq,
  UpdateRoleMediaBundleReq,
  GiftCatalogResp,
  SendGiftReq,
  SendGiftResp,
  UpdateRoleMediaReq,
  UpdateRoleEventsReq,
  UpdateRoleReq,
  UploadRoleAssetResp,
  UploadRoleMediaResp,
} from '../types/api';
import type { ChatImageUploadFile } from '../utils/pickChatImage';
import { isNativeUploadFile } from '../utils/pickChatImage';

export async function listRoles(params?: { page?: number; page_size?: number }): Promise<RoleListResp> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.page_size) qs.set('page_size', String(params.page_size));
  const query = qs.toString();
  return apiFetch<RoleListResp>(`/roles${query ? `?${query}` : ''}`);
}

/** Fetches every page (for screens that need the full role list). */
export async function listAllRoles(pageSize = 50): Promise<RoleItem[]> {
  const all: RoleItem[] = [];
  let page = 1;
  while (true) {
    const res = await listRoles({ page, page_size: pageSize });
    all.push(...res.roles);
    const totalPages = res.pagination?.total_pages ?? 1;
    if (page >= totalPages || res.roles.length === 0) break;
    page += 1;
  }
  return all;
}

export async function getRole(roleId: string): Promise<RoleDetailResp> {
  return apiFetch<RoleDetailResp>(`/roles/${roleId}`);
}

export async function createRole(req: CreateRoleReq): Promise<CreateRoleResp> {
  return apiFetch<CreateRoleResp>('/roles', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function updateRole(roleId: string, req: UpdateRoleReq): Promise<RoleDetailResp> {
  return apiFetch<RoleDetailResp>(`/roles/${roleId}`, {
    method: 'PUT',
    body: JSON.stringify(req),
  });
}

export async function deleteRole(roleId: string): Promise<void> {
  await apiFetch<void>(`/roles/${roleId}`, { method: 'DELETE' });
}

export async function publishRole(roleId: string): Promise<PublishRoleResp> {
  return apiFetch<PublishRoleResp>(`/roles/${roleId}/publish`, { method: 'POST' });
}

export async function unpublishRole(roleId: string): Promise<PublishRoleResp> {
  return apiFetch<PublishRoleResp>(`/roles/${roleId}/unpublish`, { method: 'POST' });
}

export async function listRoleRevisions(roleId: string): Promise<RoleRevisionListResp> {
  return apiFetch<RoleRevisionListResp>(`/roles/${roleId}/revisions`);
}

export async function restoreRoleRevision(roleId: string, version: number): Promise<RoleDetailResp> {
  return apiFetch<RoleDetailResp>(`/roles/${roleId}/revisions/${version}/restore`, {
    method: 'POST',
  });
}

export async function listExploreRoles(opts?: {
  q?: string;
  category_id?: string;
  page?: number;
  page_size?: number;
  /** When true (R18 chip off), Mature/r18 agents are omitted; R stays and ranks before standard. */
  exclude_mature?: boolean;
}): Promise<ExploreRoleListResp> {
  const params = new URLSearchParams();
  if (opts?.q?.trim()) params.set('q', opts.q.trim());
  if (opts?.category_id?.trim()) params.set('category_id', opts.category_id.trim());
  if (opts?.page) params.set('page', String(opts.page));
  if (opts?.page_size) params.set('page_size', String(opts.page_size));
  if (opts?.exclude_mature) params.set('exclude_mature', 'true');
  const qs = params.toString();
  return apiFetch<ExploreRoleListResp>(`/explore/roles${qs ? `?${qs}` : ''}`);
}

export async function listExploreCategories(): Promise<ExploreCategoryListResp> {
  return apiFetch<ExploreCategoryListResp>('/explore/categories');
}

/** Explore-display categories for agent editor (includes user-created tags). */
export async function listUserRoleCategories(): Promise<ExploreCategoryListResp> {
  return apiFetch<ExploreCategoryListResp>('/roles/categories');
}

export async function createUserRoleCategory(name: string): Promise<ExploreRoleCategory> {
  return apiFetch<ExploreRoleCategory>('/roles/categories', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function deleteUserRoleCategory(categoryId: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/roles/categories/${encodeURIComponent(categoryId)}`, {
    method: 'DELETE',
  });
}

export async function getExploreRoleDetail(roleId: string): Promise<ExploreRoleDetailResp> {
  return apiFetch<ExploreRoleDetailResp>(`/explore/roles/${roleId}`);
}

export async function recordRoleView(roleId: string, type: 'detail' | 'chat'): Promise<RoleCommunityStats> {
  return apiFetch<RoleCommunityStats>(`/explore/roles/${roleId}/view`, {
    method: 'POST',
    body: JSON.stringify({ type }),
  });
}

export async function likeExploreRole(roleId: string): Promise<RoleLikeResp> {
  return apiFetch<RoleLikeResp>(`/explore/roles/${roleId}/like`, { method: 'POST' });
}

export async function unlikeExploreRole(roleId: string): Promise<RoleLikeResp> {
  return apiFetch<RoleLikeResp>(`/explore/roles/${roleId}/like`, { method: 'DELETE' });
}

export type RoleFollowResp = {
  followed: boolean;
  follower_count: number;
};

export async function followExploreRole(roleId: string): Promise<RoleFollowResp> {
  return apiFetch<RoleFollowResp>(`/explore/roles/${roleId}/follow`, { method: 'POST' });
}

export async function unfollowExploreRole(roleId: string): Promise<RoleFollowResp> {
  return apiFetch<RoleFollowResp>(`/explore/roles/${roleId}/follow`, { method: 'DELETE' });
}

export async function listRoleComments(
  roleId: string,
  page = 1,
  limit = 20,
  parentId?: string,
): Promise<RoleCommentListResp> {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (parentId) qs.set('parent_id', parentId);
  return apiFetch<RoleCommentListResp>(`/explore/roles/${roleId}/comments?${qs}`);
}

export async function createRoleComment(
  roleId: string,
  content: string,
  parentCommentId?: string,
): Promise<RoleCommentItem> {
  return apiFetch<RoleCommentItem>(`/explore/roles/${roleId}/comments`, {
    method: 'POST',
    body: JSON.stringify({
      content,
      ...(parentCommentId ? { parent_comment_id: parentCommentId } : {}),
    }),
  });
}

export async function deleteRoleComment(roleId: string, commentId: string): Promise<void> {
  await apiFetch<void>(`/explore/roles/${roleId}/comments/${commentId}`, { method: 'DELETE' });
}

export async function likeRoleComment(
  roleId: string,
  commentId: string,
): Promise<RoleCommentLikeResp> {
  return apiFetch<RoleCommentLikeResp>(`/explore/roles/${roleId}/comments/${commentId}/like`, {
    method: 'POST',
  });
}

export async function unlikeRoleComment(
  roleId: string,
  commentId: string,
): Promise<RoleCommentLikeResp> {
  return apiFetch<RoleCommentLikeResp>(`/explore/roles/${roleId}/comments/${commentId}/like`, {
    method: 'DELETE',
  });
}

/** `GET /api/v1/explore/roles/:id/media` */
export async function listExploreRoleMedia(
  roleId: string,
  page = 1,
  pageSize = 50,
): Promise<RoleMediaListResp> {
  const qs = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  return apiFetch<RoleMediaListResp>(
    `/explore/roles/${encodeURIComponent(roleId)}/media?${qs.toString()}`,
  );
}

/** `POST /api/v1/explore/roles/:id/media/unlock-all` */
export async function unlockExploreRoleGallery(
  roleId: string,
): Promise<UnlockGalleryResp> {
  return apiFetch<UnlockGalleryResp>(
    `/explore/roles/${encodeURIComponent(roleId)}/media/unlock-all`,
    { method: 'POST' },
  );
}

/** `POST /api/v1/explore/roles/:id/media/:media_id/unlock` */
export async function unlockExploreRoleMedia(
  roleId: string,
  mediaId: string,
): Promise<UnlockMediaResp> {
  return apiFetch<UnlockMediaResp>(
    `/explore/roles/${encodeURIComponent(roleId)}/media/${encodeURIComponent(mediaId)}/unlock`,
    { method: 'POST' },
  );
}

/** `GET /api/v1/explore/roles/:id/media-bundles` */
export async function listExploreRoleMediaBundles(
  roleId: string,
): Promise<RoleMediaBundleListResp> {
  return apiFetch<RoleMediaBundleListResp>(
    `/explore/roles/${encodeURIComponent(roleId)}/media-bundles`,
  );
}

/** `POST /api/v1/explore/roles/:id/media-bundles/:bundle_id/unlock` */
export async function unlockExploreRoleMediaBundle(
  roleId: string,
  bundleId: string,
): Promise<UnlockMediaBundleResp> {
  return apiFetch<UnlockMediaBundleResp>(
    `/explore/roles/${encodeURIComponent(roleId)}/media-bundles/${encodeURIComponent(bundleId)}/unlock`,
    { method: 'POST' },
  );
}

/** `GET /api/v1/explore/roles/:id/posts` */
export async function listExploreRolePosts(
  roleId: string,
  page = 1,
  pageSize = 20,
): Promise<PostListResp> {
  const qs = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  return apiFetch<PostListResp>(
    `/explore/roles/${encodeURIComponent(roleId)}/posts?${qs.toString()}`,
  );
}

/** `GET /api/v1/explore/roles/:id/gifts/catalog` */
export async function getExploreGiftCatalog(roleId: string): Promise<GiftCatalogResp> {
  return apiFetch<GiftCatalogResp>(
    `/explore/roles/${encodeURIComponent(roleId)}/gifts/catalog`,
  );
}

/** `POST /api/v1/explore/roles/:id/gifts` */
export async function sendExploreGift(
  roleId: string,
  req: SendGiftReq,
): Promise<SendGiftResp> {
  return apiFetch<SendGiftResp>(`/explore/roles/${encodeURIComponent(roleId)}/gifts`, {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function updateRoleEvents(roleId: string, req: UpdateRoleEventsReq): Promise<RoleDetailResp> {
  return apiFetch<RoleDetailResp>(`/roles/${roleId}/events`, {
    method: 'PUT',
    body: JSON.stringify(req),
  });
}

export function generateRolePreview(req: GenerateRolePreviewReq) {
  return apiFetch<GenerateRolePreviewResp>('/roles/preview-figure', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export function getRolePreviewMeta() {
  return apiFetch<RolePreviewMetaResp>('/roles/preview-figure/meta');
}

export function getRolePreviewRecord(recordId: string) {
  return apiFetch<RolePreviewRecordItem>(`/roles/preview-figure/records/${encodeURIComponent(recordId)}`);
}

export async function uploadRoleAsset(
  kind: 'figure' | 'avatar' | 'background',
  file: ChatImageUploadFile | Blob | File,
  filename: string,
): Promise<UploadRoleAssetResp> {
  const token = getAuthToken();
  const form = new FormData();
  form.append('kind', kind);
  if (isNativeUploadFile(file)) {
    form.append('file', {
      uri: file.uri,
      name: file.name || filename,
      type: file.type || 'application/octet-stream',
    } as unknown as Blob);
  } else {
    form.append('file', file as Blob, filename);
  }

  const res = await fetch(`${getApiBase()}/roles/assets`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });

  if (res.status === 401) {
    throw new ApiError('Unauthorized', 401);
  }

  if (!res.ok) {
    let message = `Upload failed (${res.status})`;
    let code: string | undefined;
    try {
      const errBody = await res.json();
      if (errBody.message) message = errBody.message;
      if (errBody.error_code) code = errBody.error_code;
      else if (errBody.code) code = errBody.code;
    } catch {
      // ignore
    }
    throw new ApiError(message, res.status, code);
  }

  return (await res.json()) as UploadRoleAssetResp;
}

/** `GET /api/v1/roles/:id/media` — owner library (includes drafts). */
export async function listRoleMedia(
  roleId: string,
  page = 1,
  pageSize = 10,
): Promise<RoleMediaListResp> {
  const qs = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  return apiFetch<RoleMediaListResp>(
    `/roles/${encodeURIComponent(roleId)}/media?${qs.toString()}`,
  );
}

/** `POST /api/v1/roles/:id/media/upload` — multipart; creates a draft row. */
export async function uploadRoleMedia(
  roleId: string,
  file: ChatImageUploadFile | Blob | File,
  filename: string,
): Promise<UploadRoleMediaResp> {
  const token = getAuthToken();
  const form = new FormData();
  if (isNativeUploadFile(file)) {
    form.append('file', {
      uri: file.uri,
      name: file.name || filename,
      type: file.type || 'application/octet-stream',
    } as unknown as Blob);
  } else {
    form.append('file', file as Blob, filename);
  }

  const res = await fetch(`${getApiBase()}/roles/${encodeURIComponent(roleId)}/media/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });

  if (res.status === 401) {
    throw new ApiError('Unauthorized', 401);
  }
  if (!res.ok) {
    let message = `Upload failed (${res.status})`;
    let code: string | undefined;
    try {
      const errBody = await res.json();
      if (errBody.message) message = errBody.message;
      if (errBody.error_code) code = errBody.error_code;
      else if (errBody.code) code = errBody.code;
    } catch {
      // ignore
    }
    throw new ApiError(message, res.status, code);
  }
  return (await res.json()) as UploadRoleMediaResp;
}

/** `PUT /api/v1/roles/:id/media/:media_id` */
export async function updateRoleMedia(
  roleId: string,
  mediaId: string,
  req: UpdateRoleMediaReq,
): Promise<RoleMediaItem> {
  return apiFetch<RoleMediaItem>(
    `/roles/${encodeURIComponent(roleId)}/media/${encodeURIComponent(mediaId)}`,
    { method: 'PUT', body: JSON.stringify(req) },
  );
}

/** `POST /api/v1/roles/:id/media/:media_id/publish` */
export async function publishRoleMedia(roleId: string, mediaId: string): Promise<RoleMediaItem> {
  return apiFetch<RoleMediaItem>(
    `/roles/${encodeURIComponent(roleId)}/media/${encodeURIComponent(mediaId)}/publish`,
    { method: 'POST' },
  );
}

/** `POST /api/v1/roles/:id/media/:media_id/archive` */
export async function archiveRoleMedia(roleId: string, mediaId: string): Promise<RoleMediaItem> {
  return apiFetch<RoleMediaItem>(
    `/roles/${encodeURIComponent(roleId)}/media/${encodeURIComponent(mediaId)}/archive`,
    { method: 'POST' },
  );
}

/** `DELETE /api/v1/roles/:id/media/:media_id` */
export async function deleteRoleMedia(roleId: string, mediaId: string): Promise<void> {
  await apiFetch<void>(
    `/roles/${encodeURIComponent(roleId)}/media/${encodeURIComponent(mediaId)}`,
    { method: 'DELETE' },
  );
}

/** `POST /api/v1/roles/:id/media/:media_id/confirm-rating` */
export async function confirmRoleMediaRating(
  roleId: string,
  mediaId: string,
  req: ConfirmMediaRatingReq,
): Promise<RoleMediaItem> {
  return apiFetch<RoleMediaItem>(
    `/roles/${encodeURIComponent(roleId)}/media/${encodeURIComponent(mediaId)}/confirm-rating`,
    { method: 'POST', body: JSON.stringify(req) },
  );
}

/** `GET /api/v1/roles/:id/media-bundles` */
export async function listRoleMediaBundles(roleId: string): Promise<RoleMediaBundleListResp> {
  return apiFetch<RoleMediaBundleListResp>(
    `/roles/${encodeURIComponent(roleId)}/media-bundles`,
  );
}

/** `POST /api/v1/roles/:id/media-bundles` */
export async function createRoleMediaBundle(
  roleId: string,
  req: CreateRoleMediaBundleReq,
): Promise<RoleMediaBundleView> {
  return apiFetch<RoleMediaBundleView>(`/roles/${encodeURIComponent(roleId)}/media-bundles`, {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

/** `PUT /api/v1/roles/:id/media-bundles/:bundle_id` */
export async function updateRoleMediaBundle(
  roleId: string,
  bundleId: string,
  req: UpdateRoleMediaBundleReq,
): Promise<RoleMediaBundleView> {
  return apiFetch<RoleMediaBundleView>(
    `/roles/${encodeURIComponent(roleId)}/media-bundles/${encodeURIComponent(bundleId)}`,
    { method: 'PUT', body: JSON.stringify(req) },
  );
}

/** `POST /api/v1/roles/:id/media-bundles/:bundle_id/publish` */
export async function publishRoleMediaBundle(
  roleId: string,
  bundleId: string,
): Promise<RoleMediaBundleView> {
  return apiFetch<RoleMediaBundleView>(
    `/roles/${encodeURIComponent(roleId)}/media-bundles/${encodeURIComponent(bundleId)}/publish`,
    { method: 'POST' },
  );
}

/** `POST /api/v1/roles/:id/media-bundles/:bundle_id/archive` */
export async function archiveRoleMediaBundle(
  roleId: string,
  bundleId: string,
): Promise<RoleMediaBundleView> {
  return apiFetch<RoleMediaBundleView>(
    `/roles/${encodeURIComponent(roleId)}/media-bundles/${encodeURIComponent(bundleId)}/archive`,
    { method: 'POST' },
  );
}

/** `DELETE /api/v1/roles/:id/media-bundles/:bundle_id` */
export async function deleteRoleMediaBundle(roleId: string, bundleId: string): Promise<void> {
  await apiFetch<void>(
    `/roles/${encodeURIComponent(roleId)}/media-bundles/${encodeURIComponent(bundleId)}`,
    { method: 'DELETE' },
  );
}
