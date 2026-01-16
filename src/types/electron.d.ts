export {};

declare global {
	interface Window {
		electronAPI: {
			openFileDialog: () => Promise<string[] | null>;
			getFileUrl: (filePath: string) => Promise<string | null>;
		};
	}

	interface HTMLMediaElement {
		captureStream(frameRate?: number): MediaStream;
	}
}
