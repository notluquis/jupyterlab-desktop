# Contributing to JupyterLab Desktop

Thanks for your interest in contributing. This document covers building, running, testing and packaging the application. Elsewhere:

- **Cutting a release, and updating the bundled JupyterLab**: [Release.md](Release.md)
- **Reporting a bug**: open an issue with the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md), after checking the [troubleshooting guide](troubleshoot.md)
- **Using the app**: [user guide](user-guide.md), [CLI documentation](cli.md), [Python environment management](python-env-management.md)

JupyterLab Desktop packages [JupyterLab](https://github.com/jupyterlab/jupyterlab) as an Electron application. A change to the notebook interface itself belongs in that repository; this one covers the desktop shell, the bundled Python environment and the installers.

Pull requests follow the [template](.github/pull_request_template.md), which includes a section on AI usage. Answer both of its questions honestly, and keep the pull request in draft until you have run the code yourself.

This project follows the [Jupyter Code of Conduct](https://github.com/jupyter/governance/blob/main/conduct/code_of_conduct.md). Security vulnerabilities never go to a public issue: the [Jupyter security policy](https://jupyter.org/security) asks for a GitHub Security Advisory on this repository, and security@jupyter.org only when that is not possible.

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

`<platform>`: osx-64, osx-arm64, linux-64, linux-aarch64 or win-64. The `dist` scripts also take `win-arm64`, and `osx` for both macOS architectures at once. `package.json` is the list.

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

It also needs a Python with JupyterLab, pointed at by `JLAB_TEST_PYTHON_PATH`. Without it the env-backed specs skip rather than fail, so the suite reports green while the tests that exercise environments never ran. `.github/workflows/e2e.yml` builds a venv for this, and the same thing locally is:

```bash
python3 -m venv /tmp/jlab-venv
/tmp/jlab-venv/bin/pip install jupyterlab ipywidgets
export JLAB_TEST_PYTHON_PATH=/tmp/jlab-venv/bin/python
```

On Linux, Playwright also needs its system libraries: `npx playwright install-deps`.

Coverage is configured in `vitest.config.ts` with `all: true` over an explicit `include` list, so untested branches in those files count against the thresholds even when no test imports them. The list is scoped to the main-process logic modules that are unit-testable; the window, view, dialog and preload surfaces are integration code covered by the e2e suite. Besides the aggregate floor, several well-covered modules are locked at their current level so a later change cannot silently regress them.

Three more checks run in CI and are worth running before pushing:

```bash
yarn type-check           # tsc --noEmit, run by typecheck.yml
yarn lint:check           # prettier --check and eslint, no writes, run by publish.yml
yarn check_version_match  # desktop against bundled JupyterLab version, run by publish.yml
```

`yarn lint` is the same two as `lint:check` with fixes applied. CI never runs it, since a job that rewrites the tree would have nowhere to put the result.

Prettier is pinned in `devDependencies` and its config is `.prettierrc`. The trap is the config rather than the binary: run against a file outside the project tree, prettier finds no `.prettierrc` to inherit, falls back to its defaults and reports wrapping differences that do not exist. Pass the config explicitly when checking anything that is not in place: `./node_modules/.bin/prettier --config ./.prettierrc --check <file>`.

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
