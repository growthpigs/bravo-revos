import { POST } from '@/app/api/cartridges/instructions/[id]/process/route';
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMem0Client } from '@/lib/mem0/client';

// Mock dependencies
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/mem0/client');
jest.mock('pdf-parse', () => {
  return jest.fn((buffer) => Promise.resolve({ text: 'This is PDF content' }));
});
jest.mock('mammoth', () => ({
  extractRawText: jest.fn((options) => Promise.resolve({ value: 'This is DOCX content' }))
}));

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockGetMem0Client = getMem0Client as jest.MockedFunction<typeof getMem0Client>;

describe('POST /api/cartridges/instructions/[id]/process', () => {
  const mockUserId = '00000000-0000-0000-0000-000000000001';
  const mockInstructionId = '11111111-1111-1111-1111-111111111111';

  let mockSupabase: any;
  let mockMem0: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Supabase client
    mockSupabase = {
      auth: {
        getUser: jest.fn()
      },
      from: jest.fn(),
      storage: {
        from: jest.fn()
      }
    };

    // Mock Mem0 client
    mockMem0 = {
      add: jest.fn().mockResolvedValue({ success: true })
    };

    mockCreateClient.mockResolvedValue(mockSupabase as any);
    mockGetMem0Client.mockReturnValue(mockMem0);
  });

  it('should return 401 if user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Not authenticated')
    });

    const request = new NextRequest('http://localhost:3000/api/cartridges/instructions/123/process', {
      method: 'POST'
    });

    const response = await POST(request, { params: { id: mockInstructionId } });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 404 if cartridge not found', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    });

    const mockFrom = jest.fn().mockReturnThis();
    const mockSelect = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockReturnThis();
    const mockSingle = jest.fn().mockResolvedValue({
      data: null,
      error: new Error('Not found')
    });

    mockSupabase.from = mockFrom;
    mockFrom.mockReturnValue({
      select: mockSelect,
      update: jest.fn().mockReturnThis(),
      eq: mockEq
    });
    mockSelect.mockReturnValue({
      eq: mockEq
    });
    mockEq.mockReturnValue({
      eq: mockEq,
      single: mockSingle
    });

    const request = new NextRequest('http://localhost:3000/api/cartridges/instructions/123/process', {
      method: 'POST'
    });

    const response = await POST(request, { params: { id: mockInstructionId } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Cartridge not found');
  });

  it('should process instruction cartridge without training docs', async () => {
    const mockCartridge = {
      id: mockInstructionId,
      user_id: mockUserId,
      name: 'Marketing Best Practices',
      description: 'Instructions for creating marketing content',
      training_docs: [],
      mem0_namespace: `instructions::marketing::${mockUserId}`,
      process_status: 'pending'
    };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    });

    const mockFrom = jest.fn();
    const mockSelect = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockReturnThis();
    const mockSingle = jest.fn().mockResolvedValue({
      data: mockCartridge,
      error: null
    });
    const mockUpdate = jest.fn().mockReturnThis();

    // First call: select cartridge
    mockFrom.mockReturnValueOnce({
      select: mockSelect
    });
    mockSelect.mockReturnValue({
      eq: mockEq
    });
    mockEq.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        single: mockSingle
      })
    });

    // Second call: update to processing
    mockFrom.mockReturnValueOnce({
      update: mockUpdate
    });
    mockUpdate.mockReturnValue({
      eq: jest.fn().mockResolvedValue({ data: null, error: null })
    });

    // Third call: update to completed
    mockFrom.mockReturnValueOnce({
      update: mockUpdate
    });
    mockUpdate.mockReturnValue({
      eq: jest.fn().mockResolvedValue({ data: null, error: null })
    });

    mockSupabase.from = mockFrom;

    const request = new NextRequest('http://localhost:3000/api/cartridges/instructions/123/process', {
      method: 'POST'
    });

    const response = await POST(request, { params: { id: mockInstructionId } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('Instructions processed successfully');
    expect(data.extracted_knowledge).toBeDefined();
    expect(data.extracted_knowledge.cartridge_name).toBe('Marketing Best Practices');
    expect(data.extracted_knowledge.training_doc_count).toBe(0);
    expect(data.extracted_knowledge.has_training_docs).toBe(false);

    // Verify Mem0 was called with correct format
    expect(mockMem0.add).toHaveBeenCalledWith(
      [{
        role: 'user',
        content: expect.stringContaining('Content generation instructions')
      }],
      {
        user_id: `instructions::marketing::${mockUserId}`,
        metadata: {
          type: 'instructions',
          cartridge_id: mockInstructionId,
          processed_at: expect.any(String)
        }
      }
    );
  });

  it('should process instruction cartridge with training docs', async () => {
    const mockCartridge = {
      id: mockInstructionId,
      user_id: mockUserId,
      name: 'Content Strategy',
      description: 'Advanced content creation strategy',
      training_docs: [
        {
          file_path: `${mockUserId}/instructions/${mockInstructionId}/guide.pdf`,
          file_name: 'guide.pdf',
          file_type: 'application/pdf',
          uploaded_at: '2024-01-01T00:00:00Z'
        },
        {
          file_path: `${mockUserId}/instructions/${mockInstructionId}/examples.txt`,
          file_name: 'examples.txt',
          file_type: 'text/plain',
          uploaded_at: '2024-01-01T00:00:00Z'
        }
      ],
      mem0_namespace: `instructions::marketing::${mockUserId}`,
      process_status: 'pending'
    };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    });

    // Mock storage client for file downloads
    const mockPdfBlob = {
      arrayBuffer: jest.fn().mockResolvedValue(Buffer.from('This is PDF content').buffer),
      type: 'application/pdf'
    };

    const mockTxtBlob = {
      arrayBuffer: jest.fn().mockResolvedValue(Buffer.from('Example 1: Use clear CTAs\nExample 2: Keep it concise').buffer),
      type: 'text/plain'
    };

    const mockStorageClient = {
      ...mockSupabase,
      storage: {
        from: jest.fn().mockReturnValue({
          download: jest.fn()
            .mockResolvedValueOnce({
              data: mockPdfBlob,
              error: null
            })
            .mockResolvedValueOnce({
              data: mockTxtBlob,
              error: null
            })
        })
      }
    };

    // Mock createClient to return different clients for service role
    mockCreateClient
      .mockResolvedValueOnce(mockSupabase as any) // Regular client
      .mockResolvedValueOnce(mockStorageClient as any); // Service role client

    const mockFrom = jest.fn();
    const mockSelect = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockReturnThis();
    const mockSingle = jest.fn().mockResolvedValue({
      data: mockCartridge,
      error: null
    });
    const mockUpdate = jest.fn().mockReturnThis();

    // First call: select cartridge
    mockFrom.mockReturnValueOnce({
      select: mockSelect
    });
    mockSelect.mockReturnValue({
      eq: mockEq
    });
    mockEq.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        single: mockSingle
      })
    });

    // Second call: update to processing
    mockFrom.mockReturnValueOnce({
      update: mockUpdate
    });
    mockUpdate.mockReturnValue({
      eq: jest.fn().mockResolvedValue({ data: null, error: null })
    });

    // Third call: update to completed
    mockFrom.mockReturnValueOnce({
      update: mockUpdate
    });
    mockUpdate.mockReturnValue({
      eq: jest.fn().mockResolvedValue({ data: null, error: null })
    });

    mockSupabase.from = mockFrom;

    const request = new NextRequest('http://localhost:3000/api/cartridges/instructions/123/process', {
      method: 'POST'
    });

    const response = await POST(request, { params: { id: mockInstructionId } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('Instructions processed successfully');
    expect(data.extracted_knowledge.training_doc_count).toBe(2);
    expect(data.extracted_knowledge.has_training_docs).toBe(true);

    // Verify Mem0 was called
    expect(mockMem0.add).toHaveBeenCalled();
    const mem0Call = mockMem0.add.mock.calls[0];
    const content = mem0Call[0][0].content;

    // Verify content includes training docs
    expect(content).toContain('Training Documents:');
    expect(content).toContain('guide.pdf');
    expect(content).toContain('examples.txt');
  });

  it('should handle Mem0 storage errors gracefully', async () => {
    const mockCartridge = {
      id: mockInstructionId,
      user_id: mockUserId,
      name: 'Test Instructions',
      description: 'Test description',
      training_docs: [],
      mem0_namespace: `instructions::marketing::${mockUserId}`,
      process_status: 'pending'
    };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    });

    // Mock Mem0 to fail
    mockMem0.add.mockRejectedValue(new Error('Mem0 connection failed'));

    const mockFrom = jest.fn();
    const mockSelect = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockReturnThis();
    const mockSingle = jest.fn().mockResolvedValue({
      data: mockCartridge,
      error: null
    });
    const mockUpdate = jest.fn().mockReturnThis();

    mockFrom.mockReturnValue({
      select: mockSelect,
      update: mockUpdate
    });
    mockSelect.mockReturnValue({
      eq: mockEq
    });
    mockEq.mockReturnValue({
      eq: mockEq,
      single: mockSingle
    });
    mockUpdate.mockReturnValue({
      eq: jest.fn().mockResolvedValue({ data: null, error: null })
    });

    mockSupabase.from = mockFrom;

    const request = new NextRequest('http://localhost:3000/api/cartridges/instructions/123/process', {
      method: 'POST'
    });

    // Should still succeed even if Mem0 fails
    const response = await POST(request, { params: { id: mockInstructionId } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('Instructions processed successfully');
  });

  it('should update status to failed on processing error', async () => {
    const mockCartridge = {
      id: mockInstructionId,
      user_id: mockUserId,
      name: 'Test Instructions',
      training_docs: [],
      mem0_namespace: `instructions::marketing::${mockUserId}`
    };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    });

    const mockFrom = jest.fn();
    const mockSelect = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockReturnThis();
    const mockSingle = jest.fn().mockResolvedValue({
      data: mockCartridge,
      error: null
    });
    const mockUpdate = jest.fn().mockReturnThis();

    mockFrom.mockReturnValue({
      select: mockSelect,
      update: mockUpdate
    });
    mockSelect.mockReturnValue({
      eq: mockEq
    });
    mockEq.mockReturnValue({
      eq: mockEq,
      single: mockSingle
    });

    // First update succeeds (processing status)
    // Second update should fail to trigger error handling
    let updateCallCount = 0;
    mockUpdate.mockReturnValue({
      eq: jest.fn().mockImplementation(() => {
        updateCallCount++;
        if (updateCallCount === 2) {
          // Fail on second update (completed status)
          return Promise.resolve({ data: null, error: new Error('Database error') });
        }
        return Promise.resolve({ data: null, error: null });
      })
    });

    mockSupabase.from = mockFrom;

    const request = new NextRequest('http://localhost:3000/api/cartridges/instructions/123/process', {
      method: 'POST'
    });

    const response = await POST(request, { params: { id: mockInstructionId } });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Processing failed');
  });

  it('should handle missing cartridge gracefully', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    });

    const mockFrom = jest.fn();
    const mockSelect = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockReturnThis();
    const mockSingle = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'Cartridge not found' }
    });

    mockFrom.mockReturnValue({
      select: mockSelect
    });
    mockSelect.mockReturnValue({
      eq: mockEq
    });
    mockEq.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: mockSingle
      })
    });

    mockSupabase.from = mockFrom;

    const request = new NextRequest('http://localhost:3000/api/cartridges/instructions/nonexistent/process', {
      method: 'POST'
    });

    const response = await POST(request, { params: { id: 'nonexistent-id' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Cartridge not found');
  });

  it('should use correct Mem0 namespace format', async () => {
    const mockCartridge = {
      id: mockInstructionId,
      user_id: mockUserId,
      name: 'Test Instructions',
      training_docs: [],
      mem0_namespace: `instructions::marketing::${mockUserId}`,
      process_status: 'pending'
    };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    });

    const mockFrom = jest.fn();
    const mockSelect = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockReturnThis();
    const mockSingle = jest.fn().mockResolvedValue({
      data: mockCartridge,
      error: null
    });
    const mockUpdate = jest.fn().mockReturnThis();

    mockFrom.mockReturnValue({
      select: mockSelect,
      update: mockUpdate
    });
    mockSelect.mockReturnValue({
      eq: mockEq
    });
    mockEq.mockReturnValue({
      eq: mockEq,
      single: mockSingle
    });
    mockUpdate.mockReturnValue({
      eq: jest.fn().mockResolvedValue({ data: null, error: null })
    });

    mockSupabase.from = mockFrom;

    const request = new NextRequest('http://localhost:3000/api/cartridges/instructions/123/process', {
      method: 'POST'
    });

    await POST(request, { params: { id: mockInstructionId } });

    // Verify Mem0 namespace format
    expect(mockMem0.add).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({
        user_id: `instructions::marketing::${mockUserId}`,
        metadata: expect.objectContaining({
          type: 'instructions',
          cartridge_id: mockInstructionId
        })
      })
    );
  });
});
