import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';

const ProtectedRoute = ({ children, roles = [], allowNone = false }) => {
    const { user, loading } = useContext(AuthContext);

    if (loading) {
        return <div className="flex justify-center items-center h-screen">Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" />;
    }

    // If we are on role selection page (allowNone=true), checking if role is already set
    if (allowNone) {
        if (user.role !== 'none') {
            if (user.role === 'teacher') return <Navigate to="/teacher-dashboard" />;
            if (user.role === 'student') return <Navigate to="/student-dashboard" />;
            if (user.role === 'admin') return <Navigate to="/admin-dashboard" />;
        }
        return children;
    }

    // If user hasn't selected a role yet, force them to selection
    if (user.role === 'none') {
        return <Navigate to="/select-role" />;
    }

    // Role based access control
    if (roles && !roles.includes(user.role)) {
        // Redirect to their appropriate dashboard
        if (user.role === 'teacher') return <Navigate to="/teacher-dashboard" />;
        if (user.role === 'student') return <Navigate to="/student-dashboard" />;
        if (user.role === 'admin') return <Navigate to="/admin-dashboard" />;
        return <Navigate to="/login" />; // Fallback
    }

    return children;
};

export default ProtectedRoute;
