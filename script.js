document.addEventListener('DOMContentLoaded', () => {
    // Tabs Logic with 3D Flip Animation
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');
    let isAnimating = false;

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Prevent rapid clicking during animation
            if (isAnimating) return;

            const targetTab = tab.dataset.tab;
            const currentActive = document.querySelector('.tab-content.active');
            const newActive = document.getElementById(targetTab);

            // If clicking the same tab, do nothing
            if (currentActive === newActive) return;

            isAnimating = true;

            // Add flip-out animation to current tab
            if (currentActive) {
                currentActive.classList.add('flip-out');

                // Wait for flip-out animation to complete
                setTimeout(() => {
                    currentActive.classList.remove('active', 'flip-out');

                    // Update active tab button
                    tabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');

                    // Show new tab with flip-in animation
                    newActive.classList.add('active');

                    // Allow new animations after flip-in completes
                    setTimeout(() => {
                        isAnimating = false;
                    }, 600);
                }, 300); // Half of the animation duration
            } else {
                // First load, no flip-out needed
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                newActive.classList.add('active');

                setTimeout(() => {
                    isAnimating = false;
                }, 600);
            }
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

            // Reset
            pdfFile = null;
            pdfPreview.innerHTML = '';
            pdfInput.value = '';
            convertPdfBtn.disabled = true;
        } catch (error) {
            console.error(error);
            alert('Error converting PDF.');
        } finally {
            convertPdfBtn.textContent = 'Convert to JPEG';
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

            // Reset
            pdfWordFile = null;
            pdfWordPreview.innerHTML = '';
            pdfWordInput.value = '';
            convertPdfWordBtn.disabled = true;
        } catch (error) {
            console.error(error);
            alert('Error converting PDF to Word.');
        } finally {
            convertPdfWordBtn.textContent = 'Convert to Word';
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

            // Reset
            wordPdfFile = null;
            wordPdfPreview.innerHTML = '';
            wordPdfInput.value = '';
            convertWordPdfBtn.disabled = true;
        } catch (error) {
            console.error(error);
            alert('Error converting Word to PDF.');
        } finally {
            convertWordPdfBtn.textContent = 'Convert to PDF';
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

    // --- Split PDF Logic ---
    const splitPdfInput = document.getElementById('split-pdf-input');
    const splitPdfDropZone = document.getElementById('drop-zone-split-pdf');
    const splitPdfPreview = document.getElementById('split-pdf-preview');
    const splitPdfBtn = document.getElementById('split-pdf-btn');
    const splitOptions = document.querySelector('.split-options');
    const splitRangeInput = document.getElementById('split-range');
    const splitModeRadios = document.getElementsByName('split-mode');
    let splitPdfFile = null;

    setupDragAndDrop(splitPdfDropZone, splitPdfInput);

    splitPdfInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleSplitPdfFile(e.target.files[0]);
        }
    });

    // Toggle range input based on selection
    splitModeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            splitRangeInput.disabled = e.target.value !== 'range';
            if (e.target.value === 'range') {
                splitRangeInput.focus();
            }
        });
    });

    function handleSplitPdfFile(file) {
        if (file.type !== 'application/pdf') {
            alert('Please upload a PDF file.');
            return;
        }
        splitPdfFile = file;
        splitPdfPreview.innerHTML = `<div class="preview-item" style="width:auto; padding:10px; display:flex; align-items:center;">✂️ ${file.name}</div>`;
        splitPdfBtn.disabled = false;
        splitOptions.style.display = 'block';
    }

    splitPdfBtn.addEventListener('click', async () => {
        if (!splitPdfFile) return;

        splitPdfBtn.textContent = 'Splitting...';
        splitPdfBtn.disabled = true;

        try {
            const arrayBuffer = await readFileAsArrayBuffer(splitPdfFile);
            const { PDFDocument } = PDFLib;
            const pdfDoc = await PDFDocument.load(arrayBuffer);
            const totalPages = pdfDoc.getPageCount();

            const mode = document.querySelector('input[name="split-mode"]:checked').value;

            if (mode === 'all') {
                // Split all pages into separate files
                for (let i = 0; i < totalPages; i++) {
                    const newPdf = await PDFDocument.create();
                    const [page] = await newPdf.copyPages(pdfDoc, [i]);
                    newPdf.addPage(page);
                    const pdfBytes = await newPdf.save();
                    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                    downloadBlob(blob, `page_${i + 1}.pdf`);
                }
            } else {
                // Extract specific pages
                const rangeStr = splitRangeInput.value.trim();
                if (!rangeStr) {
                    alert('Please enter page numbers to extract.');
                    splitPdfBtn.disabled = false;
                    splitPdfBtn.textContent = 'Split PDF';
                    return;
                }

                const pagesToExtract = parsePageRange(rangeStr, totalPages);
                if (pagesToExtract.length === 0) {
                    alert('Invalid page range.');
                    splitPdfBtn.disabled = false;
                    splitPdfBtn.textContent = 'Split PDF';
                    return;
                }

                const newPdf = await PDFDocument.create();
                const copiedPages = await newPdf.copyPages(pdfDoc, pagesToExtract);
                copiedPages.forEach(page => newPdf.addPage(page));

                const pdfBytes = await newPdf.save();
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                downloadBlob(blob, 'extracted_pages.pdf');
            }

            // Reset
            splitPdfFile = null;
            splitPdfPreview.innerHTML = '';
            splitPdfInput.value = '';
            splitRangeInput.value = '';
            splitOptions.style.display = 'none';
            splitPdfBtn.disabled = true;
        } catch (error) {
            console.error(error);
            alert('Error splitting PDF.');
        } finally {
            splitPdfBtn.textContent = 'Split PDF';
        }
    });

    function parsePageRange(rangeStr, maxPages) {
        const pages = new Set();
        const parts = rangeStr.split(',');

        for (const part of parts) {
            const trimPart = part.trim();
            if (trimPart.includes('-')) {
                const [start, end] = trimPart.split('-').map(num => parseInt(num));
                if (!isNaN(start) && !isNaN(end)) {
                    for (let i = start; i <= end; i++) {
                        if (i >= 1 && i <= maxPages) pages.add(i - 1); // 0-indexed
                    }
                }
            } else {
                const num = parseInt(trimPart);
                if (!isNaN(num) && num >= 1 && num <= maxPages) {
                    pages.add(num - 1);
                }
            }
        }
        return Array.from(pages).sort((a, b) => a - b);
    }

    // --- PPT to PDF Logic ---
    const pptPdfInput = document.getElementById('ppt-pdf-input');
    const pptPdfDropZone = document.getElementById('drop-zone-ppt-pdf');
    const pptPdfPreview = document.getElementById('ppt-pdf-preview');
    const convertPptPdfBtn = document.getElementById('convert-ppt-pdf-btn');
    let pptPdfFile = null;

    setupDragAndDrop(pptPdfDropZone, pptPdfInput);

    pptPdfInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handlePptPdfFile(e.target.files[0]);
        }
    });

    function handlePptPdfFile(file) {
        if (!file.name.endsWith('.pptx')) {
            alert('Please upload a PowerPoint (.pptx) file.');
            return;
        }
        pptPdfFile = file;
        pptPdfPreview.innerHTML = `<div class="preview-item" style="width:auto; padding:10px; display:flex; align-items:center;">📊 ${file.name}</div>`;
        convertPptPdfBtn.disabled = false;
    }

    convertPptPdfBtn.addEventListener('click', async () => {
        if (!pptPdfFile) return;

        convertPptPdfBtn.textContent = 'Converting...';
        convertPptPdfBtn.disabled = true;

        try {
            const arrayBuffer = await readFileAsArrayBuffer(pptPdfFile);
            const zip = await JSZip.loadAsync(arrayBuffer);

            // Find all slide files
            const slideFiles = Object.keys(zip.files).filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'));

            // Sort slides numerically
            slideFiles.sort((a, b) => {
                const numA = parseInt(a.match(/slide(\d+)\.xml/)[1]);
                const numB = parseInt(b.match(/slide(\d+)\.xml/)[1]);
                return numA - numB;
            });

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            let hasContent = false;

            for (let i = 0; i < slideFiles.length; i++) {
                if (i > 0) doc.addPage();

                const slideXml = await zip.file(slideFiles[i]).async('string');
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(slideXml, 'text/xml');

                // Extract text from <a:t> elements
                const textElements = xmlDoc.getElementsByTagName('a:t');
                let slideText = '';

                for (let j = 0; j < textElements.length; j++) {
                    slideText += textElements[j].textContent + ' ';
                }

                // Add text to PDF
                // Split text to fit page
                const splitText = doc.splitTextToSize(slideText, 180);
                let y = 10;

                doc.setFontSize(14);
                doc.text(`Slide ${i + 1}`, 10, y);
                y += 10;

                doc.setFontSize(10);
                for (let k = 0; k < splitText.length; k++) {
                    if (y > 280) {
                        doc.addPage();
                        y = 10;
                    }
                    doc.text(splitText[k], 10, y);
                    y += 7;
                }

                if (slideText.trim().length > 0) hasContent = true;
            }

            if (!hasContent && slideFiles.length > 0) {
                doc.text("No extractable text found in slides.", 10, 20);
            }

            doc.save('converted_presentation.pdf');

            // Reset
            pptPdfFile = null;
            pptPdfPreview.innerHTML = '';
            pptPdfInput.value = '';
            convertPptPdfBtn.disabled = true;
        } catch (error) {
            console.error(error);
            alert('Error converting PPT to PDF.');
        } finally {
            convertPptPdfBtn.textContent = 'Convert to PDF';
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
                else if (input === splitPdfInput) handleSplitPdfFile(e.dataTransfer.files[0]);
                else if (input === pptPdfInput) handlePptPdfFile(e.dataTransfer.files[0]);
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
