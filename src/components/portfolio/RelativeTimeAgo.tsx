import React, { useState, useEffect } from 'react';

interface RelativeTimeAgoProps {
  timestamp: number | null;
  className?: string;
}

/**
 * Isolated relative time renderer that updates its own state every 1 second.
 * Does NOT trigger re-renders in parent tables or row components.
 */
export const RelativeTimeAgo: React.FC<RelativeTimeAgoProps> = React.memo(({
  timestamp,
  className = ''
}) => {
  const [secondsAgo, setSecondsAgo] = useState<number>(() => {
    return timestamp ? Math.max(0, Math.floor((Date.now() - timestamp) / 1000)) : 0;
  });

  useEffect(() => {
    if (!timestamp) return;

    const update = () => {
      setSecondsAgo(Math.max(0, Math.floor((Date.now() - timestamp) / 1000)));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [timestamp]);

  if (!timestamp) return null;

  return (
    <span className={`tabular-nums font-mono ${className}`}>
      ({secondsAgo}s ago)
    </span>
  );
});
