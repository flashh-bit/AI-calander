import React, { useState } from 'react';
import { X, User as UserIcon, Check, Plus, LogOut, KeyRound, Mail } from 'lucide-react';
import { User } from '../types';

interface UserSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  users: User[];
  onSelectUser: (user: User) => void;
  onLoginAnother: (email: string, password: string) => Promise<void>;
  onLogout: () => void;
}

export const UserSwitcherModal: React.FC<UserSwitcherModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  users,
  onSelectUser,
  onLoginAnother,
  onLogout,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) return;

    try {
      setLoading(true);
      await onLoginAnother(email.trim(), password);
      setIsAdding(false);
      setEmail('');
      setPassword('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-200"
      id="account-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-[#fdfcf9] rounded-t-3xl sm:rounded-2xl shadow-2xl border-t sm:border border-[#dedad1] max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
        id="account-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Sheet Drag Handle */}
        <div className="w-full pt-3 pb-1 flex justify-center sm:hidden bg-[#fdfcf9]">
          <div className="w-12 h-1.5 bg-[#d2ccc0] rounded-full" />
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-b border-[#eeebe4]">
          <div className="flex items-center gap-2">
            <UserIcon className="w-4.5 h-4.5 text-[#4a545e]" strokeWidth={1.5} />
            <h2 className="text-sm sm:text-base font-semibold text-[#2d3139]">Account Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[#8c949e] hover:text-[#2d3139] hover:bg-[#f2efe9] transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4.5 h-4.5" strokeWidth={1.5} />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4 flex-1 overflow-y-auto">
          {/* Active User Card */}
          {currentUser && (
            <div className="p-4 rounded-xl bg-[#f5f3ee] border border-[#dedad1] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#4a545e] text-[#f7f6f2] flex items-center justify-center text-sm font-semibold uppercase shrink-0">
                  {currentUser.name ? currentUser.name.charAt(0) : 'U'}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1f242b] leading-tight">
                    {currentUser.name}
                  </p>
                  <p className="text-xs text-[#717a84] mt-0.5">{currentUser.email}</p>
                </div>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#e8e4db] text-[#4a545e] font-medium border border-[#dedad1]">
                Active
              </span>
            </div>
          )}

          {/* Other Accounts List */}
          {users.filter((u) => u.id !== currentUser?.id).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#4a545e] mb-2">Switch Account</p>
              <div className="space-y-1.5">
                {users
                  .filter((u) => u.id !== currentUser?.id)
                  .map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        onSelectUser(u);
                        onClose();
                      }}
                      className="w-full p-2.5 rounded-xl border border-[#dedad1] bg-[#ffffff] hover:bg-[#faf9f6] text-left flex items-center justify-between transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#e8e4db] text-[#4a545e] flex items-center justify-center text-xs font-semibold uppercase">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-[#2d3139] leading-tight">{u.name}</p>
                          <p className="text-[10px] text-[#717a84]">{u.email}</p>
                        </div>
                      </div>
                      <span className="text-[11px] text-[#55606d] font-medium hover:underline">
                        Switch
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Add / Log in with another account */}
          {!isAdding ? (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full py-2.5 px-3 min-h-[42px] border border-dashed border-[#dedad1] hover:border-[#4a545e] hover:bg-[#ffffff] rounded-xl text-xs font-medium text-[#55606d] hover:text-[#2d3139] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Sign in with another account</span>
            </button>
          ) : (
            <form onSubmit={handleAddSubmit} className="p-3.5 bg-[#f7f5f0] rounded-xl border border-[#dedad1] space-y-3">
              <p className="text-xs font-semibold text-[#2d3139]">Sign into another account</p>
              {error && (
                <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {error}
                </div>
              )}
              <div>
                <input
                  type="email"
                  placeholder="Email address"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#dedad1] bg-[#ffffff] text-[#2d3139] focus:outline-hidden focus:border-[#4a545e]"
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#dedad1] bg-[#ffffff] text-[#2d3139] focus:outline-hidden focus:border-[#4a545e]"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 text-xs text-[#55606d] hover:text-[#2d3139] rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-3.5 py-1.5 text-xs font-medium text-[#f7f9fa] bg-[#4a545e] hover:bg-[#3f4750] rounded-lg transition-all cursor-pointer"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </div>
            </form>
          )}

          {/* Log Out Button */}
          <div className="pt-2 border-t border-[#eeebe4]">
            <button
              id="logout-button"
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="w-full py-2.5 px-3 min-h-[42px] rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100/70 text-rose-700 font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
            >
              <LogOut className="w-3.5 h-3.5" strokeWidth={1.8} />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
