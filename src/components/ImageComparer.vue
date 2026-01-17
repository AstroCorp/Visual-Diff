<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import SliderIcon from '../icons/slider.svg?raw';
import Options from './Options.vue';
import FileMenu from './FileMenu.vue';
import VideoControls from './VideoControls.vue';
import Loader from './Loader.vue';

interface Props {
	imageLeft: string;
	imageRight: string;
	fileNameLeft: string;
	fileNameRight: string;
}

interface Emits {
	(e: 'select-files'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Detectar si es video por la extensión de archivo en la URL
const isVideo = computed(() => {
	const url = props.imageLeft;
	const ext = url.toLowerCase().split('.').pop()?.split(/[?#]/)[0] || '';

	return ['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'wmv', 'm4v', 'mpeg', 'mpg', '3gp', 'ogv'].includes(ext);
});

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;
const ZOOM_STEP = 0.1;

const sliderPosition = ref(50);
const zoom = ref(1);
const isDragging = ref(false);
const panOffset = ref({ x: 0, y: 0 });
const isPanning = ref(false);
const panStart = ref({ x: 0, y: 0 });
const isVisible = ref(true);
const containerRef = ref<HTMLDivElement | null>(null);
const videoLeftRef = ref<HTMLMediaElement | null>(null);
const videoRightRef = ref<HTMLMediaElement | null>(null);
const videoCurrentTime = ref(0);
const videoDuration = ref(0);
const videoIsPlaying = ref(false);
const videoFrameRate = ref(30);
const rightItemLoaded = ref(false);
const leftItemLoaded = ref(false);

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

const handleToggle = () => {
	isVisible.value = !isVisible.value;
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

const handleLoadLeft = () => {
	leftItemLoaded.value = true;
};

const handleLoadRight = () => {
	rightItemLoaded.value = true;
};

const handleVideoEnded = () => {
	videoIsPlaying.value = false;
};

const handleNextFrame = () => {
	handleVideoPause();

	const frameTime = 1 / videoFrameRate.value;
	const newTime = Math.min(videoCurrentTime.value + frameTime, videoDuration.value);

	handleVideoSeek(newTime);
};

const handlePrevFrame = () => {
	handleVideoPause();

	const frameTime = 1 / videoFrameRate.value;
	const newTime = Math.max(videoCurrentTime.value - frameTime, 0);

	handleVideoSeek(newTime);
};

const updateVideoTime = () => {
	if (videoLeftRef.value) {
		videoCurrentTime.value = videoLeftRef.value.currentTime;
	}
};

const updateVideoDuration = () => {
	if (videoLeftRef.value) {
		videoDuration.value = videoLeftRef.value.duration;

		// Intentar detectar el framerate del video
		try {
			if (videoLeftRef.value && videoLeftRef.value.captureStream) {
				const stream = videoLeftRef.value.captureStream();
				const tracks = stream.getVideoTracks();

				if (tracks.length > 0) {
					const settings = tracks[0].getSettings();

					if (settings.frameRate) {
						videoFrameRate.value = settings.frameRate;
					}
				}
			}
		} catch (e) {
			videoFrameRate.value = 30;
		}
	}
};

// Sincronizar el estado de reproducción cuando se muestra/oculta el video derecho
watch(isVisible, async (newValue) => {
	await nextTick();

	if (isVideo.value && newValue && videoRightRef.value && videoLeftRef.value) {
		const isPaused = videoLeftRef.value.paused;

		videoLeftRef.value.pause();
		videoRightRef.value.pause();

		// Esperar a que el video derecho esté listo
		await new Promise<void>((resolve) => {
			if (videoRightRef.value!.readyState >= 2) {
				resolve();
			} else {
				const handler = () => {
					videoRightRef.value!.removeEventListener('loadeddata', handler);
					resolve();
				};
				videoRightRef.value!.addEventListener('loadeddata', handler);
			}
		});

		// Sincronizar tiempos
		videoRightRef.value.currentTime = videoLeftRef.value.currentTime;

		// Esperar a que el seek se complete
		await new Promise<void>((resolve) => {
			const handler = () => {
				videoRightRef.value!.removeEventListener('seeked', handler);
				resolve();
			};
			videoRightRef.value!.addEventListener('seeked', handler);
		});

		// Reanudar reproducción si estaba reproduciéndose
		if (!isPaused) {
			await videoLeftRef.value.play();
			await videoRightRef.value.play();
		}
	}
});

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
		<Loader v-if="!leftItemLoaded || !rightItemLoaded" />

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
			<!-- Imagen o vídeo de fondo (izquierda) -->
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
					@ended="handleVideoEnded"
					@canplaythrough="handleLoadLeft"
				/>
				<img
					v-else
					:src="imageLeft"
					alt="Imagen izquierda"
					class="object-contain pointer-events-none w-full h-full"
					:style="transformStyle"
					draggable="false"
					@load="handleLoadLeft"
				/>
			</div>

			<!-- Imagen o vídeo superpuesto (derecha) con clip -->
			<div
				v-if="isVisible"
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
					@canplaythrough="handleLoadRight"
				/>
				<img
					v-else
					:src="imageRight"
					alt="Imagen derecha"
					class="object-contain pointer-events-none w-full h-full"
					:style="transformStyle"
					draggable="false"
					@load="handleLoadRight"
				/>
			</div>

			<!-- Línea del slider -->
			<div
				v-if="isVisible"
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

			<!-- Nombres de archivo que siguen al slider -->
			<div
				v-if="isVisible"
				class="absolute top-5 pointer-events-none w-64 md:w-80 lg:w-96 z-10"
				:style="{
					left: `${sliderPosition}%`,
					transform: 'translateX(calc(-100% - 15px))',
				}"
			>
				<div class="bg-black/60 backdrop-blur-sm px-3 py-2 rounded-lg">
					<p class="text-white text-xs font-mono break-all text-center">
						{{ fileNameLeft }}
					</p>
				</div>
			</div>
			<div
				v-if="isVisible"
				class="absolute top-5 pointer-events-none w-64 md:w-80 lg:w-96 z-10"
				:style="{
					left: `${sliderPosition}%`,
					transform: 'translateX(15px)',
				}"
			>
				<div class="bg-black/60 backdrop-blur-sm px-3 py-2 rounded-lg">
					<p class="text-white text-xs font-mono break-all text-center">
						{{ fileNameRight }}
					</p>
				</div>
			</div>
		</div>

		<!-- Menús -->
		<div
			class="w-full fixed bottom-5 px-5 flex flex-col-reverse lg:flex-row items-end lg:items-center gap-2 z-20"
		>
			<!-- Controles de video -->
			<VideoControls
				v-if="isVideo"
				:current-time="videoCurrentTime"
				:duration="videoDuration"
				:is-playing="videoIsPlaying"
				:frame-rate="videoFrameRate"
				@play="handleVideoPlay"
				@pause="handleVideoPause"
				@seek="handleVideoSeek"
				@next-frame="handleNextFrame"
				@prev-frame="handlePrevFrame"
			/>

			<!-- Opciones -->
			<Options
				:zoom="zoom"
				:image-visible="isVisible"
				@zoom-in="handleZoomIn"
				@zoom-out="handleZoomOut"
				@reset="handleReset"
				@toggle-image="handleToggle"
			/>

			<!-- Menú de archivos -->
			<FileMenu @select-files="handleSelectFiles" />
		</div>
	</div>
</template>
