/**
 * Comprehensive benchmark orchestrator
 * Runs all benchmark categories and aggregates results
 */
const ComprehensiveBenchmark = {
    name: 'comprehensive',
    label: 'Comprehensive',

    /**
     * Get all benchmark categories
     * @returns {Object} Benchmark objects by category
     */
    getCategories() {
        return {
            javascript: JavaScriptBenchmark,
            dom: DOMBenchmark,
            rendering: RenderingBenchmark
        };
    },

    /**
     * Get total number of tests across all categories
     * @returns {number}
     */
    getTotalTestCount() {
        const categories = this.getCategories();
        let count = 0;
        for (const benchmark of Object.values(categories)) {
            count += Object.keys(benchmark.tests).length;
        }
        return count;
    },

    /**
     * Run all benchmarks across all categories
     * @param {Function} onProgress - Progress callback ({category, test, progress, message})
     * @returns {Promise<Object>} Complete benchmark results
     */
    async runAll(onProgress) {
        const categories = this.getCategories();
        const totalTests = this.getTotalTestCount();
        let completedTests = 0;

        const results = {
            categories: {},
            categoryScores: {},
            details: [],
            overallScore: 0,
            timestamp: new Date().toISOString()
        };

        for (const [categoryName, benchmark] of Object.entries(categories)) {
            if (onProgress) {
                onProgress({
                    category: categoryName,
                    test: null,
                    progress: completedTests / totalTests,
                    message: `Running ${benchmark.label} benchmarks...`
                });
            }

            // Run category benchmark
            const categoryResults = await benchmark.run((testName, testProgress) => {
                if (onProgress) {
                    onProgress({
                        category: categoryName,
                        test: testName,
                        progress: (completedTests + testProgress * Object.keys(benchmark.tests).length) / totalTests,
                        message: `${benchmark.label}: ${testName}`
                    });
                }
            });

            // Store results
            results.categories[categoryName] = categoryResults;

            // Calculate category score
            const testScores = {};
            for (const [testName, testResult] of Object.entries(categoryResults)) {
                testScores[testName] = testResult.score;

                // Add to details array
                results.details.push({
                    category: categoryName,
                    categoryLabel: benchmark.label,
                    test: testName,
                    testLabel: testResult.label,
                    time: testResult.time,
                    score: testResult.score,
                    grade: testResult.grade
                });
            }

            results.categoryScores[categoryName] = ScoringEngine.calculateCategoryScore(testScores);

            completedTests += Object.keys(benchmark.tests).length;
        }

        // Calculate overall score
        results.overallScore = ScoringEngine.calculateOverallScore(results.categoryScores);
        results.overallGrade = ScoringEngine.getGrade(results.overallScore);

        if (onProgress) {
            onProgress({
                category: null,
                test: null,
                progress: 1,
                message: 'Benchmark complete!'
            });
        }

        return results;
    },

    /**
     * Run a single category benchmark
     * @param {string} categoryName - Category to run
     * @param {Function} onProgress - Progress callback
     * @returns {Promise<Object>} Category results
     */
    async runCategory(categoryName, onProgress) {
        const categories = this.getCategories();
        const benchmark = categories[categoryName];

        if (!benchmark) {
            throw new Error(`Unknown category: ${categoryName}`);
        }

        const results = {
            categories: {},
            categoryScores: {},
            details: [],
            overallScore: 0,
            timestamp: new Date().toISOString()
        };

        // Run category benchmark
        const categoryResults = await benchmark.run((testName, testProgress) => {
            if (onProgress) {
                onProgress({
                    category: categoryName,
                    test: testName,
                    progress: testProgress,
                    message: `${benchmark.label}: ${testName}`
                });
            }
        });

        // Store results
        results.categories[categoryName] = categoryResults;

        // Calculate category score
        const testScores = {};
        for (const [testName, testResult] of Object.entries(categoryResults)) {
            testScores[testName] = testResult.score;

            // Add to details array
            results.details.push({
                category: categoryName,
                categoryLabel: benchmark.label,
                test: testName,
                testLabel: testResult.label,
                time: testResult.time,
                score: testResult.score,
                grade: testResult.grade
            });
        }

        results.categoryScores[categoryName] = ScoringEngine.calculateCategoryScore(testScores);
        results.overallScore = results.categoryScores[categoryName];
        results.overallGrade = ScoringEngine.getGrade(results.overallScore);

        return results;
    }
};
