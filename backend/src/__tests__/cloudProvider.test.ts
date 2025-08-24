import { PikPakProvider } from '../services/cloudProviders/PikPakProvider';
import { WebDAVProvider } from '../services/cloudProviders/WebDAVProvider';
import { SynologyProvider } from '../services/cloudProviders/SynologyProvider';
import { CloudProviderManager } from '../services/CloudProviderManager';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockAxios = axios as jest.Mocked<typeof axios>;

describe('Cloud Provider Services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PikPakProvider', () => {
    const config = {
      username: 'test@example.com',
      password: 'password123',
      baseUrl: 'https://api-drive.mypikpak.com',
    };

    let provider: PikPakProvider;

    beforeEach(() => {
      provider = new PikPakProvider(config);
    });

    describe('authenticate', () => {
      it('should authenticate successfully with valid credentials', async () => {
        const mockResponse = {
          data: {
            access_token: 'mock-access-token',
            refresh_token: 'mock-refresh-token',
            expires_in: 3600,
          },
        };

        mockAxios.post.mockResolvedValue(mockResponse);

        const result = await provider.authenticate();

        expect(result).toBe(true);
        expect(mockAxios.post).toHaveBeenCalledWith(
          expect.stringContaining('/auth/signin'),
          expect.objectContaining({
            username: config.username,
            password: config.password,
          })
        );
      });

      it('should handle authentication failure', async () => {
        mockAxios.post.mockRejectedValue(new Error('Invalid credentials'));

        const result = await provider.authenticate();

        expect(result).toBe(false);
      });
    });

    describe('listFiles', () => {
      it('should list files in directory', async () => {
        const mockResponse = {
          data: {
            files: [
              {
                id: 'file-1',
                name: 'document.pdf',
                kind: 'drive#file',
                size: '1024000',
                modified_time: '2024-01-15T10:30:00Z',
                mime_type: 'application/pdf',
              },
              {
                id: 'folder-1',
                name: 'Documents',
                kind: 'drive#folder',
                modified_time: '2024-01-15T09:00:00Z',
              },
            ],
          },
        };

        mockAxios.get.mockResolvedValue(mockResponse);

        const files = await provider.listFiles('/documents');

        expect(files).toHaveLength(2);
        expect(files[0]).toEqual({
          id: 'file-1',
          name: 'document.pdf',
          type: 'file',
          size: 1024000,
          modifiedTime: new Date('2024-01-15T10:30:00Z'),
          mimeType: 'application/pdf',
          path: '/documents/document.pdf',
        });
      });
    });

    describe('uploadFile', () => {
      it('should upload file successfully', async () => {
        const mockUploadResponse = {
          data: {
            file: {
              id: 'new-file-id',
              name: 'upload.txt',
              size: '500',
            },
          },
        };

        mockAxios.post.mockResolvedValue(mockUploadResponse);

        const mockBuffer = Buffer.from('test content');
        const result = await provider.uploadFile('/test', 'upload.txt', mockBuffer);

        expect(result).toEqual({
          id: 'new-file-id',
          name: 'upload.txt',
          size: 500,
          type: 'file',
          path: '/test/upload.txt',
        });
      });
    });
  });

  describe('WebDAVProvider', () => {
    const config = {
      baseUrl: 'https://webdav.example.com',
      username: 'testuser',
      password: 'testpass',
    };

    let provider: WebDAVProvider;

    beforeEach(() => {
      provider = new WebDAVProvider(config);
    });

    describe('testConnection', () => {
      it('should test connection successfully', async () => {
        mockAxios.request.mockResolvedValue({ status: 200 });

        const result = await provider.testConnection();

        expect(result).toBe(true);
        expect(mockAxios.request).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'PROPFIND',
            url: expect.stringContaining(config.baseUrl),
            auth: {
              username: config.username,
              password: config.password,
            },
          })
        );
      });

      it('should handle connection failure', async () => {
        mockAxios.request.mockRejectedValue(new Error('Connection failed'));

        const result = await provider.testConnection();

        expect(result).toBe(false);
      });
    });

    describe('createDirectory', () => {
      it('should create directory successfully', async () => {
        mockAxios.request.mockResolvedValue({ status: 201 });

        await expect(provider.createDirectory('/new-folder')).resolves.not.toThrow();

        expect(mockAxios.request).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'MKCOL',
            url: expect.stringContaining('/new-folder'),
          })
        );
      });
    });
  });

  describe('SynologyProvider', () => {
    const config = {
      baseUrl: 'https://nas.example.com:5001',
      username: 'admin',
      password: 'adminpass',
      apiVersion: '6.0.2',
    };

    let provider: SynologyProvider;

    beforeEach(() => {
      provider = new SynologyProvider(config);
    });

    describe('authenticate', () => {
      it('should authenticate with DSM successfully', async () => {
        const mockAuthResponse = {
          data: {
            success: true,
            data: {
              sid: 'mock-session-id',
            },
          },
        };

        mockAxios.get.mockResolvedValue(mockAuthResponse);

        const result = await provider.authenticate();

        expect(result).toBe(true);
        expect(mockAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('/webapi/auth.cgi'),
          expect.objectContaining({
            params: expect.objectContaining({
              account: config.username,
              passwd: config.password,
            }),
          })
        );
      });
    });

    describe('getFileStationInfo', () => {
      it('should get file station info', async () => {
        const mockInfoResponse = {
          data: {
            success: true,
            data: {
              hostname: 'NAS-Home',
              is_manager: true,
              support_sharing: true,
            },
          },
        };

        mockAxios.get.mockResolvedValue(mockInfoResponse);

        const info = await provider.getFileStationInfo();

        expect(info).toEqual({
          hostname: 'NAS-Home',
          isManager: true,
          supportSharing: true,
        });
      });
    });
  });

  describe('CloudProviderManager', () => {
    let manager: CloudProviderManager;

    beforeEach(() => {
      manager = new CloudProviderManager();
    });

    describe('registerProvider', () => {
      it('should register a new provider', () => {
        const mockProvider = {
          type: 'test-provider',
          authenticate: jest.fn(),
          listFiles: jest.fn(),
          downloadFile: jest.fn(),
          uploadFile: jest.fn(),
          deleteFile: jest.fn(),
          testConnection: jest.fn(),
        };

        manager.registerProvider('test-provider', mockProvider as any);

        expect(manager.getProvider('test-provider')).toBe(mockProvider);
      });
    });

    describe('createProvider', () => {
      it('should create PikPak provider', () => {
        const config = {
          type: 'pikpak',
          username: 'test@example.com',
          password: 'password123',
        };

        const provider = manager.createProvider(config);

        expect(provider).toBeInstanceOf(PikPakProvider);
      });

      it('should create WebDAV provider', () => {
        const config = {
          type: 'webdav',
          baseUrl: 'https://webdav.example.com',
          username: 'testuser',
          password: 'testpass',
        };

        const provider = manager.createProvider(config);

        expect(provider).toBeInstanceOf(WebDAVProvider);
      });

      it('should create Synology provider', () => {
        const config = {
          type: 'synology',
          baseUrl: 'https://nas.example.com:5001',
          username: 'admin',
          password: 'adminpass',
        };

        const provider = manager.createProvider(config);

        expect(provider).toBeInstanceOf(SynologyProvider);
      });

      it('should throw error for unsupported provider type', () => {
        const config = {
          type: 'unsupported',
          username: 'test',
          password: 'test',
        };

        expect(() => manager.createProvider(config)).toThrow(
          'Unsupported cloud provider type: unsupported'
        );
      });
    });
  });
});