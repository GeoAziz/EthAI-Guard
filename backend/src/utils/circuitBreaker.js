const logger = require('../logger');

class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 3;
    this.resetTimeout = options.resetTimeout || 60000; // 60s default
    this.state = 'closed'; // closed, open, half-open
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
    this.halfOpenSuccessThreshold = options.halfOpenSuccessThreshold || 2;
    this.name = options.name || 'CircuitBreaker';
  }

  async call(fn) {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'half-open';
        this.successCount = 0;
        logger.info({ breaker: this.name, state: this.state }, 'circuit_breaker_half_open');
      } else {
        const err = new Error(`Circuit breaker ${this.name} is OPEN`);
        err.code = 'CIRCUIT_BREAKER_OPEN';
        throw err;
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;

    if (this.state === 'half-open') {
      this.successCount++;
      if (this.successCount >= this.halfOpenSuccessThreshold) {
        this.state = 'closed';
        logger.info({ breaker: this.name, state: this.state }, 'circuit_breaker_closed');
      }
    } else if (this.state === 'closed') {
      logger.debug({ breaker: this.name }, 'circuit_breaker_success');
    }
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'half-open') {
      this.state = 'open';
      logger.warn({ breaker: this.name, state: this.state, failures: this.failureCount }, 'circuit_breaker_open');
    } else if (this.failureCount >= this.failureThreshold && this.state === 'closed') {
      this.state = 'open';
      logger.warn({ breaker: this.name, state: this.state, failures: this.failureCount }, 'circuit_breaker_open');
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
    };
  }

  reset() {
    this.state = 'closed';
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
  }
}

module.exports = CircuitBreaker;
