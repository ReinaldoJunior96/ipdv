<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, required: true },
})

const searchTerm = ref('')
const selectedUf = ref(null)
const selectedStatus = ref(null)

const ufOptions = computed(() => {
  return [...new Set(props.rows.map((row) => row.uf).filter(Boolean))].sort()
})

const statusOptions = computed(() => {
  return [...new Set(props.rows.map((row) => row.status).filter(Boolean))].sort()
})

const filteredRows = computed(() => {
  const normalizedSearch = searchTerm.value.trim().toLowerCase()

  return props.rows.filter((row) => {
    const matchesUf = !selectedUf.value || row.uf === selectedUf.value
    const matchesStatus = !selectedStatus.value || row.status === selectedStatus.value
    const matchesSearch =
      !normalizedSearch ||
      props.columns.some((column) =>
        String(row[column.key] || '')
          .toLowerCase()
          .includes(normalizedSearch),
      ) ||
      row.__errors.some((error) => error.toLowerCase().includes(normalizedSearch)) ||
      row.__warnings.some((warning) => warning.toLowerCase().includes(normalizedSearch))

    return matchesUf && matchesStatus && matchesSearch
  })
})

const filteredSummary = computed(() => {
  if (!props.rows.length) {
    return ''
  }

  return `${filteredRows.value.length} de ${props.rows.length} registro${props.rows.length > 1 ? 's' : ''}`
})
</script>

<template>
  <v-card class="table-card mt-5" rounded="xl" elevation="0">
    <div class="table-header">
      <div>
        <h2 class="section-title">Postos importados</h2>
        <p class="section-subtitle">
          Pre-visualizacao com normalizacao leve e erros simples por linha.
        </p>
      </div>
    </div>

    <div v-if="rows.length" class="filters-bar">
      <v-text-field
        v-model="searchTerm"
        label="Buscar na tabela"
        placeholder="CNPJ, nome, municipio, responsavel ou erro..."
        density="comfortable"
        variant="outlined"
        hide-details
        prepend-inner-icon="mdi-magnify"
        clearable
      />

      <v-select
        v-model="selectedUf"
        :items="ufOptions"
        label="UF"
        density="comfortable"
        variant="outlined"
        hide-details
        clearable
      />

      <v-select
        v-model="selectedStatus"
        :items="statusOptions"
        label="Status"
        density="comfortable"
        variant="outlined"
        hide-details
        clearable
      />
    </div>

    <div v-if="rows.length" class="filters-summary">
      {{ filteredSummary }}
    </div>

    <v-sheet
      v-if="filteredRows.length"
      class="table-wrapper"
      rounded="lg"
      border
    >
      <v-table density="comfortable" fixed-header height="460">
        <thead>
          <tr>
            <th>Validacao</th>
            <th>Linha</th>
            <th v-for="column in columns" :key="column.key">
              {{ column.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in filteredRows"
            :key="`${row.cnpj}-${index}-${row.__lineNumber}`"
            :class="{ 'row-invalid': !row.__isValid }"
          >
            <td class="validation-cell">
              <v-chip
                :color="row.__isValid ? 'success' : 'warning'"
                size="small"
                variant="tonal"
              >
                {{ row.__isValid ? 'Valido' : 'Com erro' }}
              </v-chip>
              <div v-if="row.__errors.length" class="row-errors">
                <div v-for="error in row.__errors" :key="error">
                  {{ error }}
                </div>
              </div>
              <div v-if="row.__warnings.length" class="row-warnings">
                <div v-for="warning in row.__warnings" :key="warning">
                  {{ warning }}
                </div>
              </div>
            </td>
            <td>{{ row.__lineNumber }}</td>
            <td v-for="column in columns" :key="column.key">
              {{ row[column.key] || '-' }}
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-sheet>

    <v-sheet
      v-else-if="rows.length"
      class="empty-state"
      color="transparent"
      rounded="lg"
    >
      <v-icon icon="mdi-filter-off-outline" size="34" color="primary" />
      <div class="empty-title">Nenhum resultado para os filtros atuais</div>
      <div class="empty-text">
        Ajuste a busca, a UF ou o status para localizar os registros desejados.
      </div>
    </v-sheet>

    <v-sheet
      v-else
      class="empty-state"
      color="transparent"
      rounded="lg"
    >
      <v-icon icon="mdi-database-eye-outline" size="34" color="primary" />
      <div class="empty-title">Nenhum dado para mostrar</div>
      <div class="empty-text">
        Envie um CSV valido para visualizar os postos importados nesta tela.
      </div>
    </v-sheet>
  </v-card>
</template>
