import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../api/supabase';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Users, Search, UserX, Trash2, RefreshCw, UserPlus, X, Link2, Copy } from 'lucide-react';

type User = {
  id: string;
  username: string;
  email: string;
  role: string;
  status: string;
  balance: number;
  invite_code: string;
  invited_by: string;
  invite_count: number;
  created_at: string;
};

export function UserList() {
  const location = useLocation();
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    username: '',
    role: 'user',
    invite_code: '',
  });
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [myInviteCode, setMyInviteCode] = useState('');
  const [showInvite, setShowInvite] = useState(false);

  const userRole = currentUser?.role || 'user';
  const isAdmin = userRole === 'owner' || userRole === 'gm';
  const isAgent = userRole === 'agent';

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const searchParam = params.get('search');
    if (searchParam) setSearch(searchParam);
    fetchUsers(searchParam || '');
    fetchMyInviteCode();
  }, [location.search]);

  const fetchMyInviteCode = async () => {
    if (!currentUser?.id) return;
    try {
      const { data } = await supabase.from('profiles').select('invite_code').eq('id', currentUser.id).single();
      if (data) setMyInviteCode(data.invite_code);
    } catch (error) {
      console.error('Fetch invite code error:', error);
    }
  };

  const fetchUsers = async (searchQuery?: string) => {
    setLoading(true);
    try {
      let query = supabase.from('profiles').select('id, username, email, role, status, invite_code, invited_by, invite_count, created_at').order('created_at', { ascending: false });
      if (!isAdmin && !isAgent) {
        query = query.eq('id', currentUser?.id);
      } else if (isAgent) {
        query = query.or(`id.eq.${currentUser?.id},invited_by.eq.${currentUser?.id}`);
      }
      if (searchQuery) {
        query = query.or(`username.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      const usersWithBalance = await Promise.all((data || []).map(async (u: any) => {
        const { data: balanceData } = await supabase.from('points_accounts').select('balance').eq('user_id', u.id).single();
        return { ...u, balance: balanceData?.balance || 0 };
      }));
      setUsers(usersWithBalance);
    } catch (error) {
      console.error('Fetch users error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (search.trim()) {
      window.history.pushState({}, '', `/users?search=${encodeURIComponent(search.trim())}`);
      fetchUsers(search.trim());
    } else {
      window.history.pushState({}, '', '/users');
      fetchUsers('');
    }
  };

  const copyInviteCode = () => {
    if (myInviteCode) {
      navigator.clipboard.writeText(myInviteCode);
      alert('✅ 邀请码已复制！');
    }
  };

  const getInviteLink = () => `${window.location.origin}/register?invite=${myInviteCode}`;

  const handleCreateUser = async () => {
    if (!createForm.email || !createForm.password) { alert('请填写邮箱和密码'); return; }
    if (createForm.password.length < 6) { alert('密码至少6位'); return; }
    setCreating(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) { alert('请先登录'); setCreating(false); return; }
      const supabaseUrl = 'https://cvqimeqsonvkqqxlwwya.supabase.co';
      const response = await fetch(`${supabaseUrl}/functions/v1/create-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify({
          email: createForm.email,
          password: createForm.password,
          username: createForm.username || createForm.email.split('@')[0],
          role: createForm.role,
          invite_code: createForm.invite_code || myInviteCode,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '创建失败');
      if (data.success) {
        alert(`✅ 用户 ${createForm.email} 创建成功！`);
        setShowCreateForm(false);
        setCreateForm({ email: '', password: '', username: '', role: 'user', invite_code: '' });
        fetchUsers(search);
      } else {
        throw new Error(data.error || '创建失败');
      }
    } catch (error: any) {
      alert('创建失败：' + (error.message || String(error)));
    } finally {
      setCreating(false);
    }
  };

  const toggleUserStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'frozen' : 'active';
    if (!confirm(`确定${newStatus === 'active' ? '激活' : '冻结'}此用户吗？`)) return;
    setActionLoading(id);
    try {
      await supabase.from('profiles').update({ status: newStatus }).eq('id', id);
      alert(`✅ 用户已${newStatus === 'active' ? '激活' : '冻结'}`);
      fetchUsers(search);
    } catch (error) {
      alert('操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  const deleteUser = async (id: string, email: string) => {
    if (!confirm(`⚠️ 确定要永久删除用户 ${email} 吗？此操作不可恢复！`)) return;
    setActionLoading(id);
    try {
      await supabase.from('profiles').delete().eq('id', id);
      alert(`✅ 用户 ${email} 已删除`);
      fetchUsers(search);
    } catch (error: any) {
      alert('删除失败：' + (error.message || String(error)));
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="text-primary-500" size={28} />
            用户中心
          </h1>
          <p className="text-gray-400 text-sm">
            {isAdmin ? '管理所有平台用户' : isAgent ? '管理您邀请的用户' : '查看我的信息'}
          </p>
        </div>
        <div className="flex gap-2">
          {(isAdmin || isAgent) && (
            <Button size="sm" onClick={() => setShowInvite(!showInvite)}><Link2 size={16} /> 邀请码</Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => fetchUsers(search)}><RefreshCw size={16} /></Button>
          {(isAdmin || isAgent) && (
            <Button size="sm" onClick={() => setShowCreateForm(!showCreateForm)}><UserPlus size={16} /> 创建用户</Button>
          )}
        </div>
      </div>

      {showInvite && myInviteCode && (
        <Card className="bg-[#141b2d] border-amber-500/30 p-4">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-gray-400 text-sm">我的邀请码</p>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-amber-400 font-bold text-xl bg-[#0a0e1a] px-4 py-2 rounded-lg">{myInviteCode}</code>
                <button onClick={copyInviteCode} className="p-2 rounded hover:bg-blue-500/10 text-gray-400 hover:text-blue-400"><Copy size={18} /></button>
                <button onClick={() => { navigator.clipboard.writeText(getInviteLink()); alert('✅ 邀请链接已复制！'); }} className="p-2 rounded hover:bg-blue-500/10 text-gray-400 hover:text-blue-400">🔗 复制链接</button>
              </div>
              <p className="text-gray-500 text-xs mt-1">邀请链接: {getInviteLink()}</p>
            </div>
          </div>
        </Card>
      )}

      {showCreateForm && (
        <Card className="bg-[#141b2d] border-[#1e2a45] p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold flex items-center gap-2"><UserPlus size={18} className="text-green-500" /> 创建新用户</h3>
            <button onClick={() => setShowCreateForm(false)} className="text-gray-400 hover:text-white"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label className="text-gray-400 text-sm">邮箱 *</label><input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} className="w-full bg-[#0a0e1a] border border-[#1e2a45] rounded-lg px-3 py-2 text-white text-sm mt-1" placeholder="user@example.com" /></div>
            <div><label className="text-gray-400 text-sm">密码 * (至少6位)</label><input type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} className="w-full bg-[#0a0e1a] border border-[#1e2a45] rounded-lg px-3 py-2 text-white text-sm mt-1" placeholder="••••••••" /></div>
            <div><label className="text-gray-400 text-sm">用户名</label><input value={createForm.username} onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })} className="w-full bg-[#0a0e1a] border border-[#1e2a45] rounded-lg px-3 py-2 text-white text-sm mt-1" placeholder="用户名（可选）" /></div>
            <div><label className="text-gray-400 text-sm">角色</label><select value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })} className="w-full bg-[#0a0e1a] border border-[#1e2a45] rounded-lg px-3 py-2 text-white text-sm mt-1">
              <option value="user">普通用户</option><option value="agent">代理</option><option value="gm">GM</option>
            </select></div>
            {!isAdmin && (
              <div className="col-span-2">
                <label className="text-gray-400 text-sm">邀请码（可选）</label>
                <input value={createForm.invite_code} onChange={(e) => setCreateForm({ ...createForm, invite_code: e.target.value })} className="w-full bg-[#0a0e1a] border border-[#1e2a45] rounded-lg px-3 py-2 text-white text-sm mt-1" placeholder="输入邀请码" />
                <p className="text-xs text-gray-500 mt-1">邀请码: {myInviteCode}</p>
              </div>
            )}
          </div>
          <Button className="mt-3" onClick={handleCreateUser} loading={creating}><UserPlus size={16} /> 创建用户</Button>
        </Card>
      )}

      <Card className="bg-[#141b2d] border-[#1e2a45] p-3">
        <div className="flex items-center gap-3">
          <Search className="text-gray-400" size={16} />
          <input type="text" placeholder="搜索用户..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} className="flex-1 bg-transparent border-none text-white text-sm focus:outline-none placeholder-gray-500" />
          <Button size="sm" variant="secondary" onClick={handleSearch}>搜索</Button>
          {search && <button onClick={() => { setSearch(''); window.history.pushState({}, '', '/users'); fetchUsers(''); }} className="text-gray-400 hover:text-white text-sm">清除</button>}
          <span className="text-xs text-gray-400">{users.length} 个用户</span>
        </div>
      </Card>

      {loading ? <div className="text-center py-8 text-gray-400">加载中...</div> : users.length === 0 ? <div className="text-center py-8 text-gray-400">{search ? `没有找到 "${search}" 相关的用户` : '暂无用户'}</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#0a0e1a]">
              <tr className="border-b border-[#1e2a45]">
                <th className="text-left py-3 px-3 text-gray-400 font-medium">用户</th>
                <th className="text-left py-3 px-3 text-gray-400 font-medium">角色</th>
                <th className="text-left py-3 px-3 text-gray-400 font-medium">积分</th>
                <th className="text-left py-3 px-3 text-gray-400 font-medium">状态</th>
                <th className="text-left py-3 px-3 text-gray-400 font-medium">邀请人</th>
                <th className="text-right py-3 px-3 text-gray-400 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-[#1e2a45]/50 hover:bg-[#1a2340] transition">
                  <td className="py-3 px-3"><div><p className="text-white font-medium text-sm">{user.username || '未设置'}</p><p className="text-gray-400 text-xs">{user.email}</p>{user.invite_code && <span className="text-xs text-amber-500">邀请码: {user.invite_code}</span>}</div></td>
                  <td className="py-3 px-3"><span className={`text-xs px-2 py-1 rounded-full ${user.role === 'owner' ? 'bg-amber-500/20 text-amber-500' : user.role === 'gm' ? 'bg-purple-500/20 text-purple-500' : user.role === 'agent' ? 'bg-blue-500/20 text-blue-500' : 'bg-gray-500/20 text-gray-400'}`}>{user.role || 'user'}</span></td>
                  <td className="py-3 px-3 text-amber-500 font-medium">{user.balance?.toFixed(2) || '0.00'}</td>
                  <td className="py-3 px-3"><span className={`text-xs px-2 py-1 rounded-full ${user.status === 'active' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>{user.status === 'active' ? '✅ 正常' : '❄️ 冻结'}</span></td>
                  <td className="py-3 px-3 text-gray-400 text-xs">{user.invited_by ? '已邀请' : '-'}</td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex justify-end gap-1">
                      {(isAdmin || user.id === currentUser?.id) && (
                        <>
                          {user.role !== 'owner' && user.id !== currentUser?.id && (
                            <>
                              <button onClick={() => toggleUserStatus(user.id, user.status)} disabled={actionLoading === user.id} className="p-1.5 rounded hover:bg-yellow-500/10 text-yellow-500 hover:text-yellow-400 transition disabled:opacity-50" title="冻结"><UserX size={15} /></button>
                              <button onClick={() => deleteUser(user.id, user.email)} disabled={actionLoading === user.id} className="p-1.5 rounded hover:bg-red-500/10 text-red-500 hover:text-red-400 transition disabled:opacity-50" title="删除"><Trash2 size={15} /></button>
                            </>
                          )}
                          {user.id === currentUser?.id && <span className="text-xs text-gray-400">👤 自己</span>}
                          {user.role === 'owner' && <span className="text-xs text-amber-500">👑 所有者</span>}
                        </>
                      )}
                      {!isAdmin && user.id !== currentUser?.id && <span className="text-xs text-gray-400">仅查看</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
