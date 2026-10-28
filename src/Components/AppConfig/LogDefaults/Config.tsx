import React, { useState } from 'react';

import { css } from '@emotion/css';

import { AppPluginMeta, GrafanaTheme2, LogsSortOrder, PluginConfigPageProps, SelectableValue } from '@grafana/data';
import { t, Trans } from '@grafana/i18n';
import { updateAppPluginSettings } from '@grafana/plugin-compat/apps';
import { locationService } from '@grafana/runtime';
import { Alert, Button, Field, FieldSet, IconButton, RadioButtonGroup, Stack, useStyles2 } from '@grafana/ui';

import type { JsonData } from '../AppConfig';
import {
  LOG_FONT_SIZES,
  LOG_OPTION_DEFAULTS,
  LOG_TIMESTAMP_RESOLUTIONS,
  LogDefaults,
  LogFontSize,
  LogTimestampResolution,
} from 'services/logDefaults';
import { logger } from 'services/logger';
import { testIds } from 'services/testIds';

const TIMESTAMPS_HIDDEN = 'hidden';
type Timestamps = typeof TIMESTAMPS_HIDDEN | LogTimestampResolution;

interface Props extends PluginConfigPageProps<AppPluginMeta<JsonData>> {}

const LogDefaultsConfig = ({ plugin }: Props) => {
  const styles = useStyles2(getStyles);
  const { enabled, jsonData, pinned } = plugin.meta;
  // Only the options the admin has set; anything missing follows the built-in default
  const [overrides, setOverrides] = useState<LogDefaults>(jsonData?.logDefaults ?? {});

  const onChange = <K extends keyof LogDefaults>(key: K, value: LogDefaults[K]) => {
    setOverrides((prev) => ({ ...prev, [key]: value }));
  };

  const onReset = (key: keyof LogDefaults) => {
    setOverrides(({ [key]: _removed, ...rest }) => rest);
  };

  const onSave = async () => {
    try {
      await updateAppPluginSettings(plugin.meta.id, {
        enabled,
        jsonData: { ...jsonData, logDefaults: Object.keys(overrides).length ? overrides : undefined },
        pinned,
      });
      // Changes made here aren't propagated to the running plugin without a reload
      locationService.reload();
    } catch (e) {
      logger.error(e, { msg: 'Error while updating the plugin' });
    }
  };

  const renderRow = <V extends string | boolean>(
    label: string,
    options: Array<SelectableValue<V>>,
    value: V,
    isSet: boolean,
    onSelect: (value: V) => void,
    onResetRow: () => void,
    testId: string
  ) => (
    <Field label={label}>
      <Stack alignItems="center">
        <RadioButtonGroup data-testid={testId} options={options} value={value} onChange={onSelect} />
        <IconButton
          name="history"
          size="md"
          disabled={!isSet}
          onClick={onResetRow}
          tooltip={t('components.app-config.log-defaults.reset', 'Reset to default')}
          data-testid={`${testId} reset`}
        />
      </Stack>
    </Field>
  );

  const renderOption = <K extends keyof LogDefaults>(
    key: K,
    label: string,
    options: Array<SelectableValue<Required<LogDefaults>[K]>>,
    testId: string
  ) =>
    renderRow(
      label,
      options,
      overrides[key] ?? LOG_OPTION_DEFAULTS[key],
      overrides[key] !== undefined,
      (v) => onChange(key, v),
      () => onReset(key),
      testId
    );

  // Wrapping and prettifying are one choice, matching the Wrap toggle in the logs view
  const wrap = overrides.wrapLogMessage ?? LOG_OPTION_DEFAULTS.wrapLogMessage;
  const onChangeLineWrapping = (value: boolean) => {
    setOverrides((prev) => ({ ...prev, prettifyLogMessage: value, wrapLogMessage: value }));
  };

  // Mirrors Grafana's timestamps menu: hidden, or shown at millisecond or nanosecond resolution
  const showTime = overrides.showTime ?? LOG_OPTION_DEFAULTS.showTime;
  const resolution = overrides.timestampResolution ?? LOG_OPTION_DEFAULTS.timestampResolution;
  const timestamps: Timestamps = showTime ? resolution : TIMESTAMPS_HIDDEN;
  const onChangeTimestamps = (value: Timestamps) => {
    setOverrides((prev) =>
      value === TIMESTAMPS_HIDDEN
        ? { ...prev, showTime: false }
        : { ...prev, showTime: true, timestampResolution: value }
    );
  };

  const timestampLabels: Record<Timestamps, string> = {
    [TIMESTAMPS_HIDDEN]: t('components.app-config.log-defaults.timestamps-hidden', 'Hidden'),
    ms: t('components.app-config.log-defaults.timestamps-ms', 'Milliseconds'),
    ns: t('components.app-config.log-defaults.timestamps-ns', 'Nanoseconds'),
  };
  const timestampChoices: Timestamps[] = [TIMESTAMPS_HIDDEN, ...LOG_TIMESTAMP_RESOLUTIONS];
  const fontSizeLabels: Record<LogFontSize, string> = {
    default: t('components.app-config.log-defaults.font-size-normal', 'Normal'),
    small: t('components.app-config.log-defaults.font-size-small', 'Small'),
  };
  const { logDefaults: ids } = testIds.appConfig;

  return (
    <div>
      <FieldSet label={t('components.app-config.log-defaults.label', 'Log defaults')}>
        <p className={styles.description}>
          <Trans i18nKey="components.app-config.log-defaults.description">
            Defaults for the logs view. Each user can override them in the log options.
          </Trans>
        </p>

        {renderRow<boolean>(
          t('components.app-config.log-defaults.line-wrapping', 'Line wrapping'),
          [
            {
              label: t('components.service-scene.log-options-scene.label.no-wrap', 'No wrap'),
              value: false,
            },
            { label: t('components.service-scene.log-options-scene.label.wrap', 'Wrap'), value: true },
          ],
          wrap,
          overrides.wrapLogMessage !== undefined || overrides.prettifyLogMessage !== undefined,
          onChangeLineWrapping,
          () => {
            onReset('wrapLogMessage');
            onReset('prettifyLogMessage');
          },
          ids.lineWrapping
        )}
        {renderRow<Timestamps>(
          t('components.app-config.log-defaults.timestamps', 'Timestamps'),
          timestampChoices.map((value) => ({
            label: timestampLabels[value],
            value,
          })),
          timestamps,
          overrides.showTime !== undefined || overrides.timestampResolution !== undefined,
          onChangeTimestamps,
          () => {
            onReset('showTime');
            onReset('timestampResolution');
          },
          ids.timestamps
        )}
        {renderOption(
          'fontSize',
          t('components.app-config.log-defaults.font-size', 'Font size'),
          LOG_FONT_SIZES.map((value) => ({ label: fontSizeLabels[value], value })),
          ids.fontSize
        )}
        {renderOption(
          'sortOrder',
          t('components.app-config.log-defaults.sort-order', 'Sort order'),
          [
            {
              label: t('components.service-scene.log-options-scene.label.newest-first', 'Newest first'),
              value: LogsSortOrder.Descending,
            },
            {
              label: t('components.service-scene.log-options-scene.label.oldest-first', 'Oldest first'),
              value: LogsSortOrder.Ascending,
            },
          ],
          ids.sortOrder
        )}

        <Button type="submit" data-testid={ids.submit} onClick={onSave}>
          <Trans i18nKey="components.app-config.log-defaults.save">Save settings</Trans>
        </Button>
        <div className={styles.note}>
          <Alert severity="info" title="">
            <Trans i18nKey="components.app-config.active-users-reload-reflect-configuration-changes">
              Active users must reload the app to reflect configuration changes.
            </Trans>
          </Alert>
        </div>
      </FieldSet>
    </div>
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
  description: css({
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing(2),
  }),
  note: css({
    marginTop: theme.spacing(2),
  }),
});

export default LogDefaultsConfig;
