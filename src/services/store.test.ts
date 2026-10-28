import { DataSourceInstanceListItem } from '@grafana/data';
import { getDataSourceInstanceList } from '@grafana/plugin-compat/datasources';
import { SceneObject } from '@grafana/scenes';

import { plugin } from '../module';
import { isEmbeddedLogs } from './extensions/embedding';
import { getBooleanLogOption, getDefaultDatasourceUid, getExpandedLogsView, getLogOption, LOG_OPTIONS_LOCALSTORAGE_KEY, resetLogOptions } from './store';
import pluginJson from 'plugin.json';

jest.mock('@grafana/plugin-compat/datasources', () => ({
  getDataSourceInstanceList: jest.fn(),
  getDefaultDataSourceInstanceListItem: jest.fn(async (items: Array<{ isDefault?: boolean }>) =>
    items.find((i) => i.isDefault)
  ),
}));

jest.mock('../module', () => ({ plugin: { meta: { jsonData: {} } } }));

jest.mock('./extensions/embedding', () => ({
  isEmbeddedLogs: jest.fn(),
}));

jest.mock('./logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

function makeDs(overrides: Partial<DataSourceInstanceListItem>): DataSourceInstanceListItem {
  return {
    uid: 'uid',
    name: 'ds',
    type: 'loki',
    ...overrides,
  } as DataSourceInstanceListItem;
}

describe('getDefaultDatasourceUid', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requests only Loki data sources', async () => {
    jest.mocked(getDataSourceInstanceList).mockResolvedValue([]);

    await getDefaultDatasourceUid();

    expect(getDataSourceInstanceList).toHaveBeenCalledWith({ type: 'loki' });
  });

  it('returns the data source marked as default when present', async () => {
    const defaultDs = makeDs({ uid: 'default-uid', name: 'Default Loki', isDefault: true });
    const otherDs = makeDs({ uid: 'other-uid', name: 'grafanacloud-mystack-logs' });
    const items = [otherDs, defaultDs];
    jest.mocked(getDataSourceInstanceList).mockResolvedValue(items);

    await expect(getDefaultDatasourceUid()).resolves.toBe('default-uid');
  });

  it('prefers grafanacloud-*-logs by name when no default is set', async () => {
    const firstInList = makeDs({ uid: 'first-uid', name: 'Some Other Loki' });
    const grafanacloudDs = makeDs({ uid: 'grafanacloud-dev-logs', name: 'grafanacloud-dev-logs' });
    jest.mocked(getDataSourceInstanceList).mockResolvedValue([firstInList, grafanacloudDs]);

    await expect(getDefaultDatasourceUid()).resolves.toBe('grafanacloud-dev-logs');
  });

  it('prefers grafanacloud-*-logs by uid when name is different', async () => {
    const firstInList = makeDs({ uid: 'first-uid', name: 'First' });
    const grafanacloudDs = makeDs({ uid: 'grafanacloud-prod-logs', name: 'Grafana Cloud Logs (prod)' });
    jest.mocked(getDataSourceInstanceList).mockResolvedValue([firstInList, grafanacloudDs]);

    await expect(getDefaultDatasourceUid()).resolves.toBe('grafanacloud-prod-logs');
  });

  it('returns first in list when no default and no grafanacloud-*-logs match', async () => {
    const firstDs = makeDs({ uid: 'first-uid', name: 'First Loki' });
    const secondDs = makeDs({ uid: 'second-uid', name: 'Second Loki' });
    jest.mocked(getDataSourceInstanceList).mockResolvedValue([firstDs, secondDs]);

    await expect(getDefaultDatasourceUid()).resolves.toBe('first-uid');
  });

  it('returns undefined when Loki list is empty', async () => {
    jest.mocked(getDataSourceInstanceList).mockResolvedValue([]);

    await expect(getDefaultDatasourceUid()).resolves.toBeUndefined();
  });

  it('does not match grafanacloud-logs without stack name (single dash)', async () => {
    const exactName = makeDs({ uid: 'grafanacloud-logs', name: 'grafanacloud-logs' });
    const withStack = makeDs({ uid: 'grafanacloud-mystack-logs', name: 'grafanacloud-mystack-logs' });
    jest.mocked(getDataSourceInstanceList).mockResolvedValue([exactName, withStack]);

    await expect(getDefaultDatasourceUid()).resolves.toBe('grafanacloud-mystack-logs');
  });

  it('propagates list loading errors', async () => {
    const error = new Error('Failed to load data sources');
    jest.mocked(getDataSourceInstanceList).mockRejectedValue(error);

    await expect(getDefaultDatasourceUid()).rejects.toThrow(error);
  });
});

describe('getExpandedLogsView', () => {
  // isEmbeddedLogs walks the scene graph, so mock its result. Everything else uses real localStorage (jsdom).
  const sceneRef = {} as SceneObject;
  const NON_EMBEDDED_KEY = `${pluginJson.id}.logs.expanded`;
  const EMBEDDED_KEY = `${pluginJson.id}.logs.embedded.expanded`;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('when not embedded', () => {
    beforeEach(() => jest.mocked(isEmbeddedLogs).mockReturnValue(false));

    it('returns false when nothing is stored', () => {
      expect(getExpandedLogsView(sceneRef)).toBe(false);
    });

    it('returns true when stored value is "true"', () => {
      localStorage.setItem(NON_EMBEDDED_KEY, 'true');
      expect(getExpandedLogsView(sceneRef)).toBe(true);
    });

    it('returns false when stored value is "false"', () => {
      localStorage.setItem(NON_EMBEDDED_KEY, 'false');
      expect(getExpandedLogsView(sceneRef)).toBe(false);
    });

    it('returns false the stored value is not valid JSON', () => {
      localStorage.setItem(NON_EMBEDDED_KEY, 'not-json');
      expect(getExpandedLogsView(sceneRef)).toBe(false);
    });
  });

  describe('when embedded', () => {
    beforeEach(() => jest.mocked(isEmbeddedLogs).mockReturnValue(true));

    it('defaults to true when nothing is stored', () => {
      expect(getExpandedLogsView(sceneRef)).toBe(true);
    });

    it('respects a stored "false" preference over the embedded default', () => {
      localStorage.setItem(EMBEDDED_KEY, 'false');
      expect(getExpandedLogsView(sceneRef)).toBe(false);
    });

    it('respects a stored "true" preference over the embedded default', () => {
      localStorage.setItem(EMBEDDED_KEY, 'true');
      expect(getExpandedLogsView(sceneRef)).toBe(true);
    });
  });
});

describe('log option defaults', () => {
  const setAdminDefaults = (logDefaults?: Record<string, unknown>) => {
    plugin.meta.jsonData = { logDefaults };
  };

  beforeEach(() => {
    localStorage.clear();
    setAdminDefaults(undefined);
  });

  it('falls back to the caller default when nothing is stored or configured', () => {
    expect(getBooleanLogOption('wrapLogMessage', false)).toBe(false);
    expect(getLogOption('fontSize', 'default')).toBe('default');
  });

  it('uses the admin default over the caller default', () => {
    setAdminDefaults({ wrapLogMessage: true, fontSize: 'small' });
    expect(getBooleanLogOption('wrapLogMessage', false)).toBe(true);
    expect(getLogOption('fontSize', 'default')).toBe('small');
  });

  it('prefers the user choice over the admin default, including an explicit false', () => {
    setAdminDefaults({ wrapLogMessage: true, fontSize: 'small' });
    localStorage.setItem(`${LOG_OPTIONS_LOCALSTORAGE_KEY}.wrapLogMessage`, 'false');
    localStorage.setItem(`${LOG_OPTIONS_LOCALSTORAGE_KEY}.fontSize`, 'default');
    expect(getBooleanLogOption('wrapLogMessage', false)).toBe(false);
    expect(getLogOption('fontSize', 'small')).toBe('default');
  });

  it('ignores admin values for options that are not configurable', () => {
    setAdminDefaults({ enableLogDetails: true });
    expect(getBooleanLogOption('enableLogDetails', false)).toBe(false);
  });

  it('ignores a non-boolean admin value for a boolean option', () => {
    setAdminDefaults({ wrapLogMessage: 'yes' });
    expect(getBooleanLogOption('wrapLogMessage', false)).toBe(false);
  });

  it('resets user choices to the admin defaults and leaves unrelated options alone', () => {
    setAdminDefaults({ wrapLogMessage: true, fontSize: 'small' });
    localStorage.setItem(`${LOG_OPTIONS_LOCALSTORAGE_KEY}.wrapLogMessage`, 'false');
    localStorage.setItem(`${LOG_OPTIONS_LOCALSTORAGE_KEY}.sortOrder`, 'Ascending');
    localStorage.setItem(`${LOG_OPTIONS_LOCALSTORAGE_KEY}.enableLogDetails`, 'true');

    expect(resetLogOptions()).toEqual({
      fontSize: 'small',
      prettifyLogMessage: false,
      showTime: true,
      sortOrder: 'Descending',
      timestampResolution: 'ms',
      wrapLogMessage: true,
    });
    expect(localStorage.getItem(`${LOG_OPTIONS_LOCALSTORAGE_KEY}.wrapLogMessage`)).toBeNull();
    expect(localStorage.getItem(`${LOG_OPTIONS_LOCALSTORAGE_KEY}.enableLogDetails`)).toBe('true');
  });
});
