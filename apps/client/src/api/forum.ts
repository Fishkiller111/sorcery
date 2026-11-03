import { apiFetch } from './client';
import type { CreateForumPostReq, ForumBoardSlug, ForumBoardsResp, PostItem, PostLikeResp, PostListResp } from '../types/api';
import { FORUM_ENABLED } from '../constants/platformFeatures';

function assertForumEnabled(): void {
  if (!FORUM_ENABLED) {
    throw new Error('Forum is available on web only');
  }
}

/** `GET /api/v1/community/forum/boards` */
export async function getForumBoards(): Promise<ForumBoardsResp> {
  assertForumEnabled();
  return apiFetch<ForumBoardsResp>('/community/forum/boards');
}

/** `GET /api/v1/community/forum/feed` */
export async function getForumFeed(params: {
  board: ForumBoardSlug;
  page?: number;
  page_size?: number;
  q?: string;
}): Promise<PostListResp> {
  assertForumEnabled();
  const qs = new URLSearchParams();
  qs.set('board', params.board);
  if (params.page) qs.set('page', String(params.page));
  if (params.page_size) qs.set('page_size', String(params.page_size));
  const q = params.q?.trim();
  if (q) qs.set('q', q);
  return apiFetch<PostListResp>(`/community/forum/feed?${qs.toString()}`);
}

/** `POST /api/v1/community/forum/posts` — personal identity */
export async function createForumPost(req: CreateForumPostReq): Promise<PostItem> {
  assertForumEnabled();
  return apiFetch<PostItem>('/community/forum/posts', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

/** `POST /api/v1/community/forum/roles/:id/posts` — Agent identity */
export async function createForumRolePost(roleId: string, req: CreateForumPostReq): Promise<PostItem> {
  assertForumEnabled();
  return apiFetch<PostItem>(`/community/forum/roles/${encodeURIComponent(roleId)}/posts`, {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

/** `POST /api/v1/community/forum/posts/:post_id/comments/:comment_id/like` */
export async function likeForumComment(postId: string, commentId: string): Promise<PostLikeResp> {
  assertForumEnabled();
  return apiFetch<PostLikeResp>(
    `/community/forum/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}/like`,
    { method: 'POST' },
  );
}

/** `DELETE /api/v1/community/forum/posts/:post_id/comments/:comment_id/like` */
export async function unlikeForumComment(postId: string, commentId: string): Promise<PostLikeResp> {
  assertForumEnabled();
  return apiFetch<PostLikeResp>(
    `/community/forum/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}/like`,
    { method: 'DELETE' },
  );
}
