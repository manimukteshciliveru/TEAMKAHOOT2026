import { createContext, useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkUser = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                // api.js handles setting the auth token interceptor
                try {
                    const res = await api.get('/auth/me');
                    setUser(res.data);
                } catch (err) {
                    localStorage.removeItem('token');
                }
            }
            setLoading(false);
        };
        checkUser();
    }, []);

    const login = async (identifier, password) => {
        try {
            const res = await api.post('/auth/login', { identifier, password });
            localStorage.setItem('token', res.data.token);
            const userRes = await api.get('/auth/me');
            setUser(userRes.data);
            toast.success(`Welcome back, ${userRes.data.name || 'User'}!`, {
                icon: '👋',
            });
            return userRes.data;
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Login failed. Please check your credentials.');
            throw err;
        }
    };

    const register = async (name, identifier, password) => {
        try {
            const res = await api.post('/auth/register', { name, identifier, password });
            localStorage.setItem('token', res.data.token);
            const userRes = await api.get('/auth/me');
            setUser(userRes.data);
            toast.success('Account created successfully!');
            return userRes.data;
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Registration failed.');
            throw err;
        }
    };

    const setRole = async (role) => {
        const res = await api.post('/auth/set-role', { role });
        // Update user state with new role
        setUser({ ...user, role: res.data.role });
        return res.data;
    }

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        toast('Logged out successfully', {
            icon: '🚪',
        });
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, setRole }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
