import { LogsSortOrder } from '@grafana/data';

export type LogFontSize = 'default' | 'small';
export type LogTimestampResolution = 'ms' | 'ns';

// Admin-configurable log panel defaults, stored in the plugin's jsonData
export interface LogDefaults {
  fontSize?: LogFontSize;
  prettifyLogMessage?: boolean;
  showTime?: boolean;
  sortOrder?: LogsSortOrder;
  timestampResolution?: LogTimestampResolution;
  wrapLogMessage?: boolean;
}

export const LOG_OPTION_DEFAULTS: Required<LogDefaults> = {
  fontSize: 'default',
  prettifyLogMessage: false,
  showTime: true,
  sortOrder: LogsSortOrder.Descending,
  timestampResolution: 'ms',
  wrapLogMessage: false,
};
