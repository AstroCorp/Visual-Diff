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
const showFrames = ref(false);

const formattedCurrentTime = computed(() => formatTime(props.currentTime));
const currentFrame = computed(() => Math.floor(props.currentTime * props.frameRate));
const totalFrames = computed(() => Math.floor(props.duration * props.frameRate));
const formattedDuration = computed(() => formatTime(props.duration));
const progressPercentage = computed(() => {
	if (props.duration === 0) return 0;

	return (props.currentTime / props.duration) * 100;
});

const formatTime = (seconds: number): string => {
	const hours = Math.floor(seconds / 3600);
	const mins = Math.floor((seconds % 3600) / 60);
	const secs = Math.floor(seconds % 60);

	if (hours > 0) {
		return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	}

	return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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

const toggleTimeDisplay = () => {
	showFrames.value = !showFrames.value;
};
</script>

<template>
	<div class="bg-black/60 backdrop-blur-md rounded-full shadow-2xl w-full">
		<div class="flex items-center gap-1.5 px-3 py-1.5 text-white">
			<!-- Frame anterior -->
			<button
				@click="emit('prev-frame')"
				class="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-white/20 cursor-pointer"
				title="Previous frame"
				v-html="PlayerSkipBackIcon"
			/>

			<!-- Play/Pause Button -->
			<button
				@click="handlePlayPause"
				class="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-white/20 cursor-pointer"
				:title="isPlaying ? 'Pause' : 'Play'"
				v-html="isPlaying ? PlayerPauseIcon : PlayerPlayIcon"
			/>

			<!-- Frame siguiente -->
			<button
				@click="emit('next-frame')"
				class="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-white/20 cursor-pointer"
				title="Next frame"
				v-html="PlayerSkipForwardIcon"
			/>

			<div 
				@click="toggleTimeDisplay"
				class="flex flex-row justify-center gap-1.5 text-xs whitespace-nowrap bg-white/10 px-2.5 py-1.5 rounded-full cursor-pointer hover:bg-white/15 transition-colors"
				:class="{
					'w-32': totalFrames.toString().length <= 3,
					'w-36': totalFrames.toString().length === 4,
					'w-40': totalFrames.toString().length === 5,
					'w-44': totalFrames.toString().length === 6,
					'w-48': totalFrames.toString().length >= 7
				}"
				:title="showFrames ? 'Show time' : 'Show frames'"
			>
				<div v-if="!showFrames">
					{{ formattedCurrentTime }} / {{ formattedDuration }}
				</div>
				<div v-else>
					Frame {{ currentFrame }} / {{ totalFrames }}
				</div>
			</div>

			<!-- Timeline Slider -->
			<div
				class="flex-1 relative h-1 bg-white/20 rounded-full overflow-visible min-w-50 mx-1.5"
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
