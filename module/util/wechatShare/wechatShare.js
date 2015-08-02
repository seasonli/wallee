/**
 * @Fileoverview JWeixin Loader
 * @Author SeasonLi | season.chopsticks@gmail.com
 * @Version 1.0 | 2015-02-10 | SeasonLi    // Initial version
 **/

define(['lib-zepto', 'util/wechatShare/jweixin.1.0.0'], function($, wx) {
  return {
    init: function(config) {
      wx.config({
        debug: config.debug || false,
        appId: config.appId || '',
        timestamp: config.timestamp || 0,
        nonceStr: config.nonceStr || '',
        signature: config.signature || '',
        jsApiList: ['onMenuShareTimeline', 'onMenuShareAppMessage']
      });
      return wx;
    },
    setContent: function(config) {
      var config = config || {};
      wx.onMenuShareTimeline({
        title: config.title || $('title').html(),
        link: config.link || window.location.href,
        imgUrl: config.imgUrl,
        success: function() {
          config.success && config.success();
        },
        cancel: function() {
          config.cancel && config.cancel();
        }
      });
      wx.onMenuShareAppMessage({
        title: config.title || $('title').html(),
        desc: config.desc || $('title').html(),
        link: config.link || window.location.href,
        imgUrl: config.imgUrl,
        type: config.type || 'link',
        dataUrl: config.dataUrl || '',
        success: function() {
          config.success && config.success();
        },
        cancel: function() {
          config.cancel && config.cancel();
        }
      });
    }
  }
});