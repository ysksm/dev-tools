/**
 * Rendering performance benchmarks
 */
const RenderingBenchmark = {
    name: 'rendering',
    label: 'Rendering',

    tests: {
        cssRecalculation: {
            name: 'cssRecalculation',
            label: 'CSS Recalculation',
            description: 'Style changes causing reflow'
        },
        animation: {
            name: 'animation',
            label: 'Animation',
            description: 'requestAnimationFrame FPS measurement'
        },
        canvas2d: {
            name: 'canvas2d',
            label: 'Canvas 2D',
            description: 'Drawing shapes on canvas'
        },
        layout: {
            name: 'layout',
            label: 'Layout',
            description: 'Flexbox and grid calculations'
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
     * Run all rendering benchmarks
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

            let stats;

            if (testName === 'animation') {
                // Animation test is async and measures FPS
                const fpsResult = await this.run_animation();
                // Convert FPS to score-compatible time (lower is better, so invert)
                const effectiveTime = 1000 / fpsResult.fps;
                stats = {
                    mean: effectiveTime,
                    median: effectiveTime,
                    stdDev: fpsResult.stdDev,
                    min: effectiveTime,
                    max: effectiveTime,
                    sampleSize: fpsResult.frames,
                    confidence: 1,
                    fps: fpsResult.fps
                };
            } else {
                // Run test multiple times
                const times = Timer.benchmark(() => this[`run_${testName}`](), 10, 2);
                stats = Statistics.getReliableMeasurement(times);
            }

            const baseline = ScoringEngine.getBaseline('rendering', testName);
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
     * CSS recalculation benchmark
     */
    run_cssRecalculation() {
        const container = this.getContainer();
        const count = 200;
        const iterations = 50;

        // Create elements with styles
        const elements = [];
        for (let i = 0; i < count; i++) {
            const div = document.createElement('div');
            div.style.cssText = `
                width: 50px;
                height: 50px;
                background-color: blue;
                position: absolute;
                left: ${(i % 20) * 55}px;
                top: ${Math.floor(i / 20) * 55}px;
            `;
            container.appendChild(div);
            elements.push(div);
        }

        // Force layout calculation
        container.offsetHeight;

        // Perform style changes that trigger reflow
        for (let iter = 0; iter < iterations; iter++) {
            for (const el of elements) {
                // These operations trigger layout recalculation
                el.style.width = `${50 + (iter % 10)}px`;
                el.style.height = `${50 + (iter % 10)}px`;
                el.style.marginLeft = `${iter % 5}px`;

                // Force synchronous layout
                el.offsetWidth;
            }
        }

        return count * iterations;
    },

    /**
     * Animation benchmark (measures FPS)
     * @returns {Promise<{fps: number, stdDev: number, frames: number}>}
     */
    run_animation() {
        return new Promise(resolve => {
            const container = this.getContainer();
            const canvas = document.createElement('canvas');
            canvas.width = 400;
            canvas.height = 400;
            canvas.style.cssText = 'position: absolute; left: 0; top: 0;';
            container.appendChild(canvas);

            const ctx = canvas.getContext('2d');
            const frameTimes = [];
            let lastTime = performance.now();
            let frameCount = 0;
            const targetFrames = 60; // Measure for ~1 second

            // Create animated objects
            const objects = [];
            for (let i = 0; i < 50; i++) {
                objects.push({
                    x: Math.random() * 400,
                    y: Math.random() * 400,
                    vx: (Math.random() - 0.5) * 10,
                    vy: (Math.random() - 0.5) * 10,
                    radius: 5 + Math.random() * 15,
                    color: `hsl(${Math.random() * 360}, 70%, 50%)`
                });
            }

            function animate() {
                const now = performance.now();
                const deltaTime = now - lastTime;
                frameTimes.push(deltaTime);
                lastTime = now;
                frameCount++;

                // Clear canvas
                ctx.fillStyle = '#1a1a2e';
                ctx.fillRect(0, 0, 400, 400);

                // Update and draw objects
                for (const obj of objects) {
                    // Update position
                    obj.x += obj.vx;
                    obj.y += obj.vy;

                    // Bounce off walls
                    if (obj.x < 0 || obj.x > 400) obj.vx *= -1;
                    if (obj.y < 0 || obj.y > 400) obj.vy *= -1;

                    // Draw
                    ctx.beginPath();
                    ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2);
                    ctx.fillStyle = obj.color;
                    ctx.fill();
                }

                if (frameCount < targetFrames) {
                    requestAnimationFrame(animate);
                } else {
                    // Calculate results
                    const avgFrameTime = Statistics.mean(frameTimes);
                    const fps = 1000 / avgFrameTime;
                    const stdDev = Statistics.standardDeviation(frameTimes);

                    resolve({
                        fps: Math.min(fps, 144), // Cap at 144 FPS
                        stdDev,
                        frames: frameCount
                    });
                }
            }

            requestAnimationFrame(animate);
        });
    },

    /**
     * Canvas 2D benchmark
     */
    run_canvas2d() {
        const container = this.getContainer();
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        container.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        const shapes = 10000;

        // Clear canvas
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, 800, 600);

        // Draw rectangles
        for (let i = 0; i < shapes / 3; i++) {
            ctx.fillStyle = `hsl(${i % 360}, 70%, 50%)`;
            ctx.fillRect(
                Math.random() * 800,
                Math.random() * 600,
                20 + Math.random() * 30,
                20 + Math.random() * 30
            );
        }

        // Draw circles
        for (let i = 0; i < shapes / 3; i++) {
            ctx.beginPath();
            ctx.arc(
                Math.random() * 800,
                Math.random() * 600,
                5 + Math.random() * 20,
                0,
                Math.PI * 2
            );
            ctx.fillStyle = `hsl(${(i + 120) % 360}, 70%, 50%)`;
            ctx.fill();
        }

        // Draw lines
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        for (let i = 0; i < shapes / 3; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.random() * 800, Math.random() * 600);
            ctx.lineTo(Math.random() * 800, Math.random() * 600);
            ctx.stroke();
        }

        return shapes;
    },

    /**
     * Layout benchmark (flexbox and grid)
     */
    run_layout() {
        const container = this.getContainer();
        const iterations = 20;
        let result = 0;

        for (let iter = 0; iter < iterations; iter++) {
            container.innerHTML = '';

            // Create flexbox container
            const flexContainer = document.createElement('div');
            flexContainer.style.cssText = `
                display: flex;
                flex-wrap: wrap;
                justify-content: space-between;
                align-items: center;
                width: 100%;
            `;

            for (let i = 0; i < 100; i++) {
                const item = document.createElement('div');
                item.style.cssText = `
                    flex: 0 0 calc(20% - 10px);
                    height: 50px;
                    margin: 5px;
                    background-color: blue;
                `;
                flexContainer.appendChild(item);
            }

            container.appendChild(flexContainer);

            // Force layout calculation
            result += flexContainer.offsetHeight;

            // Create grid container
            const gridContainer = document.createElement('div');
            gridContainer.style.cssText = `
                display: grid;
                grid-template-columns: repeat(5, 1fr);
                gap: 10px;
                width: 100%;
            `;

            for (let i = 0; i < 100; i++) {
                const item = document.createElement('div');
                item.style.cssText = `
                    height: 50px;
                    background-color: red;
                `;
                gridContainer.appendChild(item);
            }

            container.appendChild(gridContainer);

            // Force layout calculation
            result += gridContainer.offsetHeight;

            // Modify layout properties to trigger recalculation
            flexContainer.style.justifyContent = 'flex-start';
            gridContainer.style.gridTemplateColumns = 'repeat(4, 1fr)';

            result += flexContainer.offsetWidth + gridContainer.offsetWidth;
        }

        return result;
    }
};
