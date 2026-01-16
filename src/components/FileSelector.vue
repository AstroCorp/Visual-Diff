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
		errorMessage.value = 'Por favor, selecciona exactamente 2 archivos';
		return;
	}
	
	const [leftPath, rightPath] = filePaths;
	const leftType = getFileType(leftPath);
	const rightType = getFileType(rightPath);
	
	// Validar que ambos sean del mismo tipo y reconocidos
	if (leftType !== rightType || leftType === 'unknown' || rightType === 'unknown') {
		errorMessage.value = 'Ambos archivos deben ser del mismo tipo (imágenes o videos)';
		return;
	}
	
	// Obtener las URLs file:// de los archivos
	const [leftDataUrl, rightDataUrl] = await Promise.all([
		window.electronAPI.getFileUrl(leftPath),
		window.electronAPI.getFileUrl(rightPath)
	]);
	
	if (!leftDataUrl || !rightDataUrl) {
		errorMessage.value = 'Error al cargar los archivos';
		return;
	}

	// Verificar que tengan el mismo aspect ratio
	try {
		const [leftDims, rightDims] = await Promise.all([
			getMediaDimensions(leftDataUrl, leftType),
			getMediaDimensions(rightDataUrl, rightType)
		]);

		// Verificar aspect ratio (ancho/alto)
		if (leftDims.width * rightDims.height !== rightDims.width * leftDims.height) {
			errorMessage.value = `Los archivos tienen aspect ratios diferentes (${leftDims.width}x${leftDims.height} vs ${rightDims.width}x${rightDims.height})`;
			return;
		}

		// Extraer nombres de archivo de las rutas
		const leftName = leftPath.split(/[\\/]/).pop() || '';
		const rightName = rightPath.split(/[\\/]/).pop() || '';

		emit('filesSelected', leftDataUrl, rightDataUrl, leftName, rightName);
	} catch (error) {
		errorMessage.value = 'Error al verificar las dimensiones de los archivos';
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
				Seleccionar 2 archivos para comparar
			</button>
			<p v-if="errorMessage" class="text-red-400 text-sm mt-4">
				{{ errorMessage }}
			</p>
			<p class="text-gray-400 text-sm mt-4">
				Selecciona 2 imágenes o 2 vídeos
			</p>
		</div>
	</div>
</template>
