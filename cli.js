#!/usr/bin/env node
const path = require('path');

const arg = require('arg');
const chalk = require('chalk');
const globby = require('globby');
const signalExit = require('signal-exit');

signalExit(() => chalk.enabled && process.stdout.write('\x1b[?25h'));

// https://regex101.com/r/BjSw9u/2
const MASK_PATTERN = /^(-)?([^/-][^/]*(?:\/[^/]+)*)$/;

const args = arg({
	'--help': Boolean,

	'--include': [String],
	'-I': '--include',

	'--verbose': Boolean,
	'-v': '--verbose'
});

if (args['--help']) {
	console.error(chalk`
  {bold.cyanBright best} v${require(require('path').join(__dirname, 'package.json')).version}

  A dead simple test runner.

  - Export your functions and they're evaluated
  - Function names become test names
  - Exported functions are awaited upon

  {bold USAGE}

    {bold.cyanBright best} --help
    {bold.cyanBright best} [-I {underline /dir/or/file} [-I ...]] [-T] [{underline test_name}...]

    {underline test_names}'s correspond to the name of the exported functions within test sources,
    and are prefixed with the path of the source file (sans extension) in which it was defined.

    For example, the following test function inside {bold test/foo.js}:

        {cyan exports}.my_example_test {dim =} {bold.cyanBright async} () {dim =>} ${'{'}
            assert(foo {dim ===} bar);
        ${'}'};

    would translate to the {underline test_name}:

        {bold test/foo/my_example_test}

    Specify one or more (optional) {underline test_name}'s to only run certain tests (or prefix
    with {bold -} to skip the named test).

  {bold OPTIONS}

    --help                          Shows this help message

    -v, --verbose                   Shows more verbose test results

    -I, --include {underline /dir/or/file}      Uses one or more directories/files as test sources.
                                    Defaults to {bold ./test/**/*.js} if no include directives
                                    are specified
`);

	process.exit(2);
}

function error(msg) {
	console.error(chalk`{bold.cyanBright best:} {bold.red error:}`, msg);
}

function warning(msg) {
	console.error(chalk`{bold.cyanBright best:} {bold.yellow warning:}`, msg);
}

let whitelistMode = false;
const masks = [];

if (args._.length > 0) {
	const invalid = args._.filter(pattern => {
		const match = pattern.match(MASK_PATTERN);
		if (!match) {
			return true;
		}

		// group 1 preset = - = negate
		whitelistMode = whitelistMode || !Boolean(match[1]);
		masks.push({
			// https://stackoverflow.com/a/2593661/510036
			mask: new RegExp(`^${match[2].replace(/[.?*+^$[\]\\(){}|-]/g, '\\$&')}(\\/|$)`),
			negate: Boolean(match[1])
		});
	});

	if (invalid.length > 0) {
		invalid.forEach(pattern => error(`invalid mask: ${pattern}`));
		process.exit(2);
	}
}

function requireEphemeral(filepath) {
	const resolved = require.resolve(filepath);
	const module = require(resolved);
	delete require.cache[resolved];
	return module;
}

async function runTest(name, fn) {
	let errResult = null;
	try {
		await fn();
	} catch (err) {
		errResult = err;
	}

	let message = '';
	if (chalk.enabled && !args['--verbose']) {
		message += '\x1b[G\x1b[2K';
	}

	if (errResult) {
		// Failed
		message += chalk`{red.bold FAIL} {whiteBright ${name.substring(0, process.stdout.columns - 5)}}\n`;
		message += chalk`{red ${errResult.stack}}\n\n`;
	} else {
		message += chalk`{green.bold PASS} {whiteBright ${name.substring(0, process.stdout.columns - 5)}}`;
		if (args['--verbose']) {
			message += '\n';
		}
	}

	process.stdout.write(message);
	return !Boolean(errResult);
}

async function main() {
	// Hide the cursor
	if (chalk.enabled) {
		process.stdout.write('\x1b[?25l');
	}

	// Get file listing
	const filePaths = (((args['--include'] || []).length > 0) ? args['--include'] : ['test']);
	const files = (await globby(filePaths, {
		expandDirectories: {
			extensions: ['js']
		}
	})).filter(filepath => {
		if (path.extname(filepath) !== '.js') {
			warning(`ignoring file (not a script): ${filepath}`);
			return false;
		}

		return true;
	});

	if (files.length === 0) {
		warning(`no test files specified`);
		return;
	}

	// Build up test suite
	const suite = [];
	for (const filepath of files) {
		const module = requireEphemeral(path.resolve(filepath));
		const moduleKeys = Object.keys(module);
		let validTests = moduleKeys.length;
		const tests = moduleKeys
			.map(key => [key, `${filepath.slice(0, -3)}/${key}`])
			.filter(([key, testPath]) => {
				if (typeof module[key] !== 'function') {
					warning(`skipping non-function test: ${testPath}`);
					--validTests;
					return false;
				}

				return true;
			})
			.filter(([, testPath]) => {
				let allowed = !whitelistMode;
				for (const {mask, negate} of masks) {
					if (mask.test(testPath)) {
						allowed = whitelistMode && !negate;
					}
				}
				return allowed;
			})
			.map(([key, testPath]) => [testPath, module[key]]);

		if (validTests === 0 && args['--verbose']) {
			warning(`test file has no valid tests: ${filepath}`);
		}

		suite.push(...tests);
	}

	if (suite.length === 0) {
		warning('no tests to run');
		return;
	}

	let failures = 0;
	for (const [testName, fn] of suite) {
		const testSuccess = await runTest(testName, fn);
		failures += Number(!testSuccess);
	}

	if (!args['--verbose']) {
		process.stdout.write('\n');
	}

	if (failures === 0) {
		console.error(chalk`\n{inverse.greenBright ALL TESTS PASSED}`);
	} else {
		console.error(chalk`\n{inverse.redBright ${failures} TESTS FAILED}`);
		process.exit(1);
	}
}

main().catch(err => {
	console.error(err.stack);
	process.exit(1);
});
