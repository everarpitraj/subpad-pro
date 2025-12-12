
import { timeToMs } from './timeUtils';

export const loadJSZip = () => {
    return new Promise((resolve, reject) => {
        if (window.JSZip) {
            resolve(window.JSZip);
            return;
        }
        // Check if JSZip is available via import (in a real module environment this is better)
        import('jszip').then((module) => {
            resolve(module.default);
        }).catch(() => {
            // Fallback to CDN for compatibility if needed, but direct import is preferred in Vite
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
            script.onload = () => resolve(window.JSZip);
            script.onerror = () => reject(new Error("Failed to load JSZip"));
            document.head.appendChild(script);
        });
    });
};

export const buildFileContent = (file, format) => {
    const { subtitles, notepadContent } = file;

    if (format === 'raw') {
        return notepadContent;
    }

    if (format === 'vtt') {
        let output = "WEBVTT\n\n";
        output += subtitles.map((sub) => {
            const start = sub.startTime.replace(',', '.');
            const end = sub.endTime.replace(',', '.');
            return `${start} --> ${end}\n${sub.text}\n`;
        }).join('\n');
        return output;
    }
    if (format === 'txt') {
        return subtitles.map(sub => sub.text).join('\n');
    }
    if (format === 'lrc') {
        return subtitles.map(sub => {
            const ms = timeToMs(sub.startTime);
            const minutes = Math.floor(ms / 60000);
            const seconds = Math.floor((ms % 60000) / 1000);
            const hundredths = Math.floor((ms % 1000) / 10);
            const tag = `[${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}]`;
            const cleanText = sub.text.replace(/\n/g, ' ');
            return `${tag}${cleanText}`;
        }).join('\n');
    }
    // Default SRT
    return subtitles.map((sub, index) => {
        return `${index + 1}\n${sub.startTime} --> ${sub.endTime}\n${sub.text}\n`;
    }).join('\n');
};

export const downloadSingleFile = (file, format) => {
    const content = buildFileContent(file, format);
    const extension = format === 'raw' ? 'txt' : format;
    const mimeTypes = { srt: 'text/plain', vtt: 'text/vtt', txt: 'text/plain', lrc: 'text/plain', raw: 'text/plain' };

    const blob = new Blob([content], { type: mimeTypes[format] || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const baseName = file.name.replace(/\.(srt|vtt|txt|lrc)$/i, '');
    a.href = url;
    a.download = `${baseName}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 500);
};

export const downloadZipBundle = async (filesToZip, format, onProgress) => {
    try {
        const JSZip = await loadJSZip();
        const zip = new JSZip();

        filesToZip.forEach(file => {
            const content = buildFileContent(file, format);
            const baseName = file.name.replace(/\.(srt|vtt|txt|lrc)$/i, '');
            const extension = format === 'raw' ? 'txt' : format;
            zip.file(`${baseName}.${extension}`, content);
        });

        const blob = await zip.generateAsync({ type: "blob" }, (metadata) => {
            if (onProgress) onProgress(metadata.percent);
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `subtitles_export_${new Date().toISOString().slice(0, 10)}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 500);
        return true;
    } catch (error) {
        console.error("ZIP Generation failed:", error);
        throw error;
    }
};
