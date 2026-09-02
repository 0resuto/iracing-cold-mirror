import React, { useState } from 'react';
import { Modal, Button, Input, useToast } from '@0resuto/ui-kit';
import { Lock, User, LogIn, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

export function LoginModal({ isOpen, onClose }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useAuthStore((state) => state.login);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await login(username.trim(), password);
      toast.success('Authenticated', 'Welcome back, Administrator!');
      setPassword('');
      onClose();
    } catch (err) {
      const msg = err.message || 'Invalid credentials';
      setError(msg);
      toast.error('Authentication Failed', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setPassword('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Login"
      size="sm"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-accent-red/10 border border-accent-red/30 rounded-lg text-accent-red text-xs">
            <AlertCircle size={16} className="flex-none" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-brand-10/80 uppercase tracking-wider">
            Username
          </label>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin"
            icon={User}
            disabled={isLoading}
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-brand-10/80 uppercase tracking-wider">
            Password
          </label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            icon={Lock}
            disabled={isLoading}
          />
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isLoading}
            leftIcon={<LogIn size={16} />}
          >
            Sign In
          </Button>
        </div>
      </form>
    </Modal>
  );
}
