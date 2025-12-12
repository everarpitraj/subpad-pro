
import React from 'react';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle = ({ darkMode, setDarkMode }) => {
    return (
        <button
            onClick={() => setDarkMode(!darkMode)}
            className={`relative w-14 h-7 rounded-full flex items-center transition-colors duration-500 ease-in-out focus:outline-none shadow-inner active:scale-95 border ${darkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-200 border-zinc-300'
                }`}
            aria-label="Toggle Dark Mode"
        >
            <span className={`absolute left-2 text-amber-400 transition-all duration-500 ease-in-out ${darkMode ? 'opacity-0 scale-50 -rotate-90' : 'opacity-100 scale-100 rotate-0'}`}>
                <Sun size={14} fill="currentColor" />
            </span>
            <span className={`absolute right-2 text-indigo-300 transition-all duration-500 ease-in-out ${darkMode ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 rotate-90'}`}>
                <Moon size={14} fill="currentColor" />
            </span>
            <span
                className={`absolute left-0.5 bg-white w-6 h-6 rounded-full shadow-md transform transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) flex items-center justify-center ${darkMode
                        ? 'translate-x-7 rotate-[360deg] border border-zinc-700'
                        : 'translate-x-0 rotate-0 border border-zinc-100'
                    }`}
            >
                {darkMode ? (
                    <Moon size={12} className="text-zinc-900 transition-opacity duration-300" fill="currentColor" />
                ) : (
                    <Sun size={12} className="text-amber-500 transition-opacity duration-300" fill="currentColor" />
                )}
            </span>
        </button>
    );
};

export default ThemeToggle;
