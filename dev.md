# Developer Documentation

## Build dependencies

- [conda](https://docs.conda.io)

  You can install `conda` as part of a [Miniforge](https://github.com/conda-forge/miniforge) installer.

- [conda pack](https://github.com/conda/conda-pack) and [conda lock](https://github.com/conda/conda-lock) to bundle JupyterLab Desktop Server into the standalone application and to create lock files. You can install them using:

  ```bash
  conda install -c conda-forge conda-pack conda-lock
  ```

- nodejs

  You can install from https://nodejs.org/en/download/ or run:

  ```bash
  conda install -c conda-forge nodejs
  ```

- yarn

  Install using

  ```bash
  npm install --global yarn
  ```

## Local development

JupyterLab Desktop bundles JupyterLab front-end and a conda environment as JupyterLab Desktop Server as its backend into an Electron application.

`<platform>`: osx-64, osx-arm64, linux or win

- Get the project source code

  ```bash
  git clone https://github.com/jupyterlab/jupyterlab-desktop.git
  ```

- Install dependencies and build JupyterLab Desktop

  ```bash
  yarn
  yarn build
  ```

- Create the JupyterLab Desktop Server installer using

  ```bash
  yarn create_env_installer:<platform>
  ```

  Installer will be created in `env_installer/jlab_server.tar.gz` and will be available for use in `env_installer/jlab_server`.

- Now you can launch the JupyterLab Desktop locally using:

  ```bash
  yarn start
  ```

  If JupyterLab Desktop does not find a compatible Python environment configured, it will prompt for installation using JupyterLab Desktop Server installer or let you choose a custom environment on your computer at first launch.

## Testing

Unit tests are Vitest and live in `test/unit`. End-to-end tests are Playwright driving the real Electron app and live in `test/e2e`.

```bash
yarn test:unit         # vitest run
yarn test:unit:watch   # vitest, re-runs on change
yarn test:coverage     # vitest run --coverage, enforces the thresholds below
yarn test:e2e          # playwright test, requires yarn build first
```

`yarn test:e2e` launches the built entry point rather than the sources: `package.json` points `main` at `./build/out/main/main.js`, and the tests call `electron.launch` against the project directory. On a clean checkout the run fails on a missing bundle rather than on a real defect, so run `yarn build` before it.

Coverage is configured in `vitest.config.ts` with `all: true` over an explicit `include` list, so untested branches in those files count against the thresholds even when no test imports them. The list is scoped to the main-process logic modules that are unit-testable; the window, view, dialog and preload surfaces are integration code covered by the e2e suite. Besides the aggregate floor, several well-covered modules are locked at their current level so a later change cannot silently regress them.

Two more checks run in CI and are worth running before pushing:

```bash
yarn type-check           # tsc --noEmit
yarn lint:check           # prettier --check and eslint, no writes
yarn lint                 # the same two, applying fixes
yarn check_version_match  # desktop version against the bundled JupyterLab version
```

Prettier is pinned in `devDependencies` and its config is `.prettierrc`. Running it through `npx` resolves a different major and reports formatting differences that are not real, so use the repo's own binary.

## Building for distribution

- Build the application

  ```bash
  yarn run clean && yarn build
  ```

- Create JupyterLab Desktop Server installer

  ```bash
  yarn create_env_installer:<platform>
  ```

- Create JupyterLab Desktop installer which will also bundle JupyterLab Desktop Server installer.

  ```bash
  yarn dist:<platform>
  ```

  Application Installer will be created in `dist/JupyterLab.dmg` (macOS), `dist/JupyterLab.deb` (Debian, Ubuntu), `dist/JupyterLab.rpm` (Red Hat, Fedora) and `dist/JupyterLab-Setup.exe` (Windows) based on the platform

## Shared seams in the main process

These questions already have one answer, so please do not write a second one:

| Question                         | Where it is answered                                                      |
| -------------------------------- | ------------------------------------------------------------------------- |
| What origin is this URL?         | `originOf`, `isSameServerOrigin` in `src/main/utils.ts`                   |
| Is this a scheme I accept?       | `matchesScheme` in `src/main/utils.ts`                                    |
| May this surface navigate there? | `guardNavigation` in `src/main/navigationguard.ts`, `navigationpolicy.ts` |
| Should this link leave the app?  | `openUrlInSystemBrowser` in `src/main/navigationguard.ts`                 |

A webContents nobody claims cannot navigate at all, so a new view is safe until `markGuarded` opts it into a policy of its own.

## Review guidance

Expected manual testing coverage depends on the PR, when pulling:

- patch releases of JupyterLab or Electron: Testing on a single OS is sufficient.
- minor or major JupyterLab releases and minor Electron releases: Test on multiple OSes.
- major Electron releases: Test on all OSes.

A release PR must be approved by at least two people.

### Key Checks

Depending on the PR, different part of the application may require testing. Use the guide below, but exercise your own judgment to skip or add more checks depending on circumstances.

For patch dependency update PRs:

- [ ] Notebooks UI launches (smoke test, no extensive testing required)

For minor and major JupyterLab update PRs:

- [ ] JupyterLab Desktop theme switching works
- [ ] UI Mode switching works

For conda update PRs:

- [ ] Creating new environments from "Manage Python Environments" dialog works
- [ ] The environment picker popover shows up with a list of environments
- [ ] Switching environments works

For minor and major Electron updates PR:

- [ ] All checks listed above
- [ ] No new errors in log files (e.g. `~/Library/Logs/jupyterlab-desktop/main.log`) and when launching from terminal with `jlab`
- [ ] The welcome screen opens, displays the news feed, recent sessions, and allows to create new sessions
- [ ] The settings window opens

Before JupyterLab Desktop release:

- [ ] All checks listed above

## Release Instructions

For instructions on updating bundled JupyterLab packages and cutting a new release, please follow [Release.md](Release.md) document.
