<script setup lang="ts">
import { ref } from 'vue';
import IconLogo from '../icons/icon.svg?raw';
import UploadIcon from '../icons/upload.svg?raw';
import DragDropZone from './DragDropZone.vue';
import { useMediaFiles } from '../composables/useMediaFiles';

interface Emits {
	(e: 'filesSelected', left: string, right: string, leftName: string, rightName: string): void;
}

const emit = defineEmits<Emits>();
const { getFileType, validateImageFiles, validateVideoFiles } = useMediaFiles();

const errorMessage = ref<string>('');

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
	
	await processFiles(filePaths);
};

/**
 * Procesa y valida los archivos seleccionados
 * @param filePaths - Array de rutas de archivos a procesar
 */
const processFiles = async (filePaths: string[]) => {
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

/**
 * Maneja los archivos soltados desde el componente DragDropZone
 */
const handleFilesDropped = async (filePaths: string[]) => {
	errorMessage.value = '';
	await processFiles(filePaths);
};
</script>

<template>
	<DragDropZone @files-dropped="handleFilesDropped" v-slot="{ isDragging }">
		<div 
			class="flex flex-col items-center bg-white/5 backdrop-blur-sm rounded-2xl shadow-2xl p-6 w-96 text-center transition-all"
			:class="{ 'bg-white/15 scale-105': isDragging }"
		>
			<div class="w-24 h-24 mb-4" v-html="IconLogo"></div>

			<button
				@click="selectFiles"
				class="px-10 py-4 bg-white/10 hover:bg-white/20 text-white text-base rounded-full transition-colors cursor-pointer"
				title="Select files"
				v-html="UploadIcon"
			>
			</button>

			<p v-if="errorMessage" class="text-red-400 text-sm text-center mt-5">
				{{ errorMessage }}
			</p>
			
			<p class="bg-black/20 text-gray-300 text-sm mt-5 p-4 rounded-lg">
				{{ isDragging ? 'Drop' : 'Select' }} 2 images or 2 videos with same properties to compare
			</p>
		</div>
	</DragDropZone>
</template>
