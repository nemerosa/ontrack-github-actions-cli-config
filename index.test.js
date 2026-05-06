jest.mock('@nemerosa/ontrack-github-actions-module-install', () => ({
    install: jest.fn(),
}));

const { runAction } = require('./index');
const moduleInstall = require('@nemerosa/ontrack-github-actions-module-install');

function makeCore(inputs = {}, multilineInputs = {}) {
    return {
        getInput: jest.fn((name) => (name in inputs ? inputs[name] : '')),
        getMultilineInput: jest.fn((name) => (name in multilineInputs ? multilineInputs[name] : [])),
        setOutput: jest.fn(),
        exportVariable: jest.fn(),
        addPath: jest.fn(),
        info: jest.fn(),
        setFailed: jest.fn(),
    };
}

function makeExec(stdout = JSON.stringify({
    ID: 1,
    Name: 'b1',
    Branch: { ID: 2, Name: 'main', Project: { ID: 3, Name: 'my-project' } },
})) {
    return { getExecOutput: jest.fn().mockResolvedValue({ stdout, stderr: '', exitCode: 0 }) };
}

function makeClient({ version = '5.0.0', dir = '/tmp/yt', cliExecutable = 'yontrack' } = {}) {
    return { install: jest.fn().mockResolvedValue({ version, dir, cliExecutable }) };
}

beforeEach(() => {
    delete process.env.YONTRACK_URL;
    delete process.env.YONTRACK_TOKEN;
    Object.keys(process.env)
        .filter((k) => k.startsWith('YONTRACK_CI_'))
        .forEach((k) => delete process.env[k]);
    moduleInstall.install.mockReset();
});

describe('runAction — input handling', () => {
    test('uses url/token inputs when provided', async () => {
        const core = makeCore({ url: 'https://yt.example', token: 'tok', config: '.yontrack/ci.yaml' });
        const execDep = makeExec();
        const client = makeClient();
        await runAction({ core, exec: execDep, client });
        expect(client.install).toHaveBeenCalledWith(expect.objectContaining({
            yontrackUrl: 'https://yt.example',
            yontrackToken: 'tok',
        }));
    });

    test('falls back to YONTRACK_URL/YONTRACK_TOKEN env when inputs are empty', async () => {
        process.env.YONTRACK_URL = 'https://yt.env';
        process.env.YONTRACK_TOKEN = 'env-tok';
        const core = makeCore({ config: '.yontrack/ci.yaml' });
        const execDep = makeExec();
        const client = makeClient();
        await runAction({ core, exec: execDep, client });
        expect(client.install).toHaveBeenCalledWith(expect.objectContaining({
            yontrackUrl: 'https://yt.env',
            yontrackToken: 'env-tok',
        }));
    });

    test('passes version + githubToken + cli-config to client.install', async () => {
        const core = makeCore({ version: '5.0.0', 'github-token': 'gh', 'cli-config': 'admin', config: '.yontrack/ci.yaml' });
        const execDep = makeExec();
        const client = makeClient();
        await runAction({ core, exec: execDep, client });
        expect(client.install).toHaveBeenCalledWith(expect.objectContaining({
            version: '5.0.0',
            githubToken: 'gh',
            yontrackUser: 'admin',
        }));
    });
});

describe('runAction — CLI invocation', () => {
    test('calls cliExecutable with ci config args', async () => {
        const core = makeCore({ config: '.yontrack/ci.yaml' });
        const execDep = makeExec();
        const client = makeClient({ cliExecutable: 'yontrack' });
        await runAction({ core, exec: execDep, client });
        expect(execDep.getExecOutput).toHaveBeenCalledWith('yontrack', expect.arrayContaining([
            'ci', 'config',
            '--file', '.yontrack/ci.yaml',
            '--ci', 'github',
            '--scm', 'github',
            '--output', 'json',
        ]));
    });

    test('injects predefined GITHUB_* env vars when set', async () => {
        process.env.GITHUB_REPOSITORY = 'owner/repo';
        process.env.GITHUB_RUN_ID = '999';
        const core = makeCore({ config: '.yontrack/ci.yaml' });
        const execDep = makeExec();
        const client = makeClient();
        await runAction({ core, exec: execDep, client });
        const callArgs = execDep.getExecOutput.mock.calls[0][1];
        expect(callArgs).toContain('--env');
        expect(callArgs).toContain('GITHUB_REPOSITORY=owner/repo');
        expect(callArgs).toContain('GITHUB_RUN_ID=999');
    });

    test('skips env vars that are unset', async () => {
        delete process.env.VERSION;
        const core = makeCore({ config: '.yontrack/ci.yaml' });
        const execDep = makeExec();
        const client = makeClient();
        await runAction({ core, exec: execDep, client });
        const callArgs = execDep.getExecOutput.mock.calls[0][1];
        expect(callArgs.find((a) => a.startsWith('VERSION='))).toBeUndefined();
    });

    test('injects custom env-vars input', async () => {
        process.env.MY_CUSTOM_VAR = 'hello';
        const core = makeCore({ config: '.yontrack/ci.yaml' }, { 'env-vars': ['MY_CUSTOM_VAR'] });
        const execDep = makeExec();
        const client = makeClient();
        await runAction({ core, exec: execDep, client });
        const callArgs = execDep.getExecOutput.mock.calls[0][1];
        expect(callArgs).toContain('MY_CUSTOM_VAR=hello');
        delete process.env.MY_CUSTOM_VAR;
    });

    test('injects YONTRACK_CI_* env vars', async () => {
        process.env.YONTRACK_CI_FOO = 'foo-value';
        const core = makeCore({ config: '.yontrack/ci.yaml' });
        const execDep = makeExec();
        const client = makeClient();
        await runAction({ core, exec: execDep, client });
        const callArgs = execDep.getExecOutput.mock.calls[0][1];
        expect(callArgs).toContain('YONTRACK_CI_FOO=foo-value');
    });
});

describe('runAction — output / env injection', () => {
    test('exports YONTRACK_* env vars from CLI JSON output', async () => {
        const core = makeCore({ config: '.yontrack/ci.yaml' });
        const execDep = makeExec(JSON.stringify({
            ID: 42,
            Name: 'build-42',
            Branch: { ID: 7, Name: 'main', Project: { ID: 100, Name: 'my-proj' } },
        }));
        const client = makeClient();
        await runAction({ core, exec: execDep, client });
        expect(core.exportVariable).toHaveBeenCalledWith('YONTRACK_BUILD_ID', 42);
        expect(core.exportVariable).toHaveBeenCalledWith('YONTRACK_BUILD_NAME', 'build-42');
        expect(core.exportVariable).toHaveBeenCalledWith('YONTRACK_BRANCH_ID', 7);
        expect(core.exportVariable).toHaveBeenCalledWith('YONTRACK_BRANCH_NAME', 'main');
        expect(core.exportVariable).toHaveBeenCalledWith('YONTRACK_PROJECT_ID', 100);
        expect(core.exportVariable).toHaveBeenCalledWith('YONTRACK_PROJECT_NAME', 'my-proj');
    });

    test('sets action outputs from CLI JSON output', async () => {
        const core = makeCore({ config: '.yontrack/ci.yaml' });
        const execDep = makeExec();
        const client = makeClient({ version: '5.1.0', dir: '/yt' });
        await runAction({ core, exec: execDep, client });
        expect(core.setOutput).toHaveBeenCalledWith('installed', '5.1.0');
        expect(core.setOutput).toHaveBeenCalledWith('buildId', 1);
        expect(core.setOutput).toHaveBeenCalledWith('buildName', 'b1');
        expect(core.setOutput).toHaveBeenCalledWith('branchId', 2);
        expect(core.setOutput).toHaveBeenCalledWith('branchName', 'main');
        expect(core.setOutput).toHaveBeenCalledWith('projectId', 3);
        expect(core.setOutput).toHaveBeenCalledWith('projectName', 'my-project');
    });

    test('adds CLI dir to PATH', async () => {
        const core = makeCore({ config: '.yontrack/ci.yaml' });
        const execDep = makeExec();
        const client = makeClient({ dir: '/custom/dir' });
        await runAction({ core, exec: execDep, client });
        expect(core.addPath).toHaveBeenCalledWith('/custom/dir');
    });
});
