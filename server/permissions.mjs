export const PERMISSIONS = {
  'admin.access': 'Vào trang quản trị',
  'users.read': 'Xem danh sách người dùng',
  'users.manage': 'Khóa, mở khóa và thu hồi phiên đăng nhập',
  'roles.manage': 'Cấp vai trò và phân quyền',
  'content.read': 'Xem nội dung và bản nháp',
  'content.write': 'Tạo và chỉnh sửa nội dung',
  'content.publish': 'Xuất bản và gỡ xuất bản',
  'content.delete': 'Xóa vào thùng rác và khôi phục',
  'audit.read': 'Xem nhật ký quản trị',
};
export const ROLES = {
  owner: { label: 'Chủ quản trị', permissions: Object.keys(PERMISSIONS) },
  admin: { label: 'Quản trị viên', permissions: Object.keys(PERMISSIONS) },
  editor: { label: 'Biên tập viên', permissions: ['admin.access', 'content.read', 'content.write'] },
  moderator: { label: 'Kiểm duyệt viên', permissions: ['admin.access', 'users.read', 'users.manage', 'content.read', 'audit.read'] },
  player: { label: 'Người chơi', permissions: [] },
};
export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function requirePermission(user, permission) {
  if (!user || user.status !== 'active') throw new ApiError(401, 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập Google lại.');
  if (!user.permissions.includes('admin.access') || !user.permissions.includes(permission)) throw new ApiError(403, 'Bạn không có quyền thực hiện thao tác này.');
}
export function validateGrant(actor, role, permissions) {
  if (!ROLES[role] || role === 'owner') throw new ApiError(400, 'Không thể cấp vai trò chủ quản trị từ giao diện.');
  const selected = permissions ?? ROLES[role].permissions;
  if (!Array.isArray(selected) || selected.some(p => !Object.hasOwn(PERMISSIONS, p))) throw new ApiError(400, 'Danh sách quyền không hợp lệ.');
  if (actor.role !== 'owner' && selected.some(p => !actor.permissions.includes(p))) throw new ApiError(403, 'Bạn chỉ có thể cấp những quyền mình đang có.');
  if (selected.length && !selected.includes('admin.access')) throw new ApiError(400, 'Hãy bật quyền vào trang quản trị.');
  return [...new Set(selected)];
}
