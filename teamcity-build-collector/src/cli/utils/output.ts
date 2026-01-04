/**
 * CLI output utilities
 */

// Simple spinner implementation
export interface Spinner {
  text: string;
  start(): void;
  stop(): void;
  succeed(message?: string): void;
  fail(message?: string): void;
}

export function createSpinner(text: string): Spinner {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let currentFrame = 0;
  let intervalId: NodeJS.Timeout | null = null;
  let currentText = text;

  const clearLine = () => {
    process.stdout.write('\r\x1b[K');
  };

  const render = () => {
    clearLine();
    process.stdout.write(`${frames[currentFrame]} ${currentText}`);
    currentFrame = (currentFrame + 1) % frames.length;
  };

  return {
    get text() {
      return currentText;
    },
    set text(value: string) {
      currentText = value;
    },
    start() {
      if (intervalId) return;
      intervalId = setInterval(render, 80);
      render();
    },
    stop() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        clearLine();
      }
    },
    succeed(message?: string) {
      this.stop();
      console.log(`✓ ${message ?? currentText}`);
    },
    fail(message?: string) {
      this.stop();
      console.log(`✗ ${message ?? currentText}`);
    },
  };
}

// Color utilities (using ANSI codes directly for simplicity)
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

export function printSuccess(message: string): void {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

export function printError(message: string): void {
  console.error(`${colors.red}✗${colors.reset} ${message}`);
}

export function printWarning(message: string): void {
  console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
}

export function printInfo(message: string): void {
  console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
}

export function printDebug(message: string): void {
  console.log(`${colors.gray}${message}${colors.reset}`);
}

// Progress bar
export function printProgress(current: number, total: number, label?: string): void {
  const width = 30;
  const progress = Math.floor((current / total) * width);
  const bar = '█'.repeat(progress) + '░'.repeat(width - progress);
  const percent = Math.floor((current / total) * 100);
  const labelText = label ? ` ${label}` : '';
  process.stdout.write(`\r[${bar}] ${percent}%${labelText}`);
  if (current === total) {
    console.log('');
  }
}
