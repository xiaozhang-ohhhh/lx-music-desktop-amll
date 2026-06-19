<template>
  <div :class="$style.main">
    <div ref="dom_toc_ref" class="scroll" :class="$style.toc">
      <ul :class="$style.tocList" role="toolbar">
        <li v-for="h2 in tocList" :key="h2.id" :class="$style.tocListItem" role="presentation">
          <h2
            :class="[$style.tocH2, {[$style.active]: avtiveComponentName == h2.id }]"
            role="tab" :aria-selected="avtiveComponentName == h2.id"
            :aria-label="h2.title" ignore-tip @click="toggleTab(h2.id)"
            :data-toc-id="h2.id"
          >
            <transition name="icon-spring" @enter="onIconEnter" @leave="onIconLeave">
              <svg-icon v-if="avtiveComponentName == h2.id" name="angle-right-solid" :class="$style.activeIcon" />
            </transition>
            {{ h2.title }}
          </h2>
        </li>
      </ul>
    </div>
    <div ref="dom_content_ref" class="scroll" :class="$style.setting">
      <transition name="setting-spring" mode="out-in" @enter="onSettingEnter" @leave="onSettingLeave">
        <dl :key="avtiveComponentName">
          <component :is="avtiveComponentName" />
        </dl>
      </transition>
    </div>
  </div>
</template>

<script>
import { ref, computed, nextTick } from '@common/utils/vueTools'
import { useI18n } from '@renderer/plugins/i18n'
import { useRoute } from '@common/utils/vueRouter'

import SettingBasic from './components/SettingBasic.vue'
import SettingPlay from './components/SettingPlay.vue'
import SettingPlayDetail from './components/SettingPlayDetail.vue'
import SettingDesktopLyric from './components/SettingDesktopLyric.vue'
import SettingSearch from './components/SettingSearch.vue'
import SettingList from './components/SettingList.vue'
import SettingDownload from './components/SettingDownload.vue'
import SettingSync from './components/SettingSync/index.vue'
import SettingOpenAPI from './components/SettingOpenAPI.vue'
import SettingHotKey from './components/SettingHotKey.vue'
import SettingNetwork from './components/SettingNetwork.vue'
import SettingOdc from './components/SettingOdc.vue'
import SettingBackup from './components/SettingBackup.vue'
import SettingOther from './components/SettingOther.vue'
import SettingUpdate from './components/SettingUpdate.vue'
import SettingAbout from './components/SettingAbout.vue'

export default {
  name: 'Setting',
  components: {
    SettingBasic,
    SettingPlay,
    SettingPlayDetail,
    SettingDesktopLyric,
    SettingSearch,
    SettingList,
    SettingDownload,
    SettingSync,
    SettingOpenAPI,
    SettingHotKey,
    SettingNetwork,
    SettingOdc,
    SettingBackup,
    SettingOther,
    SettingUpdate,
    SettingAbout,
  },
  setup() {
    const t = useI18n()
    const route = useRoute()

    const dom_content_ref = ref(null)
    const dom_toc_ref = ref(null)

    const tocList = computed(() => {
      return [
        { id: 'SettingBasic', title: t('setting__basic') },
        { id: 'SettingPlay', title: t('setting__play') },
        { id: 'SettingPlayDetail', title: t('setting__play_detail') },
        { id: 'SettingDesktopLyric', title: t('setting__desktop_lyric') },
        { id: 'SettingSearch', title: t('setting__search') },
        { id: 'SettingList', title: t('setting__list') },
        { id: 'SettingDownload', title: t('setting__download') },
        { id: 'SettingHotKey', title: t('setting__hot_key') },
        { id: 'SettingSync', title: t('setting__sync') },
        { id: 'SettingOpenAPI', title: t('setting__open_api') },
        { id: 'SettingNetwork', title: t('setting__network') },
        { id: 'SettingOdc', title: t('setting__odc') },
        { id: 'SettingBackup', title: t('setting__backup') },
        { id: 'SettingOther', title: t('setting__other') },
        { id: 'SettingUpdate', title: t('setting__update') },
        { id: 'SettingAbout', title: t('setting__about') },
      ]
    })

    const avtiveComponentName = ref(route.query.name && tocList.value.some(t => t.id == route.query.name)
      ? route.query.name
      : tocList.value[0].id)

    const toggleTab = id => {
      if (avtiveComponentName.value === id) return
      avtiveComponentName.value = id
      if (dom_content_ref.value) {
        dom_content_ref.value.scrollTop = 0
      }

      void nextTick(() => {
        const tocEl = dom_toc_ref.value
        if (!tocEl) return
        const activeEl = tocEl.querySelector(`[data-toc-id="${id}"]`)
        if (!activeEl) return
        const anim = activeEl.animate(
          [
            { transform: 'translate3d(0, 0, 0) scale(1)' },
            { transform: 'translate3d(4px, 0, 0) scale(1.02)', offset: 0.6 },
            { transform: 'translate3d(0, 0, 0) scale(1)' },
          ],
          {
            duration: 360,
            easing: 'cubic-bezier(0.2, 0.9, 0.2, 1)',
          },
        )
        anim.onfinish = () => {}
        anim.oncancel = () => {}
      })
    }

    // 图标弹簧入场
    const onIconEnter = (el, done) => {
      const anim = el.animate(
        [
          { transform: 'scale(0)', opacity: '0' },
          { transform: 'scale(1.3)', opacity: '1', offset: 0.6 },
          { transform: 'scale(1)', opacity: '1' }
        ],
        {
          duration: 420,
          easing: 'cubic-bezier(0.2, 0.9, 0.2, 1)',
          fill: 'forwards'
        }
      )
      anim.onfinish = done
      anim.oncancel = done
    }

    // 图标瞬间离场，不拖
    const onIconLeave = (el, done) => {
      const anim = el.animate(
        [
          { transform: 'scale(1)', opacity: '1' },
          { transform: 'scale(0)', opacity: '0' }
        ],
        {
          duration: 120,
          easing: 'cubic-bezier(0.4, 0, 1, 1)',
          fill: 'forwards'
        }
      )
      anim.onfinish = done
      anim.oncancel = done
    }

    const onSettingEnter = (el, done) => {
      const anim = el.animate(
        [
          { transform: 'translate3d(0, 12px, 0) scale(0.985)', opacity: '0' },
          { transform: 'translate3d(0, -2px, 0) scale(1.01)', opacity: '1', offset: 0.65 },
          { transform: 'translate3d(0, 0, 0) scale(1)', opacity: '1' },
        ],
        {
          duration: 520,
          easing: 'cubic-bezier(0.2, 0.9, 0.2, 1)',
          fill: 'forwards',
        },
      )
      anim.onfinish = done
      anim.oncancel = done
    }

    const onSettingLeave = (el, done) => {
      const anim = el.animate(
        [
          { transform: 'translate3d(0, 0, 0) scale(1)', opacity: '1' },
          { transform: 'translate3d(0, -8px, 0) scale(0.99)', opacity: '0' },
        ],
        {
          duration: 220,
          easing: 'cubic-bezier(0.4, 0, 1, 1)',
          fill: 'forwards',
        },
      )
      anim.onfinish = done
      anim.oncancel = done
    }

    return {
      tocList,
      avtiveComponentName,
      dom_content_ref,
      dom_toc_ref,
      toggleTab,
      onIconEnter,
      onIconLeave,
      onSettingEnter,
      onSettingLeave,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.main {
  display: flex;
  flex-flow: row nowrap;
  height: 100%;
  border-top: var(--color-list-header-border-bottom);
}

.toc {
  flex: 0 0 16%;
  overflow-y: auto;
  padding: 4px 6px;
}

.tocList {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.tocH2 {
  position: relative;
  display: flex;
  align-items: center;
  line-height: 1.5;
  .mixin-ellipsis-1();
  font-size: 13px;
  font-weight: 500;
  color: var(--color-font);
  padding: 7px 10px;
  border-radius: 7px;
  transition: background-color 0.1s ease;
  cursor: pointer;
  will-change: background-color, transform;

  &:hover {
    background-color: var(--color-button-background-hover);
  }

  &:active {
    background-color: var(--color-button-background-active);
  }

  &.active {
    color: var(--color-primary);
    padding-left: 4px;
  }
}

.activeIcon {
  flex-shrink: 0;
  height: 0.85em;
  width: 0.85em;
  margin-right: 4px;
  color: var(--color-primary);
}

.setting {
  padding: 0 15px 15px;
  font-size: 14px;
  box-sizing: border-box;
  overflow-y: auto;
  height: 100%;
  position: relative;
  width: 100%;
  will-change: transform, opacity;

  :global {
    dt {
      border-left: 5px solid var(--color-primary-alpha-700);
      padding: 3px 7px;
      margin: 15px 0;

      + dd h3 {
        margin-top: 0;
      }
    }

    dd {
      > div {
        padding: 0 15px;
      }
    }
    
    h3 {
      font-size: 12px;
      margin: 25px 0 15px;
    }
    
    .p {
      padding: 3px 0;
      line-height: 1.3;
      
      .btn + .btn {
        margin-left: 10px;
      }
    }

    .help-btn {
      padding: 0;
      margin: 0 0.4em;
      border: none;
      background: none;
      color: var(--color-button-font);
      cursor: pointer;
      transition: opacity 0.2s ease;
      
      &:hover {
        opacity: 0.7;
      }
    }
    
    .help-icon {
      margin: 0 0.4em;
    }
  }
}
</style>