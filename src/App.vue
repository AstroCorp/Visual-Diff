<script setup lang="ts">
import { ref } from 'vue';
import ImageComparer from './components/ImageComparer.vue';
import FileSelector from './components/FileSelector.vue';

const imageLeft = ref<string>('');
const imageRight = ref<string>('');

const handleFilesSelected = (left: string, right: string) => {
	imageLeft.value = left;
	imageRight.value = right;
};

const resetFiles = () => {
	imageLeft.value = '';
	imageRight.value = '';
};
</script>

<template>
	<div class="w-screen h-screen bg-gray-900 flex flex-col">
		<FileSelector v-if="!imageLeft || !imageRight" @files-selected="handleFilesSelected" />

		<div v-else class="flex-1 relative">
			<ImageComparer :image-left="imageLeft" :image-right="imageRight" @select-files="resetFiles" />
		</div>
	</div>
</template>
