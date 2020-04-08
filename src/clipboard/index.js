/***
 * TODO: clipboard 需要进行代码优化，去重和模块化,严重需要重构的代码，重构时间预计：2周
 */
epub360.PlayerPlugins.push({
    type: 'actionexecute',
    config: {
        type: 512,
        exec: function (actionview, _promise_queue, debug_info) {

            _promise_queue.immediate(function () {
                var iDetail = actionview.model.get('iDetail');
                var result = iDetail.results[0];
                var overlay = result['overlay'];
                if (!overlay) return;
                var page = interaction_view.getAnimationPage(overlay.page_id, actionview.model.page);
                if (!page) return;
                var overlaymodel = page.iOverlaylist.get(overlay.id);
                if (!overlaymodel) return;

                var canvasList = $("div[id='" + overlay.id + "'][data-type='ClipBoard']").first();
                var canvasq = document.createElement('canvas');
                canvasList.append(canvasq);
                canvasq.id = "clipboard";
                $("#clipboard").hide();
                var chooseElement = overlaymodel.toJSON().iDetail.chooseElement;
                var element_id = actionview.model.attributes.iDetail.results[0].image_url;
                var countImgLoad = 0, countLoaded = 0; // 用于统计已经完成 预加载的图片元素, 统计已经完成渲染的所有的组件的数量
                var elementTypeArr = {};
                elementTypeArr.overlaylist = [];
                elementTypeArr.masterpage = [];
                elementTypeArr.background = [];
                var elementArr = [];
                var clipboard_area_style = {};
                var need_file = overlaymodel.toJSON().iDetail.need_file;
                var clipboard_area = overlaymodel.toJSON().iDetail.clipboard_area;
                /* ******************************************************************************** 设置截屏的精度，2：2倍，3：3倍， 1：依据设备精度 **/
                var clipboard_ratio = overlaymodel.toJSON().iDetail.clipboard_ratio || 2; // 兼容老的设置，默认2倍，精度越高，生成的文件越大
                var ratio = (clipboard_ratio == 1) ? window.devicePixelRatio : clipboard_ratio;
                /**********************************************************************************  END */
                var clipboard_area_data = overlaymodel.toJSON().iCommon.landscape;

                if (overlaymodel.toJSON().iDetail.iStyle) {
                    var clipboard_area_style_array = overlaymodel.toJSON().iDetail.iStyle.replace(/\-/g, '_').split(';');
                    for (var i = 0; i < clipboard_area_style_array.length; i++) {
                        var arr_split = clipboard_area_style_array[i].split(':')
                        clipboard_area_style[$.trim(arr_split[0])] = $.trim(arr_split[1])
                    }
                }

                //没有选择截屏区域
                if (!clipboard_area) {
                    canvasq.width = Number(interaction_view.size.x) * ratio; //☜
                    if (interaction_view.ipagelist.getPage(interaction_view.currentPage).get('height')) {
                        canvasq.height = Number(interaction_view.ipagelist.getPage(interaction_view.currentPage).get('height')) * ratio;
                    }
                    else {
                        canvasq.height = Number(interaction_view.size.y) * ratio;
                    }
                } else {
                    $(canvasq).css({
                        'margin-top': Number(clipboard_area_data.iStarty) * ratio,
                        'margin-left': Number(clipboard_area_data.iStartx) * ratio,
                    })

                    canvasq.width = Number(clipboard_area_data.iWidth) * ratio;
                    canvasq.height = Number(clipboard_area_data.iHeight) * ratio;
                }
                //选择的截屏元素
                if (chooseElement && chooseElement.length) {
                    for (var i = 0; i < chooseElement.length; i++) {
                        var element = page.iOverlaylist.get(chooseElement[i].id);
                        if (element && !element.iview.$el.hasClass("hide")) {
                            elementTypeArr.overlaylist.push(element)
                        } else if (interaction_view.imasterlist.at(0).iOverlaylist.get(chooseElement[i].id)) {
                            element = interaction_view.imasterlist.at(0).iOverlaylist.get(chooseElement[i].id)
                            if (element && !element.iview.$el.hasClass("hide")) {
                                elementTypeArr.masterpage.push(element)
                            }
                        } else if (interaction_view.ibackgroundlist.at(0).iOverlaylist.get(chooseElement[i].id)) {
                            element = interaction_view.ibackgroundlist.at(0).iOverlaylist.get(chooseElement[i].id)
                            if (element && !element.iview.$el.hasClass("hide")) {
                                elementTypeArr.background.push(element)
                            }
                        }
                    }
                }// 目的是将所选元素进行排序，background 元素需要先执行，masterpage 元素需要最后执行。
                if (elementTypeArr.background && elementTypeArr.background.length) {
                    sortArr(elementTypeArr.background)
                    // for(var i=0;i<elementTypeArr.background.length; i++) {
                    //   elementArr.push(elementTypeArr.background[i])
                    // }
                }
                if (elementTypeArr.overlaylist && elementTypeArr.overlaylist.length) {
                    sortArr(elementTypeArr.overlaylist)
                    // for(var i=0; i<elementTypeArr.overlaylist.length; i++) {
                    //   elementArr.push(elementTypeArr.overlaylist[i])
                    // }
                }
                if (elementTypeArr.masterpage && elementTypeArr.masterpage.length) {
                    sortArr(elementTypeArr.masterpage)
                    // for(var i=0; i<elementTypeArr.masterpage.length; i++) {
                    //   elementArr.push(elementTypeArr.masterpage[i])
                    // }
                }

                var canvas = document.getElementById("clipboard");
                var ctx = canvas.getContext("2d");
                //选择截屏区域
                if (clipboard_area) {
                    // if (clipboard_area_style.background_color) {
                    //     ctx.fillStyle = clipboard_area_style.background_color;
                    //     ctx.fillRect(0, 0, Number(clipboard_area_data.iWidth) * ratio, Number(clipboard_area_data.iHeight) * ratio);
                    // }
                    // ctx.fillRect(0,0,Number(clipboard_area_data.iWidth) * ratio,Number(clipboard_area_data.iHeight) * ratio);

                    if (clipboard_area_style.border_top_style && (clipboard_area_style.border_top_width || clipboard_area_style.border_top_left_radius)) {

                        var r = Number(clipboard_area_style.border_top_left_radius.replace('px', '')) * ratio,
                            x = Number(clipboard_area_data.iWidth) * ratio,
                            y = Number(clipboard_area_data.iHeight) * ratio
                        if (r > Math.min(Number(clipboard_area_data.iWidth) * ratio / 2, Number(clipboard_area_data.iHeight) * ratio / 2)) {
                            r = Math.min(Number(clipboard_area_data.iWidth) * ratio / 2, Number(clipboard_area_data.iHeight) * ratio / 2)
                        }

                        ctx.beginPath();
                        ctx.moveTo(r, 0);
                        /***
                         * 注意 arcTo 方法 r 半径的值不能小于0 ， 下同
                         * @type {number}
                         */
                        r = r < 0 ? 0 : r;
                        ctx.arcTo(x, 0, x, y, r);
                        ctx.arcTo(x, y, 0, y, r);
                        ctx.arcTo(0, y, 0, 0, r);
                        ctx.arcTo(0, 0, x, 0, r);

                        if (clipboard_area_style.background_color) {
                            ctx.fillStyle = clipboard_area_style.background_color;
                            ctx.fill();
                        }

                        ctx.strokeStyle = clipboard_area_style.border_top_color || 'black';
                        ctx.lineWidth = Number(clipboard_area_style.border_top_width.replace('px', '')) * ratio * 2 || 1;
                        ctx.clip()
                        ctx.stroke();

                    }
                    // else if (clipboard_area_style.border_top_style && clipboard_area_style.border_top_width) {
                    //     // ctx.save();
                    //     ctx.lineWidth = Number(clipboard_area_style.border_top_width.replace('px', '')) * ratio * 2;
                    //     if (clipboard_area_style.border_top_color) {
                    //         ctx.strokeStyle = clipboard_area_style.border_top_color
                    //     }
                    //     ctx.strokeRect(0, 0, Number(clipboard_area_data.iWidth) * ratio, Number(clipboard_area_data.iHeight) * ratio)
                    //     // ctx.stroke();
                    //     // ctx.restore();
                    // }

                    ctx.translate(-Number(clipboard_area_data.iStartx) * ratio, -Number(clipboard_area_data.iStarty) * ratio)
                }
                //对截屏元素进行排序
                if (elementArr.length) drawItem(elementArr[0]); // 画第一个

                function sortArr(arr) { // 根据 zindex 来排列渲染顺序。
                    var sortA = function sort(a, b) {
                        return a.toJSON().zIndex - b.toJSON().zIndex;
                    }
                    arr.sort(sortA);
                    for (var i = 0; i < arr.length; i++) {
                        elementArr.push(arr[i])
                    }
                }

                //在canvas上渲染元素
                function drawItem(element) {
                    // 在 canvas 上进行元素的渲染

                    var landscape = element.toJSON().iCommon.landscape;

                    if (element.isMasterOverlay || element.isBackgroundOverlay) {    // 当 element 为background 或者 masterpage 时，其相对位置是相对整个容器的，意思是容器会针对不同手机自适应，自适应方法为设置 margin-top 和 margin-left 。此处Reveal.marginLeft 就为自适应时的margin 值。
                        landscape.iStartx = interaction_view.transform.getState(element)['position']['x'] - interaction_view.transform.getState(element)['size']['width'] / 2 - Reveal.marginLeft;
                        landscape.iStarty = interaction_view.transform.getState(element)['position']['y'] - interaction_view.transform.getState(element)['size']['height'] / 2 - Reveal.marginTop;
                    } else {
                        landscape.iStartx = interaction_view.transform.getState(element)['position']['x'] - interaction_view.transform.getState(element)['size']['width'] / 2;
                        landscape.iStarty = interaction_view.transform.getState(element)['position']['y'] - interaction_view.transform.getState(element)['size']['height'] / 2;
                    }

                    var rotatez = element.toJSON().iDetail.init_rotation;
                    var zindex = element.iview.zIndex;
                    var opacity = element.toJSON().iDetail.init_opacity;
                    var detail = element.toJSON().iDetail;

                    // 如果图片是通过微信拍照上传，需要考虑用户调整情况,并且这种情况只是针对可编辑的图片，否则忽略这种属性的调整
                    if (element.attributes.iDetail.iEditable && element._scale) {
                        landscape._x = parseFloat(element._x);
                        landscape._y = parseFloat(element._y);
                        landscape._scale = parseFloat(element._scale);
                    }

                    /*
                    * 画微信头像、图片容器、图片、幻灯片、序列帧、二维码、等的方式
                    * */

                    const type = element.toJSON().iType
                    const drawOpts = [element, canvas, ctx, landscape, rotatez, zindex, opacity, detail]

                    if (["Avatar"].includes(type)) {
                        drawAvatar(...drawOpts);
                    } else if (
                        ["ImageBlock", "Image", "CycleImage", "Gallery", "Slide", "qrcode"].includes(type)
                    ) {
                        if (detail.effect && detail.effect == 2) {
                            // 这代表是可擦除的图片。
                            drawCanvas(...drawOpts);
                        } else {
                            drawDiffImage(...drawOpts);
                        }
                    } else if (["Paragraph", "Webfont"].includes(type)) {
                        if (detail.iStaticImage) {
                            drawDiffImage(...drawOpts);
                        } else {
                            drawParagraph(...drawOpts);
                        }
                    }
                }
                //画微信头像
                function drawAvatar(element, canvas, ctx, landscape, rotatez, zindex, opacity, detail) {
                    var iNickname = element.toJSON().iDetail.iNickname
                    var we_avatar = $(element.iview.el).find('.thumb');
                    var we_name = $(element.iview.el).find('.iTextLabel');
                    var we_nameW = Number(we_name.width()) * ratio;
                    // var we_name_relativeX = Number(we_name.parent().css('transform').split('(')[1].split(',')[4]) + Number(we_name.css('left').replace('px', ''));
                    var we_name_relativeX = Number(we_name.parent()[0]._gsTransform.x) + Number(we_name.css('left').replace('px', ''));   // element._gsTransform 是对 dom 对象的操作，通过解析 transform 来获取 position。
                    // var we_name_relativeY = Number(we_name.parent().css('transform').split('(')[1].split(',')[5].split(')')[0]) + Number(we_name.css('top').replace('px', ''));
                    var we_name_relativeY = Number(we_name.parent()[0]._gsTransform.y) + Number(we_name.css('top').replace('px', ''));
                    var we_name_lineheight = Number(we_name.css('line-height').replace("px", ""))

                    var fontsize = (Number(we_name.css('font-size').replace("px", "")) * ratio) + "px";
                    var fontWeight = we_name.css('font-weight');
                    var fontfamily = we_name.css('font-family').split(",")[2];
                    var we_avatar_style = {
                        "borderColor": we_avatar.css('border-color'),
                        "borderWidth": Number(we_avatar.css('border-width').replace("px", "")) * ratio,
                        "borderStyle": we_avatar.css('border-style'),
                        "borderRadius": Number(we_avatar.css('border-radius').replace("px", "")) * ratio,
                        "background": we_avatar.css('background'),
                        "background-size": we_avatar.css('background-size')
                    }

                    var imgPos = {
                        "left": Number(landscape.iStartx) * ratio,
                        "top": Number(landscape.iStarty) * ratio,
                        "width": Number(landscape.iWidth) * ratio,
                        "height": Number(landscape.iHeight) * ratio,
                    }

                    var we_img = new Image();
                    var _src = we_avatar.css("background-image").replace(/url\((.*)\)/, '$1').replace(/"/g, '');
                    interaction_view.setCrossOrigin(we_img, _src);
                    we_img.src = _src;

                    var avatar_nameX = we_name_relativeX * ratio;
                    var avatar_nameY = we_name_relativeY * ratio;
                    ctx.save();
                    ctx.translate(imgPos.left + imgPos.width / 2, imgPos.top + imgPos.height / 2);
                    ctx.rotate(rotatez * Math.PI / 180);

                    var we_nameX_reltv_pic
                    if (we_name.css('text-align') === 'center') {
                        we_nameX_reltv_pic = avatar_nameX + we_nameW / 2 - imgPos.width / 2
                    } else if (we_name.css('text-align') === 'left' || we_name.css('text-align') === 'justify') {
                        we_nameX_reltv_pic = -(imgPos.width / 2 - avatar_nameX)
                    } else if (we_name.css('text-align') === 'right') {
                        we_nameX_reltv_pic = avatar_nameX + we_nameW - imgPos.width / 2
                    }
                    var we_nameY_reltv_pic = Number(avatar_nameY - imgPos.height / 2)
                    var we_name_text = we_name.text();

                    ctx.globalAlpha = opacity;//为每张图片添加不同的透明度，因globalalpha是全局，所以每次需要ctx.save之后再restore重新变成默认透明度

                    if (iNickname) {                                         // 是否显示昵称画微信名字
                        ctx.font = fontWeight + " " + fontsize + " " + fontfamily;
                        ctx.fillStyle = we_name.css('color');
                        if (we_name.css('text-align') === 'center') {
                            ctx.textAlign = 'center';
                        } else if (we_name.css('text-align') === 'left' || we_name.css('text-align') === 'justify') {
                            ctx.textAlign = 'left';
                        } else if (we_name.css('text-align') === 'right') {
                            ctx.textAlign = 'right';
                        }
                        ctx.textBaseline = "middle";
                        ctx.fillText(we_name_text, we_nameX_reltv_pic, we_nameY_reltv_pic + we_name_lineheight * ratio / 2)
                    }

                    if (imgPos.width == imgPos.height && we_avatar_style.borderRadius > imgPos.width / 2 && we_avatar_style.borderRadius > imgPos.height / 2) {

                        ctx.beginPath();
                        ctx.arc(0, 0, imgPos.width / 2, 0, 2 * Math.PI, false);
                        ctx.lineWidth = we_avatar_style.borderWidth * 2;
                        ctx.clip();
                    } else {
                        var r,
                            x = -imgPos.width / 2,
                            y = -imgPos.height / 2,
                            w = imgPos.width,
                            h = imgPos.height;
                        if (we_avatar_style.borderRadius > imgPos.height / 2) {
                            r = imgPos.height / 2
                        } else if (we_avatar_style.borderRadius <= imgPos.height / 2) {
                            r = we_avatar_style.borderRadius
                        }

                        ctx.beginPath();
                        ctx.moveTo(x + r, y);
                        r = r < 0 ? 0 : r;
                        ctx.arcTo(x + w, y, x + w, y + h, r);
                        ctx.arcTo(x + w, y + h, x, y + h, r);
                        ctx.arcTo(x, y + h, x, y, r);
                        ctx.arcTo(x, y, x + w, y, r);

                        ctx.lineWidth = we_avatar_style.borderWidth * 2;
                        ctx.clip();
                    }
                    if (we_img.complete) {
                        ctx.drawImage(we_img, -(imgPos.width / 2) + we_avatar_style.borderWidth, -(imgPos.height / 2) + we_avatar_style.borderWidth, imgPos.width - we_avatar_style.borderWidth * 2, imgPos.height - we_avatar_style.borderWidth * 2);
                        ctx.strokeStyle = we_avatar_style.borderColor
                        ctx.stroke();
                        ctx.restore();
                        countLoaded++;
                        canvasToImg();
                    } else {
                        we_img.onload = function () {
                            ctx.drawImage(we_img, -(imgPos.width / 2) + we_avatar_style.borderWidth, -(imgPos.height / 2) + we_avatar_style.borderWidth, imgPos.width - we_avatar_style.borderWidth * 2, imgPos.height - we_avatar_style.borderWidth * 2);
                            ctx.strokeStyle = we_avatar_style.borderColor
                            ctx.stroke();
                            ctx.restore();
                            countLoaded++;
                            canvasToImg();
                        }
                    }
                }

                //画擦除的图片（canvas）
                function drawCanvas(element, canvas, ctx, landscape, rotatez, zindex, opacity, detail) {
                    var canvas = element.iview.$el.find(".el_wrap").find('canvas')[0]
                    var x = Number(landscape.iStartx) * ratio,
                        y = Number(landscape.iStarty) * ratio,
                        w = Number(landscape.iWidth) * ratio,
                        h = Number(landscape.iHeight) * ratio
                    ctx.save();
                    ctx.globalAlpha = opacity;
                    ctx.translate(x + w / 2, y + h / 2);
                    ctx.rotate(rotatez * Math.PI / 180);
                    ctx.drawImage(canvas, -w / 2, -h / 2);
                    ctx.restore();
                    countLoaded++;
                    canvasToImg();
                }
                //画图片
                function drawDiffImage(element, canvas, ctx, landscape, rotatez, zindex, opacity, detail) {
                    var background_image, iMask_image;
                    var $el;
                    var isSvg = false;
                    var iImgMaskUrl, iImgMaskData;
                    if (element.toJSON().iType == 'Slide' || element.toJSON().iType == "CycleImage") {
                        $el = element.iview.$el.find(".slidecontent");
                    } else {
                        $el = element.iview.$el.find(".el_wrap");
                    }
                    var style = {
                        "borderWidth": Number($el.css("border-width").replace('px', '')) * ratio,
                        "borderColor": $el.css("border-color"),
                        "borderRadius": Number($el.css("border-radius").replace('px', '')) * ratio,
                        "borderStyle": $el.css("border-style")
                    }
                    var img = new Image(), _src;
                    if ($el.css('background-image') != 'none' && $el.css('background-image') != undefined) {
                        _src = $el.css('background-image').match(/url\(\"?(.[^"]*)\"?\)/)[1]
                    } else if (element.toJSON().iType == "CycleImage") {
                        var cycleimage_index = element.iview.currentIndex;
                        _src = element.iImgs[cycleimage_index].src
                    } else if ($(element.iview.el).find("img").length == 0) {
                        countLoaded++;
                        canvasToImg();
                        return;
                    } else if (element.toJSON().iType == "Slide") {
                        var slide_Idx = element.iview.currentSlideIndex;
                        _src = $(element.iview.el).find("img").eq(slide_Idx).attr("src");
                    } else {
                        _src = $(element.iview.el).find("img").attr("src");
                    }
                    interaction_view.setCrossOrigin(img, _src);
                    img.src = _src;

                    if (detail.iImgMask && detail.iImgMaskUrl) {
                        iImgMaskUrl = detail.iImgMaskUrl;
                        iImgMaskData = detail.iImgMask_data;
                        iMask_image = new Image()
                        iMask_image.src = iImgMaskUrl
                    }


                    /*
                    *  需要判断图片是否是SVG图片，
                    *  因为SVG图片的特点是图片长宽比是不变的，
                    *  从而当编辑的时候若调整长宽，
                    *  此SVG图片实际上类似缩放以适合和缩放以填充。
                    * */

                    if (img.src.indexOf('svg') != -1) {
                        if (element.toJSON().iDetail.iDisplay == 2) {
                            isSvg = 2
                        } else {
                            isSvg = 1
                        }
                    }

                    background_image = new Image();
                    interaction_view.setCrossOrigin(background_image, img.src);
                    background_image.src = img.src;
                    var r,
                        x = Number(landscape.iStartx) * ratio,
                        y = Number(landscape.iStarty) * ratio,
                        w = Number(landscape.iWidth) * ratio,
                        h = Number(landscape.iHeight) * ratio,
                        wp = (w - 2 * style.borderWidth) / w,
                        hp = (h - 2 * style.borderWidth) / h;

                    if (Math.min(w, h) / 2 < style.borderRadius) {
                        r = Math.min(w, h) / 2
                    } else {
                        r = style.borderRadius
                    }

                    ctx.save();
                    ctx.globalAlpha = opacity;

                    ctx.translate(x + w / 2, y + h / 2);
                    ctx.rotate(rotatez * Math.PI / 180);

                    ctx.beginPath();
                    ctx.moveTo(-(w / 2 - r), -h / 2);
                    r = r < 0 ? 0 : r;
                    ctx.arcTo(w / 2, -h / 2, w / 2, h / 2, r);
                    ctx.arcTo(w / 2, h / 2, -w / 2, h / 2, r);
                    ctx.arcTo(-w / 2, h / 2, -w / 2, -h / 2, r);
                    ctx.arcTo(-w / 2, -h / 2, w / 2, -h / 2, r);
                    ctx.strokeStyle = 'rgba(0,0,0,0)'
                    ctx.clip();
                    /*
                    * 当用户调整时:
                    * 也就是说用户移动图片、放大图片、旋转图片的情况下的截图,
                    * 或者说当用户切换图片的情况下回执行以下方法
                    * 针对的是可编辑的图片
                    * */

                    if (element.attributes.iDetail.iEditable && (element._scale || element._x || element._y || element._rotate)) {

                        if (background_image.complete) {
                            var port = background_image.height / background_image.width;
                            var imageWidth = w * Number(element._scale);
                            var imageHeight = imageWidth * port;
                            var translatex = 0;
                            var translatey = -(h / 2 - imageHeight / 2 / Number(element._scale));

                            ctx.translate(translatex, translatey);

                            ctx.rotate(Number(element._rotate) * Math.PI / 180)
                            ctx.translate(Number(element._x) * Number(element._scale) * ratio, Number(element._y) * Number(element._scale) * ratio);
                            ctx.drawImage(background_image, -imageWidth * wp / 2, -imageHeight * wp / 2, imageWidth * wp, imageHeight * wp);

                            if (style.borderWidth != 0) {
                                ctx.lineWidth = style.borderWidth * 2;
                                ctx.strokeStyle = style.borderColor
                            }

                            ctx.stroke();

                            ctx.restore();


                            countLoaded++;
                            canvasToImg();
                        } else {
                            background_image.onload = function () {
                                var port = background_image.height / background_image.width;
                                var imageWidth = w * Number(element._scale);
                                var imageHeight = imageWidth * port;
                                var translatex = 0;
                                var translatey = -(h / 2 - imageHeight / 2 / Number(element._scale));

                                ctx.translate(translatex, translatey);

                                ctx.rotate(Number(element._rotate) * Math.PI / 180)
                                ctx.translate(Number(element._x) * Number(element._scale) * ratio, Number(element._y) * Number(element._scale) * ratio);
                                ctx.drawImage(background_image, -imageWidth * wp / 2, -imageHeight * wp / 2, imageWidth * wp, imageHeight * wp);

                                if (style.borderWidth != 0) {
                                    ctx.lineWidth = style.borderWidth * 2;
                                    ctx.strokeStyle = style.borderColor
                                }

                                ctx.stroke();

                                ctx.restore();


                                countLoaded++;
                                canvasToImg();
                            }
                        }
                        return;
                    }

                    /*
                    * 判断图片组件的显示方式是否是缩放以合适,
                    * 或者当是svg图片的时候
                    * */

                    if (element.toJSON().iDetail.iDisplay == 1 || isSvg == 1) {

                        var containerPort = Number(landscape.iWidth) / Number(landscape.iHeight)
                        var containerPortRound = containerPort.toFixed(1);
                        if (background_image.complete) {
                            var backgroundImagePort = background_image.width / background_image.height;
                            var backgroundImagePortRound = backgroundImagePort.toFixed(1);
                            if (containerPortRound >= backgroundImagePortRound) {
                                var backgroundImageHeight = h - style.borderWidth * 2;
                                var backgroundImageWidth = backgroundImageHeight * backgroundImagePort;
                            } else {
                                var backgroundImageWidth = w - style.borderWidth * 2;
                                var backgroundImageHeight = backgroundImageWidth / backgroundImagePort;
                            }

                            ctx.drawImage(background_image, -backgroundImageWidth / 2, -backgroundImageHeight / 2, backgroundImageWidth, backgroundImageHeight);

                            if (style.borderWidth != 0) {
                                ctx.lineWidth = style.borderWidth * 2;
                                ctx.strokeStyle = style.borderColor
                            }
                            ctx.stroke();

                            ctx.restore();


                            countLoaded++;
                            canvasToImg();

                        } else {
                            background_image.onload = function () {

                                var backgroundImagePort = background_image.width / background_image.height;
                                var backgroundImagePortRound = backgroundImagePort.toFixed(1);
                                if (containerPortRound >= backgroundImagePortRound) {
                                    var backgroundImageHeight = h - style.borderWidth * ratio;
                                    var backgroundImageWidth = backgroundImageHeight * backgroundImagePort;
                                } else {
                                    var backgroundImageWidth = w - style.borderWidth * 2;
                                    var backgroundImageHeight = backgroundImageWidth / backgroundImagePort;
                                }

                                ctx.drawImage(background_image, -backgroundImageWidth / 2, -backgroundImageHeight / 2, backgroundImageWidth, backgroundImageHeight);

                                if (style.borderWidth != 0) {
                                    ctx.lineWidth = style.borderWidth * 2;
                                    ctx.strokeStyle = style.borderColor
                                }
                                ctx.stroke();

                                ctx.restore();


                                countLoaded++;
                                canvasToImg();

                            }
                        }
                        return;
                    }
                    /*
                    * 判断图片组件的显示方式是否是缩放以填充
                    * 或者当为SVG图片的时候
                    * */
                    if (element.toJSON().iDetail.iDisplay == 2 || isSvg == 2) {
                        var containerPort = Number(landscape.iHeight) / Number(landscape.iWidth)
                        var containerPortRound = containerPort.toFixed(1);
                        if (background_image.complete) {
                            var backgroundImagePort = background_image.height / background_image.width;
                            var backgroundImagePortRound = backgroundImagePort.toFixed(1);
                            if (containerPortRound <= backgroundImagePortRound) {
                                var backgroundImageWidth = w - style.borderWidth * 2;
                                var backgroundImageHeight = backgroundImageWidth * backgroundImagePort;
                            } else {
                                var backgroundImageHeight = h - style.borderWidth * 2;
                                var backgroundImageWidth = backgroundImageHeight / backgroundImagePort;
                            }
                            ctx.drawImage(background_image, -backgroundImageWidth / 2, -backgroundImageHeight / 2, backgroundImageWidth, backgroundImageHeight);
                            if (style.borderWidth != 0) {
                                ctx.lineWidth = style.borderWidth * 2;
                                ctx.strokeStyle = style.borderColor
                            }
                            ctx.stroke();
                            ctx.restore();
                            countLoaded++;
                            canvasToImg();
                        } else {
                            background_image.onload = function () {
                                var backgroundImagePort = background_image.height / background_image.width;
                                var backgroundImagePortRound = backgroundImagePort.toFixed(1);
                                if (containerPortRound <= backgroundImagePortRound) {
                                    var backgroundImageWidth = w - style.borderWidth * 2;
                                    var backgroundImageHeight = backgroundImageWidth * backgroundImagePort;
                                } else {
                                    var backgroundImageHeight = h - style.borderWidth * 2;
                                    var backgroundImageWidth = backgroundImageHeight / backgroundImagePort;
                                }
                                ctx.drawImage(background_image, -backgroundImageWidth / 2, -backgroundImageHeight / 2, backgroundImageWidth, backgroundImageHeight);
                                if (style.borderWidth != 0) {
                                    ctx.lineWidth = style.borderWidth * 2;
                                    ctx.strokeStyle = style.borderColor
                                }
                                ctx.stroke();
                                ctx.restore();
                                countLoaded++;
                                canvasToImg();
                            }
                        }
                        return;
                    }
                    /*
                    * 当不是上述情况的时候，包括图片显示为铺满的时候，
                    * 执行下面的方法。
                    *
                    * 其中包括图片设置的各种属性后的画的方式。
                    * */
                    if (background_image.complete) {
                        if (detail.iMask) {
                            var iMaskData = detail.iMask_data;
                            ctx.drawImage(background_image, -w * wp / 2 + iMaskData.x * ratio, -h * hp / 2 + iMaskData.y * ratio, iMaskData.width * ratio * wp, iMaskData.height * ratio * hp);
                            ctx.globalCompositeOperation = "destination-in";
                            ctx.fillStyle = "red";
                            ctx.fillRect(-w / 2, -h / 2, w, h);
                            ctx.restore();
                            countLoaded++;
                            canvasToImg();
                        } else if (detail.iImgMask && detail.iImgMaskUrl) {
                            iImgMaskUrl = detail.iImgMaskUrl;
                            iImgMaskData = detail.iImgMask_data;
                            iMask_image = new Image()
                            interaction_view.setCrossOrigin(iMask_image, iImgMaskUrl);
                            var maskContainerPort = Number(iImgMaskData.width) / Number(iImgMaskData.height)
                            var maskContainerPortRound = maskContainerPort.toFixed(1);
                            iMask_image.onload = function () {
                                if (iMask_image.src.indexOf('svg') != -1) {
                                    var maskImagePort = iMask_image.width / iMask_image.height;
                                    var maskImagePortRound = maskImagePort.toFixed(1);
                                    var maskImageHeight, maskImageWidth
                                    if (maskContainerPortRound >= maskImagePortRound) {
                                        maskImageHeight = iImgMaskData.height * ratio;
                                        maskImageWidth = maskImageHeight * maskImagePort
                                    } else {
                                        maskImageWidth = iImgMaskData.width * ratio;
                                        maskImageHeight = maskImageWidth / maskImagePort
                                    }
                                } else {
                                    maskImageWidth = iImgMaskData.width * ratio;
                                    maskImageHeight = iImgMaskData.height * ratio;
                                }

                                var canvasp = document.createElement('canvas');
                                $('body').append(canvasp)
                                canvasp.id = 'canvasp';
                                canvasp.width = w * wp;
                                canvasp.height = h * hp;
                                $('#canvasp').hide();
                                var canvaspp = document.querySelector('#canvasp')

                                var ctxp = canvaspp.getContext("2d");

                                ctxp.drawImage(background_image, 0, 0, w * wp, h * hp);
                                ctxp.globalCompositeOperation = "destination-in";
                                ctxp.drawImage(iMask_image, iImgMaskData.x * ratio + (iImgMaskData.width * ratio - maskImageWidth) / 2, iImgMaskData.y * ratio + (iImgMaskData.height * ratio - maskImageHeight) / 2, maskImageWidth, maskImageHeight)
                                if (style.borderWidth != 0) {
                                    ctxp.lineWidth = style.borderWidth * 2;
                                    ctxp.strokeStyle = style.borderColor
                                }

                                var base64Urlp = canvaspp.toDataURL("image/png");

                                var newImage = new Image();
                                interaction_view.setCrossOrigin(newImage, base64Urlp);

                                newImage.onload = function () {
                                    ctx.drawImage(newImage, -w * wp / 2, -h * hp / 2, w * wp, h * hp);
                                    ctx.restore();
                                    $('#canvasp').remove()
                                    countLoaded++;
                                    canvasToImg();
                                }
                                newImage.src = base64Urlp

                            }
                            iMask_image.src = iImgMaskUrl
                        } else {
                            ctx.drawImage(background_image, -w * wp / 2, -h * hp / 2, w * wp, h * hp);
                            if (style.borderWidth != 0) {
                                ctx.lineWidth = style.borderWidth * 2;
                                ctx.strokeStyle = style.borderColor
                            }
                            ctx.stroke();
                            ctx.restore();
                            countLoaded++;
                            canvasToImg();
                        }
                    } else {
                        background_image.onload = function () {
                            if (detail.iMask) {
                                var iMaskData = detail.iMask_data;
                                ctx.drawImage(background_image, -w * wp / 2 + iMaskData.x * ratio, -h * hp / 2 + iMaskData.y * ratio, iMaskData.width * ratio * wp, iMaskData.height * ratio * hp);
                                ctx.globalCompositeOperation = "destination-in";
                                ctx.fillStyle = "red";
                                ctx.fillRect(-w / 2, -h / 2, w, h);
                                ctx.restore();
                                countLoaded++;
                                canvasToImg();
                            } else if (detail.iImgMask && detail.iImgMaskUrl) {
                                iImgMaskUrl = detail.iImgMaskUrl;
                                iImgMaskData = detail.iImgMask_data;
                                iMask_image = new Image()
                                interaction_view.setCrossOrigin(iMask_image, iImgMaskUrl);
                                var maskContainerPort = Number(iImgMaskData.width) / Number(iImgMaskData.height)
                                var maskContainerPortRound = maskContainerPort.toFixed(1);
                                iMask_image.onload = function () {
                                    if (iMask_image.src.indexOf('svg') != -1) {
                                        var maskImagePort = iMask_image.width / iMask_image.height;
                                        var maskImagePortRound = maskImagePort.toFixed(1);
                                        var maskImageHeight, maskImageWidth
                                        if (maskContainerPortRound >= maskImagePortRound) {
                                            maskImageHeight = iImgMaskData.height * ratio;
                                            maskImageWidth = maskImageHeight * maskImagePort
                                        } else {
                                            maskImageWidth = iImgMaskData.width * ratio;
                                            maskImageHeight = maskImageWidth / maskImagePort
                                        }
                                    } else {
                                        maskImageWidth = iImgMaskData.width * ratio;
                                        maskImageHeight = iImgMaskData.height * ratio;
                                    }

                                    var canvasp = document.createElement('canvas');
                                    $('body').append(canvasp)
                                    canvasp.id = 'canvasp';
                                    canvasp.width = w * wp;
                                    canvasp.height = h * hp;
                                    $('#canvasp').hide();
                                    var canvaspp = document.querySelector('#canvasp')

                                    var ctxp = canvaspp.getContext("2d");

                                    ctxp.drawImage(background_image, 0, 0, w * wp, h * hp);
                                    ctxp.globalCompositeOperation = "destination-in";
                                    ctxp.drawImage(iMask_image, iImgMaskData.x * ratio + (iImgMaskData.width * ratio - maskImageWidth) / 2, iImgMaskData.y * ratio + (iImgMaskData.height * ratio - maskImageHeight) / 2, maskImageWidth, maskImageHeight)
                                    if (style.borderWidth != 0) {
                                        ctxp.lineWidth = style.borderWidth * 2;
                                        ctxp.strokeStyle = style.borderColor
                                    }

                                    var base64Urlp = canvaspp.toDataURL("image/png");

                                    var newImage = new Image();
                                    interaction_view.setCrossOrigin(newImage, base64Urlp);

                                    newImage.onload = function () {
                                        ctx.drawImage(newImage, -w * wp / 2, -h * hp / 2, w * wp, h * hp);
                                        ctx.restore();
                                        $('#canvasp').remove()
                                        countLoaded++;
                                        canvasToImg();
                                    }
                                    newImage.src = base64Urlp

                                }
                                iMask_image.src = iImgMaskUrl
                            } else {
                                ctx.drawImage(background_image, -w * wp / 2, -h * hp / 2, w * wp, h * hp);
                                if (style.borderWidth != 0) {
                                    ctx.lineWidth = style.borderWidth * 2;
                                    ctx.strokeStyle = style.borderColor
                                }
                                ctx.stroke();
                                ctx.restore();
                                countLoaded++;
                                canvasToImg();
                            }
                        }
                    }
                }
                //画文字
                function drawParagraph(element, canvas, ctx, landscape, rotatez, zindex, opacity, detail) {
                    var paragraph = element.toJSON().iDetail.iText;
                    var divLength = element.iview.$el.find(".iText").children().length;
                    if (element.iview.$el.find(".iText .iContent").length > 0) {
                        divLength = element.iview.$el.find(".iText .iContent").children().length;
                    }
                    var $el = element.iview.$el.find(".el_wrap");
                    var $textel = $el.children('.iText').length ? $el.children('.iText') : $el; // 获取 textel 元素
                    var style = {
                        "font-size": $textel.css("font-size"),
                        "background-color": $el.css("background-color"),
                        "font-family": $textel.css("font-family"),
                        "color": $textel.css("color"),
                        "border-width": $el.css("border-width"),
                        "border-color": $el.css("border-color"),
                        "text-align": $el.css("text-align"),
                        "line-height": $el.css("line-height"),
                        "padding-top": $el.css("padding-top"),
                        "padding-left": $el.css("padding-left"),
                        "font-weight": $textel.css('font-weight'),
                        "border-radius": $el.css('border-radius')
                    }
                    var attrStyle = element.toJSON().iDetail.iStyle.split(";");
                    if (divLength == 1 || divLength == 0) {
                        var text = element.toJSON().iDetail.iText.replace("<div>", "").replace("</div>", "");

                        onelineText(text, canvas, Number(landscape.iStartx) * ratio, Number(landscape.iStarty) * ratio, Number(landscape.iWidth) * ratio, attrStyle, landscape, rotatez, style)
                    } else {

                        drawMultilineText(canvas, paragraph, Number(landscape.iStartx) * ratio, Number(landscape.iStarty) * ratio, Number(landscape.iWidth) * ratio, attrStyle, landscape, rotatez, style);
                    }
                    countLoaded++;
                    canvasToImg();
                }
                //canvas转成图片
                function canvasToImg() {

                    //通过上传来把 canvas 直接转成图片
                    if (elementArr.length === 0 || countLoaded != elementArr.length) {
                        if (countLoaded < elementArr.length) {
                            // 画下一个
                            drawItem(elementArr[countLoaded]);
                        }
                        return;
                    }
                    var canvasq = $("canvas#clipboard")[0];

                    var base64Url


                    if (need_file == false) {
                        try {
                            /**
                            * * 外部测试图片生成base64的类型
                             */
                            let _base64Type = "image/webp";
                            if (typeof window.e_Debug_base64type != "undefined") _base64Type = window.e_Debug_base64type;
                            base64Url = canvasq.toDataURL(_base64Type);
                        } catch (e) {
                            interaction_view.errorAlert(e);
                        }
                        if (element_id) interaction_view.expression.setValue(element_id, base64Url);
                        $("#clipboard").remove();
                        if (actionview.executeactions.length) {
                            for (var i = 0; i < actionview.executeactions.length; i++) {
                                var _i = actionview.executeactions[i];
                                if (_i.attributes.iDetail.customType == "onClipBoardSuccess") {
                                    _i.iview.executeAction(_i.iview);
                                }
                            }
                        }
                    } else {
                        try {
                            base64Url = canvasq.toDataURL("image/png");
                        } catch (e) {
                            interaction_view.errorAlert(e);
                        }
                        var base64code = _g.fileapi.base64urltoBase64(base64Url);
                        var blob = _g.fileapi.b64toBlob({
                            b64Data: base64code
                        })
                        var url = context_url + 'uploadimage';
                        _g.fileapi.sendBinary({
                            blob: blob,
                            url: url,
                            filekey: 'image',
                            filename: 'canvas图片' + _g.uuid(1),
                            callback: function (res) {
                                var image_url = res.data.results[0];
                                if (element_id) interaction_view.expression.setValue(element_id, image_url);
                                $("#clipboard").remove();
                                if (actionview.executeactions.length) {
                                    for (var i = 0; i < actionview.executeactions.length; i++) {
                                        var _i = actionview.executeactions[i];
                                        if (_i.attributes.iDetail.customType == "onClipBoardSuccess") {
                                            _i.iview.executeAction(_i.iview);
                                        }
                                    }
                                }
                            }
                        })
                    }


                }

                //单行文字
                function onelineText(str, canvas, initX, initY, canvasWidth, attrStyle, landscape, rotatez, style) {//只有一个div但是超过容器宽度自动计算换行的方法
                    var punctuationReg = /([\[\]\,.?"'\(\)+_*\/\\&\$#^@!%~`<>:;\{\}？，。·！……（）+｛｝【】、|《》])/ig;  // 用来匹配中英文标点符号。
                    var ctx = canvas.getContext("2d");
                    var fontsize = (Number(style["font-size"].replace("px", "")) * ratio) + "px";
                    var fontfamily = style["font-family"].split(",")[2] ? style["font-family"].split(",")[2] : style["font-family"];
                    var fontWeight = style["font-weight"];
                    var linecount = 0;
                    ctx.font = fontWeight + " " + fontsize + " " + fontfamily;
                    ctx.fillStyle = style["color"];
                    ctx.textBaseline = "top";
                    ctx.textAlign = 'left';
                    ctx.lineHeight = style["line-height"];
                    if (style['text-align']) {
                        if (style['text-align'] == 'center') {
                            ctx.textAlign = 'center';
                        } else if (style['text-align'] == 'right') {
                            ctx.textAlign = 'right';
                        } else {
                            ctx.textAlign = style['text-align'];
                        }
                    }
                    var lineWidth = 0;
                    var wordsWidth = 0;
                    var lastSubStrIndex = 0;
                    var textX = initX,
                        reg = /(\d+\.?\d*)px/,     // 用以匹配像素px长度，包括带有小数点的
                        paddingleft = Number(style["padding-left"].match(reg)[1]),
                        paddingtop = Number(style["padding-top"].match(reg)[1]),
                        lineheight = Number(style["line-height"].match(reg)[1]),
                        fontsize = Number(style["font-size"].match(reg)[1]),
                        textY = initY + paddingtop * ratio + (lineheight - fontsize) / 2 * ratio, // 实际上我们需要注意第一行文本增加 lineheight的补偿 (lineheight-fontsize)/2
                        borderRadius = Number(style["border-radius"].replace("px", "")) * ratio

                    if (rotatez != 0) {
                        ctx.save();
                        ctx.translate((Number(landscape.iStartx) * ratio) + (Number(landscape.iWidth) * ratio / 2), (Number(landscape.iStarty) * ratio) + (Number(landscape.iHeight) * ratio / 2));
                        ctx.rotate(rotatez * Math.PI / 180);
                        if (style["border-width"] != "0px") {
                            // ctx.lineWidth = style["border-width"].replace("px", "");
                            // ctx.strokeStyle = style["border-color"];
                            // ctx.strokeRect(-(Number(landscape.iWidth)), -Number(landscape.iHeight), Number(landscape.iWidth) * ratio, Number(landscape.iHeight) * ratio);

                            var r,
                                // x = Number(landscape.iStartx) * ratio,
                                // y = Number(landscape.iStarty) * ratio,
                                w = Number(landscape.iWidth) * ratio,
                                h = Number(landscape.iHeight) * ratio,
                                lineWidth = Number(style["border-width"].replace("px", "")) * ratio;
                            if (Math.min(w, h) / 2 < borderRadius) {
                                r = Math.min(w, h) / 2
                            } else {
                                r = borderRadius
                            }
                            r = r < 0 ? 0 : r;
                            ctx.moveTo(-(w / 2 - r), -h / 2);
                            ctx.arcTo(w / 2, -h / 2, w / 2, h / 2, r);
                            ctx.arcTo(w / 2, h / 2, -w / 2, h / 2, r);
                            ctx.arcTo(-w / 2, h / 2, -w / 2, -h / 2, r);
                            ctx.arcTo(-w / 2, -h / 2, w / 2, -h / 2, r);

                            ctx.beginPath();
                            var _r = r - lineWidth / 2;
                            _r = _r < 0 ? 0 : r;
                            ctx.moveTo(- (w / 2 - r - lineWidth / 2 + lineWidth / 2), - (h / 2 - lineWidth / 2));
                            ctx.arcTo((w / 2 - lineWidth / 2), -(h / 2 - lineWidth / 2), (w / 2 - lineWidth / 2), (h / 2 - lineWidth / 2), _r);
                            ctx.arcTo((w / 2 - lineWidth / 2), (h / 2 - lineWidth / 2), -(w / 2 - lineWidth / 2), (h / 2 - lineWidth / 2), _r);
                            ctx.arcTo(-(w / 2 - lineWidth / 2), (h / 2 - lineWidth / 2), -(w / 2 - lineWidth / 2), -(h / 2 - lineWidth / 2), _r);
                            ctx.arcTo(-(w / 2 - lineWidth / 2), -(h / 2 - lineWidth / 2), (w / 2 - lineWidth / 2), -(h / 2 - lineWidth / 2), _r);


                            ctx.lineWidth = lineWidth;
                            ctx.strokeStyle = style["border-color"];
                            // ctx.strokeRect(initX, initY, Number(landscape.iWidth) * ratio, Number(landscape.iHeight) * ratio);
                            ctx.stroke();
                            // textY += lineWidth;
                            // initX += lineWidth;
                            // canvasWidth -= lineWidth * 2;
                        }

                        var addX = - (Number(landscape.iWidth) * ratio / 2)

                        if (ctx.textAlign == 'center') {
                            addX = addX + canvasWidth / 2 + lineWidth;
                        } else if (ctx.textAlign == 'right') {
                            addX = addX + canvasWidth - paddingleft * ratio + lineWidth;
                        } else {
                            addX = addX + paddingleft * ratio + lineWidth;
                        }
                        var addY = - ((Number(landscape.iHeight) * ratio / 2) + Number(landscape.iStarty * ratio)) + Number(textY) + lineWidth;

                        if (ctx.measureText(str[0]).width > canvasWidth) {
                            for (var i = 1; i <= str.length; i++) {
                                linecount++
                                ctx.fillText(str.substring(lastSubStrIndex, i), addX, addY);
                                addY += lineheight * ratio;
                                wordsWidth = 0;
                                lastSubStrIndex = i;
                            }
                        } else {
                            for (var i = 0; i < str.length; i++) {                            // 当框内文本超过一行时（不是enter情况下）

                                wordsWidth += ((ctx.measureText(str[i]).width));
                                if (wordsWidth >= canvasWidth - paddingleft * 2 * ratio - lineWidth * 2) {
                                    // linecount++
                                    // ctx.fillText(str.substring(lastSubStrIndex, i), addX, addY);
                                    // addY += lineheight * ratio;
                                    // lineWidth = 0;
                                    // lastSubStrIndex = i;
                                    // i = i - 1;
                                    if (punctuationReg.test(str[i])) {               // 这个判断的目的是，正常的有标点符号的段落，当某一行最后一个字后面有标点符号的时候，这个字都会另起一行，而不是让标点符号单独另起一行，所以需要判断。
                                        linecount++
                                        ctx.fillText(str.substring(lastSubStrIndex, i - 1), addX, addY);
                                        addY += lineheight * ratio;
                                        wordsWidth = 0;
                                        lastSubStrIndex = i - 1;
                                        //i = i - 2;
                                    } else {
                                        linecount++
                                        ctx.fillText(str.substring(lastSubStrIndex, i), addX, addY);
                                        addY += lineheight * ratio;
                                        wordsWidth = 0;
                                        lastSubStrIndex = i;
                                        //i = i - 1;
                                    }
                                }
                                if (i == str.length - 1) {
                                    linecount++
                                    ctx.fillText(str.substring(lastSubStrIndex, i + 1), addX, addY);
                                }
                            }
                        }
                        ctx.restore();
                        return [initY, linecount];
                    } else {
                        if (style["border-width"] != "0px") {
                            var r,
                                x = Number(landscape.iStartx) * ratio,
                                y = Number(landscape.iStarty) * ratio,
                                w = Number(landscape.iWidth) * ratio,
                                h = Number(landscape.iHeight) * ratio,
                                lineWidth = Number(style["border-width"].replace("px", "")) * ratio;
                            if (Math.min(w, h) / 2 < borderRadius) {
                                r = Math.min(w, h) / 2
                            } else {
                                r = borderRadius
                            }
                            var _r = r - lineWidth / 2;
                            _r = _r < 0 ? 0 : r;
                            ctx.beginPath();
                            ctx.moveTo(x + r - lineWidth / 2 + lineWidth / 2, y + lineWidth / 2);
                            ctx.arcTo(x + w - lineWidth / 2, y + lineWidth / 2, x + w - lineWidth / 2, y + h - lineWidth / 2, _r);
                            ctx.arcTo(x + w - lineWidth / 2, y + h - lineWidth / 2, x + lineWidth / 2, y + h - lineWidth / 2, _r);
                            ctx.arcTo(x + lineWidth / 2, y + h - lineWidth / 2, x + lineWidth / 2, y + lineWidth / 2, _r);
                            ctx.arcTo(x + lineWidth / 2, y + lineWidth / 2, x + w - lineWidth / 2, y + lineWidth / 2, _r);


                            ctx.lineWidth = lineWidth;
                            ctx.strokeStyle = style["border-color"];
                            // ctx.strokeRect(initX, initY, Number(landscape.iWidth) * ratio, Number(landscape.iHeight) * ratio);
                            ctx.stroke();
                            textY += lineWidth;
                            initX += lineWidth;
                            canvasWidth -= lineWidth * 2;
                        }

                        // 需要结合对齐方式决定起始X坐标点

                        if (ctx.textAlign == 'center') {
                            textX = initX + canvasWidth / 2;
                        } else if (ctx.textAlign == 'right') {
                            textX = initX + canvasWidth - paddingleft * ratio;
                        } else {
                            textX = initX + paddingleft * ratio;
                        }
                        if (ctx.measureText(str[0]).width > canvasWidth) {
                            for (var i = 1; i <= str.length; i++) {
                                linecount++
                                ctx.fillText(str.substring(lastSubStrIndex, i), textX, textY);
                                textY += lineheight * ratio;
                                wordsWidth = 0;
                                lastSubStrIndex = i;
                            }
                        } else {
                            for (var i = 0; i < str.length; i++) {                            // 当框内文本超过一行时（不是enter情况下）

                                wordsWidth += ((ctx.measureText(str[i]).width));
                                if (wordsWidth >= canvasWidth - paddingleft * 2 * ratio) {
                                    if (punctuationReg.test(str[i])) {                   // 这个判断的目的是，正常的有标点符号的段落，当某一行最后一个字后面有标点符号的时候，这个字都会另起一行，而不是让标点符号单独另起一行，所以需要判断。
                                        linecount++
                                        ctx.fillText(str.substring(lastSubStrIndex, i - 1), textX, textY);
                                        textY += lineheight * ratio;
                                        wordsWidth = 0;
                                        lastSubStrIndex = i - 1;
                                        // i = i - 2;
                                    } else {
                                        linecount++
                                        ctx.fillText(str.substring(lastSubStrIndex, i), textX, textY);
                                        textY += lineheight * ratio;
                                        wordsWidth = 0;
                                        lastSubStrIndex = i;
                                        // i = i - 1;
                                    }
                                }
                                if (i == str.length - 1) {
                                    linecount++
                                    ctx.fillText(str.substring(lastSubStrIndex, i + 1), textX, textY);
                                }
                            }
                        }


                        return [initY, linecount];
                    }
                }

                function toMultiLine(text) {                                                       // 把多行paragraph的文字分割成数组方法用来画多行

                    var textArr = new Array();
                    text = text.replace(/<div>/g, '');
                    textArr = text.split("</div>");
                    return textArr;
                }
                //画多行文字
                function drawMultilineText(canvas, text, startX, startY, canvasWidth, attrStyle, landscape, rotatez, style) {//如果paragraph是多行有多个div，用此方法画
                    var context = canvas.getContext('2d');
                    var fontsize = (Number(style["font-size"].replace("px", "")) * ratio) + "px";
                    var fontfamily = style["font-family"].split(",")[0] ? style["font-family"].split(",")[2] : style["font-family"];
                    var fontWeight = style["font-weight"];
                    context.font = fontWeight + " " + fontsize + " " + fontfamily;
                    context.fillStyle = style["color"];
                    var textvalArr = toMultiLine(text);
                    var linespacing = Number(style["line-height"].replace("px", "")) * ratio;
                    var y = -Number(landscape.iHeight);
                    if (rotatez != 0) {


                        // if (style["border-width"] != "0px") {
                        //     context.lineWidth = style["border-width"].replace("px", "");
                        //     context.strokeStyle = style["border-color"];
                        //     context.strokeRect(-(Number(landscape.iWidth)), -Number(landscape.iHeight), Number(landscape.iWidth) * ratio, Number(landscape.iHeight) * ratio);
                        // }
                        for (var i = 0; i < textvalArr.length; i++) {

                            // context.fillText(textvalArr[i], -(Number(landscape.iWidth)), y + 25);
                            // y += linespacing;
                            var onelineTextArr = onelineText(textvalArr[i], canvas, startX, startY, canvasWidth, attrStyle, landscape, rotatez, style)
                            startY = onelineTextArr[0];
                            var countLine = onelineTextArr[1];

                            startY += linespacing * countLine;
                        }

                        // context.restore();
                        // countLoaded++;
                        // canvasToImg();
                    } else {
                        // if (style["border-width"] != "0px") {
                        //     context.lineWidth = style["border-width"].replace("px", "");
                        //     context.strokeStyle = style["border-color"];
                        //     context.strokeRect(startX, startY, canvasWidth, Number(landscape.iHeight) * ratio);

                        //     startY += 5;
                        //     startX += 5;
                        //     canvasWidth -= 20;
                        //     style["border-width"] = "0px";
                        // }

                        for (var i = 0; i < textvalArr.length; i++) {
                            var onelineTextArr = onelineText(textvalArr[i], canvas, startX, startY, canvasWidth, attrStyle, landscape, rotatez, style)
                            startY = onelineTextArr[0];
                            var countLine = onelineTextArr[1];

                            startY += linespacing * countLine;
                        }
                    }
                }

            }, null,
                {
                    debug: debug_info
                }
            )

        },
        setExecuteActions: function (actionview, execactions, opts) {
            //设置触发器执行里面的触发器
            //opts.init true/false  , 代表是否为第一次执行,有时候要避免重复的绑定事件执行
            if (!opts) opts = {};
            console.log(opts);
            actionview.executeactions = [];
            for (var i = 0; i < execactions.length; i++) {
                var _i = $.extend(true, {}, execactions[i]);
                var action = new interaction_view.model.Action(_i);
                action.iview.render();
                actionview.executeactions.push(action);
            }
        }
    }
})


