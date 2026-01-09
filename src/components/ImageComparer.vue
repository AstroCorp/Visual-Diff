<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import SliderIcon from '../icons/slider.svg?raw';
import Options from './Options.vue';
import FileMenu from './FileMenu.vue';
import VideoControls from './VideoControls.vue';

interface Props {
	imageLeft: string;
	imageRight: string;
}

interface Emits {
	(e: 'select-files'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const isVideo = computed(() => {
	return props.imageLeft.startsWith('data:video/');
});

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
const videoLeftRef = ref<HTMLVideoElement | null>(null);
const videoRightRef = ref<HTMLVideoElement | null>(null);
const videoCurrentTime = ref(0);
const videoDuration = ref(0);
const videoIsPlaying = ref(false);

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
	} else if (isPanning.value) {
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
	if (!isDragging.value) {
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
};

const handleSelectFiles = () => emit('select-files');

const handleVideoPlay = () => {
	if (videoLeftRef.value) videoLeftRef.value.play();
	if (videoRightRef.value) videoRightRef.value.play();

	videoIsPlaying.value = true;
};

const handleVideoPause = () => {
	if (videoLeftRef.value) videoLeftRef.value.pause();
	if (videoRightRef.value) videoRightRef.value.pause();

	videoIsPlaying.value = false;
};

const handleVideoSeek = (time: number) => {
	if (videoLeftRef.value) videoLeftRef.value.currentTime = time;
	if (videoRightRef.value) videoRightRef.value.currentTime = time;

	videoCurrentTime.value = time;
};

const updateVideoTime = () => {
	if (videoLeftRef.value) {
		videoCurrentTime.value = videoLeftRef.value.currentTime;
	}
};

const updateVideoDuration = () => {
	if (videoLeftRef.value) {
		videoDuration.value = videoLeftRef.value.duration;
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
				'cursor-grab': !isPanning,
			}"
			@mousedown="startPanning"
			@wheel="handleWheel"
		>
			<!-- Imagen de fondo (izquierda) -->
			<div
				class="absolute inset-0 flex items-center justify-center min-w-full min-h-full"
			>
				<video
					v-if="isVideo"
					ref="videoLeftRef"
					:src="imageLeft"
					class="object-contain pointer-events-none w-full h-full"
					:style="transformStyle"
					muted
					@timeupdate="updateVideoTime"
					@loadedmetadata="updateVideoDuration"
				/>
				<img
					v-else
					:src="imageLeft"
					alt="Imagen izquierda"
					class="object-contain pointer-events-none w-full h-full"
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
				<video
					v-if="isVideo"
					ref="videoRightRef"
					:src="imageRight"
					class="object-contain pointer-events-none w-full h-full"
					:style="transformStyle"
					muted
				/>
				<img
					v-else
					:src="imageRight"
					alt="Imagen derecha"
					class="object-contain pointer-events-none w-full h-full"
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

		<!-- Menús -->
		<div
			class="fixed bottom-5 right-5 md:left-5 flex flex-col-reverse md:flex-row items-end md:items-center gap-2 z-20"
		>
			<!-- Controles de video -->
			<div
				v-if="isVideo"
				class="md:flex-1"
			>
				<VideoControls
					:current-time="videoCurrentTime"
					:duration="videoDuration"
					:is-playing="videoIsPlaying"
					@play="handleVideoPlay"
					@pause="handleVideoPause"
					@seek="handleVideoSeek"
				/>
			</div>

			<!-- Opciones -->
			<Options
				:zoom="zoom"
				:image-visible="imageVisible"
				@zoom-in="handleZoomIn"
				@zoom-out="handleZoomOut"
				@reset="handleReset"
				@toggle-image="handleToggleImage"
			/>

			<!-- Menú de archivos -->
			<FileMenu @select-files="handleSelectFiles" />
		</div>
	</div>
</template>
