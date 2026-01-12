/**
 * Utility functions for demonstration
 */

/**
 * Validates an email address
 * @param email - Email address to validate
 * @returns true if email is valid, false otherwise
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Calculates the sum of two numbers
 * @param a - First number
 * @param b - Second number
 * @returns Sum of a and b
 */
export function add(a: number, b: number): number {
  return a + b;
}

/**
 * Formats a name with title case
 * @param name - Name to format
 * @returns Formatted name
 */
export function formatName(name: string): string {
  if (!name || name.length === 0) {
    return '';
  }
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Calculator class for basic operations
 */
export class Calculator {
  private value: number;

  constructor(initialValue: number = 0) {
    this.value = initialValue;
  }

  /**
   * Adds a number to the current value
   */
  add(num: number): number {
    this.value += num;
    return this.value;
  }

  /**
   * Subtracts a number from the current value
   */
  subtract(num: number): number {
    this.value -= num;
    return this.value;
  }

  /**
   * Gets the current value
   */
  getValue(): number {
    return this.value;
  }

  /**
   * Resets the calculator to zero
   */
  reset(): void {
    this.value = 0;
  }
}

