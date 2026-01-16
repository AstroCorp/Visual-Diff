export {};

declare global {
	interface Window {
		electronAPI: {
			openFileDialog: () => Promise<string[] | null>;
			readFileAsDataUrl: (filePath: string) => Promise<string | null>;
		};
	}

	interface HTMLMediaElement {
		captureStream(frameRate?: number): MediaStream;
	}
}
