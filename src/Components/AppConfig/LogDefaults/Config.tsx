import React, { useState } from 'react';

import { css } from '@emotion/css';

import { AppPluginMeta, GrafanaTheme2, LogsSortOrder, PluginConfigPageProps, SelectableValue } from '@grafana/data';
import { t, Trans } from '@grafana/i18n';
import { updateAppPluginSettings } from '@grafana/plugin-compat/apps';
import { locationService } from '@grafana/runtime';
import { Alert, Button, Field, FieldSet, IconButton, RadioButtonGroup, Stack, useStyles2 } from '@grafana/ui';

import type { JsonData } from '../AppConfig';
import { LOG_OPTION_DEFAULTS, LogDefaults, LogTimestampResolution } from 'services/logDefaults';
import { logger } from 'services/logger';
import { testIds } from 'services/testIds';

type Timestamps = 'hidden' | LogTimestampResolution;
type LineWrapping = 'none' | 'wrap' | 'wrap-prettify';

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

  // Mirrors Grafana's line wrapping menu, where prettify JSON is only available together with wrapping
  const wrap = overrides.wrapLogMessage ?? LOG_OPTION_DEFAULTS.wrapLogMessage;
  const prettify = overrides.prettifyLogMessage ?? LOG_OPTION_DEFAULTS.prettifyLogMessage;
  const lineWrapping: LineWrapping = !wrap ? 'none' : prettify ? 'wrap-prettify' : 'wrap';
  const onChangeLineWrapping = (value: LineWrapping) => {
    setOverrides((prev) => ({
      ...prev,
      prettifyLogMessage: value === 'wrap-prettify',
      wrapLogMessage: value !== 'none',
    }));
  };

  // Mirrors Grafana's timestamps menu: hidden, or shown at millisecond or nanosecond resolution
  const showTime = overrides.showTime ?? LOG_OPTION_DEFAULTS.showTime;
  const resolution = overrides.timestampResolution ?? LOG_OPTION_DEFAULTS.timestampResolution;
  const timestamps: Timestamps = showTime ? resolution : 'hidden';
  const onChangeTimestamps = (value: Timestamps) => {
    setOverrides((prev) =>
      value === 'hidden' ? { ...prev, showTime: false } : { ...prev, showTime: true, timestampResolution: value }
    );
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

        {renderRow<LineWrapping>(
          t('components.app-config.log-defaults.line-wrapping', 'Line wrapping'),
          [
            { label: t('components.app-config.log-defaults.wrap-none', 'No wrapping'), value: 'none' },
            { label: t('components.app-config.log-defaults.wrap-wrap', 'Wrap lines'), value: 'wrap' },
            {
              label: t('components.app-config.log-defaults.wrap-prettify', 'Wrap lines and prettify JSON'),
              value: 'wrap-prettify',
            },
          ],
          lineWrapping,
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
          [
            { label: t('components.app-config.log-defaults.timestamps-hidden', 'Hidden'), value: 'hidden' },
            { label: t('components.app-config.log-defaults.timestamps-ms', 'Milliseconds'), value: 'ms' },
            { label: t('components.app-config.log-defaults.timestamps-ns', 'Nanoseconds'), value: 'ns' },
          ],
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
          [
            { label: t('components.app-config.log-defaults.font-size-small', 'Small'), value: 'small' },
            { label: t('components.app-config.log-defaults.font-size-normal', 'Normal'), value: 'default' },
          ],
          ids.fontSize
        )}
        {renderOption(
          'sortOrder',
          t('components.app-config.log-defaults.sort-order', 'Sort order'),
          [
            {
              label: t('components.app-config.log-defaults.sort-newest', 'Newest first'),
              value: LogsSortOrder.Descending,
            },
            {
              label: t('components.app-config.log-defaults.sort-oldest', 'Oldest first'),
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
