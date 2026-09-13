/** @type {import("eslint").Linter.Config} */
module.exports = {
	root: true,
	extends: ['@repo/eslint-config/default.cjs'],
	overrides: [
		{
			files: ['scripts/*.mjs'],
			env: { node: true, es2022: true },
			globals: { fetch: 'readonly', crypto: 'readonly', AbortSignal: 'readonly' },
			extends: ['plugin:@typescript-eslint/disable-type-checked'],
			parserOptions: { project: null },
		},
		{
			files: ['container/**/*.ts'],
			rules: {
				'turbo/no-undeclared-env-vars': [
					'error',
					{ allowList: ['SANDBOX_WORKDIR', 'SANDBOX_HOST'] },
				],
			},
		},
	],
}
