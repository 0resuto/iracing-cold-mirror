import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isAdmin: false,

      /**
       * Authenticate user with username and password.
       * Calls POST /api/v1/auth/login and stores JWT token & user profile.
       */
      login: async (username, password) => {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password }),
        });

        if (!res.ok) {
          let errorMsg = 'Invalid username or password';
          try {
            const data = await res.json();
            if (data?.detail) errorMsg = data.detail;
          } catch {
            // Non-JSON response
          }
          throw new Error(errorMsg);
        }

        const data = await res.json();
        const token = data.access_token;
        const role = data.role || 'guest';
        const user = { username: data.username || username, role };

        set({
          token,
          user,
          isAuthenticated: true,
          isAdmin: role === 'admin',
        });

        return data;
      },

      /**
       * Log out user, invalidate local credentials and state.
       */
      logout: () => {
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          isAdmin: false,
        });
      },

      /**
       * Validate active token against GET /api/v1/auth/me on app mount.
       * If token is invalid or expired, automatically logs out.
       */
      checkAuth: async () => {
        const { token } = get();
        if (!token) return;

        try {
          const res = await fetch(`${API_BASE}/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (res.ok) {
            const user = await res.json();
            set({
              user,
              isAuthenticated: true,
              isAdmin: user.role === 'admin',
            });
          } else if (res.status === 401) {
            get().logout();
          }
        } catch {
          // If server is temporarily unreachable, do not clear token immediately
        }
      },
    }),
    {
      name: 'iracing_telemetry_auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isAdmin: state.isAdmin,
      }),
    }
  )
);
