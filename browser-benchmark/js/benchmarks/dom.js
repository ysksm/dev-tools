/**
 * DOM manipulation benchmarks
 */
const DOMBenchmark = {
    name: 'dom',
    label: 'DOM',

    tests: {
        elementCreation: {
            name: 'elementCreation',
            label: 'Element Creation',
            description: 'Create and append 1000 elements'
        },
        elementRemoval: {
            name: 'elementRemoval',
            label: 'Element Removal',
            description: 'Remove elements individually and in bulk'
        },
        attributeManipulation: {
            name: 'attributeManipulation',
            label: 'Attribute Manipulation',
            description: 'classList, style, dataset operations'
        },
        querySelector: {
            name: 'querySelector',
            label: 'Query Selector',
            description: 'getElementById, querySelector performance'
        },
        textUpdate: {
            name: 'textUpdate',
            label: 'Text Update',
            description: 'textContent and innerHTML updates'
        }
    },

    /**
     * Get benchmark container element
     * @returns {HTMLElement}
     */
    getContainer() {
        return document.getElementById('benchmark-container');
    },

    /**
     * Clear benchmark container
     */
    clearContainer() {
        const container = this.getContainer();
        container.innerHTML = '';
    },

    /**
     * Run all DOM benchmarks
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
            const times = Timer.benchmark(() => this[`run_${testName}`](), 10, 2);
            const stats = Statistics.getReliableMeasurement(times);

            const baseline = ScoringEngine.getBaseline('dom', testName);
            const score = ScoringEngine.calculateTestScore(stats.mean, baseline);

            results[testName] = {
                ...test,
                time: stats.mean,
                score,
                grade: ScoringEngine.getGrade(score),
                stats
            };

            // Cleanup
            this.clearContainer();

            // Small delay between tests
            await Timer.delay(100);
        }

        return results;
    },

    /**
     * Element creation benchmark
     */
    run_elementCreation() {
        const container = this.getContainer();
        const fragment = document.createDocumentFragment();
        const count = 1000;

        // Create elements using DocumentFragment
        for (let i = 0; i < count; i++) {
            const div = document.createElement('div');
            div.className = 'benchmark-item';
            div.id = `item-${i}`;
            div.textContent = `Item ${i}`;

            const span = document.createElement('span');
            span.className = 'item-label';
            span.textContent = ` (${i})`;
            div.appendChild(span);

            fragment.appendChild(div);
        }

        container.appendChild(fragment);

        return container.children.length;
    },

    /**
     * Element removal benchmark
     */
    run_elementRemoval() {
        const container = this.getContainer();
        const count = 500;

        // First, create elements
        for (let i = 0; i < count; i++) {
            const div = document.createElement('div');
            div.className = 'remove-item';
            div.id = `remove-${i}`;
            container.appendChild(div);
        }

        // Remove half individually using removeChild
        for (let i = 0; i < count / 2; i++) {
            const child = container.firstChild;
            if (child) {
                container.removeChild(child);
            }
        }

        // Remove rest using innerHTML
        container.innerHTML = '';

        return count;
    },

    /**
     * Attribute manipulation benchmark
     */
    run_attributeManipulation() {
        const container = this.getContainer();
        const count = 100;
        const iterations = 100;

        // Create elements
        const elements = [];
        for (let i = 0; i < count; i++) {
            const div = document.createElement('div');
            div.id = `attr-${i}`;
            container.appendChild(div);
            elements.push(div);
        }

        // classList operations
        for (let iter = 0; iter < iterations; iter++) {
            for (const el of elements) {
                el.classList.add('class1', 'class2', 'class3');
                el.classList.remove('class2');
                el.classList.toggle('class4');
                el.classList.contains('class1');
            }
        }

        // style operations
        for (let iter = 0; iter < iterations; iter++) {
            for (const el of elements) {
                el.style.color = 'red';
                el.style.backgroundColor = 'blue';
                el.style.display = 'block';
                el.style.cssText = 'width: 100px; height: 50px;';
            }
        }

        // dataset operations
        for (let iter = 0; iter < iterations; iter++) {
            for (const el of elements) {
                el.dataset.id = iter;
                el.dataset.value = 'test';
                el.dataset.active = 'true';
                const val = el.dataset.id;
            }
        }

        return count * iterations * 3;
    },

    /**
     * Query selector benchmark
     */
    run_querySelector() {
        const container = this.getContainer();
        const count = 100;
        const iterations = 1000;

        // Create elements with various selectors
        for (let i = 0; i < count; i++) {
            const div = document.createElement('div');
            div.id = `query-${i}`;
            div.className = `item ${i % 2 === 0 ? 'even' : 'odd'} group-${i % 10}`;
            div.dataset.index = i;
            container.appendChild(div);
        }

        let found = 0;

        // getElementById
        for (let iter = 0; iter < iterations; iter++) {
            const el = document.getElementById(`query-${iter % count}`);
            if (el) found++;
        }

        // querySelector
        for (let iter = 0; iter < iterations; iter++) {
            const el = container.querySelector(`.group-${iter % 10}`);
            if (el) found++;
        }

        // querySelectorAll
        for (let iter = 0; iter < iterations / 10; iter++) {
            const els = container.querySelectorAll('.even');
            found += els.length;
        }

        // getElementsByClassName
        for (let iter = 0; iter < iterations; iter++) {
            const els = container.getElementsByClassName('item');
            found += els.length > 0 ? 1 : 0;
        }

        return found;
    },

    /**
     * Text update benchmark
     */
    run_textUpdate() {
        const container = this.getContainer();
        const count = 100;
        const iterations = 100;

        // Create elements
        const elements = [];
        for (let i = 0; i < count; i++) {
            const div = document.createElement('div');
            container.appendChild(div);
            elements.push(div);
        }

        // textContent updates
        for (let iter = 0; iter < iterations; iter++) {
            for (const el of elements) {
                el.textContent = `Updated text ${iter}`;
            }
        }

        // innerHTML updates (simple text)
        for (let iter = 0; iter < iterations; iter++) {
            for (const el of elements) {
                el.innerHTML = `<span>HTML content ${iter}</span>`;
            }
        }

        // innerText (triggers reflow)
        for (let iter = 0; iter < iterations / 10; iter++) {
            for (const el of elements) {
                el.innerText = `Inner text ${iter}`;
            }
        }

        return count * iterations;
    }
};
