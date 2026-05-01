import { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const ToastContext = createContext();

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'info', duration = 4000) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);

        if (duration) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed bottom-8 right-8 z-[9999] flex flex-col gap-4 max-w-md w-full pointer-events-none">
                {toasts.map(toast => (
                    <Toast key={toast.id} toast={toast} onRemove={removeToast} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

function Toast({ toast, onRemove }) {
    const { id, message, type } = toast;

    const config = {
        success: {
            icon: CheckCircle,
            bg: 'bg-green-500/10',
            border: 'border-green-500/20',
            text: 'text-green-500',
            iconColor: 'text-green-500'
        },
        error: {
            icon: AlertCircle,
            bg: 'bg-red-500/10',
            border: 'border-red-500/20',
            text: 'text-red-500',
            iconColor: 'text-red-500'
        },
        warning: {
            icon: AlertTriangle,
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/20',
            text: 'text-amber-500',
            iconColor: 'text-amber-500'
        },
        info: {
            icon: Info,
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/20',
            text: 'text-blue-500',
            iconColor: 'text-blue-500'
        }
    };

    const { icon: Icon, bg, border, text, iconColor } = config[type] || config.info;

    return (
        <div className={`pointer-events-auto flex items-center gap-4 p-6 rounded-3xl border ${bg} ${border} backdrop-blur-xl shadow-2xl animate-in slide-in-from-right-full duration-300 ring-1 ring-white/5`}>
            <div className={`${iconColor} shrink-0`}>
                <Icon size={24} />
            </div>
            <p className={`flex-1 font-black italic uppercase tracking-tighter text-sm ${text}`}>
                {message}
            </p>
            <button
                onClick={() => onRemove(id)}
                className="text-slate-500 hover:text-white transition-colors"
            >
                <X size={18} />
            </button>
        </div>
    );
}

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within ToastProvider');
    return context;
};
