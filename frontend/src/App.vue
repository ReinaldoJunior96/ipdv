<script setup>
import { computed, ref } from 'vue'

const fileInput = ref(null)
const isDragging = ref(false)
const selectedFile = ref(null)
const validationError = ref('')

const selectedFileLabel = computed(() => {
  if (!selectedFile.value) {
    return 'Nenhum arquivo selecionado'
  }

  const sizeInKb = (selectedFile.value.size / 1024).toFixed(1)
  return `${selectedFile.value.name} • ${sizeInKb} KB`
})

function isCsvFile(file) {
  if (!file) {
    return false
  }

  const lowerName = file.name.toLowerCase()
  return lowerName.endsWith('.csv') || file.type === 'text/csv'
}

function setFile(file) {
  if (!isCsvFile(file)) {
    selectedFile.value = null
    validationError.value = 'Selecione um arquivo com extensão .csv.'
    return
  }

  selectedFile.value = file
  validationError.value = ''
}

function openFilePicker() {
  fileInput.value?.click()
}

function handleFileSelection(event) {
  const [file] = event.target.files || []
  setFile(file)
}

function handleDrop(event) {
  isDragging.value = false
  const [file] = event.dataTransfer?.files || []
  setFile(file)
}
</script>

<template>
  <v-app>
    <v-main>
      <div class="home-shell">
        <v-container class="fill-height py-8">
          <v-row align="center" justify="center" class="fill-height">
            <v-col cols="12" md="8" lg="6">
              <v-card class="home-card" rounded="xl" elevation="0">
                <div class="eyebrow">Importacao CSV</div>
                <h1 class="home-title">Envie seu arquivo com arrastar e soltar</h1>
                <p class="home-subtitle">
                  Esta tela aceita apenas arquivos <strong>.csv</strong>. O envio para o
                  backend pode ser conectado depois.
                </p>

                <div
                  class="dropzone"
                  :class="{ 'dropzone-active': isDragging }"
                  @click="openFilePicker"
                  @dragenter.prevent="isDragging = true"
                  @dragover.prevent="isDragging = true"
                  @dragleave.prevent="isDragging = false"
                  @drop.prevent="handleDrop"
                >
                  <v-icon icon="mdi-file-delimited-outline" size="48" color="primary" />
                  <div class="dropzone-title">Arraste o arquivo CSV aqui</div>
                  <div class="dropzone-text">ou clique para escolher no seu computador</div>

                  <v-chip
                    class="mt-4"
                    color="secondary"
                    text-color="primary"
                    variant="flat"
                  >
                    Aceita apenas .csv
                  </v-chip>
                </div>

                <input
                  ref="fileInput"
                  class="sr-only"
                  type="file"
                  accept=".csv,text/csv"
                  @change="handleFileSelection"
                />

                <div class="feedback-block">
                  <v-alert
                    v-if="validationError"
                    type="error"
                    variant="tonal"
                    density="comfortable"
                    rounded="lg"
                  >
                    {{ validationError }}
                  </v-alert>

                  <v-alert
                    v-else-if="selectedFile"
                    type="success"
                    variant="tonal"
                    density="comfortable"
                    rounded="lg"
                  >
                    Arquivo pronto para envio: {{ selectedFileLabel }}
                  </v-alert>

                  <v-sheet
                    v-else
                    class="file-placeholder"
                    color="transparent"
                    rounded="lg"
                  >
                    {{ selectedFileLabel }}
                  </v-sheet>
                </div>

                <div class="actions">
                  <v-btn color="primary" size="large" rounded="pill" @click="openFilePicker">
                    Selecionar arquivo
                  </v-btn>
                </div>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </div>
    </v-main>
  </v-app>
</template>
