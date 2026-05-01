import { useState, useContext } from 'react';
import AuthContext from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import api from '../utils/api';
import { 
    User, 
    Lock, 
    Mail, 
    Shield, 
    CheckCircle, 
    XCircle, 
    Loader2, 
    Key, 
    UserCircle,
    Calendar,
    GraduationCap,
    Briefcase
} from 'lucide-react';

export default function Profile() {
    const { user } = useContext(AuthContext);
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    const showAlert = (text, type = 'success') => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            return showAlert('Passwords do not match', 'error');
        }

        setLoading(true);
        try {
            await api.put('/auth/change-password', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });
            showAlert('Password updated successfully');
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            showAlert(err.response?.data?.msg || 'Failed to update password', 'error');
        } finally {
            setLoading(false);
        }
    };

    const roleIcon = user?.role === 'faculty' ? <Briefcase size={24} /> : 
                     user?.role === 'admin' ? <Shield size={24} /> : <GraduationCap size={24} />;

    return (
        <DashboardLayout role={user?.role}>
            <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-in fade-in duration-700">
                {/* Alert Message */}
                {message.text && (
                    <div className={`fixed top-10 right-10 z-[200] px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-right duration-500 border ${
                        message.type === 'success' ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-red-500 text-white border-red-400'
                    }`}>
                        <div className="flex items-center gap-3">
                            {message.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
                            <p className="font-black italic uppercase tracking-tight text-sm">{message.text}</p>
                        </div>
                    </div>
                )}

                {/* Profile Header */}
                <div className="bg-white/5 rounded-[3rem] p-10 border border-white/10 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#ff6b00]/10 rounded-full blur-[80px] -mr-32 -mt-32 group-hover:bg-[#ff6b00]/20 transition-all duration-1000"></div>
                    
                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                        <div className="w-32 h-32 rounded-[2.5rem] bg-[#ff6b00] flex items-center justify-center text-white shadow-2xl shadow-[#ff6b00]/20 ring-4 ring-white/10">
                            {user?.role === 'admin' ? <Shield size={64} /> : 
                             user?.role === 'faculty' ? <Briefcase size={64} /> : 
                             <GraduationCap size={64} />}
                        </div>
                        
                        <div className="text-center md:text-left space-y-2">
                            <h1 className="text-4xl font-black text-white italic uppercase tracking-tight">
                                {user?.name || user?.username || 'User'}
                            </h1>
                            <div className="flex flex-wrap justify-center md:justify-start gap-3">
                                <span className="px-4 py-1.5 bg-white/5 rounded-full text-[10px] font-black text-[#ff6b00] uppercase tracking-widest border border-white/5 flex items-center gap-2">
                                    {roleIcon}
                                    {user?.role}
                                </span>
                                <span className="px-4 py-1.5 bg-white/5 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest border border-white/5 flex items-center gap-2">
                                    <Mail size={14} />
                                    {user?.email || 'No email provided'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Security - Password Change */}
                    <div className="bg-white/5 rounded-[3rem] p-10 border border-white/10 space-y-8">
                        <div className="flex items-center gap-4">
                            <div className="bg-rose-500/10 text-rose-500 p-3 rounded-2xl">
                                <Lock size={24} />
                            </div>
                            <h2 className="text-xl font-black text-white italic uppercase tracking-tight">Security <span className="text-rose-500">Settings</span></h2>
                        </div>

                        <form onSubmit={handlePasswordChange} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Current Password</label>
                                <div className="relative">
                                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                                    <input
                                        type="password"
                                        value={passwordData.currentPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-slate-700 focus:ring-2 focus:ring-rose-500/50 outline-none transition-all"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">New Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                                    <input
                                        type="password"
                                        value={passwordData.newPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-slate-700 focus:ring-2 focus:ring-[#ff6b00]/50 outline-none transition-all"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Confirm New Password</label>
                                <div className="relative">
                                    <CheckCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                                    <input
                                        type="password"
                                        value={passwordData.confirmPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-slate-700 focus:ring-2 focus:ring-[#ff6b00]/50 outline-none transition-all"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[#ff6b00] text-white py-4 rounded-2xl font-black italic uppercase tracking-widest text-xs hover:bg-orange-500 shadow-lg shadow-orange-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin" size={16} /> : 'Update Password'}
                            </button>
                        </form>
                    </div>

                    {/* Account Details */}
                    <div className="bg-white/5 rounded-[3rem] p-10 border border-white/10 space-y-8">
                        <div className="flex items-center gap-4">
                            <div className="bg-blue-500/10 text-blue-500 p-3 rounded-2xl">
                                <UserCircle size={24} />
                            </div>
                            <h2 className="text-xl font-black text-white italic uppercase tracking-tight">Account <span className="text-blue-500">Details</span></h2>
                        </div>

                        <div className="space-y-6">
                            {[
                                { label: 'Full Name', value: user?.name || 'N/A', icon: User },
                                user?.role === 'faculty' ? { label: 'Faculty ID', value: user?.facultyId || user?.username, icon: Key } : null,
                                user?.role === 'student' ? { label: 'Roll Number', value: user?.rollNumber || user?.username, icon: Key } : null,
                                { label: 'Role', value: user?.role, icon: Shield },
                                { label: 'Account Status', value: 'Active', icon: CheckCircle },
                                { label: 'Member Since', value: new Date(user?.createdAt || Date.now()).toLocaleDateString(), icon: Calendar },
                            ].filter(Boolean).map((detail, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-white/2 rounded-2xl border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <detail.icon size={16} className="text-slate-500" />
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{detail.label}</span>
                                    </div>
                                    <span className="text-xs font-black text-white uppercase italic">{detail.value}</span>
                                </div>
                            ))}
                        </div>

                        <div className="p-6 bg-[#ff6b00]/5 border border-[#ff6b00]/10 rounded-[2rem] text-center space-y-2">
                            <p className="text-[10px] font-black text-[#ff6b00] uppercase tracking-[0.2em]">System ID</p>
                            <p className="text-xs font-mono text-slate-400">{user?.id}</p>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
