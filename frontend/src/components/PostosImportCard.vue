<script setup>
const props = defineProps({
  fileLabel: { type: String, required: true },
  isParsing: { type: Boolean, default: false },
  isSubmitting: { type: Boolean, default: false },
  validationError: { type: String, default: '' },
  submitError: { type: String, default: '' },
  importResponse: { type: Object, default: null },
  selectedFile: { type: Object, default: null },
  invalidRowsCount: { type: Number, default: 0 },
  validRowsCount: { type: Number, default: 0 },
  importedRowsCount: { type: Number, default: 0 },
  canSubmit: { type: Boolean, default: false },
  isDragging: { type: Boolean, default: false },
})

const emit = defineEmits(['open-file-picker', 'submit', 'drag-state', 'drop-file'])
</script>

<template>
  <v-card class="home-card" rounded="xl" elevation="0">
    <div class="eyebrow">Importacao CSV</div>
    <div class="hero-header">
      <div>
        <h1 class="home-title">Importar e visualizar postos</h1>
        <p class="home-subtitle">
          Envie um arquivo <strong>.csv</strong>, valide os dados na interface e
          confira os registros antes do envio real ao backend.
        </p>
      </div>

      <v-chip color="secondary" text-color="primary" variant="flat">
        {{ importedRowsCount }} posto{{ importedRowsCount !== 1 ? 's' : '' }} carregado{{ importedRowsCount !== 1 ? 's' : '' }}
      </v-chip>
    </div>

    <div
      class="dropzone"
      :class="{ 'dropzone-active': isDragging }"
      @click="emit('open-file-picker')"
      @dragenter.prevent="emit('drag-state', true)"
      @dragover.prevent="emit('drag-state', true)"
      @dragleave.prevent="emit('drag-state', false)"
      @drop.prevent="emit('drop-file', $event)"
    >
      <v-icon icon="mdi-file-delimited-outline" size="40" color="primary" />
      <div class="dropzone-title">Arraste o arquivo CSV aqui</div>
      <div class="dropzone-text">ou clique para selecionar um arquivo</div>

      <v-chip class="mt-3" color="secondary" text-color="primary" variant="flat">
        Aceita apenas .csv
      </v-chip>
    </div>

    <div class="feedback-block">
      <v-progress-linear
        v-if="isParsing || isSubmitting"
        color="primary"
        indeterminate
        rounded
      />

      <v-alert
        v-else-if="validationError"
        type="error"
        variant="tonal"
        density="comfortable"
        rounded="lg"
      >
        {{ validationError }}
      </v-alert>

      <v-alert
        v-else-if="submitError"
        type="error"
        variant="tonal"
        density="comfortable"
        rounded="lg"
      >
        {{ submitError }}
      </v-alert>

      <v-alert
        v-else-if="importResponse"
        :type="importResponse.invalidRows > 0 ? 'warning' : 'success'"
        variant="tonal"
        density="comfortable"
        rounded="lg"
      >
        {{ importResponse.message }}
        <template v-if="typeof importResponse.importedPostos === 'number'">
          {{ ' ' }}{{ importResponse.importedPostos }} posto(s) cadastrado(s) no banco.
        </template>
      </v-alert>

      <v-alert
        v-else-if="selectedFile && invalidRowsCount"
        type="warning"
        variant="tonal"
        density="comfortable"
        rounded="lg"
      >
        Arquivo carregado com pendencias: {{ invalidRowsCount }} linha(s) com erro e
        {{ validRowsCount }} valida(s).
      </v-alert>

      <v-alert
        v-else-if="selectedFile"
        type="success"
        variant="tonal"
        density="comfortable"
        rounded="lg"
      >
        Arquivo carregado: {{ fileLabel }}
      </v-alert>

      <v-sheet
        v-else
        class="file-placeholder"
        color="transparent"
        rounded="lg"
      >
        {{ fileLabel }}
      </v-sheet>
    </div>

    <div v-if="importedRowsCount" class="validation-summary">
      <v-chip color="success" variant="tonal">
        {{ validRowsCount }} linha(s) validas
      </v-chip>
      <v-chip color="warning" variant="tonal">
        {{ invalidRowsCount }} linha(s) com erro
      </v-chip>
    </div>

    <div class="actions">
      <v-btn color="primary" size="large" rounded="pill" @click="emit('open-file-picker')">
        Selecionar arquivo
      </v-btn>
      <v-btn
        color="primary"
        variant="flat"
        size="large"
        rounded="pill"
        :loading="isSubmitting"
        :disabled="!canSubmit"
        @click="emit('submit')"
      >
        Cadastrar no banco
      </v-btn>
    </div>
  </v-card>
</template>
