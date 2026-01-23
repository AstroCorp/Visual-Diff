export {};

declare global {
	interface Window {
		electronAPI: {
			openFileDialog: () => Promise<string[] | null>;
			getFileUrl: (filePath: string) => Promise<string | null>;
			getPathForFile: (file: File) => string;
		};
	}

	interface HTMLMediaElement {
		captureStream(frameRate?: number): MediaStream;
	}
}
