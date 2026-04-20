import React, { useContext } from 'react';
import AuthContext from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import { Users, Shield, Settings, Activity } from 'lucide-react';

export default function AdminDashboard() {
    const { user } = useContext(AuthContext);

    return (
        <DashboardLayout role="admin">
            <div className="space-y-10">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight italic uppercase">Admin <span className="text-indigo-600">Control Panel</span></h1>
                    <p className="text-gray-500 font-medium mt-1">Hello, Administrator {user?.username}. System health is optimal.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[
                        { label: 'Total Users', value: '1,284', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
                        { label: 'Security Status', value: 'Verified', icon: Shield, color: 'text-green-600', bg: 'bg-green-50' },
                        { label: 'System Load', value: '12%', icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50' },
                        { label: 'Config Items', value: '42', icon: Settings, color: 'text-orange-600', bg: 'bg-orange-50' },
                    ].map((stat, idx) => (
                        <div key={idx} className="bg-white p-6 rounded-[2rem] border border-gray-50 shadow-sm flex flex-col items-center text-center">
                            <div className={`${stat.bg} ${stat.color} p-4 rounded-2xl mb-4`}>
                                <stat.icon size={24} />
                            </div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                            <p className="text-2xl font-black text-gray-900 italic">{stat.value}</p>
                        </div>
                    ))}
                </div>

                <div className="bg-white rounded-[2.5rem] p-12 border border-gray-50 shadow-xl shadow-indigo-100/10 text-center">
                    <div className="max-w-md mx-auto space-y-6">
                        <div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-indigo-600">
                            <Settings size={40} className="animate-spin-slow" />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 uppercase italic">Advanced Tools</h3>
                        <p className="text-gray-400 font-medium">User management and global settings are currently being synchronized for the new KMIT interface.</p>
                        <button className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black italic uppercase tracking-tighter hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 active:scale-95">
                            Access Global Logs
                        </button>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
