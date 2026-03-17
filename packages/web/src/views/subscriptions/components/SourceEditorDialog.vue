<script setup lang="ts">
import type { ValidationResult } from '../../../api';

defineProps<{
  open: boolean;
  title: string;
  formName: string;
  formContent: string;
  validation: ValidationResult | null;
  validating: boolean;
  errorMessage: string;
  saving: boolean;
}>();

const emit = defineEmits<{
  close: [];
  save: [];
  'update:formName': [value: string];
  'update:formContent': [value: string];
}>();
</script>

<template>
  <div v-if="open" class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-card editor-card">
      <div class="section-head">
        <div>
          <h2>{{ title }}</h2>
          <p class="section-subtitle">支持混合输入订阅链接与单条节点 URI。</p>
        </div>
      </div>

      <div class="source-editor-layout">
        <div class="validation-box validation-panel">
          <template v-if="validating">正在校验输入...</template>
          <template v-else-if="validation">
            <strong>校验结果</strong>
            <p>订阅链接 {{ validation.urlCount }} 个，原始节点 {{ validation.totalCount }} 条，去重后 {{ validation.nodeCount }} 条。</p>
            <p v-if="validation.duplicateCount > 0">发现重复节点 {{ validation.duplicateCount }} 条。</p>
            <ul v-if="validation.warnings.length">
              <li v-for="item in validation.warnings.slice(0, 5)" :key="`${item.code}-${item.message}`">
                {{ item.message }}
              </li>
            </ul>
          </template>
          <template v-else>输入后会自动执行校验。</template>
        </div>

        <div class="editor-form">
          <label class="field">
            <span>备注名称</span>
            <input :value="formName" placeholder="例如：机场主订阅" @input="emit('update:formName', ($event.target as HTMLInputElement).value)" />
          </label>

          <label class="field">
            <span>订阅内容</span>
            <textarea
              :value="formContent"
              rows="12"
              placeholder="粘贴订阅链接、节点 URI 或混合输入"
              @input="emit('update:formContent', ($event.target as HTMLTextAreaElement).value)"
            ></textarea>
          </label>
        </div>
      </div>

      <p v-if="errorMessage" class="error-banner">{{ errorMessage }}</p>

      <div class="dialog-actions">
        <button class="ghost" @click="emit('close')">取消</button>
        <button class="primary" :disabled="saving" @click="emit('save')">
          {{ saving ? '保存中...' : '保存' }}
        </button>
      </div>
    </div>
  </div>
</template>
