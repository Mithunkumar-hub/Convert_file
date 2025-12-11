document.addEventListener('DOMContentLoaded', () => {
    // Tabs Logic
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
        });
    });

    // --- JPEG to PDF Logic ---
    const jpegInput = document.getElementById('jpeg-input');
    const jpegDropZone = document.getElementById('drop-zone-jpeg');
    const jpegPreview = document.getElementById('jpeg-preview');
    const convertJpegBtn = document.getElementById('convert-jpeg-btn');
    let jpegFiles = [];

    setupDragAndDrop(jpegDropZone, jpegInput);

    jpegInput.addEventListener('change', (e) => {
        handleJpegFiles(e.target.files);
    });

    function handleJpegFiles(files) {
        for (const file of files) {
            if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
                jpegFiles.push(file);
                const reader = new FileReader();
                reader.onload = (e) => {
                    const div = document.createElement('div');
                    div.className = 'preview-item';
                    div.innerHTML = `<img src="${e.target.result}">`;
                    jpegPreview.appendChild(div);
                };
                reader.readAsDataURL(file);
            }
        }
        updateJpegButton();
    }

    function updateJpegButton() {
        convertJpegBtn.disabled = jpegFiles.length === 0;
        convertJpegBtn.textContent = jpegFiles.length > 0 ? 'Convert to PDF' : 'Convert to PDF';
    }

    convertJpegBtn.addEventListener('click', async () => {
        if (jpegFiles.length === 0) return;

        convertJpegBtn.textContent = 'Converting...';
        convertJpegBtn.disabled = true;

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            for (let i = 0; i < jpegFiles.length; i++) {
                if (i > 0) doc.addPage();

                const imgData = await readFileAsDataURL(jpegFiles[i]);
                const imgProps = doc.getImageProperties(imgData);
                const pdfWidth = doc.internal.pageSize.getWidth();
                const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

                doc.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            }

            doc.save('converted_images.pdf');

            // Reset
            jpegFiles = [];
            jpegPreview.innerHTML = '';
            updateJpegButton();
        } catch (error) {
            console.error(error);
            alert('Error converting images.');
        } finally {
            convertJpegBtn.textContent = 'Convert to PDF';
            updateJpegButton();
        }
    });

    // --- PDF to JPEG Logic ---
    const pdfInput = document.getElementById('pdf-input');
    const pdfDropZone = document.getElementById('drop-zone-pdf');
    const pdfPreview = document.getElementById('pdf-preview');
    const convertPdfBtn = document.getElementById('convert-pdf-btn');
    let pdfFile = null;

    setupDragAndDrop(pdfDropZone, pdfInput);

    pdfInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handlePdfFile(e.target.files[0]);
        }
    });

    function handlePdfFile(file) {
        if (file.type !== 'application/pdf') {
            alert('Please upload a PDF file.');
            return;
        }
        pdfFile = file;
        pdfPreview.innerHTML = `<div class="preview-item" style="width:auto; padding:10px; display:flex; align-items:center;">📄 ${file.name}</div>`;
        convertPdfBtn.disabled = false;
    }

    convertPdfBtn.addEventListener('click', async () => {
        if (!pdfFile) return;

        convertPdfBtn.textContent = 'Converting...';
        convertPdfBtn.disabled = true;

        try {
            const arrayBuffer = await readFileAsArrayBuffer(pdfFile);
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 2 }); // High quality
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({ canvasContext: context, viewport: viewport }).promise;

                const imgData = canvas.toDataURL('image/jpeg', 0.9);
                downloadImage(imgData, `page_${i}.jpg`);
            }
        } catch (error) {
            console.error(error);
            alert('Error converting PDF.');
        } finally {
            convertPdfBtn.textContent = 'Convert to JPEG';
            convertPdfBtn.disabled = false;
        }
    });

    // --- PDF to Word Logic ---
    const pdfWordInput = document.getElementById('pdf-word-input');
    const pdfWordDropZone = document.getElementById('drop-zone-pdf-word');
    const pdfWordPreview = document.getElementById('pdf-word-preview');
    const convertPdfWordBtn = document.getElementById('convert-pdf-word-btn');
    let pdfWordFile = null;

    setupDragAndDrop(pdfWordDropZone, pdfWordInput);

    pdfWordInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handlePdfWordFile(e.target.files[0]);
        }
    });

    function handlePdfWordFile(file) {
        if (file.type !== 'application/pdf') {
            alert('Please upload a PDF file.');
            return;
        }
        pdfWordFile = file;
        pdfWordPreview.innerHTML = `<div class="preview-item" style="width:auto; padding:10px; display:flex; align-items:center;">📝 ${file.name}</div>`;
        convertPdfWordBtn.disabled = false;
    }

    convertPdfWordBtn.addEventListener('click', async () => {
        if (!pdfWordFile) return;

        convertPdfWordBtn.textContent = 'Converting...';
        convertPdfWordBtn.disabled = true;

        try {
            const arrayBuffer = await readFileAsArrayBuffer(pdfWordFile);
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;

            const docChildren = [];

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();

                // Simple extraction: join all items with space
                const pageText = textContent.items.map(item => item.str).join(' ');

                docChildren.push(
                    new docx.Paragraph({
                        children: [new docx.TextRun(pageText)],
                    })
                );

                // Add page break if not last page
                if (i < pdf.numPages) {
                    docChildren.push(new docx.Paragraph({ children: [new docx.PageBreak()] }));
                }
            }

            const doc = new docx.Document({
                sections: [{
                    properties: {},
                    children: docChildren,
                }],
            });

            const blob = await docx.Packer.toBlob(doc);
            downloadBlob(blob, 'converted_document.docx');

        } catch (error) {
            console.error(error);
            alert('Error converting PDF to Word.');
        } finally {
            convertPdfWordBtn.textContent = 'Convert to Word';
            convertPdfWordBtn.disabled = false;
        }
    });


    // --- Word to PDF Logic ---
    const wordPdfInput = document.getElementById('word-pdf-input');
    const wordPdfDropZone = document.getElementById('drop-zone-word-pdf');
    const wordPdfPreview = document.getElementById('word-pdf-preview');
    const convertWordPdfBtn = document.getElementById('convert-word-pdf-btn');
    let wordPdfFile = null;

    setupDragAndDrop(wordPdfDropZone, wordPdfInput);

    wordPdfInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleWordPdfFile(e.target.files[0]);
        }
    });

    function handleWordPdfFile(file) {
        if (!file.name.endsWith('.docx')) {
            alert('Please upload a Word (.docx) file.');
            return;
        }
        wordPdfFile = file;
        wordPdfPreview.innerHTML = `<div class="preview-item" style="width:auto; padding:10px; display:flex; align-items:center;">📑 ${file.name}</div>`;
        convertWordPdfBtn.disabled = false;
    }

    convertWordPdfBtn.addEventListener('click', async () => {
        if (!wordPdfFile) return;

        convertWordPdfBtn.textContent = 'Converting...';
        convertWordPdfBtn.disabled = true;

        try {
            const arrayBuffer = await readFileAsArrayBuffer(wordPdfFile);

            // Extract raw text from docx
            const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
            const text = result.value;

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            // Split text to fit page
            const splitText = doc.splitTextToSize(text, 180);

            let y = 10;
            for (let i = 0; i < splitText.length; i++) {
                if (y > 280) {
                    doc.addPage();
                    y = 10;
                }
                doc.text(splitText[i], 10, y);
                y += 7;
            }

            doc.save('converted_document.pdf');

        } catch (error) {
            console.error(error);
            alert('Error converting Word to PDF.');
        } finally {
            convertWordPdfBtn.textContent = 'Convert to PDF';
            convertWordPdfBtn.disabled = false;
        }
    });

    // --- Merge PDF Logic ---
    const mergePdfInput = document.getElementById('merge-pdf-input');
    const mergePdfDropZone = document.getElementById('drop-zone-merge-pdf');
    const mergePdfPreview = document.getElementById('merge-pdf-preview');
    const mergePdfBtn = document.getElementById('merge-pdf-btn');
    let mergePdfFiles = [];

    setupDragAndDrop(mergePdfDropZone, mergePdfInput);

    mergePdfInput.addEventListener('change', (e) => {
        handleMergePdfFiles(e.target.files);
    });

    function handleMergePdfFiles(files) {
        for (const file of files) {
            if (file.type === 'application/pdf') {
                mergePdfFiles.push(file);
                const div = document.createElement('div');
                div.className = 'preview-item';
                div.style.width = 'auto'; // Auto width for filenames
                div.style.padding = '10px';
                div.style.display = 'flex';
                div.style.alignItems = 'center';
                div.innerHTML = `<span>🔗 ${file.name}</span>`;
                mergePdfPreview.appendChild(div);
            }
        }
        updateMergePdfButton();
    }

    function updateMergePdfButton() {
        mergePdfBtn.disabled = mergePdfFiles.length < 2;
        mergePdfBtn.textContent = mergePdfFiles.length < 2 ? 'Select at least 2 PDFs' : 'Merge PDFs';
    }

    mergePdfBtn.addEventListener('click', async () => {
        if (mergePdfFiles.length < 2) return;

        mergePdfBtn.textContent = 'Merging...';
        mergePdfBtn.disabled = true;

        try {
            const { PDFDocument } = PDFLib;
            const mergedPdf = await PDFDocument.create();

            for (const file of mergePdfFiles) {
                const arrayBuffer = await readFileAsArrayBuffer(file);
                const pdf = await PDFDocument.load(arrayBuffer);
                const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                copiedPages.forEach((page) => mergedPdf.addPage(page));
            }

            const pdfBytes = await mergedPdf.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            downloadBlob(blob, 'merged_document.pdf');

            // Reset
            mergePdfFiles = [];
            mergePdfPreview.innerHTML = '';
            updateMergePdfButton();

        } catch (error) {
            console.error(error);
            alert('Error merging PDFs.');
        } finally {
            updateMergePdfButton();
        }
    });

    // --- Helpers ---
    function setupDragAndDrop(dropZone, input) {
        dropZone.addEventListener('click', () => input.click());

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                if (input === jpegInput) handleJpegFiles(e.dataTransfer.files);
                else if (input === pdfInput) handlePdfFile(e.dataTransfer.files[0]);
                else if (input === pdfWordInput) handlePdfWordFile(e.dataTransfer.files[0]);
                else if (input === wordPdfInput) handleWordPdfFile(e.dataTransfer.files[0]);
                else if (input === mergePdfInput) handleMergePdfFiles(e.dataTransfer.files);
            }
        });
    }

    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    function readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    function downloadImage(dataUrl, filename) {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
});
