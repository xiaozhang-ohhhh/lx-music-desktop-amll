<template lang="pug">
dt#play_detail {{ $t('setting__play_detail') }}
dd
  .gap-top
    base-checkbox(id="setting_play_detail_font_zoom_enable" :model-value="appSetting['playDetail.isZoomActiveLrc']" :label="$t('setting__play_detail_font_zoom')" @update:model-value="updateSetting({'playDetail.isZoomActiveLrc': $event})")
  .gap-top
    base-checkbox(id="setting_play_detail_lyric_delayScroll" :model-value="appSetting['playDetail.isDelayScroll']" :label="$t('setting__play_detail_lyric_delay_scroll')" @update:model-value="updateSetting({ 'playDetail.isDelayScroll': $event })")
  .gap-top
    base-checkbox(id="setting_play_detail_lyric_progress_enable" :model-value="appSetting['playDetail.isShowLyricProgressSetting']" :label="$t('setting__play_detail_lyric_progress')" @update:model-value="updateSetting({'playDetail.isShowLyricProgressSetting': $event})")
  .gap-top
    base-checkbox(id="setting_play_detail_show_play_bar" :model-value="appSetting['playDetail.isShowPlayBar']" :label="$t('setting__play_detail_show_play_bar')" @update:model-value="updateSetting({ 'playDetail.isShowPlayBar': $event })")

dd
  h3#play_detail_lyric_font_weight {{ $t('setting__play_detail_lyric_font_weight') }}
  div
    base-selection.gap-left(v-model="appSetting['playDetail.lyric.fontWeight']" :list="fontWeightList" item-key="value" item-name="label" @change="updateSetting({ 'playDetail.lyric.fontWeight': $event })")
</template>

<script>
// import { ref, onBeforeUnmount } from '@common/utils/vueTools'
import { appSetting, updateSetting } from '@renderer/store/setting'

export default {
  name: 'SettingPlayDetail',
  setup() {
    const fontWeightList = [
      { value: '100', label: 'Thin (100)' },
      { value: '200', label: 'Extra Light (200)' },
      { value: '300', label: 'Light (300)' },
      { value: '400', label: 'Normal (400)' },
      { value: '500', label: 'Medium (500)' },
      { value: '600', label: 'Semi Bold (600)' },
      { value: '700', label: 'Bold (700)' },
      { value: '800', label: 'Extra Bold (800)' },
      { value: '900', label: 'Black (900)' },
    ]

    return {
      appSetting,
      updateSetting,
      fontWeightList,
    }
  },
}
</script>
