/**
 * Canvas-based chart renderer
 */
const ChartRenderer = {
    /**
     * Create a chart renderer for a specific canvas
     * @param {HTMLCanvasElement} canvas - Target canvas element
     * @returns {Object} Chart instance
     */
    create(canvas) {
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;

        // Setup HiDPI
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const width = rect.width;
        const height = rect.height;

        return {
            canvas,
            ctx,
            width,
            height,

            /**
             * Clear the canvas
             */
            clear() {
                this.ctx.clearRect(0, 0, this.width, this.height);
            },

            /**
             * Draw a bar chart
             * @param {Array} data - Array of {label, value, color}
             * @param {Object} options - Chart options
             */
            drawBarChart(data, options = {}) {
                const {
                    padding = 40,
                    barGap = 20,
                    labelColor = '#a0a0a0',
                    valueColor = '#ffffff'
                } = options;

                this.clear();

                if (data.length === 0) return;

                const maxValue = Math.max(...data.map(d => d.value), 1);
                const chartWidth = this.width - padding * 2;
                const chartHeight = this.height - padding * 2;
                const barWidth = (chartWidth - barGap * (data.length - 1)) / data.length;

                // Draw bars
                data.forEach((item, i) => {
                    const x = padding + i * (barWidth + barGap);
                    const barHeight = (item.value / maxValue) * (chartHeight - 40);
                    const y = this.height - padding - barHeight;

                    // Bar gradient
                    const gradient = this.ctx.createLinearGradient(x, y, x, this.height - padding);
                    gradient.addColorStop(0, item.color);
                    gradient.addColorStop(1, this.darkenColor(item.color, 40));

                    // Draw bar
                    this.ctx.fillStyle = gradient;
                    this.roundRect(x, y, barWidth, barHeight, 4);
                    this.ctx.fill();

                    // Draw label
                    this.ctx.fillStyle = labelColor;
                    this.ctx.font = '12px -apple-system, sans-serif';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText(item.label, x + barWidth / 2, this.height - padding + 20);

                    // Draw value
                    this.ctx.fillStyle = valueColor;
                    this.ctx.font = 'bold 14px -apple-system, sans-serif';
                    this.ctx.fillText(
                        item.value.toLocaleString(),
                        x + barWidth / 2,
                        y - 10
                    );
                });
            },

            /**
             * Draw a radar chart
             * @param {Array} data - Array of {label, value, maxValue}
             * @param {Object} options - Chart options
             */
            drawRadarChart(data, options = {}) {
                const {
                    padding = 60,
                    gridColor = 'rgba(255, 255, 255, 0.1)',
                    lineColor = '#3498db',
                    fillColor = 'rgba(52, 152, 219, 0.3)',
                    labelColor = '#ffffff',
                    gridLevels = 5
                } = options;

                this.clear();

                if (data.length < 3) return;

                const centerX = this.width / 2;
                const centerY = this.height / 2;
                const radius = Math.min(centerX, centerY) - padding;
                const angleStep = (Math.PI * 2) / data.length;

                // Draw grid
                for (let level = 1; level <= gridLevels; level++) {
                    const r = radius * (level / gridLevels);
                    this.ctx.beginPath();
                    this.ctx.strokeStyle = gridColor;
                    this.ctx.lineWidth = 1;

                    for (let i = 0; i <= data.length; i++) {
                        const angle = i * angleStep - Math.PI / 2;
                        const x = centerX + Math.cos(angle) * r;
                        const y = centerY + Math.sin(angle) * r;

                        if (i === 0) {
                            this.ctx.moveTo(x, y);
                        } else {
                            this.ctx.lineTo(x, y);
                        }
                    }

                    this.ctx.closePath();
                    this.ctx.stroke();
                }

                // Draw axis lines
                this.ctx.strokeStyle = gridColor;
                data.forEach((_, i) => {
                    const angle = i * angleStep - Math.PI / 2;
                    this.ctx.beginPath();
                    this.ctx.moveTo(centerX, centerY);
                    this.ctx.lineTo(
                        centerX + Math.cos(angle) * radius,
                        centerY + Math.sin(angle) * radius
                    );
                    this.ctx.stroke();
                });

                // Draw data
                this.ctx.beginPath();
                this.ctx.fillStyle = fillColor;
                this.ctx.strokeStyle = lineColor;
                this.ctx.lineWidth = 2;

                data.forEach((item, i) => {
                    const angle = i * angleStep - Math.PI / 2;
                    const value = Math.min(item.value / (item.maxValue || 15000), 1);
                    const x = centerX + Math.cos(angle) * radius * value;
                    const y = centerY + Math.sin(angle) * radius * value;

                    if (i === 0) {
                        this.ctx.moveTo(x, y);
                    } else {
                        this.ctx.lineTo(x, y);
                    }
                });

                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();

                // Draw data points
                data.forEach((item, i) => {
                    const angle = i * angleStep - Math.PI / 2;
                    const value = Math.min(item.value / (item.maxValue || 15000), 1);
                    const x = centerX + Math.cos(angle) * radius * value;
                    const y = centerY + Math.sin(angle) * radius * value;

                    this.ctx.beginPath();
                    this.ctx.arc(x, y, 4, 0, Math.PI * 2);
                    this.ctx.fillStyle = lineColor;
                    this.ctx.fill();
                });

                // Draw labels
                this.ctx.fillStyle = labelColor;
                this.ctx.font = '12px -apple-system, sans-serif';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';

                data.forEach((item, i) => {
                    const angle = i * angleStep - Math.PI / 2;
                    const labelRadius = radius + 25;
                    const x = centerX + Math.cos(angle) * labelRadius;
                    const y = centerY + Math.sin(angle) * labelRadius;

                    this.ctx.fillText(item.label, x, y);
                });
            },

            /**
             * Draw rounded rectangle
             * @param {number} x - X position
             * @param {number} y - Y position
             * @param {number} w - Width
             * @param {number} h - Height
             * @param {number} r - Border radius
             */
            roundRect(x, y, w, h, r) {
                this.ctx.beginPath();
                this.ctx.moveTo(x + r, y);
                this.ctx.lineTo(x + w - r, y);
                this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
                this.ctx.lineTo(x + w, y + h - r);
                this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
                this.ctx.lineTo(x + r, y + h);
                this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
                this.ctx.lineTo(x, y + r);
                this.ctx.quadraticCurveTo(x, y, x + r, y);
                this.ctx.closePath();
            },

            /**
             * Darken a hex color
             * @param {string} color - Hex color
             * @param {number} percent - Darkening percentage
             * @returns {string} Darkened color
             */
            darkenColor(color, percent) {
                const num = parseInt(color.replace('#', ''), 16);
                const amt = Math.round(2.55 * percent);
                const R = Math.max((num >> 16) - amt, 0);
                const G = Math.max((num >> 8 & 0x00FF) - amt, 0);
                const B = Math.max((num & 0x0000FF) - amt, 0);
                return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
            }
        };
    }
};
