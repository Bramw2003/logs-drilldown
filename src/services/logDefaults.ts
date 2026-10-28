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

const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';

const LOG_DEFAULT_GUARDS: { [K in keyof LogDefaults]-?: (value: unknown) => value is Required<LogDefaults>[K] } = {
  fontSize: (value): value is LogFontSize => value === 'default' || value === 'small',
  prettifyLogMessage: isBoolean,
  showTime: isBoolean,
  sortOrder: (value): value is LogsSortOrder => value === LogsSortOrder.Ascending || value === LogsSortOrder.Descending,
  timestampResolution: (value): value is LogTimestampResolution => value === 'ms' || value === 'ns',
  wrapLogMessage: isBoolean,
};

export const isLogDefaultKey = (option: string): option is keyof LogDefaults => option in LOG_OPTION_DEFAULTS;

export const isLogDefaultValue = <K extends keyof LogDefaults>(
  option: K,
  value: unknown
): value is Required<LogDefaults>[K] => LOG_DEFAULT_GUARDS[option](value);
