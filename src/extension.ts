import * as vscode from "vscode";
import { registerDataCommands } from "./commands/dataCommands";
import {
	type ChartTestConfig,
	ChartViewProvider,
} from "./providers/chartViewProvider";
import { DataPreviewProvider } from "./providers/dataPreviewProvider";

export function activate(context: vscode.ExtensionContext) {
	console.log("VSPlot extension is now active!");

	// Register webview providers
	const chartViewProvider = new ChartViewProvider(context.extensionUri);
	const dataPreviewProvider = new DataPreviewProvider(
		context.extensionUri,
		chartViewProvider,
	);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			"vsplot.dataPreview",
			dataPreviewProvider,
		),
		vscode.window.registerWebviewViewProvider(
			"vsplot.chartView",
			chartViewProvider,
		),
	);

	// Register commands
	registerDataCommands(context, dataPreviewProvider, chartViewProvider);

	// Hidden test commands for automation
	context.subscriptions.push(
		vscode.commands.registerCommand(
			"vsplot.test.applyChartConfig",
			async (cfg: ChartTestConfig) => {
				try {
					await chartViewProvider.applyChartConfig(cfg);
				} catch (e) {
					vscode.window.showErrorMessage(String(e));
				}
			},
		),
		vscode.commands.registerCommand(
			"vsplot.test.requestChartState",
			async () => {
				return chartViewProvider.requestChartState();
			},
		),
	);

	console.log("VSPlot extension registered all providers and commands");
}

export function deactivate() {
	console.log("VSPlot extension is deactivating");
}
