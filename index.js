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
    args.push('--output', 'json')

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

    const result = await exec.getExecOutput(cliExecutable, args)
    const output = result.stdout;
    const json = JSON.parse(output);
    core.info(`Config output: ${JSON.stringify(json, null, 2)}`);

    // Gets the outcome and injects it into the environment

    const buildId = json.ID;
    const buildName = json.Name;
    const branchId = json.Branch.ID;
    const branchName = json.Branch.Name;
    const projectId = json.Branch.Project.ID;
    const projectName = json.Branch.Project.Name;

    core.exportVariable('YONTRACK_BUILD_ID', buildId);
    core.exportVariable('YONTRACK_BUILD_NAME', buildName);
    core.exportVariable('YONTRACK_BRANCH_ID', branchId);
    core.exportVariable('YONTRACK_BRANCH_NAME', branchName);
    core.exportVariable('YONTRACK_PROJECT_ID', projectId);
    core.exportVariable('YONTRACK_PROJECT_NAME', projectName);

    // Injects also these values as action outputs

    core.setOutput('buildId', buildId);
    core.setOutput('buildName', buildName);
    core.setOutput('branchId', branchId);
    core.setOutput('branchName', branchName);
    core.setOutput('projectId', projectId);
    core.setOutput('projectName', projectName);

}
