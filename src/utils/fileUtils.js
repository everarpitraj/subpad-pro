
export const readFileAsText = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ file, text: reader.result });
    reader.onerror = () => reject({ file, error: reader.error });
    reader.readAsText(file);
});
