<template>
  <button
    :class="[$style.btn, {[$style.min]: min}, {[$style.outline]: outline}]"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>

<script>
export default {
  props: {
    min: Boolean,
    outline: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.btn {
  display: inline-block;
  border: none;
  border-radius: @form-radius;
  cursor: pointer;
  padding: 8px 15px;
  color: var(--color-button-font);
  outline: none;
  background-color: var(--color-button-background);
  font-size: 14px;
  transition: all 0.15s ease;
  -webkit-tap-highlight-color: transparent;

  &[disabled] {
    opacity: .4;
    cursor: default;
  }

  &.outline {
    background-color: transparent;
    border: 1.5px solid var(--color-button-background);
  }

  &:hover {
    background-color: var(--color-button-background-hover);
  }
  
  &:active {
    transform: scale(0.96);
    background-color: var(--color-button-background-active);
  }

  &:focus-visible {
    box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.3);
  }
}

.min {
  padding: 3px 8px;
  font-size: 12px;
}
</style>