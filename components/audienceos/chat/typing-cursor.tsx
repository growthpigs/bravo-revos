'use client';

import * as React from 'react';

/**
 * Blinking cursor component for typing effect
 */
export function TypingCursor({ visible = true }: { visible?: boolean }) {
  const [show, setShow] = React.useState(true);

  React.useEffect(() => {
    if (!visible) {
      setShow(false);
      return;
    }

    const interval = setInterval(() => {
      setShow((prev) => !prev);
    }, 500);

    return () => clearInterval(interval);
  }, [visible]);

  if (!visible) return null;

  return (
    <span
      className="inline-block w-0.5 h-4 bg-foreground ml-0.5 align-middle"
      style={{ opacity: show ? 1 : 0 }}
      aria-hidden="true"
    />
  );
}
