/**
 * Style Cartridge File Upload API Tests
 *
 * Tests the /api/cartridges/style/upload endpoint that handles
 * uploading PDF/TXT/DOCX/MD files to Supabase storage and updating
 * style_cartridges.source_files array.
 *
 * Task 1 from Mem0 Cartridge Integration Plan
 */

// Mock environment
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
  storage: {
    from: jest.fn(),
  },
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

// Import handlers
import { POST, DELETE } from '@/app/api/cartridges/style/upload/route';

// Mock Next.js Request with FormData
class MockRequest {
  constructor(public url: string, private _formData: FormData) {}
  async formData() {
    return this._formData;
  }
}

// Mock File class for testing
class MockFile implements Partial<File> {
  public name: string;
  public type: string;
  public size: number;
  private content: string;

  constructor(content: string, name: string, type: string, size: number = 1024) {
    this.content = content;
    this.name = name;
    this.type = type;
    this.size = size;
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    return new TextEncoder().encode(this.content).buffer;
  }

  async text(): Promise<string> {
    return this.content;
  }
}

describe('POST /api/cartridges/style/upload', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };
  const mockCartridgeId = 'cartridge-456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    test('returns 401 when user not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const formData = new FormData();
      formData.append('cartridgeId', mockCartridgeId);
      formData.append('files', new MockFile('test', 'test.pdf', 'application/pdf') as any);

      const request = new MockRequest('http://localhost:3000/api/cartridges/style/upload', formData);
      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Validation', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
    });

    test('rejects request without cartridgeId', async () => {
      const formData = new FormData();
      formData.append('files', new MockFile('test', 'test.pdf', 'application/pdf') as any);

      const request = new MockRequest('http://localhost:3000/api/cartridges/style/upload', formData);
      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Cartridge ID is required');
    });

    test('rejects request without files', async () => {
      const formData = new FormData();
      formData.append('cartridgeId', mockCartridgeId);

      const request = new MockRequest('http://localhost:3000/api/cartridges/style/upload', formData);
      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('At least one file is required');
    });

    test('rejects invalid file type', async () => {
      const mockSelect = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: mockCartridgeId, source_files: [] },
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue({ select: jest.fn().mockReturnValue(mockSelect) });
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const formData = new FormData();
      formData.append('cartridgeId', mockCartridgeId);
      formData.append('files', new MockFile('test', 'test.exe', 'application/exe') as any);

      const request = new MockRequest('http://localhost:3000/api/cartridges/style/upload', formData);
      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid file type');
    });

    test('rejects file exceeding 10MB limit', async () => {
      const mockSelect = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: mockCartridgeId, source_files: [] },
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue({ select: jest.fn().mockReturnValue(mockSelect) });

      const formData = new FormData();
      formData.append('cartridgeId', mockCartridgeId);
      // Create file with size > 10MB
      formData.append('files', new MockFile('test', 'large.pdf', 'application/pdf', 11 * 1024 * 1024) as any);

      const request = new MockRequest('http://localhost:3000/api/cartridges/style/upload', formData);
      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('exceeds 10MB limit');
    });
  });

  describe('Authorization', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
    });

    test('returns 404 when cartridge not found', async () => {
      const mockSelect = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      };

      mockSupabaseClient.from.mockReturnValue({ select: jest.fn().mockReturnValue(mockSelect) });

      const formData = new FormData();
      formData.append('cartridgeId', mockCartridgeId);
      formData.append('files', new MockFile('test', 'test.pdf', 'application/pdf') as any);

      const request = new MockRequest('http://localhost:3000/api/cartridges/style/upload', formData);
      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Cartridge not found');
    });

    test('verifies cartridge belongs to authenticated user', async () => {
      const mockSelect = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: mockCartridgeId, source_files: [] },
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue({ select: jest.fn().mockReturnValue(mockSelect) });

      const formData = new FormData();
      formData.append('cartridgeId', mockCartridgeId);
      formData.append('files', new MockFile('test', 'test.pdf', 'application/pdf') as any);

      const request = new MockRequest('http://localhost:3000/api/cartridges/style/upload', formData);
      await POST(request as any);

      // Verify it checked both id and user_id
      expect(mockSelect.eq).toHaveBeenCalledWith('id', mockCartridgeId);
      expect(mockSelect.eq).toHaveBeenCalledWith('user_id', mockUser.id);
    });
  });

  describe('File Upload', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
    });

    test('uploads single PDF file successfully', async () => {
      const mockSelect = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: mockCartridgeId, source_files: [] },
          error: null,
        }),
      };

      const mockUpload = jest.fn().mockResolvedValue({ error: null });
      const mockUpdate = {
        eq: jest.fn().mockReturnThis(),
      };
      mockUpdate.eq.mockResolvedValue({ error: null });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockSelect),
        update: jest.fn().mockReturnValue(mockUpdate),
      });

      mockSupabaseClient.storage.from.mockReturnValue({
        upload: mockUpload,
      });

      const formData = new FormData();
      formData.append('cartridgeId', mockCartridgeId);
      formData.append('files', new MockFile('PDF content', 'test.pdf', 'application/pdf') as any);

      const request = new MockRequest('http://localhost:3000/api/cartridges/style/upload', formData);
      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Files uploaded successfully');
      expect(data.uploaded).toHaveLength(1);
      expect(data.uploaded[0].name).toBe('test.pdf');
      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringContaining(`${mockUser.id}/${mockCartridgeId}/`),
        expect.any(Blob),
        expect.objectContaining({ contentType: 'application/pdf' })
      );
    });

    test('uploads multiple files successfully', async () => {
      const mockSelect = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: mockCartridgeId, source_files: [] },
          error: null,
        }),
      };

      const mockUpload = jest.fn().mockResolvedValue({ error: null });
      const mockUpdate = {
        eq: jest.fn().mockReturnThis(),
      };
      mockUpdate.eq.mockResolvedValue({ error: null });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockSelect),
        update: jest.fn().mockReturnValue(mockUpdate),
      });

      mockSupabaseClient.storage.from.mockReturnValue({
        upload: mockUpload,
      });

      const formData = new FormData();
      formData.append('cartridgeId', mockCartridgeId);
      formData.append('files', new MockFile('PDF 1', 'doc1.pdf', 'application/pdf') as any);
      formData.append('files', new MockFile('Text', 'doc2.txt', 'text/plain') as any);
      formData.append('files', new MockFile('# Markdown', 'doc3.md', 'text/markdown') as any);

      const request = new MockRequest('http://localhost:3000/api/cartridges/style/upload', formData);
      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.uploaded).toHaveLength(3);
      expect(mockUpload).toHaveBeenCalledTimes(3);
    });

    test('stores files with correct path structure: {userId}/{cartridgeId}/{timestamp}-{filename}', async () => {
      const mockSelect = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: mockCartridgeId, source_files: [] },
          error: null,
        }),
      };

      const mockUpload = jest.fn().mockResolvedValue({ error: null });
      const mockUpdate = {
        eq: jest.fn().mockReturnThis(),
      };
      mockUpdate.eq.mockResolvedValue({ error: null });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockSelect),
        update: jest.fn().mockReturnValue(mockUpdate),
      });

      mockSupabaseClient.storage.from.mockReturnValue({
        upload: mockUpload,
      });

      const formData = new FormData();
      formData.append('cartridgeId', mockCartridgeId);
      formData.append('files', new MockFile('test', 'test.pdf', 'application/pdf') as any);

      const request = new MockRequest('http://localhost:3000/api/cartridges/style/upload', formData);
      await POST(request as any);

      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`^${mockUser.id}/${mockCartridgeId}/\\d+-test\\.pdf$`)),
        expect.any(Blob),
        expect.any(Object)
      );
    });

    test('accepts all supported file types', async () => {
      const supportedFiles = [
        { name: 'doc.pdf', type: 'application/pdf', content: 'PDF' },
        { name: 'doc.txt', type: 'text/plain', content: 'Text' },
        {
          name: 'doc.docx',
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          content: 'Word',
        },
        { name: 'doc.md', type: 'text/markdown', content: '# Markdown' },
      ];

      for (const file of supportedFiles) {
        jest.clearAllMocks();

        const mockSelect = {
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: mockCartridgeId, source_files: [] },
            error: null,
          }),
        };

        const mockUpload = jest.fn().mockResolvedValue({ error: null });
        const mockUpdate = {
          eq: jest.fn().mockReturnThis(),
        };
        mockUpdate.eq.mockResolvedValue({ error: null });

        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue(mockSelect),
          update: jest.fn().mockReturnValue(mockUpdate),
        });

        mockSupabaseClient.storage.from.mockReturnValue({
          upload: mockUpload,
        });

        const formData = new FormData();
        formData.append('cartridgeId', mockCartridgeId);
        formData.append('files', new MockFile(file.content, file.name, file.type) as any);

        const request = new MockRequest('http://localhost:3000/api/cartridges/style/upload', formData);
        const response = await POST(request as any);

        expect(response.status).toBe(200);
      }
    });
  });

  describe('Database Updates', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
    });

    test('updates source_files array with new file metadata', async () => {
      const existingFiles = [
        {
          file_path: 'user-123/cartridge-456/old-file.pdf',
          file_name: 'old-file.pdf',
          file_type: 'application/pdf',
          file_size: 2048,
          uploaded_at: '2024-01-01T00:00:00.000Z',
        },
      ];

      const mockSelect = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: mockCartridgeId, source_files: existingFiles },
          error: null,
        }),
      };

      const mockUpload = jest.fn().mockResolvedValue({ error: null });
      const mockUpdateFn = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnThis(),
      });
      mockUpdateFn().eq.mockResolvedValue({ error: null });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockSelect),
        update: mockUpdateFn,
      });

      mockSupabaseClient.storage.from.mockReturnValue({
        upload: mockUpload,
      });

      const formData = new FormData();
      formData.append('cartridgeId', mockCartridgeId);
      formData.append('files', new MockFile('new', 'new.pdf', 'application/pdf', 1024) as any);

      const request = new MockRequest('http://localhost:3000/api/cartridges/style/upload', formData);
      await POST(request as any);

      // Verify update was called with combined array
      expect(mockUpdateFn).toHaveBeenCalledWith({
        source_files: expect.arrayContaining([
          expect.objectContaining({ file_name: 'old-file.pdf' }),
          expect.objectContaining({ file_name: 'new.pdf' }),
        ]),
        analysis_status: 'pending',
      });
    });

    test('sets analysis_status to pending after upload', async () => {
      const mockSelect = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: mockCartridgeId, source_files: [] },
          error: null,
        }),
      };

      const mockUpload = jest.fn().mockResolvedValue({ error: null });
      const mockUpdateFn = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnThis(),
      });
      mockUpdateFn().eq.mockResolvedValue({ error: null });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockSelect),
        update: mockUpdateFn,
      });

      mockSupabaseClient.storage.from.mockReturnValue({
        upload: mockUpload,
      });

      const formData = new FormData();
      formData.append('cartridgeId', mockCartridgeId);
      formData.append('files', new MockFile('test', 'test.pdf', 'application/pdf') as any);

      const request = new MockRequest('http://localhost:3000/api/cartridges/style/upload', formData);
      await POST(request as any);

      expect(mockUpdateFn).toHaveBeenCalledWith(
        expect.objectContaining({ analysis_status: 'pending' })
      );
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
    });

    test('handles storage upload failure', async () => {
      const mockSelect = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: mockCartridgeId, source_files: [] },
          error: null,
        }),
      };

      const mockUpload = jest.fn().mockResolvedValue({
        error: { message: 'Storage upload failed' },
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockSelect),
      });

      mockSupabaseClient.storage.from.mockReturnValue({
        upload: mockUpload,
      });

      const formData = new FormData();
      formData.append('cartridgeId', mockCartridgeId);
      formData.append('files', new MockFile('test', 'test.pdf', 'application/pdf') as any);

      const request = new MockRequest('http://localhost:3000/api/cartridges/style/upload', formData);
      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to upload');
    });

    test('cleans up uploaded files when database update fails', async () => {
      const mockSelect = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: mockCartridgeId, source_files: [] },
          error: null,
        }),
      };

      const mockUpload = jest.fn().mockResolvedValue({ error: null });
      const mockRemove = jest.fn().mockResolvedValue({ error: null });
      const mockUpdate = {
        eq: jest.fn().mockReturnThis(),
      };
      mockUpdate.eq.mockResolvedValue({
        error: { message: 'Database update failed' },
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockSelect),
        update: jest.fn().mockReturnValue(mockUpdate),
      });

      mockSupabaseClient.storage.from.mockReturnValue({
        upload: mockUpload,
        remove: mockRemove,
      });

      const formData = new FormData();
      formData.append('cartridgeId', mockCartridgeId);
      formData.append('files', new MockFile('test', 'test.pdf', 'application/pdf') as any);

      const request = new MockRequest('http://localhost:3000/api/cartridges/style/upload', formData);
      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update cartridge');
      // Verify cleanup was attempted
      expect(mockRemove).toHaveBeenCalled();
    });
  });
});

describe('DELETE /api/cartridges/style/upload', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };
  const mockCartridgeId = 'cartridge-456';
  const mockFilePath = 'user-123/cartridge-456/123456-test.pdf';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    test('returns 401 when user not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const request = {
        json: async () => ({ cartridgeId: mockCartridgeId, filePath: mockFilePath }),
      };

      const response = await DELETE(request as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Validation', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
    });

    test('rejects request without cartridgeId', async () => {
      const request = {
        json: async () => ({ filePath: mockFilePath }),
      };

      const response = await DELETE(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Cartridge ID and file path are required');
    });

    test('rejects request without filePath', async () => {
      const request = {
        json: async () => ({ cartridgeId: mockCartridgeId }),
      };

      const response = await DELETE(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Cartridge ID and file path are required');
    });
  });

  describe('Authorization', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
    });

    test('returns 404 when cartridge not found', async () => {
      const mockSelect = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      };

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockSelect),
      });

      const request = {
        json: async () => ({ cartridgeId: mockCartridgeId, filePath: mockFilePath }),
      };

      const response = await DELETE(request as any);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Cartridge not found');
    });
  });

  describe('File Deletion', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
    });

    test('deletes file from storage and updates database', async () => {
      const mockSelect = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: mockCartridgeId,
            source_files: [
              {
                file_path: mockFilePath,
                file_name: 'test.pdf',
                file_type: 'application/pdf',
                file_size: 1024,
                uploaded_at: '2024-01-01T00:00:00.000Z',
              },
            ],
          },
          error: null,
        }),
      };

      const mockRemove = jest.fn().mockResolvedValue({ error: null });
      const mockUpdate = {
        eq: jest.fn().mockReturnThis(),
      };
      mockUpdate.eq.mockResolvedValue({ error: null });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockSelect),
        update: jest.fn().mockReturnValue(mockUpdate),
      });

      mockSupabaseClient.storage.from.mockReturnValue({
        remove: mockRemove,
      });

      const request = {
        json: async () => ({ cartridgeId: mockCartridgeId, filePath: mockFilePath }),
      };

      const response = await DELETE(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('File deleted successfully');
      expect(mockRemove).toHaveBeenCalledWith([mockFilePath]);
    });

    test('removes file from source_files array', async () => {
      const otherFilePath = 'user-123/cartridge-456/other.pdf';
      const mockSelect = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: mockCartridgeId,
            source_files: [
              { file_path: mockFilePath, file_name: 'test.pdf' },
              { file_path: otherFilePath, file_name: 'other.pdf' },
            ],
          },
          error: null,
        }),
      };

      const mockRemove = jest.fn().mockResolvedValue({ error: null });
      const mockUpdateFn = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnThis(),
      });
      mockUpdateFn().eq.mockResolvedValue({ error: null });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockSelect),
        update: mockUpdateFn,
      });

      mockSupabaseClient.storage.from.mockReturnValue({
        remove: mockRemove,
      });

      const request = {
        json: async () => ({ cartridgeId: mockCartridgeId, filePath: mockFilePath }),
      };

      await DELETE(request as any);

      // Verify only the other file remains
      expect(mockUpdateFn).toHaveBeenCalledWith({
        source_files: [{ file_path: otherFilePath, file_name: 'other.pdf' }],
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
    });

    test('handles storage deletion failure', async () => {
      const mockSelect = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: mockCartridgeId, source_files: [{ file_path: mockFilePath }] },
          error: null,
        }),
      };

      const mockRemove = jest.fn().mockResolvedValue({
        error: { message: 'Storage deletion failed' },
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockSelect),
      });

      mockSupabaseClient.storage.from.mockReturnValue({
        remove: mockRemove,
      });

      const request = {
        json: async () => ({ cartridgeId: mockCartridgeId, filePath: mockFilePath }),
      };

      const response = await DELETE(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to delete file');
    });

    test('handles database update failure', async () => {
      const mockSelect = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: mockCartridgeId, source_files: [{ file_path: mockFilePath }] },
          error: null,
        }),
      };

      const mockRemove = jest.fn().mockResolvedValue({ error: null });
      const mockUpdate = {
        eq: jest.fn().mockReturnThis(),
      };
      mockUpdate.eq.mockResolvedValue({
        error: { message: 'Database update failed' },
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockSelect),
        update: jest.fn().mockReturnValue(mockUpdate),
      });

      mockSupabaseClient.storage.from.mockReturnValue({
        remove: mockRemove,
      });

      const request = {
        json: async () => ({ cartridgeId: mockCartridgeId, filePath: mockFilePath }),
      };

      const response = await DELETE(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update cartridge');
    });
  });
});
