<template>
  <div 
    class="content" 
    :class="[
      $style.select, 
      show ? $style.active : '',
      disabled ? $style.disabled : ''
    ]"
  >
    <div 
      ref="dom_btn" 
      :class="$style.label" 
      @click="handleToggle"
      :tabindex="disabled ? -1 : 0"
    >
      <span :class="$style.labelText">{{ displayText }}</span>
      <svg 
        :class="[$style.chevron, show ? $style.chevronRotate : '']"
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        stroke-width="2.5" 
        stroke-linecap="round" 
        stroke-linejoin="round"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>

    <ul 
      v-show="show" 
      ref="dom_list" 
      :class="[$style.list, animState ? $style.listShow : $style.listHide]"
      role="listbox"
    >
      <li
        v-for="(item, index) in list" 
        :key="index" 
        :class="[$style.listItem, isActive(item) ? $style.activeItem : '']"
        @click="handleClick(item)"
      >
        {{ getItemLabel(item) }}
      </li>
      <li v-if="list.length === 0" :class="$style.emptyState">暂无选项</li>
    </ul>
  </div>
</template>

<script>
export default {
  name: 'SelectDropdown',
  props: {
    list: { type: Array, default: () => [] },
    modelValue: { type: [String, Number, Object], default: null },
    itemName: { type: String, default: 'name' },
    itemKey: { type: String, default: 'id' },
    placeholder: { type: String, default: '请选择...' },
    disabled: { type: Boolean, default: false },
  },
  emits: ['update:modelValue', 'change'],
  data() {
    return {
      show: false,
      animState: false,
    }
  },
  computed: {
    activeIndex() {
      if (this.modelValue == null) return -1
      return this.list.findIndex(item => this.getItemValue(item) === this.getItemValue(this.modelValue))
    },
    displayText() {
      if (this.modelValue == null || this.modelValue === '') return this.placeholder
      const item = this.list[this.activeIndex]
      return item ? this.getItemLabel(item) : this.placeholder
    },
  },
  mounted() {
    document.addEventListener('click', this.handleClickOutside, true)
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleClickOutside, true)
  },
  methods: {
    getItemValue(item) {
      return typeof item === 'object' ? (item[this.itemKey] || item) : item
    },
    getItemLabel(item) {
      return typeof item === 'object' ? (item[this.itemName] || item[this.itemKey] || String(item)) : String(item)
    },
    isActive(item) {
      return this.getItemValue(item) === this.getItemValue(this.modelValue)
    },
    handleToggle() {
      if (this.disabled) return
      if (this.show) {
        this.close()
      } else {
        this.open()
      }
    },
    open() {
      this.show = true
      this.$nextTick(() => {
        requestAnimationFrame(() => {
          this.animState = true
          // 滚动到选中项
          if (this.activeIndex >= 0 && this.$refs.dom_list) {
            const item = this.$refs.dom_list.children[this.activeIndex]
            if (item) item.scrollIntoView({ block: 'nearest' })
          }
        })
      })
    },
    close() {
      this.animState = false
      setTimeout(() => {
        if (!this.animState) this.show = false
      }, 300)
    },
    handleClickOutside(e) {
      if (!this.show) return
      if (
        e.target !== this.$refs.dom_btn && 
        !this.$refs.dom_btn?.contains(e.target)
      ) {
        this.close()
      }
    },
    handleClick(item) {
      if (this.disabled) return
      this.$emit('update:modelValue', this.getItemValue(item))
      this.$emit('change', item)
      this.close()
    },
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.select {
  display: inline-block;
  position: relative;
  width: 100%;
  max-width: 320px;

  &.disabled {
    opacity: 0.4;
    pointer-events: none;
  }
}

.label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  height: 34px;
  padding: 0 14px;
  background-color: var(--color-button-background);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: background-color 0.15s ease;
  outline: none;
  color: var(--color-button-font);
  font-size: 14px;
  font-weight: 500;

  &:hover {
    background-color: var(--color-button-background-hover);
  }

  &:active {
    background-color: var(--color-button-background-active);
    transform: scale(0.97);
    transition: background-color 0.05s ease, transform 0.1s ease;
  }

  &:focus-visible {
    box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.25);
  }
}

.labelText {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chevron {
  flex-shrink: 0;
  width: 15px;
  height: 15px;
  opacity: 0.45;
  transition: transform 0.35s cubic-bezier(0.25, 0.1, 0.25, 1), opacity 0.15s ease;

  .active & {
    opacity: 1;
    color: var(--color-primary);
  }

  &.chevronRotate {
    transform: rotate(180deg);
  }
}

.list {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  width: 100%;
  background-color: var(--color-content-background);
  border-radius: 10px;
  box-shadow: 
    0 0 0 0.5px rgba(0, 0, 0, 0.06),
    0 4px 20px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(40px) saturate(180%);
  -webkit-backdrop-filter: blur(40px) saturate(180%);
  max-height: 280px;
  overflow-y: auto;
  z-index: 1000;
  padding: 6px;
  transform-origin: top center;
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease;

  &::-webkit-scrollbar {
    width: 5px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
    margin: 6px 0;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.12);
    border-radius: 3px;
    &:hover { background: rgba(0, 0, 0, 0.2); }
  }
}

.listHide {
  opacity: 0;
  transform: scale(0.9) translateY(-12px);
  pointer-events: none;
}

.listShow {
  opacity: 1;
  transform: scale(1) translateY(0);
  pointer-events: auto;
}

.listItem {
  cursor: pointer;
  border-radius: 7px;
  padding: 7px 10px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-font);
  transition: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &:hover {
    background-color: var(--color-button-background-hover);
  }

  &:active {
    background-color: var(--color-button-background-active);
  }

  &.activeItem {
    color: var(--color-primary);
    font-weight: 600;
  }
}

.emptyState {
  padding: 24px 16px;
  text-align: center;
  color: var(--color-font-label);
  font-size: 12px;
}
</style>