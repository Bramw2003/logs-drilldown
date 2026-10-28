import { LogsSortOrder } from '@grafana/data';
import { Options } from '@grafana/schema/dist/esm/raw/composable/logs/panelcfg/x/LogsPanelCfg_types.gen';

// The logs panel only exports these as type unions, so the runtime lists are checked against them
export type LogFontSize = NonNullable<Options['fontSize']>;
export type LogTimestampResolution = NonNullable<Options['timestampResolution']>;

export const LOG_FONT_SIZES = ['default', 'small'] as const satisfies readonly LogFontSize[];
export const LOG_TIMESTAMP_RESOLUTIONS = ['ms', 'ns'] as const satisfies readonly LogTimestampResolution[];

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
  fontSize: LOG_FONT_SIZES[0],
  prettifyLogMessage: false,
  showTime: true,
  sortOrder: LogsSortOrder.Descending,
  timestampResolution: LOG_TIMESTAMP_RESOLUTIONS[0],
  wrapLogMessage: false,
};

const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';

const LOG_DEFAULT_GUARDS: { [K in keyof LogDefaults]-?: (value: unknown) => value is Required<LogDefaults>[K] } = {
  fontSize: (value): value is LogFontSize => LOG_FONT_SIZES.some((size) => size === value),
  prettifyLogMessage: isBoolean,
  showTime: isBoolean,
  sortOrder: (value): value is LogsSortOrder => value === LogsSortOrder.Ascending || value === LogsSortOrder.Descending,
  timestampResolution: (value): value is LogTimestampResolution =>
    LOG_TIMESTAMP_RESOLUTIONS.some((resolution) => resolution === value),
  wrapLogMessage: isBoolean,
};

export const isLogDefaultKey = (option: string): option is keyof LogDefaults => option in LOG_OPTION_DEFAULTS;

export const isLogDefaultValue = <K extends keyof LogDefaults>(
  option: K,
  value: unknown
): value is Required<LogDefaults>[K] => LOG_DEFAULT_GUARDS[option](value);
