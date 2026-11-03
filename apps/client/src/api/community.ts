import { apiFetch, getAuthToken, ApiError } from './client';
import { getApiBase } from '../constants/config';
import type {
  CommunityFeedTab,
  CreatePostReq,
  PostItem,
  PostLikeResp,
  PostListResp,
  UploadPostMediaResp,
} from '../types/api';
import type { ChatImageUploadFile } from '../utils/pickChatImage';
import { isNativeUploadFile } from '../utils/pickChatImage';

/** `GET /api/v1/community/feed?tab=for_you|following&q=` */
export async function getCommunityFeed(params?: {
  tab?: CommunityFeedTab;
  page?: number;
  page_size?: number;
  /** Keyword search: content / agent name / author nickname */
  q?: string;
}): Promise<PostListResp> {
  const qs = new URLSearchParams();
  qs.set('tab', params?.tab ?? 'for_you');
  if (params?.page) qs.set('page', String(params.page));
  if (params?.page_size) qs.set('page_size', String(params.page_size));
  const q = params?.q?.trim();
  if (q) qs.set('q', q);
  return apiFetch<PostListResp>(`/community/feed?${qs.toString()}`);
}

/** `POST /api/v1/community/posts` — publish as the logged-in user (personal identity). */
export async function createMePost(req: CreatePostReq): Promise<PostItem> {
  return apiFetch<PostItem>('/community/posts', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

/** `POST /api/v1/roles/:id/posts` — publish as a owned published Agent. */
export async function createRolePost(roleId: string, req: CreatePostReq): Promise<PostItem> {
  return apiFetch<PostItem>(`/roles/${encodeURIComponent(roleId)}/posts`, {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

/** `GET /api/v1/roles/:id/posts` — owner list (all statuses except deleted). */
export async function listOwnerRolePosts(
  roleId: string,
  page = 1,
  pageSize = 20,
): Promise<PostListResp> {
  const qs = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  return apiFetch<PostListResp>(`/roles/${encodeURIComponent(roleId)}/posts?${qs.toString()}`);
}

/** `PUT /api/v1/roles/:id/posts/:post_id` — edit text; send `image_urls` to replace media. */
export async function updateRolePost(
  roleId: string,
  postId: string,
  req: CreatePostReq,
): Promise<PostItem> {
  return apiFetch<PostItem>(
    `/roles/${encodeURIComponent(roleId)}/posts/${encodeURIComponent(postId)}`,
    {
      method: 'PUT',
      body: JSON.stringify(req),
    },
  );
}

/** `POST /api/v1/roles/:id/posts/upload` — multipart image (jpg/png/webp) or video (mp4). */
export async function uploadRolePostMedia(
  roleId: string,
  file: ChatImageUploadFile | Blob | File,
  filename: string,
): Promise<UploadPostMediaResp> {
  return uploadPostMediaFile(
    `${getApiBase()}/roles/${encodeURIComponent(roleId)}/posts/upload`,
    file,
    filename,
  );
}

/** `POST /api/v1/community/posts/upload` — personal-identity post media. */
export async function uploadMePostMedia(
  file: ChatImageUploadFile | Blob | File,
  filename: string,
): Promise<UploadPostMediaResp> {
  return uploadPostMediaFile(`${getApiBase()}/community/posts/upload`, file, filename);
}

async function uploadPostMediaFile(
  url: string,
  file: ChatImageUploadFile | Blob | File,
  filename: string,
): Promise<UploadPostMediaResp> {
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

  const res = await fetch(url, {
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
  return (await res.json()) as UploadPostMediaResp;
}

/** `DELETE /api/v1/roles/:id/posts/:post_id` */
export async function deleteRolePost(roleId: string, postId: string): Promise<void> {
  await apiFetch(`/roles/${encodeURIComponent(roleId)}/posts/${encodeURIComponent(postId)}`, {
    method: 'DELETE',
  });
}

/** `GET /api/v1/community/posts/:post_id` */
export async function getCommunityPost(postId: string): Promise<PostItem> {
  return apiFetch<PostItem>(`/community/posts/${encodeURIComponent(postId)}`);
}

/** `POST /api/v1/community/posts/:post_id/like` */
export async function likeCommunityPost(postId: string): Promise<PostLikeResp> {
  return apiFetch<PostLikeResp>(`/community/posts/${encodeURIComponent(postId)}/like`, {
    method: 'POST',
  });
}

/** `DELETE /api/v1/community/posts/:post_id/like` */
export async function unlikeCommunityPost(postId: string): Promise<PostLikeResp> {
  return apiFetch<PostLikeResp>(`/community/posts/${encodeURIComponent(postId)}/like`, {
    method: 'DELETE',
  });
}

/** `GET /api/v1/community/posts/:post_id/comments` */
export async function listPostComments(
  postId: string,
  page = 1,
  pageSize = 50,
): Promise<import('../types/api').PostCommentListResp> {
  const qs = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  return apiFetch(`/community/posts/${encodeURIComponent(postId)}/comments?${qs.toString()}`);
}

/** `POST /api/v1/community/posts/:post_id/comments` */
export async function createPostComment(
  postId: string,
  content: string,
): Promise<import('../types/api').PostCommentItem> {
  return apiFetch(`/community/posts/${encodeURIComponent(postId)}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

/** `DELETE /api/v1/community/posts/:post_id/comments/:comment_id` */
export async function deletePostComment(postId: string, commentId: string): Promise<void> {
  await apiFetch(
    `/community/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`,
    { method: 'DELETE' },
  );
}

export type CommunityHotItem = {
  topic_id: string;
  title: string;
  summary?: string;
  rank: number;
  primary_source: string;
  source_url?: string;
  pinned?: boolean;
};

export type CommunityHotListResp = {
  items: CommunityHotItem[];
};

/** `GET /api/v1/community/hot` — public read-only trending list */
export async function getCommunityHot(): Promise<CommunityHotListResp> {
  return apiFetch<CommunityHotListResp>('/community/hot');
}

export type ContentReportReason =
  | 'spam'
  | 'harassment'
  | 'hate'
  | 'sexual'
  | 'illegal'
  | 'ip'
  | 'other';

/** `POST /api/v1/community/reports` — flag objectionable UGC (Guideline 1.2). */
export async function createContentReport(req: {
  target_type: 'post' | 'post_comment' | 'role' | 'user';
  target_id: string;
  reason_code: ContentReportReason;
  detail?: string;
}): Promise<{ report_id: string; status: string }> {
  return apiFetch('/community/reports', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

/** `POST /api/v1/community/blocks` — block user or agent (role) from a post; removes their posts from your feed. */
export async function blockCommunityUser(req: {
  user_id?: string;
  role_id?: string;
  post_id?: string;
  reason_code?: ContentReportReason | 'block';
  detail?: string;
}): Promise<{
  blocked: boolean;
  report_id?: string;
  blocked_user_id?: string;
  blocked_role_id?: string;
}> {
  return apiFetch('/community/blocks', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

/** `DELETE /api/v1/community/blocks/:user_id` */
export async function unblockCommunityUser(userId: string): Promise<void> {
  await apiFetch(`/community/blocks/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
}

/** `DELETE /api/v1/community/role-blocks/:role_id` */
export async function unblockCommunityRole(roleId: string): Promise<void> {
  await apiFetch(`/community/role-blocks/${encodeURIComponent(roleId)}`, {
    method: 'DELETE',
  });
}
