/**
 * Results table renderer
 */
const ResultsRenderer = {
    table: null,
    tbody: null,

    /**
     * Initialize results renderer
     */
    init() {
        this.table = document.getElementById('results-table');
        this.tbody = this.table.querySelector('tbody');
    },

    /**
     * Clear all results from table
     */
    clear() {
        if (!this.tbody) this.init();
        this.tbody.innerHTML = '';
    },

    /**
     * Render results to table
     * @param {Array} details - Array of result details
     */
    render(details) {
        if (!this.tbody) this.init();

        this.clear();

        for (const result of details) {
            const row = document.createElement('tr');

            // Category
            const categoryCell = document.createElement('td');
            const categoryClass = `category-${result.category === 'javascript' ? 'js' : result.category}`;
            categoryCell.innerHTML = `<span class="${categoryClass}">${result.categoryLabel}</span>`;
            row.appendChild(categoryCell);

            // Test name
            const testCell = document.createElement('td');
            testCell.textContent = result.testLabel;
            row.appendChild(testCell);

            // Time
            const timeCell = document.createElement('td');
            timeCell.textContent = ScoringEngine.formatTime(result.time);
            row.appendChild(timeCell);

            // Score
            const scoreCell = document.createElement('td');
            scoreCell.textContent = ScoringEngine.formatScore(result.score);
            row.appendChild(scoreCell);

            // Grade
            const gradeCell = document.createElement('td');
            gradeCell.innerHTML = `<span class="${result.grade.cssClass}">${result.grade.grade}</span>`;
            row.appendChild(gradeCell);

            this.tbody.appendChild(row);
        }
    },

    /**
     * Add a single result row
     * @param {Object} result - Single result detail
     */
    addRow(result) {
        if (!this.tbody) this.init();

        const row = document.createElement('tr');

        // Category
        const categoryCell = document.createElement('td');
        const categoryClass = `category-${result.category === 'javascript' ? 'js' : result.category}`;
        categoryCell.innerHTML = `<span class="${categoryClass}">${result.categoryLabel}</span>`;
        row.appendChild(categoryCell);

        // Test name
        const testCell = document.createElement('td');
        testCell.textContent = result.testLabel;
        row.appendChild(testCell);

        // Time
        const timeCell = document.createElement('td');
        timeCell.textContent = ScoringEngine.formatTime(result.time);
        row.appendChild(timeCell);

        // Score
        const scoreCell = document.createElement('td');
        scoreCell.textContent = ScoringEngine.formatScore(result.score);
        row.appendChild(scoreCell);

        // Grade
        const gradeCell = document.createElement('td');
        gradeCell.innerHTML = `<span class="${result.grade.cssClass}">${result.grade.grade}</span>`;
        row.appendChild(gradeCell);

        this.tbody.appendChild(row);
    },

    /**
     * Show empty state message
     * @param {string} message - Message to display
     */
    showEmpty(message = 'No results yet. Click "Run All" to start benchmarking.') {
        if (!this.tbody) this.init();

        this.clear();

        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 5;
        cell.style.textAlign = 'center';
        cell.style.padding = '2rem';
        cell.style.color = 'var(--text-secondary)';
        cell.textContent = message;
        row.appendChild(cell);
        this.tbody.appendChild(row);
    }
};
