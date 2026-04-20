import React, { useState, useContext } from 'react';
import AuthContext from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, Mail, Lock, User, ShieldCheck } from 'lucide-react';

export default function Login() {
    const [isLogin, setIsLogin] = useState(true);
    const { user, login, register } = useContext(AuthContext);
    const navigate = useNavigate();

    React.useEffect(() => {
        if (user) {
            navigate('/');
        }
    }, [user, navigate]);

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: ''
    });

    const { username, email, password } = formData;

    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async e => {
        e.preventDefault();
        try {
            if (isLogin) {
                await login(email, password);
            } else {
                await register(username, email, password);
            }
            navigate('/');
        } catch (err) {
            console.error('Login/Signup error:', err);
            const errorMsg = err.response?.data?.msg || err.message || 'An error occurred';
            const status = err.response?.status ? ` (Status: ${err.response.status})` : '';

            if (err.message === 'Network Error') {
                alert('Network Error: Could not connect to the server. Please check if VITE_API_URL is configured correctly in Vercel.');
            } else {
                alert(`${errorMsg}${status}`);
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0f172a] relative overflow-hidden font-inter">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#ff6b00]/10 rounded-full blur-[120px] -mr-48 -mt-48"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] -ml-48 -mb-48"></div>

            <div className="w-full max-w-md p-8 relative z-10">
                {/* Logo Area */}
                <div className="flex flex-col items-center mb-10">
                    <div className="w-20 h-20 bg-gradient-to-tr from-[#ff6b00] to-orange-400 rounded-3xl rotate-12 flex items-center justify-center shadow-2xl shadow-orange-500/20 mb-6 group hover:rotate-0 transition-all duration-500">
                        <ShieldCheck className="text-white -rotate-12 group-hover:rotate-0 transition-transform" size={40} />
                    </div>
                    <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">
                        KMIT <span className="text-[#ff6b00]">QUIZ</span>
                    </h1>
                    <p className="text-gray-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-2">Elite Assessment Portal</p>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                    {/* Active Indicator */}
                    <div className={`absolute top-0 h-1 bg-[#ff6b00] transition-all duration-500 ${isLogin ? 'left-0 w-1/2' : 'left-1/2 w-1/2'}`}></div>

                    <h2 className="text-2xl font-black text-white mb-8 italic uppercase tracking-tight flex items-center gap-3">
                        {isLogin ? <LogIn className="text-[#ff6b00]" /> : <UserPlus className="text-[#ff6b00]" />}
                        {isLogin ? 'Sign In' : 'Create Account'}
                    </h2>

                    <form onSubmit={onSubmit} className="space-y-6">
                        {!isLogin && (
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Username</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                                        <User size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        name="username"
                                        placeholder="Choose a handle"
                                        value={username}
                                        onChange={onChange}
                                        required={!isLogin}
                                        className="block w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#ff6b00]/50 focus:border-transparent transition-all font-medium"
                                    />
                                </div>
                            </div>
                        )}
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Roll Number</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                                    <Mail size={18} />
                                </div>
                                <input
                                    type="text"
                                    name="email"
                                    placeholder="Enter your Roll Number"
                                    value={email}
                                    onChange={onChange}
                                    required
                                    className="block w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#ff6b00]/50 focus:border-transparent transition-all font-medium"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type="password"
                                    name="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={onChange}
                                    required
                                    className="block w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#ff6b00]/50 focus:border-transparent transition-all font-medium"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full flex justify-center items-center gap-3 py-4 px-6 bg-[#ff6b00] hover:bg-orange-500 text-white rounded-2xl shadow-lg shadow-orange-500/20 text-sm font-black italic uppercase tracking-widest transition-all active:scale-[0.98] mt-4"
                        >
                            {isLogin ? 'Access Portal' : 'Action Forbidden'}
                            <LogIn size={18} />
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-white/5 text-center">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                            Official Student Assessment Gateway
                        </p>
                    </div>
                </div>

                <p className="mt-8 text-center text-gray-600 text-[10px] font-bold uppercase tracking-widest">
                    &copy; 2026 KMIT Advanced Assessment Logic
                </p>
            </div>
        </div>
    );
}
