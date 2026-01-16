<script setup lang="ts">
import UploadIcon from '../icons/upload.svg?raw';

interface Emits {
	(e: 'select-files'): void;
}

const emit = defineEmits<Emits>();

const handleSelectFiles = () => emit('select-files');
</script>

<template>
	<div class="bg-black/60 backdrop-blur-md rounded-full shadow-2xl">
		<div class="flex items-center gap-1.5 p-1.5 text-white">
			<!-- Select files -->
			<button
				@click="handleSelectFiles"
				class="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-white/20 cursor-pointer"
				title="Seleccionar otros archivos"
				v-html="UploadIcon"
			/>
		</div>
	</div>
</template>
