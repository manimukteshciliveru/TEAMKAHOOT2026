import React from 'react';

const PremiumNumberInput = ({ label, value, onChange, icon: Icon, min = 1, max = 100, step = 1, suffix = '' }) => {
    return (
        <div className="bg-white/5 p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-white/5 flex items-center gap-3 md:gap-4 group transition-all hover:bg-white/10">
            <div className="bg-[#ff6b00] w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center text-white shadow-xl group-hover:scale-110 transition-transform">
                {Icon && <Icon className="w-5 h-5 md:w-6 md:h-6" />}
            </div>
            <div className="flex-1">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
                <div className="flex items-baseline gap-2">
                    <input
                        type="number"
                        min={min}
                        max={max}
                        step={step}
                        value={value}
                        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
                        className="bg-transparent border-none text-2xl md:text-4xl font-black text-white italic outline-none w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    {suffix && <span className="text-sm md:text-xl font-black text-slate-600 italic uppercase">{suffix}</span>}
                </div>
            </div>
        </div>
    );
};

export default PremiumNumberInput;
