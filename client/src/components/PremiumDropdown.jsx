import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';

const PremiumDropdown = ({ label, value, options, onChange, icon: Icon, color = 'bg-[#ff6b00]' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="bg-white/5 p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-white/5 flex items-center gap-3 md:gap-4 relative" ref={dropdownRef}>
            <div className={`${color} w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center text-white shadow-xl shrink-0`}>
                {Icon && <Icon className="w-5 h-5 md:w-6 md:h-6" />}
            </div>
            <div className="flex-1">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between text-lg md:text-xl font-black text-white italic outline-none text-left"
                >
                    <span>{value}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 md:w-5 md:h-5" /> : <ChevronDown className="w-4 h-4 md:w-5 md:h-5" />}
                </button>
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-4 bg-[#1e293b] border border-white/10 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2">
                        {options.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                    onChange(opt.value);
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl text-lg font-bold transition-all
                                    ${value === opt.value ? 'bg-[#ff6b00] text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                            >
                                {opt.label}
                                {value === opt.value && <Check size={20} />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PremiumDropdown;
