/**
 * Statistical calculation utilities
 */
const Statistics = {
    /**
     * Calculate mean (average)
     * @param {number[]} values - Array of numbers
     * @returns {number} Mean value
     */
    mean(values) {
        if (values.length === 0) return 0;
        return values.reduce((a, b) => a + b, 0) / values.length;
    },

    /**
     * Calculate median
     * @param {number[]} values - Array of numbers
     * @returns {number} Median value
     */
    median(values) {
        if (values.length === 0) return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0
            ? sorted[mid]
            : (sorted[mid - 1] + sorted[mid]) / 2;
    },

    /**
     * Calculate standard deviation
     * @param {number[]} values - Array of numbers
     * @returns {number} Standard deviation
     */
    standardDeviation(values) {
        if (values.length === 0) return 0;
        const avg = this.mean(values);
        const squareDiffs = values.map(v => Math.pow(v - avg, 2));
        return Math.sqrt(this.mean(squareDiffs));
    },

    /**
     * Calculate variance
     * @param {number[]} values - Array of numbers
     * @returns {number} Variance
     */
    variance(values) {
        if (values.length === 0) return 0;
        const avg = this.mean(values);
        const squareDiffs = values.map(v => Math.pow(v - avg, 2));
        return this.mean(squareDiffs);
    },

    /**
     * Get minimum value
     * @param {number[]} values - Array of numbers
     * @returns {number} Minimum value
     */
    min(values) {
        return Math.min(...values);
    },

    /**
     * Get maximum value
     * @param {number[]} values - Array of numbers
     * @returns {number} Maximum value
     */
    max(values) {
        return Math.max(...values);
    },

    /**
     * Calculate percentile
     * @param {number[]} values - Array of numbers
     * @param {number} p - Percentile (0-100)
     * @returns {number} Percentile value
     */
    percentile(values, p) {
        if (values.length === 0) return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const index = (p / 100) * (sorted.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        if (lower === upper) return sorted[lower];
        return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
    },

    /**
     * Remove outliers using IQR method
     * @param {number[]} values - Array of numbers
     * @param {number} multiplier - IQR multiplier (default 1.5)
     * @returns {number[]} Array without outliers
     */
    removeOutliers(values, multiplier = 1.5) {
        if (values.length < 4) return values;

        const sorted = [...values].sort((a, b) => a - b);
        const q1 = this.percentile(sorted, 25);
        const q3 = this.percentile(sorted, 75);
        const iqr = q3 - q1;
        const lower = q1 - multiplier * iqr;
        const upper = q3 + multiplier * iqr;

        return values.filter(v => v >= lower && v <= upper);
    },

    /**
     * Get reliable measurement statistics
     * @param {number[]} values - Array of timing measurements
     * @returns {{mean: number, median: number, stdDev: number, min: number, max: number, sampleSize: number, confidence: number}}
     */
    getReliableMeasurement(values) {
        const cleaned = this.removeOutliers(values);
        return {
            mean: this.mean(cleaned),
            median: this.median(cleaned),
            stdDev: this.standardDeviation(cleaned),
            min: this.min(cleaned),
            max: this.max(cleaned),
            sampleSize: cleaned.length,
            confidence: cleaned.length / values.length
        };
    }
};
