import { formatFileSize, formatRelativeTime } from '../utils';

describe('Utils Functions', () => {
  describe('formatFileSize', () => {
    it('formats bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });

    it('handles decimal places', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1572864)).toBe('1.5 MB');
    });

    it('handles very small sizes', () => {
      expect(formatFileSize(512)).toBe('512 B');
      expect(formatFileSize(1)).toBe('1 B');
    });
  });

  describe('formatRelativeTime', () => {
    it('formats relative time correctly in Korean', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      const result = formatRelativeTime(oneHourAgo.toISOString());
      expect(result).toMatch(/(시간|분|초)/);
    });

    it('handles recent times', () => {
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
      
      const result = formatRelativeTime(oneMinuteAgo.toISOString());
      expect(result).toMatch(/(분|초)/);
    });
  });
});