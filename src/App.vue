<script setup lang="ts">
import ImageComparer from './components/ImageComparer.vue';

const imageLeft = 'https://picsum.photos/800/600?random=1';
const imageRight = 'https://picsum.photos/800/600?random=2';
</script>

<template>
	<div class="w-screen h-screen bg-gray-900">
		<ImageComparer :image-left="imageLeft" :image-right="imageRight" />
	</div>
</template>
