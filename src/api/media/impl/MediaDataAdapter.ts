import { IMedia } from "../IMedia";
import { Media } from "./Media";
import { IMediaAuthorization } from "../IMediaAuthorization";
import { MediaAuthorization } from "./MediaAuthorization";
import { IMediaAuthType } from "../IMediaAuthType";

export function buildMedia(media: Media): IMedia {
  // 分集总数
  let epCount = media.vod_play_url.split('#').length
  let m: IMedia = {
    id: media.vod_id,
    title: media.vod_name,

    type: '1',
    tags: media.vod_tag,
    //
    coverH: media.vod_pic,
    coverV: media.vod_pic,
    directors: media.vod_director,

    //
    language: media.vod_lang,
    releaseDate: media.vod_time,
    licenceNum: '0',
    //
    subtitle: media.vod_sub,
    actors: media.vod_actor,
    introduction: media.vod_content,

    score: media.vod_score,

    itemList: {
      id: media.vod_id,
      title: media.vod_name,
      count: epCount,
      type: 0,
      enable: epCount > 1
    },
    //
    itemListId: media.vod_id,
    // 分集的总数
    itemListCount: epCount,
    // 权益类型
    authType: IMediaAuthType.MEDIA_AUTH_TYPE_FREE,

    // 视频分类
    typeId: media.type_id,
    // 视频分类名称
    typeName: media.type_name,
    // 播放ID
    playId: '',
    // 播放地址
    playUrl: media.vod_play_url,
    // 分集时长
    duration: media.vod_duration
  }
  return m
}

export function buildMediaList(mediaList: Array<Media>): Array<IMedia> {
  const medias: Array<IMedia> = []
  for (let i = 0; i < mediaList.length; i++) {
    const m = mediaList[i]
    medias.push(buildMedia(m))
  }
  return medias
}

export function buildMediaAuthorization(authorization: MediaAuthorization): IMediaAuthorization {
  let mediaType = IMediaAuthType.MEDIA_AUTH_TYPE_VIP
  if (authorization.typeCode == 'FREE') {
    mediaType = IMediaAuthType.MEDIA_AUTH_TYPE_FREE
  }

  let auth: IMediaAuthorization = {
    id: authorization.assetLongId,
    auth: authorization.auth,
    payType: authorization.payType,
    type: mediaType,
    typeName: authorization.typeName,
  }
  return auth
}
