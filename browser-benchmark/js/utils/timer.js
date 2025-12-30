/**
 * High-precision timer utility using performance.now()
 */
const Timer = {
    /**
     * Get current high-resolution timestamp
     * @returns {number} Timestamp in milliseconds
     */
    now() {
        return performance.now();
    },

    /**
     * Measure execution time of a synchronous function
     * @param {Function} fn - Function to measure
     * @returns {{result: any, time: number}} Result and execution time
     */
    measure(fn) {
        const start = this.now();
        const result = fn();
        const time = this.now() - start;
        return { result, time };
    },

    /**
     * Measure execution time of an async function
     * @param {Function} fn - Async function to measure
     * @returns {Promise<{result: any, time: number}>} Result and execution time
     */
    async measureAsync(fn) {
        const start = this.now();
        const result = await fn();
        const time = this.now() - start;
        return { result, time };
    },

    /**
     * Run a function multiple times and collect timing data
     * @param {Function} fn - Function to benchmark
     * @param {number} iterations - Number of iterations
     * @param {number} warmup - Warmup iterations (not measured)
     * @returns {number[]} Array of execution times
     */
    benchmark(fn, iterations = 100, warmup = 5) {
        // Warmup runs
        for (let i = 0; i < warmup; i++) {
            fn();
        }

        // Measured runs
        const times = [];
        for (let i = 0; i < iterations; i++) {
            const { time } = this.measure(fn);
            times.push(time);
        }

        return times;
    },

    /**
     * Run an async function multiple times and collect timing data
     * @param {Function} fn - Async function to benchmark
     * @param {number} iterations - Number of iterations
     * @param {number} warmup - Warmup iterations
     * @returns {Promise<number[]>} Array of execution times
     */
    async benchmarkAsync(fn, iterations = 100, warmup = 5) {
        // Warmup runs
        for (let i = 0; i < warmup; i++) {
            await fn();
        }

        // Measured runs
        const times = [];
        for (let i = 0; i < iterations; i++) {
            const { time } = await this.measureAsync(fn);
            times.push(time);
        }

        return times;
    },

    /**
     * Delay execution for a specified time
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise<void>}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};
