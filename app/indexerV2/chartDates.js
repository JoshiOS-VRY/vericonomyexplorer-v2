"use strict";

/** Axis / bucket label — always includes the year. */
function formatChartDayLabel(unixSeconds) {
	return new Date(unixSeconds * 1000).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric"
	});
}

module.exports = {
	formatChartDayLabel
};
