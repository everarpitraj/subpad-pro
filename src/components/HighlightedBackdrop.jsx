
import React from 'react';

const HighlightedBackdrop = ({ text, highlight, darkMode }) => {
    if (!highlight) return <div className="whitespace-pre-wrap word-break-break-word">{text}</div>;

    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
        <div className="whitespace-pre-wrap word-break-break-word">
            {parts.map((part, i) =>
                part.toLowerCase() === highlight.toLowerCase() ? (
                    <span key={i} className={`${darkMode ? 'bg-indigo-500/40 text-transparent' : 'bg-yellow-200 text-transparent'} rounded-[1px]`}>{part}</span>
                ) : (
                    <span key={i}>{part}</span>
                )
            )}
        </div>
    );
};

export default HighlightedBackdrop;
