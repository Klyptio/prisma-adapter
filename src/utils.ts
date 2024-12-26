export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private readonly metrics: Map<string, number[]> = new Map();
  private readonly slowQueries: Array<{model: string, operation: string, duration: number}> = [];

  static getInstance(): PerformanceMonitor {
    if (!this.instance) {
      this.instance = new PerformanceMonitor();
    }
    return this.instance;
  }

  trackQuery(model: string, operation: string, startTime: number): void {
    const duration = Date.now() - startTime;
    const key = `${model}:${operation}`;
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    
    this.metrics.get(key)?.push(duration);

    if (duration > 1000) {
      this.slowQueries.push({ model, operation, duration });
    }
  }

  getMetrics() {
    const result: Record<string, { avg: number, min: number, max: number }> = {};
    
    this.metrics.forEach((durations, key) => {
      result[key] = {
        avg: durations.reduce((a, b) => a + b, 0) / durations.length,
        min: Math.min(...durations),
        max: Math.max(...durations)
      };
    });

    return {
      metrics: result,
      slowQueries: this.slowQueries.slice(-100)
    };
  }
}

export class QueryTimingHistogram {
  private readonly buckets: Map<string, number> = new Map();
  private readonly boundaries = [10, 50, 100, 500, 1000, 5000];

  record(duration: number): void {
    const bucket = this.boundaries.find(b => duration <= b) || 'slow';
    const key = `≤${bucket}ms`;
    this.buckets.set(key, (this.buckets.get(key) || 0) + 1);
  }

  getDistribution(): Record<string, number> {
    return Object.fromEntries(this.buckets.entries());
  }
}