export {};

declare global {
	interface Window {
		electronAPI: {
			openFileDialog: () => Promise<string[] | null>;
			readFileAsDataUrl: (filePath: string) => Promise<string | null>;
		};
	}
}
