<script setup lang="ts">
import { computed } from 'vue';
import ZoomInIcon from '../icons/zoom-in.svg?raw';
import ZoomOutIcon from '../icons/zoom-out.svg?raw';
import RefreshIcon from '../icons/refresh.svg?raw';

interface Props {
	zoom: number;
}

interface Emits {
	(e: 'zoom-in'): void;
	(e: 'zoom-out'): void;
	(e: 'reset'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const zoomPercentage = computed(() => Math.round(props.zoom * 100));

const handleZoomIn = () => emit('zoom-in');
const handleZoomOut = () => emit('zoom-out');
const handleReset = () => emit('reset');
</script>

<template>
	<div
		class="fixed bottom-5 right-5 bg-black/60 backdrop-blur-md rounded-full shadow-2xl"
	>
		<div class="flex items-center gap-1.5 p-1.5 text-white">
			<!-- Zoom In -->
			<button
				@click="handleZoomIn"
				class="w-10 h-10 flex items-center justify-center rounded-full transition-colors hover:bg-white/20 cursor-pointer"
				title="Aumentar zoom"
				v-html="ZoomInIcon"
			/>

			<!-- Zoom Display -->
			<div class="w-10 text-center text-sm font-semibold select-none">
				{{ zoomPercentage }}%
			</div>

			<!-- Zoom Out -->
			<button
				@click="handleZoomOut"
				class="w-10 h-10 flex items-center justify-center rounded-full transition-colors hover:bg-white/20 cursor-pointer"
				title="Reducir zoom"
				v-html="ZoomOutIcon"
			/>

			<!-- Divider -->
			<div class="w-0.5 h-5 bg-white/20"></div>

			<!-- Reset -->
			<button
				@click="handleReset"
				class="w-10 h-10 flex items-center justify-center rounded-full transition-colors hover:bg-white/20 cursor-pointer"
				title="Resetear vista"
				v-html="RefreshIcon"
			/>
		</div>
	</div>
</template>
