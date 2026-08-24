import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import log from 'electron-log';

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    existsSync: vi.fn(),
    lstatSync: vi.fn(),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    // a vi.fn() with no implementation returns undefined, and the reader calls .toString() on it: throw what fs throws for a missing file instead
    readFileSync: vi.fn(() => {
      throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    })
  };
});

import {
  CtrlWBehavior,
  DEFAULT_WIN_HEIGHT,
  DEFAULT_WIN_WIDTH,
  LogLevel,
  resetUnreadableReports,
  resolveWorkingDirectory,
  serverLaunchArgsDefault,
  serverLaunchArgsFixed,
  Setting,
  SettingType,
  StartupMode,
  ThemeType,
  UIMode,
  UserSettings
} from '../../src/main/config/settings';

const mockFs = vi.mocked(fs);

// save() reads the file before merging over it, so a stub left set by one test would feed the next one whatever the previous body returned
beforeEach(() => {
  vi.clearAllMocks();
  mockFs.existsSync = vi.fn();
  mockFs.lstatSync = vi.fn();
  mockFs.mkdirSync = vi.fn();
  mockFs.writeFileSync = vi.fn();
  mockFs.readFileSync = vi.fn(() => {
    throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
  }) as any;
});

describe('constants', () => {
  it('DEFAULT_WIN_WIDTH is 1024', () => expect(DEFAULT_WIN_WIDTH).toBe(1024));
  it('DEFAULT_WIN_HEIGHT is 768', () => expect(DEFAULT_WIN_HEIGHT).toBe(768));
});

describe('enums', () => {
  it('ThemeType has system/light/dark', () => {
    expect(ThemeType.System).toBe('system');
    expect(ThemeType.Light).toBe('light');
    expect(ThemeType.Dark).toBe('dark');
  });

  it('StartupMode values are correct', () => {
    expect(StartupMode.WelcomePage).toBe('welcome-page');
    expect(StartupMode.LastSessions).toBe('restore-sessions');
  });

  it('LogLevel values are correct', () => {
    expect(LogLevel.Error).toBe('error');
    expect(LogLevel.Debug).toBe('debug');
  });

  it('CtrlWBehavior values are correct', () => {
    expect(CtrlWBehavior.CloseWindow).toBe('close');
    expect(CtrlWBehavior.Warn).toBe('warn');
  });

  it('UIMode values are correct', () => {
    expect(UIMode.MultiDocument).toBe('multi-document');
    expect(UIMode.Zen).toBe('zen');
  });
});

describe('serverLaunchArgsFixed', () => {
  it('contains --no-browser', () => {
    expect(serverLaunchArgsFixed).toContain('--no-browser');
  });

  it('contains port placeholder', () => {
    expect(serverLaunchArgsFixed.some(a => a.includes('{port}'))).toBe(true);
  });

  it('contains token placeholder', () => {
    expect(serverLaunchArgsFixed.some(a => a.includes('{token}'))).toBe(true);
  });

  it('disables browser', () => {
    expect(serverLaunchArgsFixed).toContain('--no-browser');
  });

  it('disables quit button', () => {
    expect(serverLaunchArgsFixed).toContain('--LabApp.quit_button=False');
  });
});

describe('serverLaunchArgsDefault', () => {
  it('allows hidden files', () => {
    expect(
      serverLaunchArgsDefault.some(a => a.includes('allow_hidden=True'))
    ).toBe(true);
  });
});

describe('resolveWorkingDirectory', () => {
  it('returns home when no directory given', () => {
    // app.getPath mock returns /tmp/jlab-test-userdata/home
    const result = resolveWorkingDirectory('');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns given path when it is a valid directory', () => {
    mockFs.lstatSync = vi.fn(() => ({ isDirectory: () => true } as fs.Stats));
    const result = resolveWorkingDirectory('/valid/dir');
    expect(result).toBe('/valid/dir');
  });

  it('resets to home when path is a file not a directory', () => {
    mockFs.lstatSync = vi.fn(() => ({ isDirectory: () => false } as fs.Stats));
    const result = resolveWorkingDirectory('/some/file.txt');
    expect(result).not.toBe('/some/file.txt');
  });

  it('resets to home when path does not exist', () => {
    mockFs.lstatSync = vi.fn(() => {
      throw new Error('ENOENT');
    });
    const result = resolveWorkingDirectory('/nonexistent/path');
    expect(result).not.toBe('/nonexistent/path');
  });

  it('keeps invalid path when resetIfInvalid is false', () => {
    mockFs.lstatSync = vi.fn(() => {
      throw new Error('ENOENT');
    });
    const result = resolveWorkingDirectory('/bad/path', false);
    expect(result).toBe('/bad/path');
  });
});

describe('Setting', () => {
  it('returns the default value until one is set', () => {
    const s = new Setting<string>('def');
    expect(s.value).toBe('def');
    expect(s.valueSet).toBe(false);
  });

  it('returns the assigned value after it is set', () => {
    const s = new Setting<string>('def');
    s.value = 'changed';
    expect(s.value).toBe('changed');
    expect(s.valueSet).toBe(true);
  });

  it('reports differentThanDefault only after a real change', () => {
    const s = new Setting<number>(10);
    expect(s.differentThanDefault).toBe(false);
    s.value = 11;
    expect(s.differentThanDefault).toBe(true);
  });

  it('setToDefault restores the default value', () => {
    const s = new Setting<string>('def');
    s.value = 'x';
    s.setToDefault();
    expect(s.value).toBe('def');
    expect(s.differentThanDefault).toBe(false);
  });
});

describe('UserSettings', () => {
  it('getValue returns the default before any change', () => {
    const us = new UserSettings(false);
    expect(us.getValue(SettingType.theme)).toBe(ThemeType.System);
  });

  it('setValue then getValue round-trips a non-default value', () => {
    const us = new UserSettings(false);
    us.setValue(SettingType.theme, ThemeType.Light);
    expect(us.getValue(SettingType.theme)).toBe(ThemeType.Light);
  });

  it('unsetValue restores the default', () => {
    const us = new UserSettings(false);
    us.setValue(SettingType.theme, ThemeType.Light);
    us.unsetValue(SettingType.theme);
    expect(us.getValue(SettingType.theme)).toBe(ThemeType.System);
  });

  it('save persists only settings that differ from their default', () => {
    mockFs.writeFileSync = vi.fn();
    const us = new UserSettings(false);
    us.setValue(SettingType.theme, ThemeType.Light);
    us.save();
    const written = JSON.parse(
      (mockFs.writeFileSync as any).mock.calls[0][1] as string
    );
    expect(written).toHaveProperty('theme', ThemeType.Light);
    expect(written).not.toHaveProperty('logLevel');
  });

  it('does not let a __proto__ key out of the file reach Object.prototype', () => {
    // read walks SettingType rather than the file, so nothing out of the file ever indexes _settings. Walking the file instead resolved '__proto__' to Object.prototype and assigned onto it, at module import.
    mockFs.existsSync = vi.fn(() => true);
    mockFs.readFileSync = vi.fn(() =>
      Buffer.from('{"__proto__":{"pwned":1},"theme":"dark"}')
    ) as any;
    mockFs.writeFileSync = vi.fn();

    try {
      const us = new UserSettings(true);
      us.save();

      // Measured one assertion at a time against both mutations, because the first attempt at this comment asserted the opposite and was wrong. Against `read` walking the file instead of the enum, all three fire. Against the merge, `{ ...onDisk }` swapped for `Object.assign({}, onDisk)`, only the round-trip below fires: assign invokes the `__proto__` setter on `merged`, which retargets that object's own prototype and never touches `Object.prototype`, so neither probe sees it.
      //
      // These two are the pollution probes, and they are what a future change that writes onto the prototype would trip.
      expect(({} as any).value).toBeUndefined();
      expect(({} as any).pwned).toBeUndefined();
      // This one is the merge guard, and the only assertion here that catches the spread being swapped for assign. It reads as the redundant one next to two prototype checks, which is exactly why it says so.
      const written = (mockFs.writeFileSync as any).mock.calls[0][1] as string;
      expect(written).toContain('__proto__');
    } finally {
      delete (Object.prototype as any).value;
      delete (Object.prototype as any).pwned;
    }
  });

  // `__proto__` is the one that pollutes; `constructor` and `toString` are the two that shadow. All three have to come back out of the merge as own properties of a plain object, or a key somebody put in the file is lost the same way an unknown one used to be.
  it('carries constructor and toString through the merge as plain keys', () => {
    mockFs.existsSync = vi.fn(() => true);
    mockFs.readFileSync = vi.fn(() =>
      Buffer.from('{"constructor":"c","toString":"t","theme":"dark"}')
    ) as any;
    mockFs.writeFileSync = vi.fn();

    const us = new UserSettings(true);
    us.save();

    const written = JSON.parse(
      (mockFs.writeFileSync as any).mock.calls[0][1] as string
    );
    expect(Object.getOwnPropertyNames(written)).toEqual(
      expect.arrayContaining(['constructor', 'toString'])
    );
    expect(written.constructor).toBe('c');
    expect(written.toString).toBe('t');
    // and nothing leaked onto the prototype on the way
    expect(({} as any).c).toBeUndefined();
  });

  // The catch used to swallow both cases the same way, and merging over {} deletes every key this build does not know: the loss this merge exists to prevent, with the write reporting success.
  beforeEach(() => {
    // module state, so without this the second unreadable case reads as silent because the first already reported
    resetUnreadableReports();
  });

  it('says so when the file is there and could not be read', () => {
    mockFs.existsSync = vi.fn(() => true);
    let reads = 0;
    mockFs.readFileSync = vi.fn(() => {
      // readable at construction, unreadable by the time save re-reads it
      if (reads++ === 0) {
        return Buffer.from('{"futureSetting":42,"theme":"dark"}');
      }
      throw Object.assign(new Error('EBUSY'), { code: 'EBUSY' });
    }) as any;
    mockFs.writeFileSync = vi.fn();

    const us = new UserSettings(true);
    us.save();

    expect(log.error).toHaveBeenCalledWith(
      expect.stringContaining('may be dropped'),
      expect.anything()
    );
  });

  // Eighteen call sites reach save(), so a condition that persists would otherwise put the same line in the log on every settings change.
  it('reports an unreadable file once, not on every save', () => {
    mockFs.existsSync = vi.fn(() => true);
    let reads = 0;
    mockFs.readFileSync = vi.fn(() => {
      if (reads++ === 0) {
        return Buffer.from('{"futureSetting":42}');
      }
      throw Object.assign(new Error('EBUSY'), { code: 'EBUSY' });
    }) as any;
    mockFs.writeFileSync = vi.fn();

    const us = new UserSettings(true);
    us.save();
    us.save();
    us.save();

    expect(vi.mocked(log.error).mock.calls).toHaveLength(1);
  });

  it('says nothing when the file is simply absent', () => {
    mockFs.existsSync = vi.fn(() => false);
    mockFs.readFileSync = vi.fn(() => {
      throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    }) as any;
    mockFs.writeFileSync = vi.fn();

    new UserSettings(true).save();

    expect(log.error).not.toHaveBeenCalled();
  });

  // `[1,2,3]` is the only non-object shape that survives read(): null, a number and a string all throw out of `key in jsonData`, and that throw is #1115's to catch, not this branch's.
  it('takes nothing from an array at the top level', () => {
    mockFs.existsSync = vi.fn(() => true);
    mockFs.readFileSync = vi.fn(() => Buffer.from('[1,2,3]')) as any;
    mockFs.writeFileSync = vi.fn();

    const us = new UserSettings(true);
    us.save();

    // spreading an array would have written {"0":1,"1":2,"2":3}
    const written = JSON.parse(
      (mockFs.writeFileSync as any).mock.calls[0][1] as string
    );
    expect(written).toEqual({});
  });

  it('drops a key whose value is back to the default', () => {
    // merging over the file means the on-disk value survives unless something takes it out, and a setting that no longer differs is one of those
    mockFs.existsSync = vi.fn(() => true);
    mockFs.readFileSync = vi.fn(() =>
      Buffer.from(JSON.stringify({ showNewsFeed: false }))
    ) as any;
    mockFs.writeFileSync = vi.fn();

    const us = new UserSettings(true);
    us.setValue(SettingType.showNewsFeed, true); // true is the default

    us.save();

    const written = JSON.parse(
      (mockFs.writeFileSync as any).mock.calls[0][1] as string
    );
    expect('showNewsFeed' in written).toBe(false);
  });

  it('writes back a key it has no setting for', () => {
    // save merges over the file rather than rebuilding it, or a settings.json written by a newer build loses whatever this one does not recognise, and troubleshoot.md sends people to edit this file by hand
    mockFs.existsSync = vi.fn(() => true);
    mockFs.readFileSync = vi.fn(() =>
      Buffer.from(JSON.stringify({ futureSetting: 42, theme: 'dark' }))
    ) as any;
    mockFs.writeFileSync = vi.fn();

    const us = new UserSettings(true);
    us.save();

    const written = JSON.parse(
      (mockFs.writeFileSync as any).mock.calls[0][1] as string
    );
    expect(written).toEqual({ futureSetting: 42, theme: 'dark' });
  });
});
