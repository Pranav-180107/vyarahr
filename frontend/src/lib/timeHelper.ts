export const getRelativeTime = (timeStr: string) => {
  if (!timeStr || timeStr === 'Just now' || timeStr.includes(' ago')) return timeStr;
  const date = new Date(timeStr);
  if (isNaN(date.getTime())) return timeStr;

  const diffInSeconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
};
