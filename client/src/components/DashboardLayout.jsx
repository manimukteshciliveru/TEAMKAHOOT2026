import React, { useContext } from 'react';
import Swal from 'sweetalert2';
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
    Clock,
    Shield,
    Briefcase,
    GraduationCap,
    Menu,
    X as CloseIcon
} from 'lucide-react';

export default function DashboardLayout({ children, role }) {
    const { logout, user } = useContext(AuthContext);
    const location = useLocation();
    const navigate = useNavigate();

    const [isMenuOpen, setIsMenuOpen] = React.useState(false);

    const handleLogout = async () => {
        const result = await Swal.fire({
            title: 'Ready to Leave?',
            text: 'You will need to login again to access your dashboard.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Logout',
            cancelButtonText: 'Stay Logged In',
            confirmButtonColor: '#ff6b00',
            background: '#1e293b',
            color: '#fff'
        });

        if (result.isConfirmed) {
            logout();
            navigate('/login');
        }
    };

    const isActive = (path) => location.pathname === path;

    const facultyLinks = [
        { name: 'Home', path: '/faculty-dashboard', icon: LayoutDashboard },
        { name: 'My Quizzes', path: '/my-quizzes', icon: BookOpen },

    ];

    const studentLinks = [
        { name: 'Home', path: '/home', icon: LayoutDashboard },
        { name: 'Join', path: '/join', icon: PlusCircle },
        { name: 'History', path: '/history', icon: Clock },
    ];

    const adminLinks = [
        { name: 'Dashboard', path: '/admin-dashboard', icon: LayoutDashboard },
        { name: 'Users', path: '/admin/users', icon: User },
    ];

    let links = [];
    if (role === 'faculty') links = facultyLinks;
    else if (role === 'student') links = studentLinks;
    else if (role === 'admin') links = adminLinks;

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-200 flex flex-col">
            {/* Top Navbar */}
            <header className="bg-[#0f172a]/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-20">
                        {/* Logo & Branding */}
                        <div className="flex items-center gap-4 md:gap-8">
                            {/* Mobile Menu Button */}
                            <button 
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="md:hidden p-2 text-slate-400 hover:text-white transition-colors"
                            >
                                {isMenuOpen ? <CloseIcon size={24} /> : <Menu size={24} />}
                            </button>
                            <div className="flex-shrink-0 flex items-center gap-3">
                                <div className="bg-white p-1.5 rounded-xl shadow-lg">
                                    <img src="/kmit-logo.png" alt="KMIT Logo" className="w-7 h-7 object-contain" />
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
                            {/* Live Status Indicator */}
                            <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-green-400/10 border border-green-400/20 rounded-2xl">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.5)]"></div>
                                <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">Live Status</span>
                            </div>

                            <Link to="/profile" className="hidden sm:flex items-center gap-3 px-4 py-2 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all cursor-pointer group">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-black shadow-sm ring-2 ring-white/10 group-hover:scale-110 transition-transform ${
                                    role === 'admin' ? 'bg-rose-600' : 
                                    role === 'faculty' ? 'bg-indigo-600' : 'bg-[#ff6b00]'
                                }`}>
                                    {role === 'admin' ? <Shield size={16} /> : 
                                     role === 'faculty' ? <Briefcase size={16} /> : <GraduationCap size={16} />}
                                </div>
                                <div className="text-left">
                                    <p className="text-xs font-black text-white leading-none group-hover:text-[#ff6b00] transition-colors">{user?.name || user?.username || 'User'}</p>
                                    <p className="text-[10px] text-[#ff6b00] font-bold uppercase mt-1 tracking-widest">{role}</p>
                                </div>
                            </Link>

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

                {/* Mobile Menu Dropdown */}
                {isMenuOpen && (
                    <div className="md:hidden bg-[#0f172a] border-b border-white/5 animate-in slide-in-from-top duration-300">
                        <div className="px-4 pt-2 pb-6 space-y-2">
                            {links.map((link) => {
                                const Icon = link.icon;
                                return (
                                    <Link
                                        key={link.path}
                                        to={link.path}
                                        onClick={() => setIsMenuOpen(false)}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-bold transition-all ${isActive(link.path)
                                            ? 'bg-[#ff6b00] text-white'
                                            : 'text-slate-400 hover:bg-white/5'
                                            }`}
                                    >
                                        <Icon size={20} />
                                        {link.name}
                                    </Link>
                                );
                            })}
                            <div className="pt-4 mt-4 border-t border-white/5">
                                <Link 
                                    to="/profile" 
                                    onClick={() => setIsMenuOpen(false)}
                                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-white/5"
                                >
                                    <User size={20} />
                                    Profile
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-400/10"
                                >
                                    <LogOut size={20} />
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                )}
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
