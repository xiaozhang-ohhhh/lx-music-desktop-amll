import { BaseRenderer, MaskObsceneWordsMode, LyricLine, LyricLineMouseEvent, LyricPlayerBase, spring } from '@applemusic-like-lyrics/core';
import { ExtractPublicPropTypes, PropType, Ref, ShallowRef, SlotsType } from 'vue';
declare const lyricPlayerProps: {
    /**
     * 是否禁用歌词播放组件，默认为 `false`，歌词组件启用后将会开始逐帧更新歌词的动画效果，并对传入的其他参数变更做出反馈。
     *
     * 如果禁用了歌词组件动画，你也可以通过引用取得原始渲染组件实例，手动逐帧调用其 `update` 函数来更新动画效果。
     */
    readonly disabled: {
        readonly type: BooleanConstructor;
        readonly default: false;
    };
    /**
     * 是否演出部分效果，目前会控制播放间奏点的动画的播放暂停与否，默认为 `true`
     */
    readonly playing: {
        readonly type: BooleanConstructor;
        readonly default: true;
    };
    /**
     * 设置歌词行的对齐方式，如果为 `undefined` 则默认为 `center`
     *
     * - 设置成 `top` 的话将会向目标歌词行的顶部对齐
     * - 设置成 `bottom` 的话将会向目标歌词行的底部对齐
     * - 设置成 `center` 的话将会向目标歌词行的垂直中心对齐
     */
    readonly alignAnchor: {
        readonly type: PropType<"top" | "bottom" | "center">;
        readonly default: "center";
    };
    /**
     * 设置默认的歌词行对齐位置，相对于整个歌词播放组件的大小位置，如果为 `undefined`
     * 则默认为 `0.5`
     *
     * 可以设置一个 `[0.0-1.0]` 之间的任意数字，代表组件高度由上到下的比例位置
     */
    readonly alignPosition: {
        readonly type: NumberConstructor;
        readonly default: 0.5;
    };
    /**
     * 设置是否使用物理弹簧算法实现歌词动画效果，默认启用
     *
     * 如果启用，则会通过弹簧算法实时处理歌词位置，但是需要性能足够强劲的电脑方可流畅运行
     *
     * 如果不启用，则会回退到基于 `transition` 的过渡效果，对低性能的机器比较友好，但是效果会比较单一
     */
    readonly enableSpring: {
        readonly type: BooleanConstructor;
        readonly default: true;
    };
    /**
     * 设置是否启用歌词行的模糊效果，默认为 `true`
     */
    readonly enableBlur: {
        readonly type: BooleanConstructor;
        readonly default: true;
    };
    /**
     * 设置是否使用物理弹簧算法实现歌词动画效果，默认启用
     *
     * 如果启用，则会通过弹簧算法实时处理歌词位置，但是需要性能足够强劲的电脑方可流畅运行
     *
     * 如果不启用，则会回退到基于 `transition` 的过渡效果，对低性能的机器比较友好，但是效果会比较单一
     */
    readonly enableScale: {
        readonly type: BooleanConstructor;
        readonly default: true;
    };
    /**
     * 设置是否隐藏已经播放过的歌词行，默认不隐藏
     */
    readonly hidePassedLines: {
        readonly type: BooleanConstructor;
        readonly default: false;
    };
    /**
     * 设置歌词中不雅用语的掩码模式，默认为 `MaskObsceneWordsMode.Disabled`，即不掩码
     */
    readonly maskObsceneWordsMode: {
        readonly type: PropType<MaskObsceneWordsMode>;
        readonly default: MaskObsceneWordsMode.Disabled;
    };
    /**
     * 设置当前播放歌词，要注意传入后这个数组内的信息不得修改，否则会发生错误
     */
    readonly lyricLines: {
        readonly type: PropType<LyricLine[]>;
        readonly required: false;
    };
    /**
     * 设置当前播放进度，单位为毫秒且**必须是整数**，此时将会更新内部的歌词进度信息
     * 内部会根据调用间隔和播放进度自动决定如何滚动和显示歌词，所以这个的调用频率越快越准确越好
     */
    readonly currentTime: {
        readonly type: NumberConstructor;
        readonly default: 0;
    };
    /**
     * 设置文字动画的渐变宽度，单位以歌词行的主文字字体大小的倍数为单位，默认为 0.5，即一个全角字符的一半宽度
     *
     * 如果要模拟 Apple Music for Android 的效果，可以设置为 1
     *
     * 如果要模拟 Apple Music for iPad 的效果，可以设置为 0.5
     *
     * 如果想要近乎禁用渐变效果，可以设置成非常接近 0 的小数（例如 `0.0001` ），但是**不可以为 0**
     */
    readonly wordFadeWidth: {
        readonly type: NumberConstructor;
        readonly default: 0.5;
    };
    /**
     * 设置所有歌词行在横坐标上的弹簧属性，包括重量、弹力和阻力。
     *
     * @param params 需要设置的弹簧属性，提供的属性将会覆盖原来的属性，未提供的属性将会保持原样
     */
    readonly linePosXSpringParams: {
        readonly type: PropType<Partial<spring.SpringParams>>;
        readonly required: false;
    };
    /**
     * 设置所有歌词行在​纵坐标上的弹簧属性，包括重量、弹力和阻力。
     *
     * @param params 需要设置的弹簧属性，提供的属性将会覆盖原来的属性，未提供的属性将会保持原样
     */
    readonly linePosYSpringParams: {
        readonly type: PropType<Partial<spring.SpringParams>>;
        readonly required: false;
    };
    /**
     * 设置所有歌词行在​缩放大小上的弹簧属性，包括重量、弹力和阻力。
     *
     * @param params 需要设置的弹簧属性，提供的属性将会覆盖原来的属性，未提供的属性将会保持原样
     */
    readonly lineScaleSpringParams: {
        readonly type: PropType<Partial<spring.SpringParams>>;
        readonly required: false;
    };
    /**
     * 设置渲染器，如果为 `undefined` 则默认为 `MeshGradientRenderer`
     * 默认渲染器有可能会随着版本更新而更换
     */
    readonly lyricPlayer: {
        readonly type: PropType<{
            new (...args: ConstructorParameters<typeof BaseRenderer>): BaseRenderer;
        }>;
        readonly required: false;
    };
};
/**
 * 歌词播放组件的属性
 */
export type LyricPlayerProps = ExtractPublicPropTypes<typeof lyricPlayerProps>;
declare const lyricPlayerEmits: {
    readonly lineClick: (_: LyricLineMouseEvent) => boolean;
    readonly lineContextmenu: (_: LyricLineMouseEvent) => boolean;
};
/**
 * 歌词播放组件的事件
 */
export type LyricPlayerEmits = typeof lyricPlayerEmits;
/**
 * 歌词播放组件的引用
 */
export interface LyricPlayerRef {
    /**
     * 歌词播放实例
     */
    lyricPlayer: Ref<LyricPlayerBase | undefined>;
    /**
     * 将歌词播放实例的元素包裹起来的 DIV 元素实例
     */
    wrapperEl: Readonly<ShallowRef<HTMLDivElement | null>>;
}
export declare const LyricPlayer: import('vue').DefineComponent<import('vue').ExtractPropTypes<{
    /**
     * 是否禁用歌词播放组件，默认为 `false`，歌词组件启用后将会开始逐帧更新歌词的动画效果，并对传入的其他参数变更做出反馈。
     *
     * 如果禁用了歌词组件动画，你也可以通过引用取得原始渲染组件实例，手动逐帧调用其 `update` 函数来更新动画效果。
     */
    readonly disabled: {
        readonly type: BooleanConstructor;
        readonly default: false;
    };
    /**
     * 是否演出部分效果，目前会控制播放间奏点的动画的播放暂停与否，默认为 `true`
     */
    readonly playing: {
        readonly type: BooleanConstructor;
        readonly default: true;
    };
    /**
     * 设置歌词行的对齐方式，如果为 `undefined` 则默认为 `center`
     *
     * - 设置成 `top` 的话将会向目标歌词行的顶部对齐
     * - 设置成 `bottom` 的话将会向目标歌词行的底部对齐
     * - 设置成 `center` 的话将会向目标歌词行的垂直中心对齐
     */
    readonly alignAnchor: {
        readonly type: PropType<"top" | "bottom" | "center">;
        readonly default: "center";
    };
    /**
     * 设置默认的歌词行对齐位置，相对于整个歌词播放组件的大小位置，如果为 `undefined`
     * 则默认为 `0.5`
     *
     * 可以设置一个 `[0.0-1.0]` 之间的任意数字，代表组件高度由上到下的比例位置
     */
    readonly alignPosition: {
        readonly type: NumberConstructor;
        readonly default: 0.5;
    };
    /**
     * 设置是否使用物理弹簧算法实现歌词动画效果，默认启用
     *
     * 如果启用，则会通过弹簧算法实时处理歌词位置，但是需要性能足够强劲的电脑方可流畅运行
     *
     * 如果不启用，则会回退到基于 `transition` 的过渡效果，对低性能的机器比较友好，但是效果会比较单一
     */
    readonly enableSpring: {
        readonly type: BooleanConstructor;
        readonly default: true;
    };
    /**
     * 设置是否启用歌词行的模糊效果，默认为 `true`
     */
    readonly enableBlur: {
        readonly type: BooleanConstructor;
        readonly default: true;
    };
    /**
     * 设置是否使用物理弹簧算法实现歌词动画效果，默认启用
     *
     * 如果启用，则会通过弹簧算法实时处理歌词位置，但是需要性能足够强劲的电脑方可流畅运行
     *
     * 如果不启用，则会回退到基于 `transition` 的过渡效果，对低性能的机器比较友好，但是效果会比较单一
     */
    readonly enableScale: {
        readonly type: BooleanConstructor;
        readonly default: true;
    };
    /**
     * 设置是否隐藏已经播放过的歌词行，默认不隐藏
     */
    readonly hidePassedLines: {
        readonly type: BooleanConstructor;
        readonly default: false;
    };
    /**
     * 设置歌词中不雅用语的掩码模式，默认为 `MaskObsceneWordsMode.Disabled`，即不掩码
     */
    readonly maskObsceneWordsMode: {
        readonly type: PropType<MaskObsceneWordsMode>;
        readonly default: MaskObsceneWordsMode.Disabled;
    };
    /**
     * 设置当前播放歌词，要注意传入后这个数组内的信息不得修改，否则会发生错误
     */
    readonly lyricLines: {
        readonly type: PropType<LyricLine[]>;
        readonly required: false;
    };
    /**
     * 设置当前播放进度，单位为毫秒且**必须是整数**，此时将会更新内部的歌词进度信息
     * 内部会根据调用间隔和播放进度自动决定如何滚动和显示歌词，所以这个的调用频率越快越准确越好
     */
    readonly currentTime: {
        readonly type: NumberConstructor;
        readonly default: 0;
    };
    /**
     * 设置文字动画的渐变宽度，单位以歌词行的主文字字体大小的倍数为单位，默认为 0.5，即一个全角字符的一半宽度
     *
     * 如果要模拟 Apple Music for Android 的效果，可以设置为 1
     *
     * 如果要模拟 Apple Music for iPad 的效果，可以设置为 0.5
     *
     * 如果想要近乎禁用渐变效果，可以设置成非常接近 0 的小数（例如 `0.0001` ），但是**不可以为 0**
     */
    readonly wordFadeWidth: {
        readonly type: NumberConstructor;
        readonly default: 0.5;
    };
    /**
     * 设置所有歌词行在横坐标上的弹簧属性，包括重量、弹力和阻力。
     *
     * @param params 需要设置的弹簧属性，提供的属性将会覆盖原来的属性，未提供的属性将会保持原样
     */
    readonly linePosXSpringParams: {
        readonly type: PropType<Partial<spring.SpringParams>>;
        readonly required: false;
    };
    /**
     * 设置所有歌词行在​纵坐标上的弹簧属性，包括重量、弹力和阻力。
     *
     * @param params 需要设置的弹簧属性，提供的属性将会覆盖原来的属性，未提供的属性将会保持原样
     */
    readonly linePosYSpringParams: {
        readonly type: PropType<Partial<spring.SpringParams>>;
        readonly required: false;
    };
    /**
     * 设置所有歌词行在​缩放大小上的弹簧属性，包括重量、弹力和阻力。
     *
     * @param params 需要设置的弹簧属性，提供的属性将会覆盖原来的属性，未提供的属性将会保持原样
     */
    readonly lineScaleSpringParams: {
        readonly type: PropType<Partial<spring.SpringParams>>;
        readonly required: false;
    };
    /**
     * 设置渲染器，如果为 `undefined` 则默认为 `MeshGradientRenderer`
     * 默认渲染器有可能会随着版本更新而更换
     */
    readonly lyricPlayer: {
        readonly type: PropType<{
            new (...args: ConstructorParameters<typeof BaseRenderer>): BaseRenderer;
        }>;
        readonly required: false;
    };
}>, () => import("vue/jsx-runtime").JSX.Element, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    readonly lineClick: (_: LyricLineMouseEvent) => boolean;
    readonly lineContextmenu: (_: LyricLineMouseEvent) => boolean;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<{
    /**
     * 是否禁用歌词播放组件，默认为 `false`，歌词组件启用后将会开始逐帧更新歌词的动画效果，并对传入的其他参数变更做出反馈。
     *
     * 如果禁用了歌词组件动画，你也可以通过引用取得原始渲染组件实例，手动逐帧调用其 `update` 函数来更新动画效果。
     */
    readonly disabled: {
        readonly type: BooleanConstructor;
        readonly default: false;
    };
    /**
     * 是否演出部分效果，目前会控制播放间奏点的动画的播放暂停与否，默认为 `true`
     */
    readonly playing: {
        readonly type: BooleanConstructor;
        readonly default: true;
    };
    /**
     * 设置歌词行的对齐方式，如果为 `undefined` 则默认为 `center`
     *
     * - 设置成 `top` 的话将会向目标歌词行的顶部对齐
     * - 设置成 `bottom` 的话将会向目标歌词行的底部对齐
     * - 设置成 `center` 的话将会向目标歌词行的垂直中心对齐
     */
    readonly alignAnchor: {
        readonly type: PropType<"top" | "bottom" | "center">;
        readonly default: "center";
    };
    /**
     * 设置默认的歌词行对齐位置，相对于整个歌词播放组件的大小位置，如果为 `undefined`
     * 则默认为 `0.5`
     *
     * 可以设置一个 `[0.0-1.0]` 之间的任意数字，代表组件高度由上到下的比例位置
     */
    readonly alignPosition: {
        readonly type: NumberConstructor;
        readonly default: 0.5;
    };
    /**
     * 设置是否使用物理弹簧算法实现歌词动画效果，默认启用
     *
     * 如果启用，则会通过弹簧算法实时处理歌词位置，但是需要性能足够强劲的电脑方可流畅运行
     *
     * 如果不启用，则会回退到基于 `transition` 的过渡效果，对低性能的机器比较友好，但是效果会比较单一
     */
    readonly enableSpring: {
        readonly type: BooleanConstructor;
        readonly default: true;
    };
    /**
     * 设置是否启用歌词行的模糊效果，默认为 `true`
     */
    readonly enableBlur: {
        readonly type: BooleanConstructor;
        readonly default: true;
    };
    /**
     * 设置是否使用物理弹簧算法实现歌词动画效果，默认启用
     *
     * 如果启用，则会通过弹簧算法实时处理歌词位置，但是需要性能足够强劲的电脑方可流畅运行
     *
     * 如果不启用，则会回退到基于 `transition` 的过渡效果，对低性能的机器比较友好，但是效果会比较单一
     */
    readonly enableScale: {
        readonly type: BooleanConstructor;
        readonly default: true;
    };
    /**
     * 设置是否隐藏已经播放过的歌词行，默认不隐藏
     */
    readonly hidePassedLines: {
        readonly type: BooleanConstructor;
        readonly default: false;
    };
    /**
     * 设置歌词中不雅用语的掩码模式，默认为 `MaskObsceneWordsMode.Disabled`，即不掩码
     */
    readonly maskObsceneWordsMode: {
        readonly type: PropType<MaskObsceneWordsMode>;
        readonly default: MaskObsceneWordsMode.Disabled;
    };
    /**
     * 设置当前播放歌词，要注意传入后这个数组内的信息不得修改，否则会发生错误
     */
    readonly lyricLines: {
        readonly type: PropType<LyricLine[]>;
        readonly required: false;
    };
    /**
     * 设置当前播放进度，单位为毫秒且**必须是整数**，此时将会更新内部的歌词进度信息
     * 内部会根据调用间隔和播放进度自动决定如何滚动和显示歌词，所以这个的调用频率越快越准确越好
     */
    readonly currentTime: {
        readonly type: NumberConstructor;
        readonly default: 0;
    };
    /**
     * 设置文字动画的渐变宽度，单位以歌词行的主文字字体大小的倍数为单位，默认为 0.5，即一个全角字符的一半宽度
     *
     * 如果要模拟 Apple Music for Android 的效果，可以设置为 1
     *
     * 如果要模拟 Apple Music for iPad 的效果，可以设置为 0.5
     *
     * 如果想要近乎禁用渐变效果，可以设置成非常接近 0 的小数（例如 `0.0001` ），但是**不可以为 0**
     */
    readonly wordFadeWidth: {
        readonly type: NumberConstructor;
        readonly default: 0.5;
    };
    /**
     * 设置所有歌词行在横坐标上的弹簧属性，包括重量、弹力和阻力。
     *
     * @param params 需要设置的弹簧属性，提供的属性将会覆盖原来的属性，未提供的属性将会保持原样
     */
    readonly linePosXSpringParams: {
        readonly type: PropType<Partial<spring.SpringParams>>;
        readonly required: false;
    };
    /**
     * 设置所有歌词行在​纵坐标上的弹簧属性，包括重量、弹力和阻力。
     *
     * @param params 需要设置的弹簧属性，提供的属性将会覆盖原来的属性，未提供的属性将会保持原样
     */
    readonly linePosYSpringParams: {
        readonly type: PropType<Partial<spring.SpringParams>>;
        readonly required: false;
    };
    /**
     * 设置所有歌词行在​缩放大小上的弹簧属性，包括重量、弹力和阻力。
     *
     * @param params 需要设置的弹簧属性，提供的属性将会覆盖原来的属性，未提供的属性将会保持原样
     */
    readonly lineScaleSpringParams: {
        readonly type: PropType<Partial<spring.SpringParams>>;
        readonly required: false;
    };
    /**
     * 设置渲染器，如果为 `undefined` 则默认为 `MeshGradientRenderer`
     * 默认渲染器有可能会随着版本更新而更换
     */
    readonly lyricPlayer: {
        readonly type: PropType<{
            new (...args: ConstructorParameters<typeof BaseRenderer>): BaseRenderer;
        }>;
        readonly required: false;
    };
}>> & Readonly<{
    onLineClick?: ((_: LyricLineMouseEvent) => any) | undefined;
    onLineContextmenu?: ((_: LyricLineMouseEvent) => any) | undefined;
}>, {
    readonly playing: boolean;
    readonly disabled: boolean;
    readonly alignAnchor: "top" | "bottom" | "center";
    readonly alignPosition: number;
    readonly enableSpring: boolean;
    readonly enableBlur: boolean;
    readonly enableScale: boolean;
    readonly hidePassedLines: boolean;
    readonly maskObsceneWordsMode: MaskObsceneWordsMode;
    readonly currentTime: number;
    readonly wordFadeWidth: number;
}, SlotsType<{
    "bottom-line": () => void;
}>, {}, {}, string, import('vue').ComponentProvideOptions, true, {}, any>;
export {};
