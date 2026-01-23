<script setup lang="ts">
import { ref } from 'vue';
import { useMediaFiles } from '../composables/useMediaFiles';

interface Emits {
	(e: 'filesDropped', filePaths: string[]): void;
}

const emit = defineEmits<Emits>();
const { isMediaFile } = useMediaFiles();

const isDragging = ref<boolean>(false);

/**
 * Maneja el evento de drag enter
 * Activa el estado de arrastre para feedback visual
 * @param e - Evento de drag del navegador
 */
const handleDragEnter = (e: DragEvent) => {
	e.preventDefault();
	e.stopPropagation();
	isDragging.value = true;
};

/**
 * Maneja el evento de drag over para permitir el drop
 * Previene el comportamiento por defecto del navegador
 * @param e - Evento de drag del navegador
 */
const handleDragOver = (e: DragEvent) => {
	e.preventDefault();
	e.stopPropagation();
};

/**
 * Maneja el evento de drag leave
 * Desactiva el estado de arrastre solo cuando el cursor sale completamente del contenedor,
 * evitando flickering al pasar sobre elementos hijos
 * @param e - Evento de drag del navegador
 */
const handleDragLeave = (e: DragEvent) => {
	e.preventDefault();
	e.stopPropagation();
	
	// Solo desactivar si realmente salimos del contenedor principal
	const target = e.currentTarget as HTMLElement;
	const relatedTarget = e.relatedTarget as HTMLElement;
	
	if (!target.contains(relatedTarget)) {
		isDragging.value = false;
	}
};

/**
 * Maneja el evento de drop de archivos
 * Procesa los archivos soltados, filtra solo archivos multimedia válidos,
 * limita a los primeros 2 archivos y emite el evento con las rutas
 * @param e - Evento de drop del navegador conteniendo los archivos
 */
const handleDrop = async (e: DragEvent) => {
	e.preventDefault();
	e.stopPropagation();
	isDragging.value = false;
	
	if (!e.dataTransfer?.files || e.dataTransfer.files.length === 0) {
		return;
	}
	
	// En Electron, usamos webUtils.getPathForFile() para obtener la ruta completa del archivo
	const files = Array.from(e.dataTransfer.files);
	const allFilePaths = files.map(file => window.electronAPI.getPathForFile(file));
	
	if (allFilePaths.length === 0) {
		return;
	}
	
	// Filtrar solo archivos de medios (imagen o video) y limitar a los primeros 2
	const mediaFiles = allFilePaths.filter(isMediaFile).slice(0, 2);
	
	if (mediaFiles.length > 0) {
		emit('filesDropped', mediaFiles);
	}
};

defineExpose({ isDragging });
</script>

<template>
	<div 
		class="flex-1 flex items-center justify-center"
		@dragenter="handleDragEnter"
		@dragover="handleDragOver"
		@dragleave="handleDragLeave"
		@drop="handleDrop"
	>
		<slot :is-dragging="isDragging"></slot>
	</div>
</template>
