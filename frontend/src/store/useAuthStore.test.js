import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from './useAuthStore';

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().logout();
    vi.restoreAllMocks();
  });

  it('should initialize with guest/unauthenticated state', () => {
    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isAdmin).toBe(false);
  });

  it('should successfully log in and update state on valid credentials', async () => {
    const mockResponse = {
      access_token: 'mock-jwt-token-123',
      token_type: 'bearer',
      username: 'admin',
      role: 'admin',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    await useAuthStore.getState().login('admin', 'secret123');

    const state = useAuthStore.getState();
    expect(state.token).toBe('mock-jwt-token-123');
    expect(state.user).toEqual({ username: 'admin', role: 'admin' });
    expect(state.isAuthenticated).toBe(true);
    expect(state.isAdmin).toBe(true);
  });

  it('should throw an error on invalid credentials', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ detail: 'Incorrect username or password' }),
    });

    await expect(useAuthStore.getState().login('admin', 'wrong')).rejects.toThrow(
      'Incorrect username or password'
    );

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.token).toBeNull();
  });

  it('should log out and reset state', () => {
    useAuthStore.setState({
      token: 'some-token',
      user: { username: 'admin', role: 'admin' },
      isAuthenticated: true,
      isAdmin: true,
    });

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isAdmin).toBe(false);
  });
});
