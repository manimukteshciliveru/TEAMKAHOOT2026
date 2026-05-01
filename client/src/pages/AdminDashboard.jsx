import React, { useContext } from 'react';
import AuthContext from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import { Users, Shield, Settings, Activity, UserPlus, ChevronRight } from 'lucide-react';

export default function AdminDashboard() {
    const { user } = useContext(AuthContext);

    const [formData, setFormData] = React.useState({
        username: '',
        password: '',
        role: 'student',
        rollNumber: '',
        branch: '',
        section: ''
    });


    const [message, setMessage] = React.useState({ text: '', type: '' });
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const { username, password, role, rollNumber, branch, section } = formData;

    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async e => {
        e.preventDefault();
        setIsSubmitting(true);
        setMessage({ text: '', type: '' });
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/create-user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (res.ok) {
                setMessage({ text: data.msg, type: 'success' });
                setFormData({ username: '', password: '', role: 'student', rollNumber: '', branch: '', section: '' });
            } else {
                setMessage({ text: data.msg || 'Error creating user', type: 'error' });
            }
        } catch (err) {
            setMessage({ text: 'Server connection error', type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <DashboardLayout role="admin">
            <div className="space-y-10">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight italic uppercase">Admin <span className="text-indigo-600">Control Panel</span></h1>
                        <p className="text-gray-500 font-medium mt-1">Hello, Administrator {user?.username}. System health is optimal.</p>
                    </div>
                    <div className="hidden md:block">
                        <div className="bg-indigo-50 px-4 py-2 rounded-xl flex items-center gap-2 border border-indigo-100">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Server Live</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[
                        { label: 'Total Users', value: '1,284', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
                        { label: 'Security Status', value: 'Verified', icon: Shield, color: 'text-green-600', bg: 'bg-green-50' },
                        { label: 'System Load', value: '12%', icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50' },
                        { label: 'Config Items', value: '42', icon: Settings, color: 'text-orange-600', bg: 'bg-orange-50' },
                    ].map((stat, idx) => (
                        <div key={idx} className="bg-white p-6 rounded-[2rem] border border-gray-50 shadow-sm flex flex-col items-center text-center hover:shadow-md transition-shadow">
                            <div className={`${stat.bg} ${stat.color} p-4 rounded-2xl mb-4`}>
                                <stat.icon size={24} />
                            </div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                            <p className="text-2xl font-black text-gray-900 italic">{stat.value}</p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {/* User Creation Form */}
                    <div className="bg-white rounded-[2.5rem] p-10 border border-gray-50 shadow-xl shadow-indigo-100/20">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="bg-indigo-600 p-3 rounded-2xl text-white">
                                <UserPlus size={24} />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 uppercase italic">Provision <span className="text-indigo-600">New User</span></h3>
                        </div>

                        {message.text && (
                            <div className={`mb-6 p-4 rounded-2xl font-bold text-sm ${message.type === 'success' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                                {message.text}
                            </div>
                        )}

                        <form onSubmit={onSubmit} className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Username / Identifier</label>
                                    <input
                                        type="text"
                                        name="username"
                                        value={username}
                                        onChange={onChange}
                                        placeholder="e.g. john_doe"
                                        required
                                        className="w-full bg-gray-50 border-none rounded-2xl p-4 text-gray-900 font-medium focus:ring-2 focus:ring-indigo-600/20 transition-all outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Display Name</label>
                                    <input
                                        type="text"
                                        name="displayName"
                                        placeholder="e.g. John Doe"
                                        className="w-full bg-gray-50 border-none rounded-2xl p-4 text-gray-900 font-medium focus:ring-2 focus:ring-indigo-600/20 transition-all outline-none"
                                    />
                                </div>

                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Secure Password</label>
                                <input
                                    type="password"
                                    name="password"
                                    value={password}
                                    onChange={onChange}
                                    placeholder="••••••••"
                                    required
                                    className="w-full bg-gray-50 border-none rounded-2xl p-4 text-gray-900 font-medium focus:ring-2 focus:ring-indigo-600/20 transition-all outline-none"
                                />
                            </div>

                            {role === 'student' && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-in slide-in-from-top duration-300">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Roll Number</label>
                                        <input
                                            type="text"
                                            name="rollNumber"
                                            value={formData.rollNumber}
                                            onChange={onChange}
                                            placeholder="24BD1A..."
                                            required
                                            className="w-full bg-gray-50 border-none rounded-2xl p-4 text-gray-900 font-medium focus:ring-2 focus:ring-indigo-600/20 transition-all outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Branch</label>
                                        <input
                                            type="text"
                                            name="branch"
                                            value={formData.branch}
                                            onChange={onChange}
                                            placeholder="CSM"
                                            required
                                            className="w-full bg-gray-50 border-none rounded-2xl p-4 text-gray-900 font-medium focus:ring-2 focus:ring-indigo-600/20 transition-all outline-none"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Sec</label>
                                        <input
                                            type="text"
                                            name="section"
                                            value={formData.section}
                                            onChange={onChange}
                                            placeholder="E"
                                            required
                                            className="w-full bg-gray-50 border-none rounded-2xl p-4 text-gray-900 font-medium focus:ring-2 focus:ring-indigo-600/20 transition-all outline-none"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Access Role</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, role: 'student' })}
                                        className={`p-4 rounded-2xl font-black italic uppercase tracking-widest text-xs transition-all ${role === 'student' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                                    >
                                        Student
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, role: 'faculty', rollNumber: '', branch: '', section: '' })}
                                        className={`p-4 rounded-2xl font-black italic uppercase tracking-widest text-xs transition-all ${role === 'faculty' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                                    >
                                        Faculty
                                    </button>
                                </div>
                            </div>


                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-gray-900 text-white py-5 rounded-[2rem] font-black italic uppercase tracking-tighter text-lg hover:bg-indigo-600 transition-all active:scale-[0.98] shadow-xl shadow-gray-200/50 disabled:opacity-50"
                            >
                                {isSubmitting ? 'Processing...' : 'Authorize User Access'}
                            </button>
                        </form>
                    </div>

                    {/* Quick Stats or Logs */}
                    <div className="space-y-8">
                        <div className="bg-indigo-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                            <div className="relative z-10">
                                <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-4">System <span className="text-indigo-400">Vault</span></h3>
                                <p className="text-indigo-200 font-medium mb-8">Securely manage all platform credentials and audit logs from this terminal.</p>
                                <button className="bg-white text-indigo-900 px-8 py-4 rounded-2xl font-black italic uppercase tracking-widest text-xs hover:bg-indigo-50 transition active:scale-95">
                                    View Audit Logs
                                </button>
                            </div>
                            <Shield size={180} className="absolute -bottom-10 -right-10 text-white/5 rotate-12 group-hover:rotate-0 transition-transform duration-700" />
                        </div>

                        <div className="bg-white rounded-[2.5rem] p-10 border border-gray-50 shadow-lg flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="bg-orange-50 text-orange-600 p-4 rounded-2xl">
                                    <Settings size={24} className="animate-spin-slow" />
                                </div>
                                <div>
                                    <h4 className="font-black italic uppercase text-gray-900">Maintenance</h4>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Scheduled in 4 days</p>
                                </div>
                            </div>
                            <ChevronRight className="text-gray-300" />
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );

}
