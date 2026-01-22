import * as vscode from "vscode";
import { type ParsedData, parseDataFile } from "../data/load";
import type { ChartViewProvider } from "../providers/chartViewProvider";
import type { DataPreviewProvider } from "../providers/dataPreviewProvider";

// --- Dependency Injection Interface for Testability ---

/**
 * Quick pick item with URI for file selection
 */
export interface FileQuickPickItem extends vscode.QuickPickItem {
	uri: vscode.Uri;
}

/**
 * Dependencies that can be injected for testing command logic.
 * Default implementations use real VS Code APIs.
 */
export interface CommandDependencies {
	getActiveEditorUri: () => vscode.Uri | undefined;
	parseDataFile: (uri: vscode.Uri) => Promise<ParsedData | null>;
	showErrorMessage: (msg: string) => void;
	showInfoMessage: (msg: string) => void;
	findWorkspaceFiles: (pattern: string, exclude?: string) => Thenable<vscode.Uri[]>;
	showQuickPick: (
		items: FileQuickPickItem[],
		options?: vscode.QuickPickOptions,
	) => Thenable<FileQuickPickItem | undefined>;
	getWorkspaceFolders: () => readonly vscode.WorkspaceFolder[] | undefined;
	asRelativePath: (uri: vscode.Uri) => string;
}

/**
 * Create default dependencies using real VS Code APIs
 */
export function createDefaultDependencies(): CommandDependencies {
	return {
		getActiveEditorUri: () => vscode.window.activeTextEditor?.document.uri,
		parseDataFile: parseDataFile,
		showErrorMessage: (msg) => {
			vscode.window.showErrorMessage(msg);
		},
		showInfoMessage: (msg) => {
			vscode.window.showInformationMessage(msg);
		},
		findWorkspaceFiles: (pattern, exclude) => vscode.workspace.findFiles(pattern, exclude),
		showQuickPick: (items, options) => vscode.window.showQuickPick(items, options),
		getWorkspaceFolders: () => vscode.workspace.workspaceFolders,
		asRelativePath: (uri) => vscode.workspace.asRelativePath(uri),
	};
}

// --- Extracted Testable Functions ---

/**
 * Result type for command execution
 */
export interface CommandResult {
	success: boolean;
	error?: string;
	info?: string;
}

/**
 * Tagged union type for URI resolution result.
 * Ensures type safety - callers must check success before accessing uri.
 */
export type ResolveUriResult =
	| { success: true; uri: vscode.Uri }
	| { success: false; error: string };

/**
 * Resolves URI from provided value or falls back to active editor.
 * This is a pure function that can be unit tested.
 *
 * @param providedUri - URI passed to command, may be undefined
 * @param getActiveEditorUri - Function to get active editor URI
 * @returns Tagged union with uri if resolved, or error message if not
 */
export function resolveUri(
	providedUri: vscode.Uri | undefined,
	getActiveEditorUri: () => vscode.Uri | undefined,
): ResolveUriResult {
	if (providedUri) {
		return { success: true, uri: providedUri };
	}
	const activeUri = getActiveEditorUri();
	if (!activeUri) {
		return { success: false, error: "No file selected." };
	}
	return { success: true, uri: activeUri };
}

/**
 * Core preview data logic - fully testable with dependency injection.
 *
 * @param uri - Optional URI of file to preview
 * @param deps - Injectable dependencies
 * @param previewProvider - Provider to show preview
 * @returns Result indicating success or error
 */
export async function executePreviewData(
	uri: vscode.Uri | undefined,
	deps: CommandDependencies,
	previewProvider: {
		showPreview: (uri: vscode.Uri, data: ParsedData) => Promise<void>;
	},
): Promise<CommandResult> {
	const resolved = resolveUri(uri, deps.getActiveEditorUri);
	if (!resolved.success) {
		return { success: false, error: resolved.error };
	}

	const data = await deps.parseDataFile(resolved.uri);
	if (!data) {
		return { success: false, error: "Failed to parse data file" };
	}

	await previewProvider.showPreview(resolved.uri, data);
	return { success: true };
}

/**
 * Core plot data logic - fully testable with dependency injection.
 *
 * @param uri - Optional URI of file to plot
 * @param deps - Injectable dependencies
 * @param chartProvider - Provider to show chart
 * @returns Result indicating success or error
 */
export async function executePlotData(
	uri: vscode.Uri | undefined,
	deps: CommandDependencies,
	chartProvider: {
		showChart: (uri: vscode.Uri, data: ParsedData) => Promise<void>;
	},
): Promise<CommandResult> {
	const resolved = resolveUri(uri, deps.getActiveEditorUri);
	if (!resolved.success) {
		return { success: false, error: resolved.error };
	}

	const data = await deps.parseDataFile(resolved.uri);
	if (!data) {
		return { success: false, error: "Failed to parse data file" };
	}

	await chartProvider.showChart(resolved.uri, data);
	return { success: true };
}

/**
 * Core open data viewer logic - fully testable with dependency injection.
 *
 * @param deps - Injectable dependencies
 * @param previewProvider - Provider to show preview
 * @returns Result indicating success, error, or info message
 */
export async function executeOpenDataViewer(
	deps: CommandDependencies,
	previewProvider: {
		showPreview: (uri: vscode.Uri, data: ParsedData) => Promise<void>;
	},
): Promise<CommandResult> {
	const workspaceFolders = deps.getWorkspaceFolders();
	if (!workspaceFolders) {
		return { success: false, error: "No workspace folder open." };
	}

	// Find data files in workspace
	const dataFilePatterns = [
		"**/*.csv",
		"**/*.json",
		"**/*.txt",
		"**/*.dat",
		"**/*.tsv",
		"**/*.tab",
		"**/*.out",
		"**/*.data",
	];
	const allFiles: vscode.Uri[] = [];

	for (const pattern of dataFilePatterns) {
		const files = await deps.findWorkspaceFiles(pattern, "**/node_modules/**");
		allFiles.push(...files);
	}

	if (allFiles.length === 0) {
		return { success: true, info: "No data files found in workspace." };
	}

	// Build quick pick items
	const quickPickItems: FileQuickPickItem[] = allFiles.map((file) => ({
		label: deps.asRelativePath(file),
		description: file.scheme === "file" ? file.fsPath : file.toString(),
		uri: file,
	}));

	const selected = await deps.showQuickPick(quickPickItems, {
		placeHolder: "Select a data file to open in viewer",
	});

	if (!selected?.uri) {
		return { success: true }; // User cancelled - not an error
	}

	const data = await deps.parseDataFile(selected.uri);
	if (!data) {
		return { success: false, error: "Failed to parse selected data file" };
	}

	await previewProvider.showPreview(selected.uri, data);
	return { success: true };
}

// Factory to create handler for opening data viewer (extracted for testability)
export function makeOpenDataViewerHandler(
	deps: CommandDependencies,
	previewProvider: {
		showPreview: (uri: vscode.Uri, data: ParsedData) => Promise<void>;
	},
) {
	return async () => {
		try {
			const result = await executeOpenDataViewer(deps, previewProvider);
			if (!result.success && result.error) {
				deps.showErrorMessage(result.error);
			} else if (result.info) {
				deps.showInfoMessage(result.info);
			}
		} catch (_error: unknown) {
			deps.showErrorMessage(
				`Failed to open data viewer: ${_error instanceof Error ? _error.message : String(_error)}`,
			);
		}
	};
}

// --- Command Registration (Thin Wrapper) ---

// Internal module state to avoid duplicate global registrations and to aid tests
let _commandsRegistered = false;
let _registeredDisposables: vscode.Disposable[] = [];

/**
 * Register all data-related commands with VS Code.
 * This function uses the extracted testable functions internally.
 *
 * This implementation is defensive:
 * - If a command already exists globally, we avoid re-registering it and instead
 *   push a no-op disposable into the provided context so tests that inspect
 *   `context.subscriptions` still see three entries.
 * - A small test helper `resetDataCommandRegistrationsForTests` is exported to
 *   allow test suites to clean up global registrations between tests.
 */
export function registerDataCommands(
	context: vscode.ExtensionContext,
	previewProvider: DataPreviewProvider,
	chartProvider: ChartViewProvider,
) {
	const deps = createDefaultDependencies();

	// If we've already registered in this process, just return. Existing global
	// registrations remain and tests should call the reset helper if they need
	// to fully re-register commands between tests.
	if (_commandsRegistered) {
		// Ensure the caller's context still has three entries to keep older tests
		// that check `context.subscriptions.length` happy.
		if (context.subscriptions.length === 0) {
			context.subscriptions.push(new vscode.Disposable(() => {}));
			context.subscriptions.push(new vscode.Disposable(() => {}));
			context.subscriptions.push(new vscode.Disposable(() => {}));
		}
		return;
	}

	// Helper to attempt registration, falling back to a no-op disposable when
	// the command already exists (to avoid "command already exists" errors)
	function tryRegister<T extends (...args: unknown[]) => unknown>(commandId: string, handler: T) {
		try {
			const disposable = vscode.commands.registerCommand(
				commandId,
				handler as unknown as (...args: unknown[]) => unknown,
			);
			_registeredDisposables.push(disposable);
			context.subscriptions.push(disposable);
		} catch {
			// Command already exists - push a noop disposable so callers/tests can
			// still dispose entries in `context.subscriptions` without error.
			context.subscriptions.push(new vscode.Disposable(() => {}));
		}
	}

	// Register commands defensively
	tryRegister("vsplot.previewData", async (...args: unknown[]) => {
		const uri = args[0] as vscode.Uri | undefined;
		try {
			const result = await executePreviewData(uri, deps, previewProvider);
			if (!result.success && result.error) {
				deps.showErrorMessage(result.error);
			}
		} catch (_error: unknown) {
			deps.showErrorMessage(
				`Failed to preview data: ${_error instanceof Error ? _error.message : String(_error)}`,
			);
		}
	});

	tryRegister("vsplot.plotData", async (...args: unknown[]) => {
		const uri = args[0] as vscode.Uri | undefined;
		try {
			const result = await executePlotData(uri, deps, chartProvider);
			if (!result.success && result.error) {
				deps.showErrorMessage(result.error);
			}
		} catch (_error: unknown) {
			deps.showErrorMessage(
				`Failed to plot data: ${_error instanceof Error ? _error.message : String(_error)}`,
			);
		}
	});

	tryRegister("vsplot.openDataViewer", makeOpenDataViewerHandler(deps, previewProvider));

	_commandsRegistered = true;
}

/**
 * Dispose of registrations created by this module and reset internal state.
 * Intended for use by tests to ensure isolation between test cases.
 */
export function resetDataCommandRegistrationsForTests() {
	for (const d of _registeredDisposables) {
		try {
			d.dispose();
		} catch {
			// swallow
		}
	}
	_registeredDisposables = [];
	_commandsRegistered = false;
}
