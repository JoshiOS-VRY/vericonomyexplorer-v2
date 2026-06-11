'use client';

import { useEffect, useState } from 'react';

export function CsrfInput() {
  const [token, setToken] = useState('');

  useEffect(() => {
    fetch('/api/csrf')
      .then((res) => res.json())
      .then((data: { token?: string }) => setToken(data.token ?? ''))
      .catch(() => setToken(''));
  }, []);

  if (!token) return null;
  return <input type="hidden" name="_csrf" value={token} />;
}
