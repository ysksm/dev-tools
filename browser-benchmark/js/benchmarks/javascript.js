/**
 * JavaScript execution speed benchmarks
 */
const JavaScriptBenchmark = {
    name: 'javascript',
    label: 'JavaScript',

    tests: {
        arrayOperations: {
            name: 'arrayOperations',
            label: 'Array Operations',
            description: 'map, filter, reduce, sort on 100k elements'
        },
        numericCalculation: {
            name: 'numericCalculation',
            label: 'Numeric Calculation',
            description: 'Fibonacci, prime check, matrix multiplication'
        },
        stringProcessing: {
            name: 'stringProcessing',
            label: 'String Processing',
            description: 'Concatenation, regex, JSON parse/stringify'
        },
        objectOperations: {
            name: 'objectOperations',
            label: 'Object Operations',
            description: 'Creation, property access, Object.keys/values'
        },
        functionCalls: {
            name: 'functionCalls',
            label: 'Function Calls',
            description: 'Simple functions, closures, recursion'
        }
    },

    /**
     * Run all JavaScript benchmarks
     * @param {Function} onProgress - Progress callback
     * @returns {Promise<Object>} Test results
     */
    async run(onProgress) {
        const results = {};
        const testNames = Object.keys(this.tests);

        for (let i = 0; i < testNames.length; i++) {
            const testName = testNames[i];
            const test = this.tests[testName];

            if (onProgress) {
                onProgress(test.label, (i + 1) / testNames.length);
            }

            // Run test multiple times
            const times = Timer.benchmark(() => this[`run_${testName}`](), 20, 3);
            const stats = Statistics.getReliableMeasurement(times);

            const baseline = ScoringEngine.getBaseline('javascript', testName);
            const score = ScoringEngine.calculateTestScore(stats.mean, baseline);

            results[testName] = {
                ...test,
                time: stats.mean,
                score,
                grade: ScoringEngine.getGrade(score),
                stats
            };

            // Small delay between tests
            await Timer.delay(50);
        }

        return results;
    },

    /**
     * Array operations benchmark
     */
    run_arrayOperations() {
        const size = 100000;
        const arr = Array.from({ length: size }, (_, i) => i);

        // Map
        const mapped = arr.map(x => x * 2);

        // Filter
        const filtered = mapped.filter(x => x % 3 === 0);

        // Reduce
        const sum = filtered.reduce((a, b) => a + b, 0);

        // Sort (on a smaller array to avoid timeout)
        const toSort = arr.slice(0, 10000).map(() => Math.random());
        toSort.sort((a, b) => a - b);

        return sum;
    },

    /**
     * Numeric calculation benchmark
     */
    run_numericCalculation() {
        // Fibonacci (iterative for better measurement)
        function fib(n) {
            let a = 0, b = 1;
            for (let i = 0; i < n; i++) {
                [a, b] = [b, a + b];
            }
            return a;
        }

        // Prime check
        function isPrime(n) {
            if (n < 2) return false;
            for (let i = 2; i <= Math.sqrt(n); i++) {
                if (n % i === 0) return false;
            }
            return true;
        }

        // Matrix multiplication (3x3)
        function matMul(a, b) {
            const result = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    for (let k = 0; k < 3; k++) {
                        result[i][j] += a[i][k] * b[k][j];
                    }
                }
            }
            return result;
        }

        let result = 0;

        // Run fibonacci
        for (let i = 0; i < 1000; i++) {
            result += fib(100);
        }

        // Run prime check
        for (let i = 2; i < 10000; i++) {
            if (isPrime(i)) result++;
        }

        // Run matrix multiplication
        const m1 = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
        const m2 = [[9, 8, 7], [6, 5, 4], [3, 2, 1]];
        for (let i = 0; i < 10000; i++) {
            matMul(m1, m2);
        }

        return result;
    },

    /**
     * String processing benchmark
     */
    run_stringProcessing() {
        const iterations = 10000;
        let result = '';

        // String concatenation
        for (let i = 0; i < iterations; i++) {
            result += 'test';
        }

        // Template literals
        const items = [];
        for (let i = 0; i < iterations; i++) {
            items.push(`item-${i}-${Math.random()}`);
        }

        // Regex matching
        const text = 'The quick brown fox jumps over the lazy dog. '.repeat(100);
        const matches = text.match(/\b\w{4,}\b/g);

        // JSON parse/stringify
        const obj = { name: 'test', values: [1, 2, 3, 4, 5], nested: { a: 1, b: 2 } };
        for (let i = 0; i < iterations; i++) {
            JSON.parse(JSON.stringify(obj));
        }

        return result.length + items.length + (matches ? matches.length : 0);
    },

    /**
     * Object operations benchmark
     */
    run_objectOperations() {
        const iterations = 100000;
        let result = 0;

        // Object creation
        const objects = [];
        for (let i = 0; i < iterations; i++) {
            objects.push({ id: i, value: Math.random() });
        }

        // Property access
        for (let i = 0; i < iterations; i++) {
            result += objects[i % objects.length].value;
        }

        // Object.keys/values
        const sample = objects[0];
        for (let i = 0; i < iterations; i++) {
            Object.keys(sample);
            Object.values(sample);
        }

        // Object spread
        for (let i = 0; i < iterations / 10; i++) {
            const merged = { ...sample, extra: i };
            result += merged.id;
        }

        return result;
    },

    /**
     * Function calls benchmark
     */
    run_functionCalls() {
        const iterations = 1000000;
        let result = 0;

        // Simple function
        function add(a, b) {
            return a + b;
        }

        // Closure
        function createCounter() {
            let count = 0;
            return () => ++count;
        }

        // Arrow function
        const multiply = (a, b) => a * b;

        // Simple function calls
        for (let i = 0; i < iterations; i++) {
            result += add(i, 1);
        }

        // Closure calls
        const counter = createCounter();
        for (let i = 0; i < iterations / 10; i++) {
            counter();
        }

        // Arrow function calls
        for (let i = 0; i < iterations; i++) {
            result += multiply(i, 2);
        }

        return result;
    }
};
