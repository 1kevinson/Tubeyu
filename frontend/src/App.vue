<script setup>
import { onMounted, ref } from 'vue'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const status = ref('loading...')

onMounted(async () => {
  try {
    const res = await fetch(`${apiUrl}/api/health`)
    const data = await res.json()
    status.value = data.status
  } catch (err) {
    status.value = `unreachable (${err.message})`
  }
})
</script>

<template>
  <main>
    <h1>Tubeyu</h1>
    <p>Backend status: {{ status }}</p>
  </main>
</template>
