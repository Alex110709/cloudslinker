describe('Backend Utils', () => {
  describe('File size formatter', () => {
    const formatFileSize = (bytes: number): string => {
      if (bytes === 0) return '0 B';
      
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      
      return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    };

    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });

    it('should handle decimal places', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1572864)).toBe('1.5 MB');
    });
  });

  describe('Path utilities', () => {
    const normalizePath = (path: string): string => {
      return path.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
    };

    it('should normalize paths correctly', () => {
      expect(normalizePath('/path//to///file')).toBe('/path/to/file');
      expect(normalizePath('/path/to/folder/')).toBe('/path/to/folder');
      expect(normalizePath('')).toBe('/');
      expect(normalizePath('/')).toBe('/');
    });
  });

  describe('Validation helpers', () => {
    const isValidEmail = (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    it('should validate email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name+tag@domain.co.uk')).toBe(true);
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
    });
  });
});