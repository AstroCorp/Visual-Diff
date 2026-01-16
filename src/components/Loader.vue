<script setup lang="ts">
import LoaderIcon from '../icons/loader.svg?raw';
</script>

<template>
	<div class="w-full h-full absolute top-0 left-0 bg-gray-900 flex items-center justify-center z-50">
		<div class="w-16 h-16 mx-auto" v-html="LoaderIcon"></div>
	</div>
</template>
