import { createContext, useState, useEffect } from 'react';
import api from '../utils/api';

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

    const login = async (email, password) => {
        const res = await api.post('/auth/login', { email, password });
        localStorage.setItem('token', res.data.token);
        const userRes = await api.get('/auth/me');
        setUser(userRes.data);
        return userRes.data;
    };

    const register = async (username, email, password) => {
        const res = await api.post('/auth/register', { username, email, password });
        localStorage.setItem('token', res.data.token);
        const userRes = await api.get('/auth/me');
        setUser(userRes.data);
        return userRes.data;
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
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, setRole }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
