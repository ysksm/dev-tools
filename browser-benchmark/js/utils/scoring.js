/**
 * Scoring engine for benchmark results
 */
const ScoringEngine = {
    // Baseline values (expected times in ms for a mid-range PC)
    BASELINES: {
        javascript: {
            arrayOperations: 15,
            numericCalculation: 10,
            stringProcessing: 8,
            objectOperations: 5,
            functionCalls: 3
        },
        dom: {
            elementCreation: 20,
            elementRemoval: 15,
            attributeManipulation: 10,
            querySelector: 5,
            textUpdate: 8
        },
        rendering: {
            cssRecalculation: 30,
            animation: 16.67,  // 60fps target
            canvas2d: 50,
            layout: 25
        }
    },

    // Category weights for overall score
    WEIGHTS: {
        javascript: 0.35,
        dom: 0.35,
        rendering: 0.30
    },

    /**
     * Calculate score for a single test
     * Score = (baseline / measured) * 10000
     * Range: 1000 - 15000
     * @param {number} measuredTime - Measured execution time
     * @param {number} baseline - Baseline time for this test
     * @returns {number} Score
     */
    calculateTestScore(measuredTime, baseline) {
        if (measuredTime <= 0) return 15000;
        const rawScore = (baseline / measuredTime) * 10000;
        return Math.max(1000, Math.min(15000, Math.round(rawScore)));
    },

    /**
     * Calculate category score (average of all tests in category)
     * @param {Object} testResults - Object with test names and scores
     * @returns {number} Category score
     */
    calculateCategoryScore(testResults) {
        const scores = Object.values(testResults);
        if (scores.length === 0) return 0;
        return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    },

    /**
     * Calculate overall score (weighted average of categories)
     * @param {Object} categoryScores - Object with category names and scores
     * @returns {number} Overall score
     */
    calculateOverallScore(categoryScores) {
        let totalScore = 0;
        let totalWeight = 0;

        for (const [category, score] of Object.entries(categoryScores)) {
            const weight = this.WEIGHTS[category] || 0;
            totalScore += score * weight;
            totalWeight += weight;
        }

        return totalWeight > 0 ? Math.round(totalScore / totalWeight * (1 / Math.max(...Object.values(this.WEIGHTS)))) : 0;
    },

    /**
     * Get grade based on score
     * @param {number} score - Score value
     * @returns {{grade: string, label: string, color: string, cssClass: string}}
     */
    getGrade(score) {
        if (score >= 12000) {
            return { grade: 'S', label: 'Excellent', color: '#ff6b6b', cssClass: 'grade-s' };
        }
        if (score >= 10000) {
            return { grade: 'A+', label: 'Great', color: '#feca57', cssClass: 'grade-a' };
        }
        if (score >= 8000) {
            return { grade: 'A', label: 'Good', color: '#feca57', cssClass: 'grade-a' };
        }
        if (score >= 6000) {
            return { grade: 'B', label: 'Average', color: '#48dbfb', cssClass: 'grade-b' };
        }
        if (score >= 4000) {
            return { grade: 'C', label: 'Below Avg', color: '#1dd1a1', cssClass: 'grade-c' };
        }
        return { grade: 'D', label: 'Poor', color: '#a0a0a0', cssClass: 'grade-d' };
    },

    /**
     * Get baseline for a specific test
     * @param {string} category - Category name
     * @param {string} testName - Test name
     * @returns {number} Baseline value
     */
    getBaseline(category, testName) {
        return this.BASELINES[category]?.[testName] || 10;
    },

    /**
     * Format score for display
     * @param {number} score - Score value
     * @returns {string} Formatted score
     */
    formatScore(score) {
        return score.toLocaleString();
    },

    /**
     * Format time for display
     * @param {number} time - Time in milliseconds
     * @returns {string} Formatted time
     */
    formatTime(time) {
        if (time < 1) {
            return `${(time * 1000).toFixed(2)} μs`;
        }
        if (time < 1000) {
            return `${time.toFixed(2)} ms`;
        }
        return `${(time / 1000).toFixed(2)} s`;
    }
};
