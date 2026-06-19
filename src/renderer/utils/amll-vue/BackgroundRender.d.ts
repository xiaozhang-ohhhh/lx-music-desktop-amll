import { AbstractBaseRenderer, BaseRenderer } from '@applemusic-like-lyrics/core';
import { ExtractPublicPropTypes, PropType, Ref, ShallowRef } from 'vue';
/**
 * 背景渲染组件的引用
 */
export interface BackgroundRenderRef {
    /**
     * 背景渲染实例引用
     */
    bgRender?: Ref<AbstractBaseRenderer | undefined>;
    /**
     * 将背景渲染实例的元素包裹起来的 DIV 元素实例
     */
    wrapperEl: Readonly<ShallowRef<HTMLDivElement | null>>;
}
declare const backgroundRenderProps: {
    /**
     * 设置背景专辑资源
     */
    readonly album: {
        readonly type: PropType<string | HTMLImageElement | HTMLVideoElement>;
        readonly required: false;
    };
    /**
     * 设置专辑资源是否为视频
     */
    readonly albumIsVideo: {
        readonly type: BooleanConstructor;
        readonly required: false;
    };
    /**
     * 设置当前背景动画帧率，如果为 `undefined` 则默认为 `30`
     */
    readonly fps: {
        readonly type: NumberConstructor;
        readonly required: false;
    };
    /**
     * 设置当前播放状态，如果为 `undefined` 则默认为 `true`
     */
    readonly playing: {
        readonly type: BooleanConstructor;
        readonly required: false;
    };
    /**
     * 设置当前动画流动速度，如果为 `undefined` 则默认为 `2`
     */
    readonly flowSpeed: {
        readonly type: NumberConstructor;
        readonly required: false;
    };
    /**
     * 设置背景是否根据“是否有歌词”这个特征调整自身效果，例如有歌词时会变得更加活跃
     *
     * 部分渲染器会根据这个特征调整自身效果
     *
     * 如果不确定是否需要赋值或无法知晓是否包含歌词，请传入 true 或不做任何处理（默认值为 true）
     */
    readonly hasLyric: {
        readonly type: BooleanConstructor;
        readonly required: false;
    };
    /**
     * 设置低频的音量大小，范围在 80hz-120hz 之间为宜，取值范围在 [0.0-1.0] 之间
     *
     * 部分渲染器会根据音量大小调整背景效果（例如根据鼓点跳动）
     *
     * 如果无法获取到类似的数据，请传入 undefined 或 1.0 作为默认值，或不做任何处理（默认值即 1.0）
     */
    readonly lowFreqVolume: {
        readonly type: NumberConstructor;
        readonly required: false;
    };
    /**
     * 设置当前渲染缩放比例，如果为 `undefined` 则默认为 `0.5`
     */
    readonly renderScale: {
        readonly type: NumberConstructor;
        readonly required: false;
    };
    /**
     * 设置渲染器，如果为 `undefined` 则默认为 `MeshGradientRenderer`
     * 默认渲染器有可能会随着版本更新而更换
     */
    readonly renderer: {
        readonly type: PropType<{
            new (...args: ConstructorParameters<typeof BaseRenderer>): BaseRenderer;
        }>;
        readonly required: false;
    };
};
export type BackgroundRenderProps = ExtractPublicPropTypes<typeof backgroundRenderProps>;
export declare const BackgroundRender: import('vue').DefineComponent<import('vue').ExtractPropTypes<{
    /**
     * 设置背景专辑资源
     */
    readonly album: {
        readonly type: PropType<string | HTMLImageElement | HTMLVideoElement>;
        readonly required: false;
    };
    /**
     * 设置专辑资源是否为视频
     */
    readonly albumIsVideo: {
        readonly type: BooleanConstructor;
        readonly required: false;
    };
    /**
     * 设置当前背景动画帧率，如果为 `undefined` 则默认为 `30`
     */
    readonly fps: {
        readonly type: NumberConstructor;
        readonly required: false;
    };
    /**
     * 设置当前播放状态，如果为 `undefined` 则默认为 `true`
     */
    readonly playing: {
        readonly type: BooleanConstructor;
        readonly required: false;
    };
    /**
     * 设置当前动画流动速度，如果为 `undefined` 则默认为 `2`
     */
    readonly flowSpeed: {
        readonly type: NumberConstructor;
        readonly required: false;
    };
    /**
     * 设置背景是否根据“是否有歌词”这个特征调整自身效果，例如有歌词时会变得更加活跃
     *
     * 部分渲染器会根据这个特征调整自身效果
     *
     * 如果不确定是否需要赋值或无法知晓是否包含歌词，请传入 true 或不做任何处理（默认值为 true）
     */
    readonly hasLyric: {
        readonly type: BooleanConstructor;
        readonly required: false;
    };
    /**
     * 设置低频的音量大小，范围在 80hz-120hz 之间为宜，取值范围在 [0.0-1.0] 之间
     *
     * 部分渲染器会根据音量大小调整背景效果（例如根据鼓点跳动）
     *
     * 如果无法获取到类似的数据，请传入 undefined 或 1.0 作为默认值，或不做任何处理（默认值即 1.0）
     */
    readonly lowFreqVolume: {
        readonly type: NumberConstructor;
        readonly required: false;
    };
    /**
     * 设置当前渲染缩放比例，如果为 `undefined` 则默认为 `0.5`
     */
    readonly renderScale: {
        readonly type: NumberConstructor;
        readonly required: false;
    };
    /**
     * 设置渲染器，如果为 `undefined` 则默认为 `MeshGradientRenderer`
     * 默认渲染器有可能会随着版本更新而更换
     */
    readonly renderer: {
        readonly type: PropType<{
            new (...args: ConstructorParameters<typeof BaseRenderer>): BaseRenderer;
        }>;
        readonly required: false;
    };
}>, () => import("vue/jsx-runtime").JSX.Element, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<{
    /**
     * 设置背景专辑资源
     */
    readonly album: {
        readonly type: PropType<string | HTMLImageElement | HTMLVideoElement>;
        readonly required: false;
    };
    /**
     * 设置专辑资源是否为视频
     */
    readonly albumIsVideo: {
        readonly type: BooleanConstructor;
        readonly required: false;
    };
    /**
     * 设置当前背景动画帧率，如果为 `undefined` 则默认为 `30`
     */
    readonly fps: {
        readonly type: NumberConstructor;
        readonly required: false;
    };
    /**
     * 设置当前播放状态，如果为 `undefined` 则默认为 `true`
     */
    readonly playing: {
        readonly type: BooleanConstructor;
        readonly required: false;
    };
    /**
     * 设置当前动画流动速度，如果为 `undefined` 则默认为 `2`
     */
    readonly flowSpeed: {
        readonly type: NumberConstructor;
        readonly required: false;
    };
    /**
     * 设置背景是否根据“是否有歌词”这个特征调整自身效果，例如有歌词时会变得更加活跃
     *
     * 部分渲染器会根据这个特征调整自身效果
     *
     * 如果不确定是否需要赋值或无法知晓是否包含歌词，请传入 true 或不做任何处理（默认值为 true）
     */
    readonly hasLyric: {
        readonly type: BooleanConstructor;
        readonly required: false;
    };
    /**
     * 设置低频的音量大小，范围在 80hz-120hz 之间为宜，取值范围在 [0.0-1.0] 之间
     *
     * 部分渲染器会根据音量大小调整背景效果（例如根据鼓点跳动）
     *
     * 如果无法获取到类似的数据，请传入 undefined 或 1.0 作为默认值，或不做任何处理（默认值即 1.0）
     */
    readonly lowFreqVolume: {
        readonly type: NumberConstructor;
        readonly required: false;
    };
    /**
     * 设置当前渲染缩放比例，如果为 `undefined` 则默认为 `0.5`
     */
    readonly renderScale: {
        readonly type: NumberConstructor;
        readonly required: false;
    };
    /**
     * 设置渲染器，如果为 `undefined` 则默认为 `MeshGradientRenderer`
     * 默认渲染器有可能会随着版本更新而更换
     */
    readonly renderer: {
        readonly type: PropType<{
            new (...args: ConstructorParameters<typeof BaseRenderer>): BaseRenderer;
        }>;
        readonly required: false;
    };
}>> & Readonly<{}>, {
    readonly albumIsVideo: boolean;
    readonly playing: boolean;
    readonly hasLyric: boolean;
}, {}, {}, {}, string, import('vue').ComponentProvideOptions, true, {}, any>;
export {};
