const core = require('@actions/core');
const exec = require('@actions/exec');
const client = require('@nemerosa/ontrack-github-actions-module-install');

(async () => {
    try {
        await setup();
    } catch (error) {
        core.setFailed(error.message);
    }
})();

async function setup() {

    let url = core.getInput('url');
    if (!url) {
        url = process.env.YONTRACK_URL;
    }
    let token = core.getInput('token');
    if (!token) {
        token = process.env.YONTRACK_TOKEN;
    }

    // Installing and configuring the CLI
    const {version, dir, cliExecutable} = await client.install({
        version: core.getInput('version'),
        githubToken: core.getInput('github-token'),
        acceptDraft: false,
        logging: true,
        yontrackUrl: url,
        yontrackToken: token,
        yontrackUser: core.getInput('cli-config'),
        connRetryCount: core.getInput('conn-retry-count'),
        connRetryWait: core.getInput('conn-retry-wait'),
    })

    core.setOutput('installed', version);
    core.addPath(dir)
    core.info(`Yontrack CLI version ${version} installed`);

    // Configuration

    const path = core.getInput('config');
    core.info(`Yontrack config at ${path}`);

    // Building the command line arguments

    const args = []
    args.push('ci', 'config')
    args.push('--file', path)
    args.push('--ci', 'github')
    args.push('--scm', 'github')
    args.push('--output', 'env')

    // List of environment variables to inject

    const envNames = [
        'GITHUB_SERVER_URL',
        'GITHUB_REPOSITORY',
        'GITHUB_REF_NAME',
        'GITHUB_RUN_ID',
        'GITHUB_RUN_NUMBER',
        'GITHUB_WORKFLOW',
        'GITHUB_EVENT_NAME',
        'GITHUB_ACTIONS',
        'GITHUB_SHA',
    ]

    for (const envName of envNames) {
        args.push('--env', `${envName}=${process.env[envName]}`)
    }

    // Running the configuration

    await exec.exec(cliExecutable, args)

    // TODO Gets the outcome and injects it into the environment
}
