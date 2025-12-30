import { config } from '@/config/env';
import { Logger, FileSyncLoggerConfig } from 'ruki-logger';

Logger.configure({
  hideTimestamp: false,
  timestampFormat: "iso",
  format: "#2%##2%###4%####",
  tagDecorator: "[]",
  colorOptions: {
    location: "#505a5bff",
  },
  locationPath: 'relative',
  levelColors: {
    error: "#f63d3dff",
    warn: "#ffa500ff",
    info: "#7c2a89ff",
    highlight: "#ffd000ff",
    task: "#21d321ff",
    quiet: "#505a5bff",
    test: "#2a892aff",

  },
  levelTaggingOptions: {
    error: { tag: '[ERROR]' },
    warn: { tag: '[WARN]' },
    info: { tag: '[INFO]' },
    highlight: { tag: '[HIGHLIGHT]' },
    task: { tag: '[TASK]' },
    quiet: { tag: '[VERBOSE]' },
  },
  forceColorLevel: 3,
  enableLevelTagging: true,
  cellSizes: {
    timestamp: { min: 26 },
    tag: { min: 20 },
    location: { min: 60 },
  },
});


if (config.isProduction) {
  new FileSyncLoggerConfig({
    info: 'logs/info.log',
    error: 'logs/error.log',
  }).registerSink();
}

export const logger = Logger;