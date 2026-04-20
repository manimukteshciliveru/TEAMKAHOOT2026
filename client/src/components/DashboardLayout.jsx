import React, { useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import {
    LayoutDashboard,
    PlusCircle,
    BookOpen,
    LogOut,
    User,
    BarChart3,
    Settings,
    Clock
} from 'lucide-react';

export default function DashboardLayout({ children, role }) {
    const { logout, user } = useContext(AuthContext);
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActive = (path) => location.pathname === path;

    const teacherLinks = [
        { name: 'Home', path: '/teacher-dashboard', icon: LayoutDashboard },
        { name: 'My Quizzes', path: '/my-quizzes', icon: BookOpen },
        { name: 'Performance', path: '/performance', icon: BarChart3 },
    ];

    const studentLinks = [
        { name: 'Home', path: '/student-dashboard', icon: LayoutDashboard },
        { name: 'Assessments', path: '/assessments', icon: BookOpen },
    ];

    const adminLinks = [
        { name: 'Dashboard', path: '/admin-dashboard', icon: LayoutDashboard },
        { name: 'Users', path: '/admin/users', icon: User },
    ];

    let links = [];
    if (role === 'teacher') links = teacherLinks;
    else if (role === 'student') links = studentLinks;
    else if (role === 'admin') links = adminLinks;

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-200 flex flex-col">
            {/* Top Navbar */}
            <header className="bg-[#0f172a]/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-20">
                        {/* Logo & Branding */}
                        <div className="flex items-center gap-8">
                            <div className="flex-shrink-0 flex items-center gap-3">
                                <div className="bg-[#ff6b00] p-2 rounded-xl shadow-[0_0_20px_rgba(255,107,0,0.3)]">
                                    <span className="text-2xl">🔥</span>
                                </div>
                                <h1 className="text-2xl font-black text-white tracking-tight italic">
                                    KMIT <span className="text-[#ff6b00]">Kahoot</span>
                                </h1>
                            </div>

                            {/* Navigation Links */}
                            <nav className="hidden md:flex space-x-4">
                                {links.map((link) => {
                                    const Icon = link.icon;
                                    return (
                                        <Link
                                            key={link.path}
                                            to={link.path}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${isActive(link.path)
                                                ? 'bg-[#ff6b00] text-white shadow-lg shadow-[#ff6b00]/20'
                                                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                                }`}
                                        >
                                            <Icon size={18} />
                                            {link.name}
                                        </Link>
                                    );
                                })}
                            </nav>
                        </div>

                        {/* User Actions */}
                        <div className="flex items-center gap-4">
                            <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-white/5 rounded-2xl border border-white/10">
                                <div className="w-8 h-8 rounded-full bg-[#ff6b00] flex items-center justify-center text-white font-black shadow-sm ring-2 ring-white/10">
                                    {user?.username?.[0]?.toUpperCase()}
                                </div>
                                <div className="text-left">
                                    <p className="text-xs font-black text-white leading-none">{user?.username}</p>
                                    <p className="text-[10px] text-[#ff6b00] font-bold uppercase mt-1 tracking-widest">{role}</p>
                                </div>
                            </div>

                            <button
                                onClick={handleLogout}
                                className="p-3 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-2xl transition-all border border-transparent hover:border-red-400/20"
                                title="Logout"
                            >
                                <LogOut size={22} />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>

            {/* Bottom Branding */}
            <footer className="py-6 text-center text-slate-600 text-xs font-medium border-t border-white/5">
                &copy; {new Date().getFullYear()} KMIT Educational Arena. Empowering Excellence.
            </footer>
        </div>
    );
}
