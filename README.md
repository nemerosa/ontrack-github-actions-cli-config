# Ontrack GitHub actions: CLI Config

GitHub action to install and configure the [Yontrack CLI](https://github.com/nemerosa/ontrack-cli), followed
by the configuration of the build, branch & project in Yontrack, using
a local configuration file.

## Inputs

### Yontrack CI configuration

#### `config`

Path to the local configuration file to use. Defaults to `.yontrack.ci.yml`.

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

## Example usage

Setting the CLI automatically:

```yaml
- name: Setup the CLI
  uses: nemerosa/ontrack-github-actions-cli-install
  with:
    github-token: ${{ github.token }}
    url: <ontrack-url>
    token: ${{ secrets.ONTRACK_TOKEN }}
# This:
# 1. installs the CLI
# 2. configures the CLI
# After this step, the `yontrack` command is available in the PATH.
```
