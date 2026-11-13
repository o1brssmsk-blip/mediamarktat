"use client";

import { useState, useEffect } from "react";

export function UsersTab({ darkMode }: { darkMode: boolean }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // New user form
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Kullanıcılar alınamadı.");
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          username: newUsername,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Kullanıcı eklenemedi.");
      }
      setShowAddModal(false);
      setNewEmail("");
      setNewPassword("");
      setNewUsername("");
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Bu kullanıcıyı silmek istediğinize emin misiniz?")) return;
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Silme başarısız.");
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${darkMode ? 'bg-white/10 text-white' : 'bg-black/5 text-black'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          </div>
          <div>
            <h2 className={`text-2xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>Kullanıcı Yönetimi</h2>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Admin kullanıcılarını yönetin</p>
          </div>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="px-6 py-2.5 bg-[#EB5E28] text-white rounded-full font-bold tracking-wide hover:bg-[#c94d1e] transition-all duration-300 shadow-[0_0_15px_rgba(235,94,40,0.3)] hover:shadow-[0_0_25px_rgba(235,94,40,0.5)] active:scale-95 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          Yeni Kullanıcı Ekle
        </button>
      </div>

      {error && <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl font-medium">{error}</div>}

      <div className={`rounded-3xl border shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden backdrop-blur-xl ${darkMode ? 'bg-[#1c1c1e]/70 border-white/5' : 'bg-white/80 border-[#d2d2d7]/50'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className={`text-[11px] uppercase tracking-wider font-semibold border-b ${darkMode ? 'bg-black/20 text-gray-400 border-white/5' : 'bg-gray-50/50 text-gray-500 border-gray-100'}`}>
              <tr>
                <th className="px-6 py-4">Kullanıcı Adı</th>
                <th className="px-6 py-4">E-posta</th>
                <th className="px-6 py-4">Rol</th>
                <th className="px-6 py-4">Durum</th>
                <th className="px-6 py-4">Oluşturulma</th>
                <th className="px-6 py-4 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-white/5' : 'divide-gray-100'}`}>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center opacity-50 font-medium">Yükleniyor...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center opacity-50 font-medium">Kullanıcı bulunamadı.</td>
                </tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} className={`${darkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-black/[0.01]'} transition-colors duration-200`}>
                    <td className={`px-6 py-4 font-bold text-base ${darkMode ? 'text-white' : 'text-gray-900'}`}>{u.username}</td>
                    <td className="px-6 py-4 opacity-80">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide shadow-sm ${u.role === 'super_admin' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}>
                        {u.role === 'super_admin' ? 'SUPER ADMIN' : 'ADMIN'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide shadow-sm ${u.status === 'active' ? 'bg-teal-500/10 text-teal-500 border border-teal-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                        {u.status === 'active' ? 'AKTİF' : 'PASİF'}
                      </span>
                    </td>
                    <td className="px-6 py-4 opacity-60 font-medium">
                      {new Date(u.created_at).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {u.email !== 'admin@example.com' && (
                        <button 
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors active:scale-95"
                          title="Sil"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-md rounded-3xl border shadow-2xl p-8 ${darkMode ? 'bg-[#111111] border-white/10' : 'bg-white border-gray-200'} animate-in zoom-in-95 duration-200`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className={`text-xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>Yeni Kullanıcı Ekle</h3>
              <button onClick={() => setShowAddModal(false)} className={`p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>✕</button>
            </div>
            <form onSubmit={handleAddUser} className="space-y-5">
              <div>
                <label className={`block text-xs font-bold mb-1.5 opacity-80 uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Kullanıcı Adı</label>
                <input 
                  type="text" 
                  required
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  placeholder="örn. ahmet_admin"
                  className={`w-full p-3.5 rounded-xl text-sm outline-none transition-all ${darkMode ? 'bg-black/20 text-white border border-white/10 focus:border-[#EB5E28]' : 'bg-gray-50 border border-gray-200 focus:border-[#EB5E28]'}`} 
                />
              </div>
              <div>
                <label className={`block text-xs font-bold mb-1.5 opacity-80 uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>E-posta</label>
                <input 
                  type="email" 
                  required
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="örn. ahmet@example.com"
                  className={`w-full p-3.5 rounded-xl text-sm outline-none transition-all ${darkMode ? 'bg-black/20 text-white border border-white/10 focus:border-[#EB5E28]' : 'bg-gray-50 border border-gray-200 focus:border-[#EB5E28]'}`} 
                />
              </div>
              <div>
                <label className={`block text-xs font-bold mb-1.5 opacity-80 uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Şifre</label>
                <input 
                  type="password" 
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="En az 6 karakter"
                  className={`w-full p-3.5 rounded-xl text-sm outline-none transition-all ${darkMode ? 'bg-black/20 text-white border border-white/10 focus:border-[#EB5E28]' : 'bg-gray-50 border border-gray-200 focus:border-[#EB5E28]'}`} 
                />
              </div>
              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-black/5 dark:border-white/5">
                <button type="button" onClick={() => setShowAddModal(false)} className={`px-5 py-2.5 rounded-xl font-bold transition-all active:scale-95 ${darkMode ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}>İptal</button>
                <button type="submit" className="px-6 py-2.5 bg-[#EB5E28] text-white rounded-xl font-bold hover:bg-[#c94d1e] shadow-lg shadow-[#EB5E28]/20 transition-all active:scale-95">Ekle</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

