<template>
  <qt-view class="bg_player" :clipChildren="false" ref="bg_root">
    <replace-child :focusable="false" :clipChildren="false" @onChildChanged="onChildChanged"
      ref="bg_player_replace_child" markChildSID="bg-player" :replaceOnVisibilityChanged='false'
      class="bg_player_replace_child" sid="bg_player_replace_child_sid">
    </replace-child>
    <qt-view sid="bg-player" class="bg_player_box" :clipChildren="true" :focusable="false" name='home_player'
      :style="{ width: playerBoxWidth + 'px', height: playerBoxHeight + 'px' }">
      <qt-view :style="{ width: playerWidth + 'px', height: playerHeight + 'px' }" v-if="playerInit" :focusable="false"
        :fillParent="true" class="playerBox" :clipChildren="false">
        <es-player-manager :clipChildren="false" ref="playerManagerRef" class="player-manager" :focusable="false"
          :initPlayerWindowType="2" :playerList="playerList" @onPlayerPlaying="onVideoPlayerPlaying"
          @onPlayerCompleted="onVideoPlayerCompleted" @onPlayerInitialized="onPlayerInitialized" />
        <!-- 背景视频遮罩 信息 -->
        <!-- <qt-view class="home_bg_player_view_info" :visible="isFullScreen" :gradientBackground="{colors:['#00000000','#E6000000']}">
          <p class="info_name">{{playerInfo.name}}</p>
          <div class="info_score" v-if="playerInfo.score">
            <span class="info_score_txt">评分：</span>
            <span class="info_score_num">{{playerInfo.score}}</span>
          </div>
          <p class="info_major" v-if="playerInfo.major">主演: {{playerInfo.major}} </p>
        </qt-view> -->
      </qt-view>
      <qt-view class="item_player_focus_bg" :style="{ width: playerWidth + 'px', height: playerHeight + 'px' }"
        :focusable="true" :enableFocusBorder="true" @click="onClickCellItem">
        <img-transition ref="itemCellBgImgRef" :transitionTime="400" :focusable="false" :clipChildren="false"
          class="item_cell_bg_img"
          :style="{ backgroundColor: 'transparent', width: playerWidth + 'px', height: playerHeight + 'px' }">
        </img-transition>
      </qt-view>
      <!-- 背景视频遮罩 -->
      <qt-view class="home_bg_player_view_mask" :visible="bgPlayerType === 2" />
      <!-- 小窗播放列表 -->
      <qt-view class="item_cell_list_front" :style="{ width: playerListWidth + 'px', height: playerListHeight + 'px' }">
        <qt-list-view ref="listViewRef" :clipChildren="true" padding="0,0,0,1" v-if="listInit"
          :visible="bgPlayerType === 1" :style="{ width: playerListWidth + 'px', height: playerListHeight + 'px' }"
          :bringFocusChildToFront="false" :autoscroll='[currentPlayIndex, playerListHeight * 0.5 - 96 * 0.5]'
          :singleSelectPosition="currentPlayIndex" @item-click="onItemClick" @item-focused="onItemFocus">
          <qt-view :type="10001" name="iclf_item" class="iclf_item" :focusable="true" :enableFocusBorder="true"
            :style="{ width: playerListWidth + 'px' }" :clipChildren="true" eventClick eventFocus :focusScale="1">
            <qt-text :focusable="false" :ellipsizeMode="2" :fontSize="26" gravity="left|center" :lines="2" :maxLines="2"
              :duplicateParentState="true" class="iclf_item_text" text="${title}" :paddingRect="[50, 0, 16, 0]" />
            <qt-view class="play_Mark" :focusable="false" :showOnState="['selected', 'focused']"
              :duplicateParentState="true">
              <play-mark :style="{ width: '20px', height: '20px' }" :markColor="'#FF4E46'" :gap="-1"
                style="margin-left: 16px;" :focusable="false" />
            </qt-view>
          </qt-view>
        </qt-list-view>
      </qt-view>
    </qt-view>
  </qt-view>
</template>

<script lang="ts">
import { useESRouter } from "@extscreen/es3-router"
import { ref, defineComponent, markRaw, nextTick } from "vue";
import { QTIListView, QTListViewItem } from "@quicktvui/quicktvui3";
import {
  ESMediaSource,
  ESMediaSourceList,
  ESPlayerPosition,
  ESPlayerPlayMode,
  useESPlayerDecodeManager,
  ESPlayerDecode,
  ESIPlayerInterceptor
} from "@extscreen/es3-player"
import { ESIPlayerManager, ESMediaItemList, ESMediaItem, ESPlayerManager } from "@extscreen/es3-player-manager";
import { ESVideoPlayer } from "@extscreen/es3-video-player";
import { ESLogLevel, useESLog, useESToast } from "@extscreen/es3-core";
import { watch } from "@vue/runtime-core";
import { TabPlayItem } from "../pages/home/build_data/tab_content/impl/TabPlayItem"
import { useLaunch } from "../tools/launch/useApi"
import QtImgTransition from "./qt-img-transition.vue";
export enum CoveredPlayerType {
  TYPE_UNDEFINED = -1,
  TYPE_CELL = 0,
  TYPE_CELL_LIST = 1,
  TYPE_BG = 2,
}
export default defineComponent({
  name: 'waterfall-player',
  components: {
    QtImgTransition,
    'es-player-manager': ESPlayerManager,
  },
  props: {
    active: {
      type: Boolean,
      default: true
    }
  },
  setup(props, ctx) {
    const launch = useLaunch()
    const decode = useESPlayerDecodeManager()
    const router = useESRouter()
    let playerBoxWidth = ref<number>(0)
    let playerBoxHeight = ref<number>(0)
    let playerWidth = ref<number>(1920)
    let playerHeight = ref<number>(1080)
    let playerListWidth = ref<number>(478)
    let playerListHeight = ref<number>(0)
    let bgPlayerType = ref(CoveredPlayerType.TYPE_UNDEFINED)
    const listViewRef = ref<QTIListView>()
    let listDataRec: Array<QTListViewItem> = [];
    const playerManagerRef = ref<ESIPlayerManager>()
    const playerList = ref([markRaw(ESVideoPlayer)])
    const itemCellBgImgRef = ref();
    let bg_player_replace_child = ref()
    let bg_root = ref()
    let playerIsInitialized = ref(false)
    let delayShowTimer: any = -1
    let delayShowPlayerTimer: any = -1
    let delayShowItemCellBgImgTimer: any = -1
    let delayUpdateItemTimer: any = -1
    let onItemFocusTimer: any = -1
    let recordPlayerList: Array<any> = []
    let coverSrc = ''
    let curCoverSrc = ""
    let cellListFocused = false
    let listInit = ref(false)
    let playerInit = ref(false)
    let pauseOnCoverShow = ref(false)
    let isAnyPlaying = ref(false)
    let currentPlayIndex = ref(0)
    let mediaInterceptor: ESIPlayerInterceptor | undefined
    const log = useESLog()
    const toast = useESToast()



    watch(() => props.active, (value) => {
      log.e('BG-PLAYER', `props.active change:${value}`)

    })
    const playAtIndex = (index: number) => {
      let list = recordPlayerList
      currentPlayIndex.value = index
      if (list && list.length > index && index > -1) {
        currentPlayIndex.value = index

        let item = list[index]
        log.e('BG-PLAYER', `playAtIndex item:${JSON.stringify(item)},index:${index}`)
        play(item)
        playerManagerRef.value?.setSize(playerWidth.value, playerHeight.value)
      } else {
        log.e('BG-PLAYER', `playAtIndex error list size = 0,index ${index} `)
      }
    }
    const doChangeParent = (cellReplaceSID: string, playerType: number,
      boxWidth: number, boxHeight: number, playerWidth: number, playerHeight: number,
      playerListData: any, playIndex: number, interceptor?: ESIPlayerInterceptor) => {
      mediaInterceptor = interceptor
      clearTimeout(delayShowTimer)
      clearTimeout(delayShowPlayerTimer)
      bgPlayerType.value = playerType
      log.i(`BG-PLAYER`, `doChangeCell cellReplaceSID:${cellReplaceSID},playerType:${playerType},
      boxWidth:${boxWidth},boxHeight:${boxHeight},playerWidth:${playerWidth},playerHeight:${playerHeight},playIndex:${playIndex},playerListDataSize:${playerListData == null ? 0 : playerListData.length}`)
      //Native.callUIFunction(bg_root.value,'dispatchFunctionBySid', [cellReplaceSID,'setChildSID',['bg-player']]);
      showCoverImmediately()
      if (isAnyPlaying.value) {
        stop()
      }
      let delayToPlay = 0
      if (!playerInit.value) {
        playerInit.value = true
        delayToPlay += 2000
        log.e('BG-PLAYER', `doChangeParent 首次初始化播放器`)
      }
      let item0 = playerListData[0]
      initPlayBg(item0.cover)
      currentPlayIndex.value = playIndex
      delayShowTimer = setTimeout(() => {
        initComponent(playerListData, playerType)
        setSize(boxWidth, boxHeight, playerWidth, playerHeight)
        playAtIndex(playIndex)
        // delayShowPlayer(300)
      }, delayToPlay)
    }

    const keepPlayerInvisible = (stopIfNeed: boolean = true) => {
      log.e('DebugReplaceChild', `+++++keepPlayerInvisible pauseIfNeed:${stopIfNeed}`)
      // clearTimeout(delayShowPlayerTimer)
      if (stopIfNeed) {
        if (isAnyPlaying.value) {
          isAnyPlaying.value = false
          stop()
        }
      }
    }

    /**
     *
     * @param delay delay执行显示
     * @param pauseIfNeed
     * @param showAfterDelay
     */
    const delayShowPlayer = (delay: number = 300) => {
      log.e('BG-PLAYER', `+++++delayShowPlayer delay:${delay}`)
      bg_root.value?.dispatchFunctionBySid('bg-player', 'changeAlpha', [0])
      clearTimeout(delayShowPlayerTimer)
      delayShowPlayerTimer = setTimeout(() => {
        log.e('DebugReplaceChild', `----set bgPlayerOpacity 1 on changeParent`)
        bg_root.value?.dispatchFunctionBySid('bg-player', 'changeAlpha', [1])
      }, delay)
    }

    const initComponent = (playerListData: any, playerType: number) => {
      recordPlayerList = []
      if (delayShowTimer) clearTimeout(delayShowTimer)
      if (delayShowItemCellBgImgTimer) clearTimeout(delayShowItemCellBgImgTimer)
      recordPlayerList = JSON.parse(JSON.stringify(playerListData))
      if (!playerIsInitialized.value) initPlayer();

      if (playerType == CoveredPlayerType.TYPE_CELL) {
        setPlayMediaListMode(3)
      } else if (playerType == CoveredPlayerType.TYPE_BG) {
        setPlayMediaListMode(3)
      } else if (playerType == CoveredPlayerType.TYPE_CELL_LIST) {
        listInit.value = true
        setPlayMediaListMode(3)
        if (!playerListData) return
        let arr: Array<QTListViewItem> = []
        for (let i = 0; i < playerListData.length; i++) {
          let el = playerListData[i]
          el.type = 10001;
          el.decoration = {};
          el.isPlaying = (i === 0);
          arr.push(el)
        }
        nextTick(() => {
          listDataRec = listViewRef.value!.init(arr)
        })
      }
    }

    const reset = () => {
      log.e('BG-PLAYER', `reset`)
      clearTimeout(delayShowTimer)
      clearTimeout(delayShowPlayerTimer)
      stop()
      release()
    }
    const setSize = (width: number, height: number, pWidth: number, pHeight: number) => {
      playerBoxWidth.value = width
      playerBoxHeight.value = height
      playerListWidth.value = width - pWidth
      playerListHeight.value = height
      playerWidth.value = pWidth
      playerHeight.value = pHeight
      // playerManagerRef.value?.setSize(playerWidth,playerHeight)
      playerManagerRef.value?.setSize(playerWidth.value, playerHeight.value)
    }
    // cell-img-transition api

    const initPlayBg = (backgroundImage: any) => {
      curCoverSrc = backgroundImage
      let imgBg = !!backgroundImage ? backgroundImage : 'http://qcloudcdn.a311.ottcn.com/channelzero_image/web_static/extend_screen/mood/video_bj_01.png'
      setBgImage(imgBg)
    }

    function resetCellImage() {
      itemCellBgImgRef.value?.reset()
    }
    const showCoverImmediately = (pausePlay = false) => {
      clearTimeout(dismissCoverTimer)
      pauseOnCoverShow.value = pausePlay
    }

    const setCurBg = () => {
      if (curCoverSrc) {
        coverSrc = curCoverSrc
        itemCellBgImgRef.value.setNextImage(curCoverSrc)
      } else {
        coverSrc = ""
        itemCellBgImgRef.value.setNextColor(0)
      }
    }

    const setBgImage = (imgUrl: string) => {
      if (coverSrc === imgUrl) {
        return
      }
      coverSrc = imgUrl
      if (imgUrl) {
        itemCellBgImgRef.value.setNextImage(imgUrl)
      } else {
        itemCellBgImgRef.value.setNextColor(0)
      }
    }

    const requestDismissCover = (delay = 1000) => {
      if (isAnyPlaying.value) {
        clearTimeout(dismissCoverTimer)
        pauseOnCoverShow.value = false
        dismissCoverTimer = setTimeout(() => {
          setBgImage("")
        }, delay)
      }
    }
    //player api
    const initPlayer = () => playerManagerRef.value?.initialize()
    const play = (item: TabPlayItem) => {
      const isRequestUrl = item.isRequestUrl
      let mediaItem_0: ESMediaItem
      let playList: ESMediaItemList
      log.e("XRG", `isRequestUrl = ${isRequestUrl} mediaInterceptor = ${mediaInterceptor}`)
      if (isRequestUrl && mediaInterceptor) {
        log.e("XRG", `准备拦截数据`)
        mediaItem_0 = {
          id: item.id,
          interceptors: [mediaInterceptor],
        }
      }
      else {
        const url = item.url
        mediaItem_0 = {
          mediaSourceList: {
            index: 0,
            list: [{
              uri: url
            }]
          },
        }
      }
      playList = {
        index: 0,
        list: [mediaItem_0]
      }
      playerManagerRef.value?.playMediaList(playList);
    }
    const release = () => {
      log.e('BG-PLAYER', `release called`)
      playerManagerRef.value?.release()
    }
    const stop = () => {
      log.e('BG-PLAYER', `stop called`)
      playerManagerRef.value?.stop()
      if (isAnyPlaying.value) {
        isAnyPlaying.value = false
      }
    }

    const stopIfNeed = () => {
      log.e('BG-PLAYER', `stop called`)
      if (isAnyPlaying.value) {
        isAnyPlaying.value = false
        playerManagerRef.value?.stop()
      }
    }
    const pause = () => {
      log.d('BG-PLAYER', `pause`)
      playerManagerRef.value?.stop()
      if (isAnyPlaying.value) {
        isAnyPlaying.value = false
      }
    }
    const resume = () => {
      log.d('BG-PLAYER', `resume`)
      //FIXME 这里使用了start方法，应该是resume?
      playerManagerRef.value?.resume()
    }
    const setPlayMediaListMode = (playMode: ESPlayerPlayMode) => playerManagerRef.value?.setPlayMediaListMode(playMode)
    let dismissCoverTimer: any
    const onVideoPlayerPlaying = () => {
      console.log("XRG===", `dismissCoverTimer ${dismissCoverTimer} isAnyPlaying.value isAnyPlaying.value`)
      clearTimeout(dismissCoverTimer)
      isAnyPlaying.value = true
      if (pauseOnCoverShow.value) {
        pause()
      } else {
        console.log("XRG===", `recordPlayerList[currentPlayIndex.value].url ${recordPlayerList[currentPlayIndex.value].url}`)
        requestDismissCover(1500)
      }
    }

    const onClickCellItem = (e) => {
      router.push({
        name: 'screen_main_view',
        params: {}
      });
      //事件需要大于onItemFocus 中的时间
      clearTimeout(onItemFocusTimer)
      setTimeout(() => { stop() }, 900)
    }
    const onItemClick = (e) => {
      router.push({
        name: 'screen_main_view',
        params: {}
      });
      //事件需要大于onItemFocus 中的时间
      clearTimeout(onItemFocusTimer)
      setTimeout(() => { stop() }, 900)
    }
    const onItemFocus = (e) => {
      cellListFocused = e.hasFocus
      if (e.hasFocus && e.position != currentPlayIndex.value) {
        onItemFocusTimer && clearTimeout(onItemFocusTimer)
        onItemFocusTimer = setTimeout(() => {
          dealwithItemPlay(e.item, e.position)
        }, 400)
      }
    }
    const dealwithItemPlay = (item: any, nextIndex: any) => {
      listViewRef.value?.clearPostTask()
      if (delayUpdateItemTimer) clearTimeout(delayUpdateItemTimer)
      listViewRef.value?.setItemSelected(nextIndex, true)
      initPlayBg(item.cover)

      showCoverImmediately()
      delayUpdateItemTimer = setTimeout(() => {
        listDataRec[currentPlayIndex.value].isPlaying = false
        currentPlayIndex.value = nextIndex
        stop()
        listDataRec[nextIndex].isPlaying = true
        play(item)
        playerManagerRef.value?.setSize(playerWidth.value, playerHeight.value)
      }, 300)
    }
    const onPlayerInitialized = () => {
      // decode.setDecode(ESPlayerDecode.ES_PLAYER_DECODE_HARDWARE)
      playerIsInitialized.value = true
    }
    const onVideoPlayerCompleted = () => {
      if (bgPlayerType.value == CoveredPlayerType.TYPE_CELL_LIST) {
        if (!cellListFocused) {
          if (currentPlayIndex.value + 1 >= recordPlayerList.length) dealwithItemPlay(recordPlayerList[0], 0)
          else dealwithItemPlay(recordPlayerList[currentPlayIndex.value + 1], currentPlayIndex.value + 1)
        }
      }
    }
    const onChildChanged = (e) => {
      // console.log(e,'onChildChangedonChildChangedonChildChangedonChildChangedonChildChanged')
    }
    return {
      playerList, bg_player_replace_child, itemCellBgImgRef, reset, bg_root,
      playerManagerRef, release, stop, pause, resume, initPlayer, play,
      playerBoxWidth, playerBoxHeight, playerListWidth, playerListHeight,
      playerWidth, playerHeight, playerIsInitialized,
      listViewRef, onItemClick, currentPlayIndex, onItemFocus, onClickCellItem,
      requestDismissCover, setCurBg, setBgImage,
      initPlayBg, delayShowPlayer, playerInit,
      onVideoPlayerPlaying, onVideoPlayerCompleted, onPlayerInitialized,
      initComponent, setSize, onChildChanged, showCoverImmediately,
      playAtIndex, doChangeParent, bgPlayerType, listInit, pauseOnCoverShow, isAnyPlaying, stopIfNeed,
      keepPlayerInvisible
    };
  },
});
</script>

<style>
.bg_player {
  width: 1920px;
  height: 1080px;
  background-color: transparent;
  flex-direction: row;
  justify-content: center;
  align-items: center;
}

.bg_player_replace_child {
  width: 1920px;
  height: 1080px;
  background-color: transparent;
  position: absolute;
}

.bg_player_box {
  width: 1920px;
  height: 1080px;
  background-color: transparent;
  position: absolute;
  border-radius: 8px;
  top: 0;
  left: 0;
}

.playerBox {
  background-color: rgba(0, 0, 0, 0.1);
  focus-border-style: solid;
  focus-border-color: #fff;
  focus-border-width: 2px;
  focus-border-radius: 0;
}

.player-manager {
  width: 1920px;
  height: 1080px;
  background-color: transparent;
  position: absolute;
  left: 0;
  top: 0;
  z-index: -1;
  border-radius: 8px;
}

.home_bg_player_view_mask {
  background-color: rgba(0, 0, 0, 0.5);
  width: 1920px;
  height: 1080px;
  top: 0;
  position: absolute;
}

.item_cell_bg_img {
  background-color: transparent;
  position: absolute;
  left: 0;
  top: 0;
  border-radius: 0px;
}

.item_cell_list_front {
  background-color: rgba(255, 255, 255, 0.1);
  position: absolute;
  right: 0;
  top: 0;
}

.iclf_item {
  height: 96px;
  background-color: transparent;
  border-bottom-width: 1px;
  border-bottom-color: rgba(255, 255, 255, 0.1);
  focus-border-style: solid;
  focus-border-color: #fff;
  focus-border-width: 2px;
  focus-border-radius: 0;
  focus-background-color: #fff;
  z-index: 99;
}

.item_player_focus_bg {
  focus-border-style: solid;
  focus-border-color: #fff;
  focus-border-radius: 0;
  background-color: transparent;
  position: absolute;
  left: 0;
  top: 0;
  border-radius: 0px;
}

.iclf_item .play_Mark {
  width: 45px;
  height: 30px;
  background-color: transparent;
  position: absolute;
  left: 0;
  top: 38px;
}

.iclf_item_text {
  position: absolute;
  height: 96px;
  color: #fff;
  left: 0;
  focus-color: #000;
  width: 482px;
  select-color: #FF4E46;
  background-color: transparent;
}
</style>
