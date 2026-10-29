import type { SafeAccount, UserRole } from '../auth/types';

export interface ContentWord { id?: string; english: string; vietnamese: string; acceptedAnswers?: string[] }
export interface ManagedContent {
  id: string; type: 'lesson' | 'announcement' | 'event'; title: string; description: string;
  body: string; words: ContentWord[]; status: 'draft' | 'published' | 'archived' | 'deleted';
  revision: number; createdAt: string; updatedAt: string; updatedBy: string;
}
export interface AuditEntry { id: string; actorEmail: string; action: string; target: string; detail: Record<string, unknown>; at: string }
export interface Invitation { email: string; role: UserRole; permissions: string[]; expiresAt: string; createdBy: string }
export interface Metadata { roles: Record<UserRole, { label: string; permissions: string[] }>; permissions: Record<string, string> }
export interface Overview {
  users: { total: number; active: number; admins: number } | null;
  content: { total: number; published: number; drafts: number } | null;
  activity: AuditEntry[];
}
export interface PageResult<T> { items: T[]; total: number; page: number }
export async function adminApi<T>(path: string, method = 'GET', data?: unknown): Promise<T> {
  const response = await fetch(`/api/admin${path}`, {
    method, credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(20_000),
    ...(data !== undefined ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) } : {}),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Không thể kết nối máy chủ quản trị.');
  return result as T;
}
export type AdminUser = SafeAccount & { permissions: string[]; updatedAt: string };
export const actionLabels: Record<string, string> = {
  'user.registered': 'Đăng ký tài khoản', 'user.login': 'Đăng nhập Google',
  'owner.configured': 'Thiết lập chủ quản trị', 'user.updated': 'Cập nhật người dùng / quyền',
  'user.sessions_revoked': 'Thu hồi phiên đăng nhập', 'invitation.created': 'Cấp quyền chờ theo email',
  'invitation.revoked': 'Hủy quyền chờ', 'content.created': 'Tạo nội dung', 'content.updated': 'Cập nhật nội dung',
  'content.deleted': 'Chuyển vào thùng rác', 'content.restored': 'Khôi phục nội dung',
};
