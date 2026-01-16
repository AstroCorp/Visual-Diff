<script setup lang="ts">
import { ref, computed } from 'vue';
import PlayerPlayIcon from '../icons/player-play.svg?raw';
import PlayerPauseIcon from '../icons/player-pause.svg?raw';
import PlayerSkipBackIcon from '../icons/player-skip-back.svg?raw';
import PlayerSkipForwardIcon from '../icons/player-skip-forward.svg?raw';

interface Props {
	currentTime: number;
	duration: number;
	isPlaying: boolean;
	frameRate: number;
}

interface Emits {
	(e: 'play'): void;
	(e: 'pause'): void;
	(e: 'seek', time: number): void;
	(e: 'prev-frame'): void;
	(e: 'next-frame'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const isDragging = ref(false);

const formattedCurrentTime = computed(() => formatTime(props.currentTime));
const currentFrame = computed(() => Math.floor(props.currentTime * props.frameRate));
const totalFrames = computed(() => Math.floor(props.duration * props.frameRate));
const formattedDuration = computed(() => formatTime(props.duration));
const progressPercentage = computed(() => {
	if (props.duration === 0) return 0;
	return (props.currentTime / props.duration) * 100;
});

const formatTime = (seconds: number): string => {
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);

	return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const handlePlayPause = () => {
	if (props.isPlaying) {
		emit('pause');
	} else {
		emit('play');
	}
};

const handleSliderInput = (event: Event) => {
	const target = event.target as HTMLInputElement;
	const time = parseFloat(target.value);

	emit('seek', time);
};

const handleSliderMouseDown = () => {
	isDragging.value = true;
};

const handleSliderMouseUp = () => {
	isDragging.value = false;
};
</script>

<template>
	<div class="bg-black/60 backdrop-blur-md rounded-full shadow-2xl w-full">
		<div class="flex items-center gap-3 px-4 py-2 text-white">
			<!-- Frame anterior -->
			<button
				@click="emit('prev-frame')"
				class="w-10 h-10 flex items-center justify-center rounded-full transition-colors hover:bg-white/20 cursor-pointer"
				title="Frame anterior"
				v-html="PlayerSkipBackIcon"
			/>

			<!-- Play/Pause Button -->
			<button
				@click="handlePlayPause"
				class="w-10 h-10 flex items-center justify-center rounded-full transition-colors hover:bg-white/20 cursor-pointer"
				:title="isPlaying ? 'Pausar' : 'Reproducir'"
				v-html="isPlaying ? PlayerPauseIcon : PlayerPlayIcon"
			/>

			<!-- Frame siguiente -->
			<button
				@click="emit('next-frame')"
				class="w-10 h-10 flex items-center justify-center rounded-full transition-colors hover:bg-white/20 cursor-pointer"
				title="Frame siguiente"
				v-html="PlayerSkipForwardIcon"
			/>

			<div class="flex flex-row text-xs gap-1.5 font-mono whitespace-nowrap">
				<div>
					{{ formattedCurrentTime }} / {{ formattedDuration }}
				</div>
				<div class="text-white/50">({{ currentFrame }} / {{ totalFrames }})</div>
			</div>

			<!-- Timeline Slider -->
			<div
				class="flex-1 relative h-1 bg-white/20 rounded-full overflow-visible min-w-50"
			>
				<div
					class="absolute left-0 top-0 h-full bg-white/60 rounded-full transition-all"
					:style="{ width: `${progressPercentage}%` }"
				></div>
				<!-- Indicador de posición (bolita) -->
				<div
					class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-lg transition-all pointer-events-none"
					:style="{ left: `${progressPercentage}%` }"
				></div>
				<input
					type="range"
					min="0"
					:max="duration"
					step="0.01"
					:value="currentTime"
					@input="handleSliderInput"
					@mousedown="handleSliderMouseDown"
					@mouseup="handleSliderMouseUp"
					class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
				/>
			</div>
		</div>
	</div>
</template>
