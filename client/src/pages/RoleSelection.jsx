import React, { useContext } from 'react';
import AuthContext from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Presentation, ShieldAlert, ChevronRight } from 'lucide-react';

export default function RoleSelection() {
    const { setRole } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleRoleSelect = async (role) => {
        try {
            await setRole(role);
            if (role === 'teacher') navigate('/teacher-dashboard');
            if (role === 'student') navigate('/student-dashboard');
            if (role === 'admin') navigate('/admin-dashboard');
        } catch (err) {
            console.error(err);
            alert('Error setting role');
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f172a] relative overflow-hidden font-inter p-6">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#ff6b00]/5 rounded-full blur-[120px] -mr-80 -mt-80"></div>
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-600/5 rounded-full blur-[120px] -ml-80 -mb-80"></div>

            <div className="relative z-10 text-center space-y-4 mb-16">
                <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter">
                    Identify Your <span className="text-[#ff6b00]">Status</span>
                </h1>
                <p className="text-gray-400 font-bold uppercase tracking-[0.4em] text-[10px]">Security clearance required for gateway access</p>
                <div className="w-24 h-1 bg-gradient-to-r from-transparent via-[#ff6b00] to-transparent mx-auto mt-6"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full relative z-10">
                {/* Teacher Role */}
                <button
                    onClick={() => handleRoleSelect('teacher')}
                    className="group relative bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[3rem] hover:bg-white/10 transition-all duration-500 overflow-hidden text-left"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-600/20 transition-colors"></div>
                    <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mb-8 shadow-lg shadow-indigo-600/20 group-hover:scale-110 group-hover:rotate-6 transition-transform">
                        <Presentation size={32} />
                    </div>
                    <h2 className="text-2xl font-black text-white italic uppercase tracking-tight mb-2">Educator</h2>
                    <p className="text-gray-400 text-sm font-medium leading-relaxed mb-8">Architect complex assessments, track real-time analytics, and mentor students.</p>
                    <div className="flex items-center gap-2 text-[#ff6b00] font-black italic uppercase tracking-widest text-[10px] group-hover:translate-x-2 transition-transform">
                        INITIALIZE PORTAL <ChevronRight size={14} />
                    </div>
                </button>

                {/* Student Role */}
                <button
                    onClick={() => handleRoleSelect('student')}
                    className="group relative bg-white/5 backdrop-blur-xl border border-[#ff6b00]/30 p-10 rounded-[3rem] hover:bg-[#ff6b00]/5 transition-all duration-500 overflow-hidden text-left scale-105 shadow-2xl shadow-orange-900/20"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff6b00]/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-[#ff6b00]/20 transition-colors"></div>
                    <div className="w-16 h-16 bg-[#ff6b00] rounded-2xl flex items-center justify-center text-white mb-8 shadow-lg shadow-orange-600/20 group-hover:scale-110 group-hover:-rotate-6 transition-transform">
                        <GraduationCap size={32} />
                    </div>
                    <h2 className="text-2xl font-black text-white italic uppercase tracking-tight mb-2">Challenger</h2>
                    <p className="text-gray-300 text-sm font-medium leading-relaxed mb-8">Engage in high-stakes live sessions, dominate leaderboards, and excel.</p>
                    <div className="flex items-center gap-2 text-white font-black italic uppercase tracking-widest text-[10px] group-hover:translate-x-2 transition-transform bg-[#ff6b00] w-fit px-4 py-2 rounded-full">
                        JOIN THE ARENA <ChevronRight size={14} />
                    </div>
                </button>

                {/* Admin Role */}
                <button
                    onClick={() => handleRoleSelect('admin')}
                    className="group relative bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[3rem] hover:bg-white/10 transition-all duration-500 overflow-hidden text-left"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-red-600/20 transition-colors"></div>
                    <div className="w-16 h-16 bg-slate-700 rounded-2xl flex items-center justify-center text-white mb-8 shadow-lg shadow-slate-900/20 group-hover:scale-110 group-hover:rotate-6 transition-transform">
                        <ShieldAlert size={32} />
                    </div>
                    <h2 className="text-2xl font-black text-white italic uppercase tracking-tight mb-2">Systems</h2>
                    <p className="text-gray-400 text-sm font-medium leading-relaxed mb-8">Maintain infrastructure integrity, manage global user datasets, and oversee operations.</p>
                    <div className="flex items-center gap-2 text-gray-500 font-black italic uppercase tracking-widest text-[10px] group-hover:translate-x-2 transition-transform">
                        ADMIN OVERRIDE <ChevronRight size={14} />
                    </div>
                </button>
            </div>

            <p className="mt-16 text-gray-600 text-[10px] font-bold uppercase tracking-[0.5em] opacity-50 relative z-10">
                CRITICAL: Role selection is permanent for this identity.
            </p>
        </div>
    );
}
