export type MediaType = 'image' | 'video' | 'unknown';

export interface MediaDimensions {
	width: number;
	height: number;
}

export interface VideoInfo extends MediaDimensions {
	duration: number;
	frameRate: number;
	totalFrames: number;
}
