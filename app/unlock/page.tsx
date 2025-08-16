'use client';
import { useState } from 'react';

export default function Page() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch('/api/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      window.location.href = '/';
    } else {
      setError('Invalid password');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="space-y-4 max-w-sm w-full bg-white p-6 rounded-xl shadow">
        <h1 className="text-lg font-bold text-center">Enter Password</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="px-3 py-2 border rounded-md w-full"
        />
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button type="submit" className="px-3 py-2 bg-black text-white rounded-md w-full">Unlock</button>
      </form>
    </div>
  );
}
