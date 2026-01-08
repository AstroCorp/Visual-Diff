<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import SliderIcon from '../icons/slider.svg?raw';
import ZoomControls from './ZoomControls.vue';

interface Props {
	imageLeft: string;
	imageRight: string;
}

const props = defineProps<Props>();

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;
const ZOOM_STEP = 0.1;

const sliderPosition = ref(50);
const zoom = ref(1);
const isDragging = ref(false);
const containerRef = ref<HTMLDivElement | null>(null);
const panOffset = ref({ x: 0, y: 0 });
const isPanning = ref(false);
const panStart = ref({ x: 0, y: 0 });
const imageVisible = ref(true);

const sliderStyle = computed(() => ({
	left: `${sliderPosition.value}%`,
}));

const clipStyle = computed(() => ({
	clipPath: `inset(0 ${100 - sliderPosition.value}% 0 0)`,
}));

const transformStyle = computed(() => ({
	transform: `scale(${zoom.value}) translate(${panOffset.value.x}px, ${panOffset.value.y}px)`,
}));

const handleZoomIn = () => {
	zoom.value = Math.min(zoom.value + ZOOM_STEP, MAX_ZOOM);
};

const handleZoomOut = () => {
	zoom.value = Math.max(zoom.value - ZOOM_STEP, MIN_ZOOM);
	if (zoom.value === 1) {
		panOffset.value = { x: 0, y: 0 };
	}
};

const handleReset = () => {
	zoom.value = 1;
	panOffset.value = { x: 0, y: 0 };
};

const handleToggleImage = () => {
	imageVisible.value = !imageVisible.value;
};

const startDragging = (event: MouseEvent) => {
	isDragging.value = true;
	updateSliderPosition(event);
};

const updateSliderPosition = (event: MouseEvent) => {
	if (!containerRef.value) return;

	const rect = containerRef.value.getBoundingClientRect();
	const x = event.clientX - rect.left;
	const percentage = (x / rect.width) * 100;

	sliderPosition.value = Math.max(0, Math.min(100, percentage));
};

const handleMouseMove = (event: MouseEvent) => {
	if (isDragging.value) {
		updateSliderPosition(event);
	} else if (isPanning.value && zoom.value > 1) {
		const dx = event.clientX - panStart.value.x;
		const dy = event.clientY - panStart.value.y;

		panOffset.value = {
			x: panOffset.value.x + dx / zoom.value,
			y: panOffset.value.y + dy / zoom.value,
		};
		panStart.value = { x: event.clientX, y: event.clientY };
	}
};

const handleMouseUp = () => {
	isDragging.value = false;
	isPanning.value = false;
};

const startPanning = (event: MouseEvent) => {
	if (zoom.value > 1 && !isDragging.value) {
		event.preventDefault();

		isPanning.value = true;
		panStart.value = { x: event.clientX, y: event.clientY };
	}
};

const handleWheel = (event: WheelEvent) => {
	event.preventDefault();

	const delta = -event.deltaY / 1000;
	const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom.value + delta));

	zoom.value = newZoom;

	if (newZoom === 1) {
		panOffset.value = { x: 0, y: 0 };
	}
};

onMounted(() => {
	document.addEventListener('mousemove', handleMouseMove);
	document.addEventListener('mouseup', handleMouseUp);
});

onUnmounted(() => {
	document.removeEventListener('mousemove', handleMouseMove);
	document.removeEventListener('mouseup', handleMouseUp);
});
</script>

<template>
	<div class="w-full h-full flex items-center justify-center overflow-hidden">
		<div
			ref="containerRef"
			class="relative w-full h-full select-none overflow-hidden"
			:class="{
				'cursor-grabbing': isPanning,
				'cursor-grab': zoom > 1 && !isPanning,
			}"
			@mousedown="startPanning"
			@wheel="handleWheel"
		>
			<!-- Imagen de fondo (izquierda) -->
			<div
				class="absolute inset-0 flex items-center justify-center min-w-full min-h-full"
			>
				<img
					:src="imageLeft"
					alt="Imagen izquierda"
					class="object-contain pointer-events-none"
					:class="
						zoom > 1 ? 'w-auto h-auto' : 'max-w-full max-h-full'
					"
					:style="transformStyle"
					draggable="false"
				/>
			</div>

			<!-- Imagen superpuesta (derecha) con clip -->
			<div
				v-if="imageVisible"
				class="absolute inset-0 flex items-center justify-center min-w-full min-h-full"
				:style="clipStyle"
			>
				<img
					:src="imageRight"
					alt="Imagen derecha"
					class="object-contain pointer-events-none"
					:class="
						zoom > 1 ? 'w-auto h-auto' : 'max-w-full max-h-full'
					"
					:style="transformStyle"
					draggable="false"
				/>
			</div>

			<!-- Línea del slider -->
			<div
				v-if="imageVisible"
				class="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg cursor-ew-resize z-10"
				:style="sliderStyle"
				@mousedown="startDragging"
			>
				<!-- Handle del slider con icono -->
				<div
					class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 cursor-ew-resize"
					v-html="SliderIcon"
				/>
			</div>
		</div>

		<!-- Controles de zoom -->
		<ZoomControls
			:zoom="zoom"
			:image-visible="imageVisible"
			@zoom-in="handleZoomIn"
			@zoom-out="handleZoomOut"
			@reset="handleReset"
			@toggle-image="handleToggleImage"
		/>
	</div>
</template>
