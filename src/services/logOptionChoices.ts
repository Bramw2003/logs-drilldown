import { LogsSortOrder, SelectableValue } from '@grafana/data';
import { t } from '@grafana/i18n';

// Shared by the log options header and the Log defaults settings tab so the wording stays identical
export const getSortOrderChoices = (): Array<SelectableValue<LogsSortOrder>> => [
  {
    description: t(
      'components.service-scene.log-options-scene.description.show-results-newest-to-oldest',
      'Show results newest to oldest'
    ),
    label: t('components.service-scene.log-options-scene.label.newest-first', 'Newest first'),
    value: LogsSortOrder.Descending,
  },
  {
    description: t(
      'components.service-scene.log-options-scene.description.show-results-oldest-to-newest',
      'Show results oldest to newest'
    ),
    label: t('components.service-scene.log-options-scene.label.oldest-first', 'Oldest first'),
    value: LogsSortOrder.Ascending,
  },
];

export const getWrapChoices = (): Array<SelectableValue<boolean>> => [
  {
    description: t(
      'components.service-scene.log-options-scene.description.enable-wrapping-of-long-log-lines',
      'Enable wrapping of long log lines'
    ),
    label: t('components.service-scene.log-options-scene.label.wrap', 'Wrap'),
    value: true,
  },
  {
    description: t(
      'components.service-scene.log-options-scene.description.disable-wrapping-of-long-log-lines',
      'Disable wrapping of long log lines'
    ),
    label: t('components.service-scene.log-options-scene.label.no-wrap', 'No wrap'),
    value: false,
  },
];
