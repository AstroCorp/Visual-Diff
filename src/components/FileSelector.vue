<script setup lang="ts">
import { ref } from 'vue';

interface Emits {
	(e: 'filesSelected', left: string, right: string, leftName: string, rightName: string): void;
}

const emit = defineEmits<Emits>();

const errorMessage = ref<string>('');

/**
 * Determina el tipo de archivo basándose en su extensión
 * @param filePath - Ruta del archivo a analizar
 * @returns 'image', 'video' o 'unknown' según la extensión
 */
const getFileType = (filePath: string): 'image' | 'video' | 'unknown' => {
	const ext = filePath.toLowerCase().split('.').pop() || '';
	const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
	const videoExts = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'wmv', 'm4v', 'mpeg', 'mpg', '3gp', 'ogv'];
	
	if (imageExts.includes(ext)) return 'image';
	if (videoExts.includes(ext)) return 'video';

	return 'unknown';
};

/**
 * Obtiene las dimensiones (ancho y alto) de una imagen o video
 * @param dataUrl - URL del archivo (file:// o data URL)
 * @param type - Tipo de medio ('image' o 'video')
 * @returns Promise con las dimensiones {width, height}
 */
const getMediaDimensions = (dataUrl: string, type: 'image' | 'video'): Promise<{ width: number; height: number }> => {
	return new Promise((resolve, reject) => {
		if (type === 'image') {
			// Crear elemento Image temporal para obtener dimensiones
			const img = new Image();
			img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
			img.onerror = reject;
			img.src = dataUrl;
		} else {
			// Crear elemento video temporal para obtener dimensiones
			const video = document.createElement('video');
			video.onloadedmetadata = () => resolve({ width: video.videoWidth, height: video.videoHeight });
			video.onerror = reject;
			video.src = dataUrl;
		}
	});
};

/**
 * Obtiene información detallada de un video
 * @param dataUrl - URL del archivo de video
 * @returns Promise con la información del video {width, height, duration, frameRate, totalFrames}
 */
const getVideoInfo = (dataUrl: string): Promise<{ width: number; height: number; duration: number; frameRate: number; totalFrames: number }> => {
	return new Promise((resolve, reject) => {
		const video = document.createElement('video');
		video.preload = 'metadata';
		
		video.onloadedmetadata = async () => {
			const width = video.videoWidth;
			const height = video.videoHeight;
			const duration = video.duration;
			
			// Intentar detectar el framerate real del video
			let frameRate = 30;

			try {
				if (video.captureStream) {
					const stream = video.captureStream();
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
			
			resolve({ width, height, duration, frameRate, totalFrames });
		};
		
		video.onerror = reject;
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

/**
 * Maneja la selección de archivos con validaciones:
 * - Exactamente 2 archivos
 * - Mismo tipo (ambos imágenes o ambos videos)
 * - Mismo aspect ratio (comparación exacta)
 */
const selectFiles = async () => {
	errorMessage.value = '';
	
	// Abrir diálogo de selección de archivos
	const filePaths = await window.electronAPI.openFileDialog();
	
	if (!filePaths || filePaths.length === 0) return;
	
	// Validar que sean exactamente 2 archivos
	if (filePaths.length !== 2) {
		errorMessage.value = 'Please select exactly 2 files';
		return;
	}
	
	const [leftPath, rightPath] = filePaths;
	const leftType = getFileType(leftPath);
	const rightType = getFileType(rightPath);
	
	// Validar que ambos sean del mismo tipo y reconocidos
	if (leftType !== rightType || leftType === 'unknown' || rightType === 'unknown') {
		errorMessage.value = 'Both files must be of the same type (images or videos)';
		return;
	}
	
	// Obtener las URLs file:// de los archivos
	const [leftDataUrl, rightDataUrl] = await Promise.all([
		window.electronAPI.getFileUrl(leftPath),
		window.electronAPI.getFileUrl(rightPath)
	]);
	
	if (!leftDataUrl || !rightDataUrl) {
		errorMessage.value = 'Error loading files';
		return;
	}

	// Verificar que tengan el mismo aspect ratio
	try {
		if (leftType === 'image') {
			await validateImageFiles(leftDataUrl, rightDataUrl);
		} else {
			await validateVideoFiles(leftDataUrl, rightDataUrl);
		}

		// Extraer nombres de archivo de las rutas
		const leftName = leftPath.split(/[\\/]/).pop() || '';
		const rightName = rightPath.split(/[\\/]/).pop() || '';

		emit('filesSelected', leftDataUrl, rightDataUrl, leftName, rightName);
	} catch (error) {
		errorMessage.value = error instanceof Error ? error.message : 'Error verifying files';
	}
};
</script>

<template>
	<div class="flex-1 flex items-center justify-center">
		<div class="text-center space-y-6">
			<h1 class="text-2xl font-bold text-white mb-8">Visual Diff</h1>
			<button
				@click="selectFiles"
				class="px-8 py-4 bg-white/20 hover:bg-white/40 text-white text-lg rounded-lg transition-colors cursor-pointer"
			>
				Select 2 files to compare
			</button>
			<p v-if="errorMessage" class="text-red-400 text-sm mt-4">
				{{ errorMessage }}
			</p>
			<p class="text-gray-400 text-sm mt-4">
				Select 2 images or 2 videos
			</p>
		</div>
	</div>
</template>
