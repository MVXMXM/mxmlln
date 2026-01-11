'use client';
import { useEffect } from 'react';

export default function Page() {
  useEffect(() => {
    window.location.href = '/static/015/index.html';
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Redirecting to experiment 015...</p>
    </div>
  );
}
