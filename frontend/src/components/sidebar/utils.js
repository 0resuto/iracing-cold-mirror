export const formatSessionTime = (startTimeStr, durationSec, createdAtStr) => {
  const dateObj = startTimeStr ? new Date(startTimeStr) : (createdAtStr ? new Date(createdAtStr) : null);
  if (!dateObj || isNaN(dateObj.getTime())) {
    return { date: 'Session Date N/A', timeRange: '', duration: '' };
  }

  const date = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const startTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  let timeRange = startTime;
  let duration = '';

  if (durationSec && durationSec > 0) {
    const endDateObj = new Date(dateObj.getTime() + durationSec * 1000);
    const endTime = endDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    timeRange = `${startTime} – ${endTime}`;

    const mins = Math.floor(durationSec / 60);
    const secs = Math.floor(durationSec % 60);
    duration = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  }

  return { date, timeRange, duration };
};
