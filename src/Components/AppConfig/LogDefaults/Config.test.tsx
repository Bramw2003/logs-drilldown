import React from 'react';

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { AppPluginMeta, GrafanaPlugin, LogsSortOrder, PluginConfigPage, PluginMeta, PluginType } from '@grafana/data';
import { updateAppPluginSettings } from '@grafana/plugin-compat/apps';
import { locationService } from '@grafana/runtime';

import type { JsonData } from '../AppConfig';
import LogDefaultsConfig from './Config';
import { testIds } from 'services/testIds';

jest.mock('@grafana/plugin-compat/apps', () => ({
  updateAppPluginSettings: jest.fn(),
}));

jest.mock('@grafana/runtime', () => ({
  ...jest.requireActual('@grafana/runtime'),
  locationService: { reload: jest.fn() },
}));

jest.mock('services/logger', () => ({
  logger: { error: jest.fn() },
}));

const mockUpdateAppPluginSettings = jest.mocked(updateAppPluginSettings);

function createPluginMeta(jsonData: JsonData = {}): GrafanaPlugin<AppPluginMeta<JsonData>> {
  return {
    meta: {
      id: 'grafana-lokiexplore-app',
      type: PluginType.app,
      name: 'Logs Drilldown',
      info: {} as PluginMeta['info'],
      module: '',
      baseUrl: '',
      enabled: true,
      pinned: false,
      jsonData,
    },
    addConfigPage: (tab: PluginConfigPage<AppPluginMeta<JsonData>>) => {
      throw new Error('Function not implemented.');
    },
    setChannelSupport: () => {
      throw new Error('Function not implemented.');
    },
  };
}

const save = () => fireEvent.click(screen.getByTestId(testIds.appConfig.logDefaults.submit));

describe('LogDefaultsConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateAppPluginSettings.mockResolvedValue({} as PluginMeta);
  });

  it('shows the built-in defaults as selected when nothing is configured', () => {
    render(<LogDefaultsConfig plugin={createPluginMeta()} query={{}} />);

    const selected = (testId: string, label: string) =>
      expect(within(screen.getByTestId(testId)).getByLabelText(label)).toBeChecked();
    selected(testIds.appConfig.logDefaults.lineWrapping, 'No wrap');
    selected(testIds.appConfig.logDefaults.timestamps, 'Milliseconds');
    selected(testIds.appConfig.logDefaults.fontSize, 'Normal');
    selected(testIds.appConfig.logDefaults.sortOrder, 'Newest first');
  });

  it('shows saved defaults as selected', () => {
    render(<LogDefaultsConfig plugin={createPluginMeta({ logDefaults: { wrapLogMessage: true } })} query={{}} />);
    expect(within(screen.getByTestId(testIds.appConfig.logDefaults.lineWrapping)).getByLabelText('Wrap')).toBeChecked();
  });

  it('omits logDefaults from the payload when nothing is set', async () => {
    render(<LogDefaultsConfig plugin={createPluginMeta()} query={{}} />);
    save();

    await waitFor(() => expect(mockUpdateAppPluginSettings).toHaveBeenCalled());
    expect(mockUpdateAppPluginSettings).toHaveBeenCalledWith(
      'grafana-lokiexplore-app',
      expect.objectContaining({ jsonData: expect.objectContaining({ logDefaults: undefined }) })
    );
    expect(locationService.reload).toHaveBeenCalled();
  });

  it('saves the options that were set, including one picked equal to the built-in default, and keeps other settings', async () => {
    const plugin = createPluginMeta({ interval: '7d', logDefaults: { sortOrder: LogsSortOrder.Ascending } });
    render(<LogDefaultsConfig plugin={plugin} query={{}} />);
    fireEvent.click(within(screen.getByTestId(testIds.appConfig.logDefaults.lineWrapping)).getByLabelText('Wrap'));
    // The built-in value is already selected, so it takes switching away and back to pin it
    const fontSize = within(screen.getByTestId(testIds.appConfig.logDefaults.fontSize));
    fireEvent.click(fontSize.getByLabelText('Small'));
    fireEvent.click(fontSize.getByLabelText('Normal'));
    save();

    await waitFor(() => expect(mockUpdateAppPluginSettings).toHaveBeenCalled());
    expect(mockUpdateAppPluginSettings).toHaveBeenCalledWith(
      'grafana-lokiexplore-app',
      expect.objectContaining({
        jsonData: {
          interval: '7d',
          logDefaults: {
            sortOrder: LogsSortOrder.Ascending,
            wrapLogMessage: true,
            prettifyLogMessage: true,
            fontSize: 'default',
          },
        },
      })
    );
  });

  it('disables the reset button until an option is set', () => {
    render(<LogDefaultsConfig plugin={createPluginMeta({ logDefaults: { wrapLogMessage: true } })} query={{}} />);

    expect(screen.getByTestId(`${testIds.appConfig.logDefaults.lineWrapping} reset`)).toBeEnabled();
    expect(screen.getByTestId(`${testIds.appConfig.logDefaults.timestamps} reset`)).toBeDisabled();
  });

  it('resets an option to the built-in default and stops saving it', async () => {
    const plugin = createPluginMeta({ logDefaults: { wrapLogMessage: true, sortOrder: LogsSortOrder.Ascending } });
    render(<LogDefaultsConfig plugin={plugin} query={{}} />);
    fireEvent.click(screen.getByTestId(`${testIds.appConfig.logDefaults.lineWrapping} reset`));

    expect(
      within(screen.getByTestId(testIds.appConfig.logDefaults.lineWrapping)).getByLabelText('No wrap')
    ).toBeChecked();
    save();

    await waitFor(() => expect(mockUpdateAppPluginSettings).toHaveBeenCalled());
    expect(mockUpdateAppPluginSettings).toHaveBeenCalledWith(
      'grafana-lokiexplore-app',
      expect.objectContaining({ jsonData: { logDefaults: { sortOrder: LogsSortOrder.Ascending } } })
    );
  });

  it('saves wrap and prettify together, and resets both', async () => {
    render(<LogDefaultsConfig plugin={createPluginMeta()} query={{}} />);
    const lineWrapping = screen.getByTestId(testIds.appConfig.logDefaults.lineWrapping);
    fireEvent.click(within(lineWrapping).getByLabelText('Wrap'));
    save();

    await waitFor(() => expect(mockUpdateAppPluginSettings).toHaveBeenCalled());
    expect(mockUpdateAppPluginSettings).toHaveBeenCalledWith(
      'grafana-lokiexplore-app',
      expect.objectContaining({ jsonData: { logDefaults: { wrapLogMessage: true, prettifyLogMessage: true } } })
    );
  });

  it('clears both wrap values on reset', async () => {
    const plugin = createPluginMeta({ logDefaults: { wrapLogMessage: true, prettifyLogMessage: true } });
    render(<LogDefaultsConfig plugin={plugin} query={{}} />);
    fireEvent.click(screen.getByTestId(`${testIds.appConfig.logDefaults.lineWrapping} reset`));
    save();

    await waitFor(() => expect(mockUpdateAppPluginSettings).toHaveBeenCalled());
    expect(mockUpdateAppPluginSettings).toHaveBeenCalledWith(
      'grafana-lokiexplore-app',
      expect.objectContaining({ jsonData: expect.objectContaining({ logDefaults: undefined }) })
    );
  });

  it('saves hidden timestamps without touching the resolution', async () => {
    render(<LogDefaultsConfig plugin={createPluginMeta()} query={{}} />);
    fireEvent.click(within(screen.getByTestId(testIds.appConfig.logDefaults.timestamps)).getByLabelText('Hidden'));
    save();

    await waitFor(() => expect(mockUpdateAppPluginSettings).toHaveBeenCalled());
    expect(mockUpdateAppPluginSettings).toHaveBeenCalledWith(
      'grafana-lokiexplore-app',
      expect.objectContaining({ jsonData: { logDefaults: { showTime: false } } })
    );
  });

  it('saves nanosecond timestamps as shown with that resolution', async () => {
    render(<LogDefaultsConfig plugin={createPluginMeta()} query={{}} />);
    fireEvent.click(within(screen.getByTestId(testIds.appConfig.logDefaults.timestamps)).getByLabelText('Nanoseconds'));
    save();

    await waitFor(() => expect(mockUpdateAppPluginSettings).toHaveBeenCalled());
    expect(mockUpdateAppPluginSettings).toHaveBeenCalledWith(
      'grafana-lokiexplore-app',
      expect.objectContaining({ jsonData: { logDefaults: { showTime: true, timestampResolution: 'ns' } } })
    );
  });
});
