import { useCallback, useEffect, useMemo, useState } from "react";
import { KeyRound, Pencil, PlusCircle, ShieldAlert, ShieldCheck, Trash2, User, UserCheck, UserCog, Users } from "lucide-react";
import { Bi } from "../components/ui/Bi";
import { Modal } from "../components/ui/Overlays";
import { PageHeader } from "../components/ui/PageHeader";
import { useApp } from "../context/AppContext";
import { ROLES } from "../lib/constants";
import {
  createUserInSupabase,
  deleteUserFromSupabase,
  fetchUsersFromSupabase,
  updateUserInSupabase,
} from "../lib/supabase";
import { btnDanger, btnPrimary, btnSecondary, card, inputCls } from "../lib/styles";

export function AccountsPage() {
  const { role, user, pushToast, confirmAction, lang = "vi" } = useApp();
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({ username: "", password: "", name: "", role: ROLES.USER });
  const [addBusy, setAddBusy] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", role: ROLES.USER, newPassword: "" });
  const [editBusy, setEditBusy] = useState(false);

  const currentUsername = (typeof user === "object" && (user?.username || user?.name)) || user || "";

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const res = await fetchUsersFromSupabase();
    if (res.ok) {
      setUsersList(res.users || []);
    } else {
      pushToast(res.error || "Không thể tải danh sách tài khoản", "error");
    }
    setLoading(false);
  }, [pushToast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return usersList;
    return usersList.filter(
      (u) =>
        (u.username || "").toLowerCase().includes(q) ||
        (u.name || "").toLowerCase().includes(q) ||
        (u.role || "").toLowerCase().includes(q)
    );
  }, [usersList, search]);

  const adminCount = useMemo(() => usersList.filter((u) => u.role === ROLES.ADMIN).length, [usersList]);
  const userCount = useMemo(() => usersList.filter((u) => u.role === ROLES.USER).length, [usersList]);

  const handleOpenAdd = () => {
    setAddForm({ username: "", password: "", name: "", role: ROLES.USER });
    setAddModalOpen(true);
  };

  const handleCreateUser = async () => {
    if (!addForm.username.trim() || !addForm.password.trim()) {
      pushToast("Vui lòng nhập tên tài khoản và mật khẩu / 请输入用户名和密码", "error");
      return;
    }
    setAddBusy(true);
    const res = await createUserInSupabase(addForm);
    setAddBusy(false);
    if (res.ok) {
      pushToast(lang === "zh" ? "创建账号成功！" : "Tạo tài khoản thành công!", "success");
      setAddModalOpen(false);
      loadUsers();
    } else {
      pushToast(res.error || "Lỗi tạo tài khoản", "error");
    }
  };

  const handleOpenEdit = (target) => {
    setEditUser(target);
    setEditForm({
      name: target.name || "",
      role: target.role || ROLES.USER,
      newPassword: "",
    });
    setEditModalOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!editUser) return;
    setEditBusy(true);
    const updates = {
      name: editForm.name,
      role: editForm.role,
    };
    if (editForm.newPassword.trim()) {
      updates.password = editForm.newPassword.trim();
    }
    const res = await updateUserInSupabase(editUser.id, updates);
    setEditBusy(false);
    if (res.ok) {
      pushToast(lang === "zh" ? "更新账号成功！" : "Cập nhật tài khoản thành công!", "success");
      setEditModalOpen(false);
      setEditUser(null);
      loadUsers();
    } else {
      pushToast(res.error || "Lỗi cập nhật", "error");
    }
  };

  const handleDeleteUser = (target) => {
    if (target.username.toLowerCase() === currentUsername.toLowerCase()) {
      pushToast("Không thể xóa tài khoản bạn đang đăng nhập!", "error");
      return;
    }
    if (target.role === ROLES.ADMIN && adminCount <= 1) {
      pushToast("Không thể xóa Admin duy nhất của hệ thống!", "error");
      return;
    }

    confirmAction(
      `Bạn có chắc chắn muốn xóa tài khoản "${target.username}" (${target.name || ""}) không?\n\n/ 确定要删除账号 "${target.username}" 吗？`,
      async () => {
        const res = await deleteUserFromSupabase(target.id);
        if (res.ok) {
          pushToast(lang === "zh" ? "已删除账号！" : "Đã xóa tài khoản thành công!", "success");
          loadUsers();
        } else {
          pushToast(res.error || "Lỗi xóa tài khoản", "error");
        }
      },
      {
        title: lang === "zh" ? "删除账号" : "Xóa tài khoản",
        confirmLabel: lang === "zh" ? "确认删除" : "Xóa vĩnh viễn",
        danger: true,
      }
    );
  };

  // User Intco or any non-admin cannot access this page
  if (role !== ROLES.ADMIN) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-line bg-canvas">
        <ShieldAlert className="w-12 h-12 text-bad mb-3" />
        <h3 className="text-base font-bold text-ink mb-1">
          {lang === "zh" ? "权限不足" : "Không có quyền truy cập"}
        </h3>
        <p className="text-xs text-mute max-w-sm">
          {lang === "zh"
            ? "该功能仅限系统管理员 (Admin) 访问管理。"
            : "Chức năng này chỉ dành riêng cho Quản trị viên (Admin)."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader vi="Quản lý tài khoản" zh="账户权限管理" />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className={`${card} v-rise p-5 flex items-center gap-4`} style={{ "--i": 0 }}>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-brand flex items-center justify-center font-bold">
            <Users size={24} />
          </div>
          <div>
            <div className="text-xs font-semibold text-mute">
              {lang === "zh" ? "全部账号" : "Tổng tài khoản"}
            </div>
            <div className="text-2xl font-bold text-ink">{usersList.length}</div>
          </div>
        </div>

        <div className={`${card} v-rise p-5 flex items-center gap-4`} style={{ "--i": 1 }}>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <ShieldCheck size={24} />
          </div>
          <div>
            <div className="text-xs font-semibold text-mute">
              {lang === "zh" ? "管理员账号 (Admin)" : "Quản trị viên (Admin)"}
            </div>
            <div className="text-2xl font-bold text-purple-600">{adminCount}</div>
          </div>
        </div>

        <div className={`${card} v-rise p-5 flex items-center gap-4`} style={{ "--i": 2 }}>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <UserCheck size={24} />
          </div>
          <div>
            <div className="text-xs font-semibold text-mute">
              {lang === "zh" ? "普通用户 (User)" : "Người dùng thường (User)"}
            </div>
            <div className="text-2xl font-bold text-blue-600">{userCount}</div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className={`${card} v-rise p-6`} style={{ "--i": 3 }}>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="v-stat-icon bg-canvas text-brand">
              <UserCog size={22} />
            </div>
            <div>
              <Bi
                vi="Danh sách tài khoản & Phân quyền"
                zh="账号列表与权限配置"
                en="Accounts & Permissions"
                viClass="text-lg font-bold text-ink"
              />
              <div className="text-xs text-mute mt-0.5">
                {lang === "zh"
                  ? "支持添加、修改角色与密码、以及删除账号"
                  : "Hỗ trợ thêm mới, phân quyền Admin/User, đổi mật khẩu và xóa tài khoản"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              className={`${inputCls} w-52 md:w-64`}
              placeholder={lang === "zh" ? "搜索账号/姓名..." : "Tìm tài khoản, tên..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className={btnPrimary} onClick={handleOpenAdd}>
              <PlusCircle size={16} />
              <span>{lang === "zh" ? "添加新账号" : "Thêm tài khoản"}</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-canvas border-b border-line text-xs font-bold text-mute">
                <th className="px-4 py-3 text-center w-16">#</th>
                <th className="px-4 py-3">{lang === "zh" ? "账号 (用户名)" : "Tên tài khoản (Username)"}</th>
                <th className="px-4 py-3">{lang === "zh" ? "显示名称" : "Tên hiển thị"}</th>
                <th className="px-4 py-3">{lang === "zh" ? "权限角色" : "Phân quyền (Vai trò)"}</th>
                <th className="px-4 py-3">{lang === "zh" ? "创建时间" : "Ngày tạo"}</th>
                <th className="px-4 py-3 text-right">{lang === "zh" ? "操作" : "Thao tác"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-white">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-mute">
                    <span className="v-spin inline-block mr-2" />
                    <span>Đang tải dữ liệu...</span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-mute">
                    {lang === "zh" ? "没有找到符合的账号" : "Không tìm thấy tài khoản nào"}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, idx) => {
                  const isAdmin = u.role === ROLES.ADMIN;
                  const isSelf = u.username.toLowerCase() === currentUsername.toLowerCase();

                  return (
                    <tr key={u.id} className="hover:bg-[#F9FBFF] transition-colors">
                      <td className="px-4 py-3 text-center text-xs font-bold text-mute">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3 font-bold text-ink">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase ${
                              isAdmin ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {(u.username || "U").charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span>{u.username}</span>
                              {isSelf && (
                                <span className="text-[10px] bg-ok-tint text-ok font-semibold px-1.5 py-0.2 rounded-full">
                                  {lang === "zh" ? "当前登录" : "Bạn"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-body font-medium">
                        {u.name || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {isAdmin ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            <ShieldCheck size={14} />
                            <span>Admin (Quản trị viên)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <User size={14} />
                            <span>User (Người dùng)</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-mute">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString("vi-VN") : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            className="p-1.5 rounded-lg border border-line hover:bg-canvas hover:text-brand text-mute transition-colors cursor-pointer"
                            onClick={() => handleOpenEdit(u)}
                            title={lang === "zh" ? "修改权限/重置密码" : "Sửa quyền / Đổi mật khẩu"}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            className={`p-1.5 rounded-lg border border-line text-mute transition-colors ${
                              isSelf
                                ? "opacity-30 cursor-not-allowed"
                                : "hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 cursor-pointer"
                            }`}
                            disabled={isSelf}
                            onClick={() => handleDeleteUser(u)}
                            title={isSelf ? "Không thể xóa chính mình" : (lang === "zh" ? "删除账号" : "Xóa tài khoản")}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {addModalOpen && (
        <Modal
          open={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          title={lang === "zh" ? "添加新账号" : "Thêm tài khoản mới"}
          footer={
            <>
              <button className={btnSecondary} onClick={() => setAddModalOpen(false)}>
                {lang === "zh" ? "取消" : "Hủy"}
              </button>
              <button className={btnPrimary} onClick={handleCreateUser} disabled={addBusy}>
                {addBusy && <span className="v-spin inline-block mr-1" />}
                {lang === "zh" ? "创建" : "Tạo tài khoản"}
              </button>
            </>
          }
        >
          <div className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-bold text-mute mb-1">
                {lang === "zh" ? "用户名 (登录账号) *" : "Tên tài khoản (Tên đăng nhập) *"}
              </label>
              <input
                className={inputCls}
                placeholder="VD: Admin2, user_haiphong..."
                value={addForm.username}
                onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-mute mb-1">
                {lang === "zh" ? "初始密码 *" : "Mật khẩu ban đầu *"}
              </label>
              <input
                type="text"
                className={inputCls}
                placeholder="Nhập mật khẩu..."
                value={addForm.password}
                onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-mute mb-1">
                {lang === "zh" ? "显示名称 (姓名)" : "Tên hiển thị (Họ và tên)"}
              </label>
              <input
                className={inputCls}
                placeholder="VD: Quản lý ca ngày, Nguyễn Văn B..."
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-mute mb-1">
                {lang === "zh" ? "分配权限角色" : "Phân quyền (Vai trò)"}
              </label>
              <div className="grid grid-cols-2 gap-3 mt-1.5">
                <button
                  type="button"
                  onClick={() => setAddForm({ ...addForm, role: ROLES.USER })}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    addForm.role === ROLES.USER
                      ? "border-brand bg-brand-tint ring-2 ring-brand/20"
                      : "border-line bg-white hover:bg-canvas"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm text-ink mb-1">
                    <User size={16} className="text-blue-600" />
                    <span>User (Người dùng)</span>
                  </div>
                  <div className="text-[11px] text-mute leading-relaxed">
                    Có quyền chỉnh sửa kế hoạch, máy móc, đơn hàng; Không xem được menu Xóa dữ liệu và Tài khoản.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setAddForm({ ...addForm, role: ROLES.ADMIN })}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    addForm.role === ROLES.ADMIN
                      ? "border-brand bg-brand-tint ring-2 ring-brand/20"
                      : "border-line bg-white hover:bg-canvas"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm text-ink mb-1">
                    <ShieldCheck size={16} className="text-purple-600" />
                    <span>Admin (Quản trị viên)</span>
                  </div>
                  <div className="text-[11px] text-mute leading-relaxed">
                    Đầy đủ mọi quyền: Chỉnh sửa, dùng mục Xóa dữ liệu, quản lý và phân quyền tài khoản.
                  </div>
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit User Modal */}
      {editModalOpen && editUser && (
        <Modal
          open={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setEditUser(null);
          }}
          title={lang === "zh" ? `编辑账号: ${editUser.username}` : `Chỉnh sửa tài khoản: ${editUser.username}`}
          footer={
            <>
              <button
                className={btnSecondary}
                onClick={() => {
                  setEditModalOpen(false);
                  setEditUser(null);
                }}
              >
                {lang === "zh" ? "取消" : "Hủy"}
              </button>
              <button className={btnPrimary} onClick={handleUpdateUser} disabled={editBusy}>
                {editBusy && <span className="v-spin inline-block mr-1" />}
                {lang === "zh" ? "保存更改" : "Lưu thay đổi"}
              </button>
            </>
          }
        >
          <div className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-bold text-mute mb-1">
                {lang === "zh" ? "用户名 (不可修改)" : "Tên tài khoản (Không thể đổi)"}
              </label>
              <input className={`${inputCls} bg-canvas opacity-70`} value={editUser.username} disabled />
            </div>
            <div>
              <label className="block text-xs font-bold text-mute mb-1">
                {lang === "zh" ? "显示名称 (姓名)" : "Tên hiển thị"}
              </label>
              <input
                className={inputCls}
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-mute mb-1">
                {lang === "zh" ? "重置新密码 (留空则保持原密码)" : "Đặt lại mật khẩu mới (để trống nếu không đổi)"}
              </label>
              <div className="relative">
                <input
                  type="text"
                  className={inputCls}
                  placeholder="Nhập mật khẩu mới..."
                  value={editForm.newPassword}
                  onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                />
                <KeyRound size={16} className="absolute right-3 top-3 text-mute" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-mute mb-1">
                {lang === "zh" ? "分配权限角色" : "Phân quyền (Vai trò)"}
              </label>
              <div className="grid grid-cols-2 gap-3 mt-1.5">
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, role: ROLES.USER })}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    editForm.role === ROLES.USER
                      ? "border-brand bg-brand-tint ring-2 ring-brand/20"
                      : "border-line bg-white hover:bg-canvas"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm text-ink mb-1">
                    <User size={16} className="text-blue-600" />
                    <span>User (Người dùng)</span>
                  </div>
                  <div className="text-[11px] text-mute leading-relaxed">
                    Có quyền chỉnh sửa; Không xem được mục Xóa dữ liệu và Tài khoản.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, role: ROLES.ADMIN })}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    editForm.role === ROLES.ADMIN
                      ? "border-brand bg-brand-tint ring-2 ring-brand/20"
                      : "border-line bg-white hover:bg-canvas"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm text-ink mb-1">
                    <ShieldCheck size={16} className="text-purple-600" />
                    <span>Admin (Quản trị viên)</span>
                  </div>
                  <div className="text-[11px] text-mute leading-relaxed">
                    Toàn quyền: Xóa dữ liệu, quản lý và phân quyền tài khoản.
                  </div>
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
