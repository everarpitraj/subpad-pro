
import React, { useState, useEffect } from 'react';
import { timeToMs, msToTime } from '../utils/timeUtils';

const TimestampInput = ({ value, onChange, onBlur, darkMode }) => {
    const [localValue, setLocalValue] = useState(value);

    useEffect(() => { setLocalValue(value); }, [value]);

    const handleChange = (e) => {
        let val = e.target.value;
        if (!/^[\d:,]*$/.test(val)) return;
        setLocalValue(val);
    };

    const handleBlur = () => {
        const regex = /^\d{2}:\d{2}:\d{2},\d{3}$/;
        if (!regex.test(localValue)) {
            setLocalValue(value);
        } else {
            onChange(localValue);
            if (onBlur) onBlur();
        }
    };

    const adjustTime = (amountMs) => {
        const ms = timeToMs(localValue);
        const newTime = Math.max(0, ms + amountMs);
        const newStr = msToTime(newTime);
        setLocalValue(newStr);
        onChange(newStr);
    };

    return (
        <div className={`flex items-center rounded-md p-0.5 transition-colors duration-500 ease-in-out border shadow-sm ${darkMode
                ? 'bg-[#18181b] border-zinc-700 hover:border-zinc-600'
                : 'bg-white border-zinc-200 hover:border-zinc-300'
            }`}>
            <button
                onClick={() => adjustTime(-100)}
                className={`w-5 h-full flex items-center justify-center rounded text-[10px] transition-colors duration-300 ${darkMode ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800' : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100'
                    }`}
                tabIndex={-1}
            >
                -
            </button>
            <input
                type="text"
                value={localValue}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-20 font-mono text-[11px] text-center outline-none bg-transparent font-medium tracking-tight transition-colors duration-500 ${darkMode
                        ? 'text-zinc-200 focus:text-indigo-400 selection:bg-indigo-500/30'
                        : 'text-zinc-700 focus:text-indigo-600 selection:bg-indigo-100'
                    }`}
                maxLength={12}
                placeholder="00:00:00,000"
            />
            <button
                onClick={() => adjustTime(100)}
                className={`w-5 h-full flex items-center justify-center rounded text-[10px] transition-colors duration-300 ${darkMode ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800' : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100'
                    }`}
                tabIndex={-1}
            >
                +
            </button>
        </div>
    );
};

export default TimestampInput;
