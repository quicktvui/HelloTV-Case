<template>
  <qt-view class="media-menu-root-css" :clipChildren="true">
    <ul class="media-menu-root-list-css" v-if="init" :clipChildren="false" :horizontal="true">
      <li :clipChildren="false" :key="index" :type="1" v-for="(item, index) in menuList">
        <media-menu-button v-if="item.type === 1" ref="fullScreenButtonRef" :icon="fullButtonNormal" text="全屏"
          @click="onFullButtonClick" :vip-focus-icon="fullButtonVIPFocused" :focus-icon="fullButtonFocused" />

        <media-menu-vip-button v-if="!authenticated && item.type === 2" @click="onVIPButtonClick" />

        <media-menu-button v-if="item.type === 3" :focus-icon="isCollected ? favButtonCollected : favButtonFocused"
          :icon="isCollected ? favButtonCollected : favButtonNormal" :text="isCollected ? '已收藏' : '收藏'"
          :vip-focus-icon="favButtonVIPFocused" @click="onFavouriteButtonClick" />
      </li>
    </ul>
  </qt-view>
</template>

<script lang="ts">

import { defineComponent } from "@vue/runtime-core"
import { IMedia } from "../../../api/media/IMedia"
import { useESRouter } from "@extscreen/es3-router"
import media_menu_button from "./media-menu-button.vue"
import media_menu_vip_button from "./media-menu-vip-button.vue"

import fullButtonFocused from "../../../assets/ic_media_full_button_focused.png"
import fullButtonNormal from "../../../assets/ic_media_full_button_normal.png"

import fullButtonVIPFocused from "../../../assets/ic_media_full_button_vip_focused.png"

import favButtonFocused from "../../../assets/ic_media_fav_button_focused.png"
import favButtonVIPFocused from "../../../assets/ic_media_fav_button_vip_focused.png"
import favButtonNormal from "../../../assets/ic_media_fav_button_normal.png"
import favButtonCollected from '../../../assets/ic_media_fav_button_collected.png'

import { ESLogLevel, useESEventBus, useESLog } from "@extscreen/es3-core"
import { IMediaAuthorization } from "../../../api/media/IMediaAuthorization"
import { inject, Ref, ref, watch } from "vue"
import { mediaAuthorizationKey } from "../injectionSymbols"
import { IMediaMenuButton } from "./IMediaMenuButton"

const TAG = "MEDIA_MENU"

export default defineComponent({
  name: "media-menu",
  props: {
    isCollected: Boolean
  },
  components: {
    "media-menu-button": media_menu_button,
    "media-menu-vip-button": media_menu_vip_button
  },
  emits: [
    "onMenuFullButtonClick",
    "onMenuVIPButtonClick",
    "onMenuFavouriteButtonClick"
  ],
  setup(props, context) {
    const log = useESLog()
    const isCollected = ref(props.isCollected)
    const authenticated = ref<boolean>(true)
    const mediaAuthorization: Ref<IMediaAuthorization> =
      inject(mediaAuthorizationKey, {} as any)
    const eventbus = useESEventBus()
    let m: IMedia

    let autofocus = ref<boolean>(false)

    const fullScreenButtonRef = ref<Array<IMediaMenuButton>>()

    const noVipMenuList = [
      { type: 1 }, { type: 3 }
    ]
    const vipMenuList = [
      { type: 1 }, { type: 2 }, { type: 3 }, { type: 3 }, { type: 3 }, { type: 3 }
    ]

    const init = ref<boolean>(true)
    const menuList = ref(noVipMenuList)

    watch(() => props.isCollected, () => isCollected.value = props.isCollected)

    watch(
      () => [mediaAuthorization?.value] as const,
      ([auth], [oldAuth]) => {
        if (mediaAuthorization?.value.auth) {
          authenticated.value = true
          menuList.value = noVipMenuList
          init.value = true
        } else {
          authenticated.value = false
          menuList.value = vipMenuList
          init.value = true
        }
      },
      { flush: "post" }
    )

    function initMedia(media: IMedia) {
      m = media
    }

    function onFullButtonClick() {
      eventbus.emit("onMenuFullButtonClick")
    }

    function onFavouriteButtonClick(e) {
      if (!e) {
        isCollected.value = !isCollected.value
        eventbus.emit("onMenuFavouriteButtonClick", isCollected.value)
      }
    }
    function onVIPButtonClick() {
      eventbus.emit("onMenuVIPButtonClick")
    }

    function setAutofocus(enable: boolean) {
      autofocus.value = enable
    }

    function requestFullButtonFocus(): void {
      let array: Array<IMediaMenuButton> | undefined = fullScreenButtonRef.value
      if (array) {
        if (log.isLoggable(ESLogLevel.DEBUG)) {
          log.d(TAG, "-------requestFullButtonFocus-------->>>>>")
        }
        array[0].requestItemFocus()
      }
    }

    function release() {
      // menuList.value = []
    }

    return {
      init,
      initMedia,
      menuList,
      isCollected,
      fullButtonFocused,
      fullButtonNormal,
      fullButtonVIPFocused,
      onFullButtonClick,
      onFavouriteButtonClick,
      onVIPButtonClick,
      favButtonFocused,
      favButtonNormal,
      favButtonCollected,
      authenticated,
      mediaAuthorization,
      favButtonVIPFocused,
      setAutofocus,
      autofocus,
      requestFullButtonFocus,
      fullScreenButtonRef,
      release
    }
  }
})

</script>

<style scoped>
.media-menu-root-css {
  width: 846px;
  height: 184px;
  position: absolute;
  left: 1016px;
  top: 316px;
  background-color: transparent;
}

.media-menu-root-list-css {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
}
</style>
