export const TIME_FORMATS = {
  "HH:MM:SS": {
    label: "Hours:Minutes:Seconds",
    units: ["Hours", "Minutes", "Seconds"],
  },
  "HH:MM": {
    label: "Hours:Minutes",
    units: ["Hours", "Minutes"],
  },
  "MM:SS": {
    label: "Minutes:Seconds",
    units: ["Minutes", "Seconds"],
  },
  SS: {
    label: "Seconds Only",
    units: ["Seconds"],
  },
};

export function getTimeFormatOptions() {
  return Object.entries(TIME_FORMATS).map(([value, config]) => ({
    value,
    label: config.label,
  }));
}

export function getTimeUnits(format) {
  return TIME_FORMATS[format]?.units || TIME_FORMATS["HH:MM:SS"].units;
}
