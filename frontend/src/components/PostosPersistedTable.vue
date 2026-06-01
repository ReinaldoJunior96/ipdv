<script setup>
const props = defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, required: true },
  isLoading: { type: Boolean, default: false },
  isClearing: { type: Boolean, default: false },
  errorMessage: { type: String, default: '' },
  summary: { type: String, required: true },
})

const emit = defineEmits(['refresh', 'export', 'clear'])
</script>

<template>
  <v-card class="table-card mt-5" rounded="xl" elevation="0">
    <div class="table-header persisted-header">
      <div>
        <h2 class="section-title">Postos cadastrados no banco</h2>
        <p class="section-subtitle">
          Lista simples dos registros persistidos no PostgreSQL.
        </p>
      </div>

      <div class="persisted-actions">
        <v-chip color="secondary" text-color="primary" variant="flat">
          {{ summary }}
        </v-chip>
        <v-btn
          color="error"
          variant="tonal"
          rounded="pill"
          :loading="isClearing"
          @click="emit('clear')"
        >
          Limpar banco
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          rounded="pill"
          @click="emit('export')"
        >
          Exportar dados
        </v-btn>
        <v-btn
          color="primary"
          variant="outlined"
          rounded="pill"
          :loading="isLoading"
          @click="emit('refresh')"
        >
          Atualizar lista
        </v-btn>
      </div>
    </div>

    <v-alert
      v-if="errorMessage"
      class="mb-4"
      :type="rows.length ? 'error' : 'success'"
      variant="tonal"
      density="comfortable"
      rounded="lg"
    >
      {{ errorMessage }}
    </v-alert>

    <v-progress-linear
      v-else-if="isLoading"
      color="primary"
      indeterminate
      rounded
      class="mb-4"
    />

    <v-sheet
      v-if="rows.length"
      class="table-wrapper"
      rounded="lg"
      border
    >
      <v-table density="comfortable" fixed-header height="420">
        <thead>
          <tr>
            <th v-for="column in columns" :key="`persisted-${column.key}`">
              {{ column.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="`persisted-${row.id}`">
            <td v-for="column in columns" :key="`persisted-${row.id}-${column.key}`">
              {{ row[column.key] || '-' }}
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-sheet>

    <v-sheet
      v-else-if="!isLoading"
      class="empty-state"
      color="transparent"
      rounded="lg"
    >
      <v-icon icon="mdi-database-outline" size="34" color="primary" />
      <div class="empty-title">Nenhum posto cadastrado ainda</div>
      <div class="empty-text">
        Importe um CSV para persistir os dados e visualizar os postos nesta lista.
      </div>
    </v-sheet>
  </v-card>
</template>
