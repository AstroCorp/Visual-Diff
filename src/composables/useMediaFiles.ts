import type { MediaType, MediaDimensions, VideoInfo } from '../types/media';

// Extensiones de archivo soportadas
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'wmv', 'm4v', 'mpeg', 'mpg', '3gp', 'ogv'];

export function useMediaFiles() {
	/**
	 * Determina el tipo de archivo basándose en su extensión
	 * @param filePath - Ruta del archivo a analizar
	 * @returns 'image', 'video' o 'unknown' según la extensión
	 */
	const getFileType = (filePath: string): MediaType => {
		const ext = filePath.toLowerCase().split('.').pop() || '';
		
		if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
		if (VIDEO_EXTENSIONS.includes(ext)) return 'video';
		
		return 'unknown';
	};

	/**
	 * Determina si un archivo es imagen o video basándose en su extensión
	 * @param filePath - Ruta del archivo a analizar
	 * @returns true si es imagen o video, false en caso contrario
	 */
	const isMediaFile = (filePath: string): boolean => {
		return getFileType(filePath) !== 'unknown';
	};

	/**
	 * Obtiene las dimensiones (ancho y alto) de una imagen o video
	 * @param dataUrl - URL del archivo (file:// o data URL)
	 * @param type - Tipo de medio ('image' o 'video')
	 * @returns Promise con las dimensiones {width, height}
	 */
	const getMediaDimensions = (dataUrl: string, type: MediaType): Promise<MediaDimensions> => {
		return new Promise((resolve, reject) => {
			if (type === 'image') {
				// Crear elemento Image temporal para obtener dimensiones
				const img = new Image();
				
				const cleanup = () => {
					img.onload = null;
					img.onerror = null;
					img.src = '';
				};
				
				img.onload = () => {
					const result = { width: img.naturalWidth, height: img.naturalHeight };
					cleanup();
					resolve(result);
				};
				
				img.onerror = (error) => {
					cleanup();
					reject(error);
				};
				
				img.src = dataUrl;
			} else if (type === 'video') {
				// Crear elemento video temporal para obtener dimensiones
				const video = document.createElement('video');
				video.preload = 'metadata';
				
				const cleanup = () => {
					video.onloadedmetadata = null;
					video.onerror = null;
					video.src = '';
					video.load();
				};
				
				video.onloadedmetadata = () => {
					const result = { width: video.videoWidth, height: video.videoHeight };
					cleanup();
					resolve(result);
				};
				
				video.onerror = (error) => {
					cleanup();
					reject(error);
				};
				
				video.src = dataUrl;
			} else {
				reject(new Error('Invalid media type'));
			}
		});
	};

	/**
	 * Obtiene información detallada de un video
	 * @param dataUrl - URL del archivo de video
	 * @returns Promise con la información del video {width, height, duration, frameRate, totalFrames}
	 */
	const getVideoInfo = (dataUrl: string): Promise<VideoInfo> => {
		return new Promise((resolve, reject) => {
			const video = document.createElement('video');
			video.preload = 'metadata';
			let stream: MediaStream | null = null;
			
			const cleanup = () => {
				// Detener y limpiar el stream si existe
				if (stream) {
					stream.getTracks().forEach(track => track.stop());
					stream = null;
				}
				
				// Limpiar event listeners y recursos del video
				video.onloadedmetadata = null;
				video.onerror = null;
				video.src = '';
				video.load();
			};
			
			video.onloadedmetadata = async () => {
				const width = video.videoWidth;
				const height = video.videoHeight;
				const duration = video.duration;
				
				// Intentar detectar el framerate real del video
				let frameRate = 30;

				try {
					if (video.captureStream) {
						stream = video.captureStream();
						const tracks = stream.getVideoTracks();
						
						if (tracks.length > 0) {
							const settings = tracks[0].getSettings();

							if (settings.frameRate) {
								frameRate = settings.frameRate;
							}
						}
					}
				} catch (e) {
					// Si falla, usar el valor por defecto
					frameRate = 30;
				}
				
				const totalFrames = Math.floor(duration * frameRate);
				const result = { width, height, duration, frameRate, totalFrames };
				
				cleanup();
				resolve(result);
			};
			
			video.onerror = (error) => {
				cleanup();
				reject(error);
			};
			
			video.src = dataUrl;
		});
	};

	/**
	 * Formatea la duración en segundos a formato mm:ss
	 * @param seconds - Duración en segundos
	 * @returns String formateado como mm:ss
	 */
	const formatDuration = (seconds: number): string => {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);

		return `${mins}:${secs.toString().padStart(2, '0')}`;
	};

	/**
	 * Valida que ambos archivos de imagen tengan el mismo aspect ratio
	 * @param leftUrl - URL del archivo izquierdo
	 * @param rightUrl - URL del archivo derecho
	 * @throws Error si los aspect ratios no coinciden
	 */
	const validateImageFiles = async (leftUrl: string, rightUrl: string): Promise<void> => {
		const [leftDims, rightDims] = await Promise.all([
			getMediaDimensions(leftUrl, 'image'),
			getMediaDimensions(rightUrl, 'image')
		]);

		// Verificar aspect ratio (ancho/alto)
		if (leftDims.width * rightDims.height !== rightDims.width * leftDims.height) {
			throw new Error(`Files have different aspect ratios (${leftDims.width}x${leftDims.height} vs ${rightDims.width}x${rightDims.height})`);
		}
	};

	/**
	 * Valida que ambos videos tengan el mismo aspect ratio, duración y número de frames
	 * @param leftUrl - URL del video izquierdo
	 * @param rightUrl - URL del video derecho
	 * @throws Error si alguna validación falla
	 */
	const validateVideoFiles = async (leftUrl: string, rightUrl: string): Promise<void> => {
		const [leftInfo, rightInfo] = await Promise.all([
			getVideoInfo(leftUrl),
			getVideoInfo(rightUrl)
		]);

		// Verificar aspect ratio
		if (leftInfo.width * rightInfo.height !== rightInfo.width * leftInfo.height) {
			throw new Error(`Videos have different aspect ratios (${leftInfo.width}x${leftInfo.height} vs ${rightInfo.width}x${rightInfo.height})`);
		}

		// Verificar duración del video (tolerancia de 0.1 segundos)
		const durationDiff = Math.abs(leftInfo.duration - rightInfo.duration);

		if (durationDiff > 0) {
			const leftMs = Math.round(leftInfo.duration * 1000);
			const rightMs = Math.round(rightInfo.duration * 1000);

			throw new Error(`Videos have different durations: ${formatDuration(leftInfo.duration)} (${leftMs} ms) vs ${formatDuration(rightInfo.duration)} (${rightMs} ms)`);
		}

		// Verificar número de frames
		const frameDiff = Math.abs(leftInfo.totalFrames - rightInfo.totalFrames);

		if (frameDiff > 0) {
			throw new Error(`Videos have different number of frames (${leftInfo.totalFrames} vs ${rightInfo.totalFrames})`);
		}
	};

	return {
		getFileType,
		isMediaFile,
		getMediaDimensions,
		getVideoInfo,
		formatDuration,
		validateImageFiles,
		validateVideoFiles,
		IMAGE_EXTENSIONS,
		VIDEO_EXTENSIONS
	};
}
