/**
 * Browser Benchmark - Main Application
 */
const BenchmarkApp = {
    // UI elements
    elements: {
        btnRunAll: null,
        btnRunJs: null,
        btnRunDom: null,
        btnRunRender: null,
        overallScore: null,
        overallGrade: null,
        barChart: null,
        radarChart: null,
        browserInfo: null
    },

    // Chart instances
    charts: {
        bar: null,
        radar: null
    },

    // Running state
    isRunning: false,

    // Category colors
    colors: {
        javascript: '#f1c40f',
        dom: '#e74c3c',
        rendering: '#9b59b6'
    },

    /**
     * Initialize the application
     */
    init() {
        this.cacheElements();
        this.setupCharts();
        this.setupEventListeners();
        this.displayBrowserInfo();
        ResultsRenderer.showEmpty();
    },

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements.btnRunAll = document.getElementById('btn-run-all');
        this.elements.btnRunJs = document.getElementById('btn-run-js');
        this.elements.btnRunDom = document.getElementById('btn-run-dom');
        this.elements.btnRunRender = document.getElementById('btn-run-render');
        this.elements.overallScore = document.getElementById('overall-score');
        this.elements.overallGrade = document.getElementById('overall-grade');
        this.elements.barChart = document.getElementById('bar-chart');
        this.elements.radarChart = document.getElementById('radar-chart');
        this.elements.browserInfo = document.getElementById('browser-info');
    },

    /**
     * Setup chart instances
     */
    setupCharts() {
        this.charts.bar = ChartRenderer.create(this.elements.barChart);
        this.charts.radar = ChartRenderer.create(this.elements.radarChart);
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        this.elements.btnRunAll.addEventListener('click', () => this.runAll());
        this.elements.btnRunJs.addEventListener('click', () => this.runCategory('javascript'));
        this.elements.btnRunDom.addEventListener('click', () => this.runCategory('dom'));
        this.elements.btnRunRender.addEventListener('click', () => this.runCategory('rendering'));

        // Handle window resize for charts
        window.addEventListener('resize', () => {
            this.setupCharts();
        });
    },

    /**
     * Set running state and update UI
     * @param {boolean} running - Whether benchmarks are running
     */
    setRunning(running) {
        this.isRunning = running;

        const buttons = [
            this.elements.btnRunAll,
            this.elements.btnRunJs,
            this.elements.btnRunDom,
            this.elements.btnRunRender
        ];

        buttons.forEach(btn => {
            btn.disabled = running;
        });
    },

    /**
     * Run all benchmarks
     */
    async runAll() {
        if (this.isRunning) return;

        this.setRunning(true);
        ProgressRenderer.show();
        ResultsRenderer.clear();

        try {
            const results = await ComprehensiveBenchmark.runAll((progress) => {
                ProgressRenderer.update(progress);
            });

            this.displayResults(results);
            ProgressRenderer.complete('Benchmark complete!');
        } catch (error) {
            console.error('Benchmark error:', error);
            ProgressRenderer.error('Benchmark failed: ' + error.message);
        } finally {
            this.setRunning(false);
        }
    },

    /**
     * Run a single category benchmark
     * @param {string} category - Category name
     */
    async runCategory(category) {
        if (this.isRunning) return;

        this.setRunning(true);
        ProgressRenderer.show();
        ResultsRenderer.clear();

        try {
            const results = await ComprehensiveBenchmark.runCategory(category, (progress) => {
                ProgressRenderer.update(progress);
            });

            this.displayResults(results);
            ProgressRenderer.complete('Benchmark complete!');
        } catch (error) {
            console.error('Benchmark error:', error);
            ProgressRenderer.error('Benchmark failed: ' + error.message);
        } finally {
            this.setRunning(false);
        }
    },

    /**
     * Display benchmark results
     * @param {Object} results - Benchmark results
     */
    displayResults(results) {
        // Update overall score
        this.elements.overallScore.textContent = ScoringEngine.formatScore(results.overallScore);

        const grade = results.overallGrade || ScoringEngine.getGrade(results.overallScore);
        this.elements.overallGrade.textContent = grade.grade;
        this.elements.overallGrade.style.color = grade.color;
        this.elements.overallGrade.className = `score-grade ${grade.cssClass}`;

        // Update bar chart
        const barData = [];
        for (const [category, score] of Object.entries(results.categoryScores)) {
            barData.push({
                label: this.getCategoryLabel(category),
                value: score,
                color: this.colors[category]
            });
        }

        if (barData.length > 0) {
            this.charts.bar.drawBarChart(barData);
        }

        // Update radar chart
        const radarData = [];
        for (const [category, score] of Object.entries(results.categoryScores)) {
            radarData.push({
                label: this.getCategoryLabel(category),
                value: score,
                maxValue: 15000
            });
        }

        if (radarData.length >= 3) {
            this.charts.radar.drawRadarChart(radarData);
        }

        // Update results table
        ResultsRenderer.render(results.details);
    },

    /**
     * Get display label for category
     * @param {string} category - Category name
     * @returns {string} Display label
     */
    getCategoryLabel(category) {
        const labels = {
            javascript: 'JavaScript',
            dom: 'DOM',
            rendering: 'Rendering'
        };
        return labels[category] || category;
    },

    /**
     * Display browser information
     */
    displayBrowserInfo() {
        const info = {
            browser: this.detectBrowser(),
            os: this.detectOS(),
            cores: navigator.hardwareConcurrency || 'Unknown',
            memory: navigator.deviceMemory ? `${navigator.deviceMemory}GB` : 'Unknown'
        };

        this.elements.browserInfo.textContent =
            `${info.browser} | ${info.os} | ${info.cores} cores | ${info.memory} RAM`;
    },

    /**
     * Detect browser name and version
     * @returns {string} Browser name
     */
    detectBrowser() {
        const ua = navigator.userAgent;

        if (ua.includes('Firefox/')) {
            const match = ua.match(/Firefox\/(\d+)/);
            return `Firefox ${match ? match[1] : ''}`;
        }
        if (ua.includes('Edg/')) {
            const match = ua.match(/Edg\/(\d+)/);
            return `Edge ${match ? match[1] : ''}`;
        }
        if (ua.includes('Chrome/')) {
            const match = ua.match(/Chrome\/(\d+)/);
            return `Chrome ${match ? match[1] : ''}`;
        }
        if (ua.includes('Safari/') && !ua.includes('Chrome')) {
            const match = ua.match(/Version\/(\d+)/);
            return `Safari ${match ? match[1] : ''}`;
        }

        return 'Unknown Browser';
    },

    /**
     * Detect operating system
     * @returns {string} OS name
     */
    detectOS() {
        const ua = navigator.userAgent;

        if (ua.includes('Mac OS X')) return 'macOS';
        if (ua.includes('Windows')) return 'Windows';
        if (ua.includes('Linux')) return 'Linux';
        if (ua.includes('Android')) return 'Android';
        if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';

        return 'Unknown OS';
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    BenchmarkApp.init();
});
