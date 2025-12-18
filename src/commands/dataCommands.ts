import * as vscode from 'vscode';
import { parseDataFile, type ParsedData } from '../data/load';
import type { DataPreviewProvider } from '../providers/dataPreviewProvider';
import type { ChartViewProvider } from '../providers/chartViewProvider';

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
    showQuickPick: (items: FileQuickPickItem[], options?: vscode.QuickPickOptions) => Thenable<FileQuickPickItem | undefined>;
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
        showErrorMessage: (msg) => { vscode.window.showErrorMessage(msg); },
        showInfoMessage: (msg) => { vscode.window.showInformationMessage(msg); },
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
 * Resolves URI from provided value or falls back to active editor.
 * This is a pure function that can be unit tested.
 * 
 * @param providedUri - URI passed to command, may be undefined
 * @param getActiveEditorUri - Function to get active editor URI
 * @returns Object with uri if resolved, or error message if not
 */
export function resolveUri(
    providedUri: vscode.Uri | undefined,
    getActiveEditorUri: () => vscode.Uri | undefined
): { uri?: vscode.Uri; error?: string } {
    if (providedUri) {
        return { uri: providedUri };
    }
    const activeUri = getActiveEditorUri();
    if (!activeUri) {
        return { error: 'No file selected.' };
    }
    return { uri: activeUri };
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
    previewProvider: { showPreview: (uri: vscode.Uri, data: ParsedData) => Promise<void> }
): Promise<CommandResult> {
    const resolved = resolveUri(uri, deps.getActiveEditorUri);
    if (resolved.error) {
        return { success: false, error: resolved.error };
    }

    const data = await deps.parseDataFile(resolved.uri!);
    if (!data) {
        return { success: false, error: 'Failed to parse data file' };
    }

    await previewProvider.showPreview(resolved.uri!, data);
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
    chartProvider: { showChart: (uri: vscode.Uri, data: ParsedData) => Promise<void> }
): Promise<CommandResult> {
    const resolved = resolveUri(uri, deps.getActiveEditorUri);
    if (resolved.error) {
        return { success: false, error: resolved.error };
    }

    const data = await deps.parseDataFile(resolved.uri!);
    if (!data) {
        return { success: false, error: 'Failed to parse data file' };
    }

    await chartProvider.showChart(resolved.uri!, data);
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
    previewProvider: { showPreview: (uri: vscode.Uri, data: ParsedData) => Promise<void> }
): Promise<CommandResult> {
    const workspaceFolders = deps.getWorkspaceFolders();
    if (!workspaceFolders) {
        return { success: false, error: 'No workspace folder open.' };
    }

    // Find data files in workspace
    const dataFilePatterns = ['**/*.csv', '**/*.json', '**/*.txt', '**/*.dat', '**/*.tsv', '**/*.tab', '**/*.out', '**/*.data'];
    const allFiles: vscode.Uri[] = [];

    for (const pattern of dataFilePatterns) {
        const files = await deps.findWorkspaceFiles(pattern, '**/node_modules/**');
        allFiles.push(...files);
    }

    if (allFiles.length === 0) {
        return { success: true, info: 'No data files found in workspace.' };
    }

    // Build quick pick items
    const quickPickItems: FileQuickPickItem[] = allFiles.map(file => ({
        label: deps.asRelativePath(file),
        description: file.scheme === 'file' ? file.fsPath : file.toString(),
        uri: file
    }));

    const selected = await deps.showQuickPick(quickPickItems, {
        placeHolder: 'Select a data file to open in viewer'
    });

    if (!selected?.uri) {
        return { success: true }; // User cancelled - not an error
    }

    const data = await deps.parseDataFile(selected.uri);
    if (!data) {
        return { success: false, error: 'Failed to parse selected data file' };
    }

    await previewProvider.showPreview(selected.uri, data);
    return { success: true };
}

// --- Command Registration (Thin Wrapper) ---

/**
 * Register all data-related commands with VS Code.
 * This function uses the extracted testable functions internally.
 */
export function registerDataCommands(
    context: vscode.ExtensionContext,
    previewProvider: DataPreviewProvider,
    chartProvider: ChartViewProvider
) {
    const deps = createDefaultDependencies();

    // Register preview data command
    const previewDataCommand = vscode.commands.registerCommand('vsplot.previewData', async (uri?: vscode.Uri) => {
        try {
            const result = await executePreviewData(uri, deps, previewProvider);
            if (!result.success && result.error) {
                deps.showErrorMessage(result.error);
            }
        } catch (error: unknown) {
            deps.showErrorMessage(`Failed to preview data: ${error instanceof Error ? error.message : String(error)}`);
        }
    });

    // Register plot data command
    const plotDataCommand = vscode.commands.registerCommand('vsplot.plotData', async (uri?: vscode.Uri) => {
        try {
            const result = await executePlotData(uri, deps, chartProvider);
            if (!result.success && result.error) {
                deps.showErrorMessage(result.error);
            }
        } catch (error: unknown) {
            deps.showErrorMessage(`Failed to plot data: ${error instanceof Error ? error.message : String(error)}`);
        }
    });

    // Register open data viewer command
    const openDataViewerCommand = vscode.commands.registerCommand('vsplot.openDataViewer', async () => {
        try {
            const result = await executeOpenDataViewer(deps, previewProvider);
            if (!result.success && result.error) {
                deps.showErrorMessage(result.error);
            } else if (result.info) {
                deps.showInfoMessage(result.info);
            }
        } catch (error: unknown) {
            deps.showErrorMessage(`Failed to open data viewer: ${error instanceof Error ? error.message : String(error)}`);
        }
    });

    context.subscriptions.push(previewDataCommand, plotDataCommand, openDataViewerCommand);
}
