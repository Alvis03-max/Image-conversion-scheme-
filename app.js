/**
 * Handwritten Text Scanner & OCR Converter
 * Main Application Logic
 */

class HandwrittenTextScanner {
    constructor() {
        // State
        this.stream = null;
        this.capturedImage = null;
        this.recognizedText = '';
        this.isCameraActive = false;
        this.isProcessing = false;
        this.tesseractWorker = null;

        // DOM Elements
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.canvasContext = this.canvas.getContext('2d');
        this.textOutput = document.getElementById('textOutput');
        this.preview = document.getElementById('preview');
        this.previewContainer = document.getElementById('previewContainer');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.resultsSection = document.querySelector('.results-section');
        this.confidenceInfo = document.getElementById('confidence');
        this.editModal = document.getElementById('editModal');
        this.editTextarea = document.getElementById('editTextarea');

        // Buttons
        this.startCameraBtn = document.getElementById('startCameraBtn');
        this.stopCameraBtn = document.getElementById('stopCameraBtn');
        this.captureBtn = document.getElementById('captureBtn');
        this.imageInput = document.getElementById('imageInput');
        this.recognizeBtn = document.getElementById('recognizeBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.copyBtn = document.getElementById('copyBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.editBtn = document.getElementById('editBtn');
        this.saveEditBtn = document.getElementById('saveEditBtn');
        this.cancelEditBtn = document.getElementById('cancelEditBtn');

        this.initializeEventListeners();
        this.initializeTesseract();
    }

    /**
     * Initialize all event listeners
     */
    initializeEventListeners() {
        // Camera controls
        this.startCameraBtn.addEventListener('click', () => this.startCamera());
        this.stopCameraBtn.addEventListener('click', () => this.stopCamera());
        this.captureBtn.addEventListener('click', () => this.captureImage());

        // Image input
        this.imageInput.addEventListener('change', (e) => this.handleImageUpload(e));
        document.addEventListener('paste', (e) => this.handlePaste(e));

        // Recognition controls
        this.recognizeBtn.addEventListener('click', () => this.recognizeHandwriting());
        this.clearBtn.addEventListener('click', () => this.clearAll());

        // Text actions
        this.copyBtn.addEventListener('click', () => this.copyToClipboard());
        this.downloadBtn.addEventListener('click', () => this.downloadText());
        this.editBtn.addEventListener('click', () => this.openEditModal());

        // Edit modal
        this.saveEditBtn.addEventListener('click', () => this.saveEdit());
        this.cancelEditBtn.addEventListener('click', () => this.closeEditModal());

        // Close modal when clicking outside
        this.editModal.addEventListener('click', (e) => {
            if (e.target === this.editModal) {
                this.closeEditModal();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'c' && this.copyBtn.disabled === false) {
                    e.preventDefault();
                    this.copyToClipboard();
                }
                if (e.key === 'x' && this.copyBtn.disabled === false) {
                    e.preventDefault();
                    this.copyToClipboard();
                    this.clearAll();
                }
            }
        });
    }

    /**
     * Initialize Tesseract.js Worker
     */
    initializeTesseract() {
        console.log('Initializing Tesseract.js...');
        this.tesseractWorker = Tesseract.createWorker({
            errorHandler: (err) => {
                console.error('Tesseract Error:', err);
                this.showError('OCR processing error. Please try again.');
            }
        });
    }

    /**
     * Start camera stream
     */
    async startCamera() {
        try {
            this.startCameraBtn.disabled = true;
            this.showLoading('Initializing camera...');

            const constraints = {
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'environment'
                },
                audio: false
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;
            this.isCameraActive = true;

            this.stopCameraBtn.disabled = false;
            this.captureBtn.disabled = false;
            this.loadingIndicator.classList.remove('active');

            console.log('Camera started successfully');
            this.showNotification('Camera started', 'success');
        } catch (error) {
            console.error('Camera error:', error);
            this.showError(`Camera error: ${error.message}`);
            this.startCameraBtn.disabled = false;
        }
    }

    /**
     * Stop camera stream
     */
    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        this.isCameraActive = false;
        this.video.srcObject = null;
        this.startCameraBtn.disabled = false;
        this.stopCameraBtn.disabled = true;
        this.captureBtn.disabled = true;

        console.log('Camera stopped');
        this.showNotification('Camera stopped', 'info');
    }

    /**
     * Capture image from camera
     */
    captureImage() {
        if (!this.isCameraActive) return;

        this.canvasContext.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        this.canvas.toBlob((blob) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.capturedImage = e.target.result;
                this.displayPreview(this.capturedImage);
                this.recognizeBtn.disabled = false;
                this.showNotification('Image captured successfully', 'success');
            };
            reader.readAsDataURL(blob);
        });
    }

    /**
     * Handle image upload from file input
     */
    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            this.showError('Please select a valid image file');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.capturedImage = e.target.result;
            this.displayPreview(this.capturedImage);
            this.recognizeBtn.disabled = false;
            this.showNotification('Image loaded successfully', 'success');
        };
        reader.onerror = () => {
            this.showError('Error reading file');
        };
        reader.readAsDataURL(file);
    }

    /**
     * Handle pasted images from clipboard
     */
    handlePaste(event) {
        const items = event.clipboardData?.items || [];
        for (let i = 0; i < items.length; i++) {
            if (items[i].kind === 'file' && items[i].type.startsWith('image/')) {
                const file = items[i].getAsFile();
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.capturedImage = e.target.result;
                    this.displayPreview(this.capturedImage);
                    this.recognizeBtn.disabled = false;
                    this.showNotification('Image pasted successfully', 'success');
                };
                reader.readAsDataURL(file);
                break;
            }
        }
    }

    /**
     * Display image preview
     */
    displayPreview(imageSrc) {
        this.preview.src = imageSrc;
        this.previewContainer.classList.add('active');
    }

    /**
     * Recognize handwriting using Tesseract.js
     */
    async recognizeHandwriting() {
        if (!this.capturedImage || this.isProcessing) return;

        this.isProcessing = true;
        this.recognizeBtn.disabled = true;
        this.loadingIndicator.classList.add('active');

        try {
            console.log('Starting OCR recognition...');

            // Initialize worker if needed
            if (!this.tesseractWorker) {
                this.tesseractWorker = Tesseract.createWorker();
            }

            // Recognize text
            const result = await this.tesseractWorker.recognize(this.capturedImage);

            this.recognizedText = result.data.text.trim();
            const confidence = (result.data.confidence || 0).toFixed(2);

            // Display results
            this.textOutput.value = this.recognizedText;
            this.resultsSection.classList.add('active');
            this.copyBtn.disabled = false;
            this.downloadBtn.disabled = false;
            this.editBtn.disabled = false;

            // Show confidence information
            this.displayConfidence(confidence, result.data.lines?.length || 0);

            console.log('OCR Recognition completed:', {
                text: this.recognizedText.substring(0, 100) + '...',
                confidence: confidence,
                lines: result.data.lines?.length || 0
            });

            this.showNotification('Text recognition completed', 'success');
        } catch (error) {
            console.error('Recognition error:', error);
            this.showError(`Recognition failed: ${error.message}`);
        } finally {
            this.isProcessing = false;
            this.recognizeBtn.disabled = false;
            this.loadingIndicator.classList.remove('active');
        }
    }

    /**
     * Display confidence and metadata
     */
    displayConfidence(confidence, lines) {
        const confidencePercentage = parseFloat(confidence);
        const quality = confidencePercentage > 90 ? 'Excellent' :
                       confidencePercentage > 75 ? 'Good' :
                       confidencePercentage > 50 ? 'Fair' : 'Low';

        const htmlContent = `
            <strong>Recognition Quality:</strong> ${quality} (${confidence}%) | 
            <strong>Text Lines:</strong> ${lines} | 
            <strong>Characters:</strong> ${this.recognizedText.length}
        `;

        this.confidenceInfo.innerHTML = htmlContent;
        this.confidenceInfo.classList.add('active');
    }

    /**
     * Copy text to clipboard
     */
    async copyToClipboard() {
        try {
            await navigator.clipboard.writeText(this.recognizedText);
            this.showNotification('Text copied to clipboard', 'success');
        } catch (error) {
            console.error('Copy error:', error);
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = this.recognizedText;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            this.showNotification('Text copied to clipboard', 'success');
        }
    }

    /**
     * Download text as a file
     */
    downloadText() {
        const element = document.createElement('a');
        const file = new Blob([this.recognizedText], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = `handwritten-text-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        this.showNotification('Text downloaded successfully', 'success');
    }

    /**
     * Open edit modal
     */
    openEditModal() {
        this.editTextarea.value = this.recognizedText;
        this.editModal.classList.remove('hidden');
        this.editTextarea.focus();
    }

    /**
     * Save edited text
     */
    saveEdit() {
        this.recognizedText = this.editTextarea.value;
        this.textOutput.value = this.recognizedText;
        this.closeEditModal();
        this.showNotification('Text updated successfully', 'success');
    }

    /**
     * Close edit modal
     */
    closeEditModal() {
        this.editModal.classList.add('hidden');
    }

    /**
     * Clear all data
     */
    clearAll() {
        this.capturedImage = null;
        this.recognizedText = '';
        this.imageInput.value = '';
        this.textOutput.value = '';
        this.preview.src = '';
        this.previewContainer.classList.remove('active');
        this.resultsSection.classList.remove('active');
        this.confidenceInfo.classList.remove('active');
        this.recognizeBtn.disabled = true;
        this.copyBtn.disabled = true;
        this.downloadBtn.disabled = true;
        this.editBtn.disabled = true;
        this.closeEditModal();
        this.showNotification('All data cleared', 'info');
    }

    /**
     * Show loading indicator
     */
    showLoading(message = 'Processing...') {
        this.loadingIndicator.querySelector('p').textContent = message;
        this.loadingIndicator.classList.add('active');
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : '#3498db'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1001;
            animation: slideInRight 0.3s ease-out;
            max-width: 400px;
            font-weight: 600;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);

        // Add animation styles if not present
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(400px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(400px); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * Show error notification
     */
    showError(message) {
        this.showNotification(message, 'error');
    }

    /**
     * Cleanup on page unload
     */
    cleanup() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
        if (this.tesseractWorker) {
            this.tesseractWorker.terminate();
        }
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.scanner = new HandwrittenTextScanner();
    console.log('Handwritten Text Scanner initialized');
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.scanner) {
        window.scanner.cleanup();
    }
});
