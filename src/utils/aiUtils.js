
export const callAiApi = async (text, instruction) => {
    const apiKey = ""; // Runtime provided or Env var
    // In a real app, you'd likely proxy this through your own backend to hide the key,
    // or prompt the user to enter their key in settings.

    if (!apiKey) {
        console.warn("No API Key provided for AI");
        return null;
    }

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `Instruction: ${instruction}\n\nInput Text:\n${text}` }] }]
                })
            }
        );
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text;
    } catch (error) {
        console.error("AI API Error:", error);
        return null;
    }
};
