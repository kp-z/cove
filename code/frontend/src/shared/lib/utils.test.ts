import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn utility', () => {
  it('should merge class names', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2');
  });

  it('should handle conditional classes', () => {
    expect(cn('base', true && 'active', false && 'disabled')).toBe('base active');
  });

  it('should handle undefined and null', () => {
    expect(cn('base', undefined, null)).toBe('base');
  });

  it('should merge tailwind classes correctly', () => {
    // twMerge should deduplicate conflicting tailwind classes
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });

  it('should handle arrays', () => {
    expect(cn(['class1', 'class2'])).toBe('class1 class2');
  });

  it('should handle objects', () => {
    expect(cn({ class1: true, class2: false, class3: true })).toBe('class1 class3');
  });

  it('should handle mixed inputs', () => {
    expect(cn('base', ['array1', 'array2'], { obj1: true, obj2: false }, 'end')).toBe(
      'base array1 array2 obj1 end'
    );
  });

  it('should handle empty input', () => {
    expect(cn()).toBe('');
  });

  it('should handle only falsy values', () => {
    expect(cn(false, null, undefined)).toBe('');
  });

  it('should not deduplicate non-tailwind classes', () => {
    // cn/twMerge only deduplicates tailwind utility classes, not custom classes
    expect(cn('class1', 'class1')).toBe('class1 class1');
  });

  it('should handle complex tailwind conflicts', () => {
    // Later classes should override earlier ones
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
    expect(cn('text-sm', 'text-lg')).toBe('text-lg');
  });
});
