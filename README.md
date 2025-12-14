# Ontrack GitHub actions: CLI Config

GitHub action to install and configure the [Yontrack CLI](https://github.com/nemerosa/ontrack-cli), followed
by the configuration of the build, branch & project in Yontrack, using
a local configuration file.

## Usage

### Setting up the action

Example:

```yaml
  - name: "Yontrack configuration"
    id: yontrack-config
    uses: nemerosa/ontrack-github-actions-cli-config@main
    env:
      YONTRACK_URL: ${{ vars.YONTRACK_URL }}
      YONTRACK_TOKEN: ${{ secrets.YONTRACK_TOKEN }}
    with:
      github-token: ${{ secrets.GITHUB_TOKEN }}
```
This step performs the following actions:

1. Installs the [Yontrack CLI](https://github.com/nemerosa/ontrack-cli) using the latest available version (using the `github-token` to get access to the list of releases)
2. Sets the `yontrack` CLI on the path for the subsequent steps
3. Configures the CLI based on the `YONTRACK_URL` and `YONTRACK_TOKEN` environment variables
4. Sends the default `.yontrack/ci.yml` to Yontrack, associated with some environment
  variables, to configure the build, branch and project.
5. Sets some environment variables to be used by the following steps. In particular, all
  Yontrack CLI commands will reuse these environment variables for the `--build`, 
  `--branch` and `--project` parameters.

> It may be better to not use the latest available version of the CLI, but to use a specific version: remove `github-token` and set the `version` parameter to a known version of the CLI.

### Configuration file

The configuration file is a YAML file expected at `.yontrack/ci.yml`.

> You can change the path of this file using the `config` input.

See the Yontrack documentation for the format of this file.

Below are some basic examples of configuration files.

#### Simplest configuration

This configuration will tell Yontrack to setup the build, branch and project using default values.

```yaml
version: v1
configuration: {}
```

#### Setting some simple validations and an auto promotion

```yaml
version: v1
configuration:
  defaults:
    branch:
      validations:
        BUILD: {}
        TEST: {}
      promotions:
        BRONZE:
          validations:
            - BUILD
            - TEST
```

#### Adding a specific promotion for the main branch 

```yaml
version: v1
configuration:
  defaults:
    branch:
      validations:
        BUILD: {}
        TEST: {}
      promotions:
        BRONZE:
          validations:
            - BUILD
            - TEST
  custom:
    - conditions:
        branch: main
      branch:
        validations:
          RELEASE: {}
        promotions:
          SILVER:
            validations:
              - RELEASE
```

### Environment variables

The following environment variables are set by this action:

* `YONTRACK_BUILD_ID`
* `YONTRACK_BUILD_NAME`
* `YONTRACK_BRANCH_ID`
* `YONTRACK_BRANCH_NAME`
* `YONTRACK_PROJECT_ID`
* `YONTRACK_PROJECT_NAME`

## Inputs

### Yontrack CI configuration

#### `config`

Path to the local configuration file to use. Defaults to `.yontrack.ci.yml`.

#### `env-vars`

List of environment variable names (one per line), to pass additionally to the default ones.

Example:

```yaml
env-vars: |
  APP_VERSION
  SOME_VAR
```

### Yontrack CLI configuration

#### `version`

Version of the [Yontrack CLI](https://github.com/nemerosa/ontrack-cli/releases) to install. If not specified, defaults to the latest available.

#### `github-token`

GitHub token to get the latest version of the CLI (when `version` is not provided).

#### `url`

URL of the Yontrack instance to target. If this input is set and the `token` one as well, this action will configure the CLI based on this information.

#### `token`

Authentication token to use to connect to Yontrack (required if URL is set). If this input is set and the `url` one as well, this action will setup the CLI based on this information.

#### `cli-config`

Optional name of the configuration to create for the CLI. Defaults to `default`.

#### `conn-retry-count`

Optional value to override max connection retry attempts. If not set, default ontrack-cli behavior applies. 

#### `conn-retry-wait`

Optional value to override max wait time between connection retry attempts. If not set, default ontrack-cli behavior applies. 

## Outputs

### `installed`

Version which has actually been installed.
