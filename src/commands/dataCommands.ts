import * as vscode from 'vscode';
import { parseDataFile } from '../data/load';
import type { DataPreviewProvider } from '../providers/dataPreviewProvider';
import type { ChartViewProvider } from '../providers/chartViewProvider';

export function registerDataCommands(
    context: vscode.ExtensionContext,
    previewProvider: DataPreviewProvider,
    chartProvider: ChartViewProvider
) {
    // Register preview data command
    const previewDataCommand = vscode.commands.registerCommand('vsplot.previewData', async (uri?: vscode.Uri) => {
        try {
            if (!uri) {
                // Fallback to active editor
                const activeEditor = vscode.window.activeTextEditor;
                if (!activeEditor) {
                    vscode.window.showErrorMessage('No file selected for preview.');
                    return;
                }
                uri = activeEditor.document.uri;
            }

            const data = await parseDataFile(uri);
            if (!data) {
                vscode.window.showErrorMessage('Failed to parse data file');
                return;
            }
            await previewProvider.showPreview(uri, data);

        } catch (error: unknown) {
            vscode.window.showErrorMessage(`Failed to preview data: ${error instanceof Error ? error.message : String(error)}`);
        }
    });

    // Register plot data command
    const plotDataCommand = vscode.commands.registerCommand('vsplot.plotData', async (uri?: vscode.Uri) => {
        try {
            if (!uri) {
                // Fallback to active editor
                const activeEditor = vscode.window.activeTextEditor;
                if (!activeEditor) {
                    vscode.window.showErrorMessage('No file selected for plotting.');
                    return;
                }
                uri = activeEditor.document.uri;
            }

            const data = await parseDataFile(uri);
            if (!data) {
                vscode.window.showErrorMessage('Failed to parse data file');
                return;
            }
            await chartProvider.showChart(uri, data);

        } catch (error: unknown) {
            vscode.window.showErrorMessage(`Failed to plot data: ${error instanceof Error ? error.message : String(error)}`);
        }
    });

    // Register open data viewer command
    const openDataViewerCommand = vscode.commands.registerCommand('vsplot.openDataViewer', async () => {
        try {
            // Show quick pick for data files in workspace
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                vscode.window.showErrorMessage('No workspace folder open.');
                return;
            }

            // Find data files in workspace
            const dataFilePatterns = ['**/*.csv', '**/*.json', '**/*.txt', '**/*.dat', '**/*.tsv', '**/*.tab', '**/*.out', '**/*.data'];
            const allFiles: vscode.Uri[] = [];

            for (const pattern of dataFilePatterns) {
                const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**');
                allFiles.push(...files);
            }

            if (allFiles.length === 0) {
                vscode.window.showInformationMessage('No data files found in workspace.');
                return;
            }

            // Show quick pick
            const quickPickItems = allFiles.map(file => ({
                label: vscode.workspace.asRelativePath(file),
                description: file.scheme === 'file' ? file.fsPath : file.toString(),
                uri: file
            }));

            const selected = await vscode.window.showQuickPick(quickPickItems, {
                placeHolder: 'Select a data file to open in viewer'
            });

            if (selected?.uri) {
                const data = await parseDataFile(selected.uri);
                if (!data) {
                    vscode.window.showErrorMessage('Failed to parse selected data file');
                    return;
                }
                await previewProvider.showPreview(selected.uri, data);
            }

        } catch (error: unknown) {
            vscode.window.showErrorMessage(`Failed to open data viewer: ${error instanceof Error ? error.message : String(error)}`);
        }
    });

    context.subscriptions.push(previewDataCommand, plotDataCommand, openDataViewerCommand);
}
