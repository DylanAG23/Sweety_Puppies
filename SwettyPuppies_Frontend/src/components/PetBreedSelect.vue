<script setup lang="ts">
import { computed, ref, watch } from 'vue'

type BreedOption = {
  value: string
  label: string
  aliases?: string[]
}

const props = defineProps<{
  modelValue: string
  options: BreedOption[]
  label: string
  placeholder?: string
  helper?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
}>()

const inputId = `breed-list-${Math.random().toString(36).slice(2, 9)}`
const query = ref('')

function normalizeText(value: string | null | undefined) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function findOption(value: string | null | undefined) {
  const normalizedValue = normalizeText(value)
  if (!normalizedValue) return null

  return (
    props.options.find((option) => {
      if (normalizeText(option.value) === normalizedValue) return true
      if (normalizeText(option.label) === normalizedValue) return true
      return (option.aliases || []).some((alias) => normalizeText(alias) === normalizedValue)
    }) || null
  )
}

function syncQueryFromModel(value: string) {
  const option = findOption(value)
  query.value = option?.label || value || ''
}

watch(
  () => props.modelValue,
  (value) => {
    syncQueryFromModel(value)
  },
  { immediate: true }
)

watch(
  () => props.options,
  () => {
    const option = findOption(props.modelValue)
    if (option && option.value !== props.modelValue) {
      emit('update:modelValue', option.value)
    }
    syncQueryFromModel(props.modelValue)
  },
  { deep: true }
)

function handleInput(event: Event) {
  const nextValue = (event.target as HTMLInputElement).value
  query.value = nextValue

  if (!nextValue.trim()) {
    emit('update:modelValue', '')
    return
  }

  const option = findOption(nextValue)
  if (option) {
    emit('update:modelValue', option.value)
  }
}

function finalizeSelection() {
  const option = findOption(query.value)
  if (option) {
    query.value = option.label
    emit('update:modelValue', option.value)
    return
  }

  syncQueryFromModel(props.modelValue)
}

const helperText = computed(() => props.helper || 'Si no tiene raza definida, selecciona Criollo.')
</script>

<template>
  <label class="breed-field">
    <span>{{ label }}</span>
    <input
      :list="inputId"
      :value="query"
      :placeholder="placeholder || 'Busca y selecciona una raza'"
      :disabled="disabled"
      autocomplete="off"
      @input="handleInput"
      @blur="finalizeSelection"
      @keydown.enter.prevent="finalizeSelection"
    >
    <datalist :id="inputId">
      <option v-for="option in options" :key="option.value" :value="option.label"></option>
    </datalist>
    <small class="breed-helper">{{ helperText }}</small>
  </label>
</template>

<style scoped>
.breed-field {
  display: grid;
  gap: 8px;
}

.breed-field span {
  color: #8f176e;
  font-weight: 700;
}

.breed-field input {
  border-radius: 18px;
  border: 1px solid rgba(243, 203, 228, 0.9);
  padding: 14px 16px;
  font: inherit;
  background: rgba(255, 255, 255, 0.95);
  color: #5b4256;
}

.breed-field input:focus {
  outline: 2px solid rgba(143, 23, 110, 0.16);
  outline-offset: 2px;
}

.breed-helper {
  color: #7f6a7b;
  font-size: 0.8rem;
  line-height: 1.45;
}
</style>
