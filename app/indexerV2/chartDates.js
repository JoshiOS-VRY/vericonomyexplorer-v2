'use strict';

/** Axis / bucket label — UTC calendar day (matches on-chain block times). */
function formatChartDayLabel(unixSeconds) {
  return new Date(unixSeconds * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

module.exports = {
  formatChartDayLabel,
};
