/**
 * Progress bar UI component
 */
const ProgressRenderer = {
    elements: {
        container: null,
        bar: null,
        text: null
    },

    /**
     * Initialize progress renderer
     */
    init() {
        this.elements.container = document.getElementById('progress-container');
        this.elements.bar = document.getElementById('progress-bar');
        this.elements.text = document.getElementById('progress-text');
    },

    /**
     * Show progress bar and set running state
     */
    show() {
        if (!this.elements.container) this.init();

        this.elements.container.classList.add('running');
        this.elements.bar.style.width = '0%';
        this.elements.text.textContent = 'Starting...';
    },

    /**
     * Hide progress bar and remove running state
     */
    hide() {
        if (!this.elements.container) this.init();

        this.elements.container.classList.remove('running');
    },

    /**
     * Update progress bar
     * @param {Object} progress - Progress info
     * @param {number} progress.progress - Progress value (0-1)
     * @param {string} progress.message - Status message
     */
    update(progress) {
        if (!this.elements.bar) this.init();

        const percent = Math.round(progress.progress * 100);
        this.elements.bar.style.width = `${percent}%`;
        this.elements.text.textContent = progress.message || `${percent}%`;
    },

    /**
     * Set progress to complete state
     * @param {string} message - Completion message
     */
    complete(message = 'Complete!') {
        if (!this.elements.bar) this.init();

        this.elements.bar.style.width = '100%';
        this.elements.text.textContent = message;

        setTimeout(() => {
            this.reset();
        }, 2000);
    },

    /**
     * Reset progress bar to initial state
     */
    reset() {
        if (!this.elements.bar) this.init();

        this.elements.container.classList.remove('running');
        this.elements.bar.style.width = '0%';
        this.elements.text.textContent = 'Ready';
    },

    /**
     * Show error state
     * @param {string} message - Error message
     */
    error(message = 'Error occurred') {
        if (!this.elements.bar) this.init();

        this.elements.container.classList.remove('running');
        this.elements.bar.style.width = '100%';
        this.elements.bar.style.background = '#e74c3c';
        this.elements.text.textContent = message;

        setTimeout(() => {
            this.elements.bar.style.background = '';
            this.reset();
        }, 3000);
    }
};
