/**
 * Global Supabase SSR Mock
 *
 * Provides a chainable mock for all Supabase operations
 */

export const createMockSupabaseClient = () => {
  const mockClient: any = {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }),
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
    from: jest.fn(),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  };

  // Create chainable query builder
  const createQueryBuilder = () => {
    const builder: any = {
      select: jest.fn().mockReturnValue(builder),
      insert: jest.fn().mockReturnValue(builder),
      update: jest.fn().mockReturnValue(builder),
      delete: jest.fn().mockReturnValue(builder),
      upsert: jest.fn().mockReturnValue(builder),
      eq: jest.fn().mockReturnValue(builder),
      neq: jest.fn().mockReturnValue(builder),
      gt: jest.fn().mockReturnValue(builder),
      gte: jest.fn().mockReturnValue(builder),
      lt: jest.fn().mockReturnValue(builder),
      lte: jest.fn().mockReturnValue(builder),
      like: jest.fn().mockReturnValue(builder),
      ilike: jest.fn().mockReturnValue(builder),
      is: jest.fn().mockReturnValue(builder),
      in: jest.fn().mockReturnValue(builder),
      contains: jest.fn().mockReturnValue(builder),
      containedBy: jest.fn().mockReturnValue(builder),
      order: jest.fn().mockReturnValue(builder),
      limit: jest.fn().mockReturnValue(builder),
      range: jest.fn().mockReturnValue(builder),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      then: jest.fn((resolve) => resolve({ data: [], error: null })),
    };

    // Make builder thenable (for await)
    builder[Symbol.toStringTag] = 'Promise';
    builder.then = (onFulfilled: any) => Promise.resolve({ data: [], error: null }).then(onFulfilled);
    builder.catch = (onRejected: any) => Promise.resolve({ data: [], error: null }).catch(onRejected);

    return builder;
  };

  mockClient.from.mockImplementation(() => createQueryBuilder());

  return mockClient;
};

export const createServerClient = jest.fn(() => createMockSupabaseClient());
export const createBrowserClient = jest.fn(() => createMockSupabaseClient());
