import { defineComponent as g, useTemplateRef as P, ref as S, onMounted as L, onUnmounted as w, watchEffect as a, createVNode as f, computed as q, mergeProps as B, Teleport as E } from "vue";
import { BackgroundRender as k, MeshGradientRenderer as p, MaskObsceneWordsMode as h, LyricPlayer as O } from "@applemusic-like-lyrics/core";
const R = {
  /**
   * 设置背景专辑资源
   */
  album: {
    type: [String, Object],
    required: !1
  },
  /**
   * 设置专辑资源是否为视频
   */
  albumIsVideo: {
    type: Boolean,
    required: !1
  },
  /**
   * 设置当前背景动画帧率，如果为 `undefined` 则默认为 `30`
   */
  fps: {
    type: Number,
    required: !1
  },
  /**
   * 设置当前播放状态，如果为 `undefined` 则默认为 `true`
   */
  playing: {
    type: Boolean,
    required: !1
  },
  /**
   * 设置当前动画流动速度，如果为 `undefined` 则默认为 `2`
   */
  flowSpeed: {
    type: Number,
    required: !1
  },
  /**
   * 设置背景是否根据“是否有歌词”这个特征调整自身效果，例如有歌词时会变得更加活跃
   *
   * 部分渲染器会根据这个特征调整自身效果
   *
   * 如果不确定是否需要赋值或无法知晓是否包含歌词，请传入 true 或不做任何处理（默认值为 true）
   */
  hasLyric: {
    type: Boolean,
    required: !1
  },
  /**
   * 设置低频的音量大小，范围在 80hz-120hz 之间为宜，取值范围在 [0.0-1.0] 之间
   *
   * 部分渲染器会根据音量大小调整背景效果（例如根据鼓点跳动）
   *
   * 如果无法获取到类似的数据，请传入 undefined 或 1.0 作为默认值，或不做任何处理（默认值即 1.0）
   */
  lowFreqVolume: {
    type: Number,
    required: !1
  },
  /**
   * 设置当前渲染缩放比例，如果为 `undefined` 则默认为 `0.5`
   */
  renderScale: {
    type: Number,
    required: !1
  },
  /**
   * 设置渲染器，如果为 `undefined` 则默认为 `MeshGradientRenderer`
   * 默认渲染器有可能会随着版本更新而更换
   */
  renderer: {
    type: Object,
    required: !1
  }
}, j = /* @__PURE__ */ g({
  name: "BackgroundRender",
  props: R,
  setup(e, {
    expose: d
  }) {
    const r = P("wrapper-ref"), n = S();
    return L(() => {
      if (r.value) {
        n.value = k.new(e.renderer ?? p);
        const t = n.value.getElement();
        t.style.width = "100%", t.style.height = "100%", r.value.appendChild(t);
      }
    }), w(() => {
      n.value && n.value.dispose();
    }), a(() => {
      e.album && n.value?.setAlbum(e.album, e.albumIsVideo);
    }), a(() => {
      e.fps && n.value?.setFPS(e.fps);
    }), a(() => {
      e.playing ? n.value?.pause() : n.value?.resume();
    }), a(() => {
      e.flowSpeed && n.value?.setFlowSpeed(e.flowSpeed);
    }), a(() => {
      e.renderScale && n.value?.setRenderScale(e.renderScale);
    }), a(() => {
      e.lowFreqVolume && n.value?.setLowFreqVolume(e.lowFreqVolume);
    }), a(() => {
      e.hasLyric !== void 0 && n.value?.setHasLyric(e.hasLyric ?? !0);
    }), d({
      bgRender: n,
      wrapperEl: r
    }), () => f("div", {
      style: "display: contents;",
      ref: "wrapper-ref"
    }, null);
  }
}), F = {
  /**
   * 是否禁用歌词播放组件，默认为 `false`，歌词组件启用后将会开始逐帧更新歌词的动画效果，并对传入的其他参数变更做出反馈。
   *
   * 如果禁用了歌词组件动画，你也可以通过引用取得原始渲染组件实例，手动逐帧调用其 `update` 函数来更新动画效果。
   */
  disabled: {
    type: Boolean,
    default: !1
  },
  /**
   * 是否演出部分效果，目前会控制播放间奏点的动画的播放暂停与否，默认为 `true`
   */
  playing: {
    type: Boolean,
    default: !0
  },
  /**
   * 设置歌词行的对齐方式，如果为 `undefined` 则默认为 `center`
   *
   * - 设置成 `top` 的话将会向目标歌词行的顶部对齐
   * - 设置成 `bottom` 的话将会向目标歌词行的底部对齐
   * - 设置成 `center` 的话将会向目标歌词行的垂直中心对齐
   */
  alignAnchor: {
    type: String,
    default: "center"
  },
  /**
   * 设置默认的歌词行对齐位置，相对于整个歌词播放组件的大小位置，如果为 `undefined`
   * 则默认为 `0.5`
   *
   * 可以设置一个 `[0.0-1.0]` 之间的任意数字，代表组件高度由上到下的比例位置
   */
  alignPosition: {
    type: Number,
    default: 0.5
  },
  /**
   * 设置是否使用物理弹簧算法实现歌词动画效果，默认启用
   *
   * 如果启用，则会通过弹簧算法实时处理歌词位置，但是需要性能足够强劲的电脑方可流畅运行
   *
   * 如果不启用，则会回退到基于 `transition` 的过渡效果，对低性能的机器比较友好，但是效果会比较单一
   */
  enableSpring: {
    type: Boolean,
    default: !0
  },
  /**
   * 设置是否启用歌词行的模糊效果，默认为 `true`
   */
  enableBlur: {
    type: Boolean,
    default: !0
  },
  /**
   * 设置是否使用物理弹簧算法实现歌词动画效果，默认启用
   *
   * 如果启用，则会通过弹簧算法实时处理歌词位置，但是需要性能足够强劲的电脑方可流畅运行
   *
   * 如果不启用，则会回退到基于 `transition` 的过渡效果，对低性能的机器比较友好，但是效果会比较单一
   */
  enableScale: {
    type: Boolean,
    default: !0
  },
  /**
   * 设置是否隐藏已经播放过的歌词行，默认不隐藏
   */
  hidePassedLines: {
    type: Boolean,
    default: !1
  },
  /**
   * 设置歌词中不雅用语的掩码模式，默认为 `MaskObsceneWordsMode.Disabled`，即不掩码
   */
  maskObsceneWordsMode: {
    type: Object,
    default: h.Disabled
  },
  /**
   * 设置当前播放歌词，要注意传入后这个数组内的信息不得修改，否则会发生错误
   */
  lyricLines: {
    type: Object,
    required: !1
  },
  /**
   * 设置当前播放进度，单位为毫秒且**必须是整数**，此时将会更新内部的歌词进度信息
   * 内部会根据调用间隔和播放进度自动决定如何滚动和显示歌词，所以这个的调用频率越快越准确越好
   */
  currentTime: {
    type: Number,
    default: 0
  },
  /**
   * 设置文字动画的渐变宽度，单位以歌词行的主文字字体大小的倍数为单位，默认为 0.5，即一个全角字符的一半宽度
   *
   * 如果要模拟 Apple Music for Android 的效果，可以设置为 1
   *
   * 如果要模拟 Apple Music for iPad 的效果，可以设置为 0.5
   *
   * 如果想要近乎禁用渐变效果，可以设置成非常接近 0 的小数（例如 `0.0001` ），但是**不可以为 0**
   */
  wordFadeWidth: {
    type: Number,
    default: 0.5
  },
  /**
   * 设置所有歌词行在横坐标上的弹簧属性，包括重量、弹力和阻力。
   *
   * @param params 需要设置的弹簧属性，提供的属性将会覆盖原来的属性，未提供的属性将会保持原样
   */
  linePosXSpringParams: {
    type: Object,
    required: !1
  },
  /**
   * 设置所有歌词行在​纵坐标上的弹簧属性，包括重量、弹力和阻力。
   *
   * @param params 需要设置的弹簧属性，提供的属性将会覆盖原来的属性，未提供的属性将会保持原样
   */
  linePosYSpringParams: {
    type: Object,
    required: !1
  },
  /**
   * 设置所有歌词行在​缩放大小上的弹簧属性，包括重量、弹力和阻力。
   *
   * @param params 需要设置的弹簧属性，提供的属性将会覆盖原来的属性，未提供的属性将会保持原样
   */
  lineScaleSpringParams: {
    type: Object,
    required: !1
  },
  /**
   * 设置渲染器，如果为 `undefined` 则默认为 `MeshGradientRenderer`
   * 默认渲染器有可能会随着版本更新而更换
   */
  lyricPlayer: {
    type: Object,
    required: !1
  }
}, W = {
  lineClick: (e) => !0,
  lineContextmenu: (e) => !0
}, A = /* @__PURE__ */ g({
  name: "LyricPlayer",
  props: F,
  emits: W,
  slots: Object,
  setup(e, {
    expose: d,
    emit: r,
    attrs: n,
    slots: t
  }) {
    const c = P("wrapper-ref"), l = S(), o = (i) => r("lineClick", i), m = (i) => r("lineContextmenu", i);
    L(() => {
      const i = c.value;
      i && (l.value = new O(), i.appendChild(l.value.getElement()), l.value.addEventListener("line-click", o), l.value.addEventListener("line-contextmenu", m));
    }), w(() => {
      l.value && (l.value.removeEventListener("line-click", o), l.value.removeEventListener("line-contextmenu", m), l.value.dispose());
    }), a((i) => {
      if (!e.disabled) {
        let v = !1, u = -1;
        const b = (s) => {
          v || (u === -1 && (u = s), l.value?.update(s - u), u = s, requestAnimationFrame(b));
        };
        requestAnimationFrame(b), i(() => {
          v = !0;
        });
      }
    }), a(() => {
      e.playing !== void 0 ? e.playing ? l.value?.resume() : l.value?.pause() : l.value?.resume();
    }), a(() => {
      e.alignAnchor !== void 0 && l.value?.setAlignAnchor(e.alignAnchor);
    }), a(() => {
      e.hidePassedLines !== void 0 && l.value?.setHidePassedLines(e.hidePassedLines);
    }), a(() => {
      e.maskObsceneWordsMode !== void 0 ? l.value?.setMaskObsceneWords(e.maskObsceneWordsMode) : l.value?.setMaskObsceneWords(h.Disabled);
    }), a(() => {
      e.alignPosition !== void 0 && l.value?.setAlignPosition(e.alignPosition);
    }), a(() => {
      e.enableSpring !== void 0 ? l.value?.setEnableSpring(e.enableSpring) : l.value?.setEnableSpring(!0);
    }), a(() => {
      e.enableBlur !== void 0 ? l.value?.setEnableBlur(e.enableBlur) : l.value?.setEnableBlur(!0);
    }), a(() => {
      e.enableScale !== void 0 ? l.value?.setEnableScale(e.enableScale) : l.value?.setEnableScale(!0);
    }), a(() => {
      e.lyricLines !== void 0 && l.value?.setLyricLines(e.lyricLines);
    }), a(() => {
      e.currentTime !== void 0 && l.value?.setCurrentTime(e.currentTime);
    }), a(() => {
      e.wordFadeWidth !== void 0 && l.value?.setWordFadeWidth(e.wordFadeWidth);
    }), a(() => {
      e.linePosXSpringParams !== void 0 && l.value?.setLinePosXSpringParams(e.linePosXSpringParams);
    }), a(() => {
      e.linePosYSpringParams !== void 0 && l.value?.setLinePosYSpringParams(e.linePosYSpringParams);
    }), a(() => {
      e.lineScaleSpringParams !== void 0 && l.value?.setLineScaleSpringParams(e.lineScaleSpringParams);
    });
    const y = q(() => l.value?.getBottomLineElement());
    return d({
      lyricPlayer: l,
      wrapperEl: c
    }), () => f("div", B({
      ref: "wrapper-ref"
    }, n), [y.value && f(E, {
      to: y.value
    }, {
      default: () => [t["bottom-line"]?.()]
    })]);
  }
});
export {
  j as BackgroundRender,
  A as LyricPlayer
};
//# sourceMappingURL=amll-vue.js.map
