# Contributing to JupyterLab Desktop

Thanks for your interest in contributing. This file is a map; each link is the document that actually answers the question.

- **Setting up, building, running and testing the app**: [dev.md](dev.md)
- **What a reviewer will check on your pull request**: [Review guidance](dev.md#review-guidance) in the same document
- **Cutting a release, and updating the bundled JupyterLab**: [Release.md](Release.md)
- **Reporting a bug**: open an issue with the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md), after checking the [troubleshooting guide](troubleshoot.md)
- **Using the app**: [user guide](user-guide.md), [CLI documentation](cli.md), [Python environment management](python-env-management.md)

JupyterLab Desktop packages [JupyterLab](https://github.com/jupyterlab/jupyterlab) as an Electron application. A change to the notebook interface itself belongs in that repository; this one covers the desktop shell, the bundled Python environment and the installers.

Pull requests follow the [template](.github/pull_request_template.md), which includes a section on AI usage. Answer both of its questions honestly, and keep the pull request in draft until you have run the code yourself.

This project follows the [Jupyter Code of Conduct](https://github.com/jupyter/governance/blob/main/conduct/code_of_conduct.md). Security vulnerabilities go to security@jupyter.org rather than to a public issue, as described in the [Jupyter security policy](https://jupyter.org/security).
