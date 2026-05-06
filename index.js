const client = require('@nemerosa/ontrack-github-actions-module-install');

async function runAction({ core, exec, client: clientDep }) {
    let url = core.getInput('url');
    if (!url) {
        url = process.env.YONTRACK_URL;
    }
    let token = core.getInput('token');
    if (!token) {
        token = process.env.YONTRACK_TOKEN;
    }

    const { version, dir, cliExecutable } = await clientDep.install({
        version: core.getInput('version'),
        githubToken: core.getInput('github-token'),
        acceptDraft: false,
        logging: true,
        yontrackUrl: url,
        yontrackToken: token,
        yontrackUser: core.getInput('cli-config'),
        connRetryCount: core.getInput('conn-retry-count'),
        connRetryWait: core.getInput('conn-retry-wait'),
    });

    core.setOutput('installed', version);
    core.addPath(dir);
    core.info(`Yontrack CLI version ${version} installed`);

    const path = core.getInput('config');
    core.info(`Yontrack config at ${path}`);

    const args = [];
    args.push('ci', 'config');
    args.push('--file', path);
    args.push('--ci', 'github');
    args.push('--scm', 'github');
    args.push('--output', 'json');

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
        'VERSION',
        'ONTRACK_SCM_ISSUES',
    ];

    const envVarNames = core
        .getMultilineInput('env-vars', { trimWhitespace: true })
        .filter(Boolean);

    envNames.push(...envVarNames);

    const yontrackCiVars = Object.keys(process.env)
        .filter((key) => key.startsWith('YONTRACK_CI_'));

    envNames.push(...yontrackCiVars);

    for (const envName of envNames) {
        const envValue = process.env[envName];
        if (envValue) {
            args.push('--env', `${envName}=${envValue}`);
        }
    }

    const result = await exec.getExecOutput(cliExecutable, args);
    const output = result.stdout;
    const json = JSON.parse(output);
    core.info(`Config output: ${JSON.stringify(json, null, 2)}`);

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

    core.setOutput('buildId', buildId);
    core.setOutput('buildName', buildName);
    core.setOutput('branchId', branchId);
    core.setOutput('branchName', branchName);
    core.setOutput('projectId', projectId);
    core.setOutput('projectName', projectName);
}

module.exports = { runAction };

if (process.env.NODE_ENV !== 'test') {
    (async () => {
        const core = await import('@actions/core');
        const execDep = await import('@actions/exec');
        try {
            await runAction({ core, exec: execDep, client });
        } catch (error) {
            core.setFailed(error.message);
        }
    })();
}
