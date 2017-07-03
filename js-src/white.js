// This is the default list
var list = "inbox";
var loadKey = list;

// These are the default sort orders for lists
var direction = 1;
var type = "text";
var direction2 = 1;
var type2 = "timestamp";

// start: websocket config
var connected = false;
var reConnecting = false;
var room = "";
var username = "";
var conn = null;
// Can't strip prefix and truncate until editing pulls in the real
// item otherwise you'll save a broken URL.
var autolinker = new Autolinker({
    stripPrefix: false,
    //truncate: 16,
    newWindow: true
});
// end: websocket config

var curtime;
var next;
var prevtime = new Date();
var curval;
var t;

var enc = function (str) {
    return encodeURIComponent(str);
}

var p = function(str) {
    "use strict";
    console.debug(str);
}

var removeTitle = function() {
    "use strict";
    return "Remove item";
}

var strikeTitle = function() {
    "use strict";
    return "Strike out item";
}

var escapeHtml = function(html) {
    "use strict";
    var text = autolinker.link(jQuery("<div/>").text(html).html());

    var priorityStyle = "";

    // reminders
    text = text.replace(/@&lt;(.*?)&gt;/, "<span class=\"label label-remind\">$1</span>");
    text = text.replace(/@\((.*?)\)/, "<span class=\"label label-remind\">$1</span>");
    text = text.replace(/([0-9]{1,2}:[0-9]{1,2} [0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4})/, "<span class=\"label label-remind\">$1</span>");

    // #bug label
    text = text.replace(/([^\\])?(#bug)/g, "$1<span class=\"label label-bug\">$2</span>");

    // #feature label
    text = text.replace(/([^\\])?(#feature)/g, "$1<span class=\"label label-feature\">$2</span>");

    // #improvement label
    text = text.replace(/([^\\])?(#improvement)/g, "$1<span class=\"label label-improvement\">$2</span>");

    // #enhancement label
    text = text.replace(/([^\\])?(#enhancement)/g, "$1<span class=\"label label-enhancement\">$2</span>");

    // All other labels (The issue status labels wrap the standard label)
    text = text.replace(/([^\\])?(#[a-zA-Z0-9-_]+)/g, "$1<span class=\"label label-label\">$2</span>");

    // Priority
    text = text.replace(/([^\\])?(![0-9]+)/, "$1<span class=\"label label-priority\"" + priorityStyle + ">$2</span>");

    return text;
}

var escapeApos = function(str) {
    if (list === null) {
        return str;
    }
    if (list === "") {
        return str;
    }
    if (undefined === str) {
        return str;
    }
    return str.replace(/'/, "\\'");
}

var escapeQuotes = function(str) {
    if (list === null) {
        return str;
    }
    if (list === "") {
        return str;
    }
    if (undefined === str) {
        return str;
    }
    return str.replace(/"/, '\\"');
}

var moveListItemToTop = function(list) {
    console.info('Moving items to the top of the list is disabled');
//    var listItem = $(".wt-all-list-item[data-list='" + escapeApos(list) + "']").parent();
//    listItem.fadeTo(500, 0);
//    listItem.detach();
//    $(".search-input-list-item").after(listItem);
//    listItem.fadeTo(500, 1);
}

var buildDoneCheckbox = function (id) {
    return "<span data-id=\"" 
        + id + "\" class=\"wt-list-item-chk-done btn-tooltip glyphicon glyphicon-trash\" id=\"wt-list-item-chk-done-" 
        + id + "\" title=\"" + removeTitle() + "\">&nbsp;</span>";
}

var buildStrikeCheckbox = function (id) {
    return "<input type=\"checkbox\" data-id=\"" 
        + id + "\" class=\"wt-list-item-chk-strike btn-tooltip\" id=\"wt-list-item-chk-strike-" 
        + id + "\" title=\"" + strikeTitle() + "\" />";
}

var saveText = function(id, text, done) {
    "use strict"
    $.ajax({
        type: "POST",
        url: "services/save/" + enc(list) + "/" + id
                + "/" + done + "/" + enc(getHashVar(3)),
        data: { text: text },
        dataType: "json",
        success: function(json) {
            moveListItemToTop(list);

            localStorage.removeItem(loadKey);
            if (id === null) {
                var markon = new Markon();
                $("#wt-list-item-0").after("<div id=\"wt-list-item-" + json.id 
                        + "\" class=\"wt-list-item\" data-id=\"" + json.id 
                        + "\"><p class=\"wt-list-item-text\">" + buildDoneCheckbox(json.id) 
                        + " " + buildStrikeCheckbox(json.id) + " <span id=\"wt-text-" 
                        + json.id + "\" class=\"wt-text\" data-id=\"" + json.id 
                        + "\">" + markon.render(escapeHtml(text)) + "</span></p></div>");
                if (useWebSockets) {
                    conn.send(JSON.stringify({"a": "message", "actiontype": "add", "list": list, "text": text, "id": json.id}));
                }
                applyEditItem(json.id);
                applyRemoveItem(json.id);
                applyStrikeItem(json.id);
                applySaveTextOfItem(json.id);
                applySaveOnEnter(json.id);
                applyTooltip();
            } else {
                if (useWebSockets) {
                    conn.send(JSON.stringify({"a": "message", "actiontype": "save", "list": list, "text": text, "id": json.id}));
                }
            }
        }
    });
}


var addStrikeHeader = function(forceHeaderRemoval) {
    if (forceHeaderRemoval) {
        if ($(".wt-strikes-header").size() > 0) {
            $(".wt-strikes-header").remove();
        }
    }
    if ($(".wt-strike").size() > 0) {
        // There are striked items but no header. Add one.
        if ($(".wt-strikes-header").size() === 0) {
            $(".wt-strike:first").parent().parent()
                    .before("<h1 class=\"wt-strikes-header\">These items are marked done</h1>");
        }
    } else {
        // There is an existing strikes header but we've un-striked everything.
        // Remove the header.
        if ($(".wt-strikes-header").size() > 0) {
            $(".wt-strikes-header").remove();
        }
    }
}

var editing = false;
var applyEditItem = function(id) {
    "use strict";
    $(".wt-text a").on("click", function () {
        if (!e) var e = window.event;
        e.cancelBubble = true;
        if (e.stopPropagation) e.stopPropagation();
    });
    $("#wt-text-" + id).on("click", function() {
        editing = true;
        var id = $(this).data("id");
        var markon = new Markon();
        var list = getHashVar(2);
        loadItem(id, list, function (json) {
            var clickedText = json.text;
            $("#wt-list-item-" + id)
                    .html("<input class=\"wt-list-item-input\" type=\"text\" id=\"wt-list-item-input-" 
                        + id + "\" data-id=\"" + id + "\" placeholder=\"Enter new item here\" />");
            $("#wt-list-item-input-" + id).val(clickedText);
            $("#wt-list-item-input-" + id).focus();
            applySaveTextOfItem(id);
            applySaveOnEnter(id);
            applyTooltip();
        });
    });
}

var applyRemoveItem = function(id) {
    "use strict";
    // Remove an item
    $("#wt-list-item-chk-done-" + id).on("click", function() {
        var doit = confirm("Confirm delete please");
        if (!doit) {
            return;
        }
        var id = $(this).data("id");
        $.getJSON("services/delete/" + id + "/" + enc(getHashVar(3)) , function(json) {
            moveListItemToTop(list);

            localStorage.removeItem(loadKey);
            $("#wt-list-item-" + id).remove();

            addStrikeHeader();

            if (useWebSockets) {
                conn.send(JSON.stringify({"a": "message", "actiontype": "remove", "list": list, "id": id}));
            }
        });
    });
}

var applyStrikeItem = function(id) {
    "use strict";
    // Strike out an item
    $("#wt-list-item-chk-strike-" + id).on("click", function() {
        var id = $(this).data("id");
        var text = $("#wt-text-" + id);
        var strike = false;
        if (!text.hasClass("wt-strike")) {
            strike = true;
        }
        // used when buildStrikeCheckbox() adds a checkmark
        // currently disabled
        var chbx = $("#wt-list-item-chk-strike-" + id);
        if (strike) {
            text.addClass("wt-strike");
            //chbx.css("color", "green");
        } else {
            text.removeClass("wt-strike");
            //chbx.css("color", "black");
        }
        $.getJSON("services/strike/" + id + "/" + strike
                + "/" + enc(getHashVar(3)), function(json) {
            moveListItemToTop(list);

            localStorage.removeItem(loadKey);
            var item = $("#wt-list-item-" + id);

            if (strike) {
                $(".wt-list-item:last").after(item);
            } else if ($(".wt-strike").size() > 0) {
                $(".wt-strike:first").parent().parent().before(item);
            }

            addStrikeHeader(true);

            if (useWebSockets) {
                conn.send(JSON.stringify({"a": "message", "actiontype": "strike", "list": list, "strike": strike, "id": id}));
            }
        }).fail(function() {
            if (strike) {
                text.removeClass("wt-strike");
            } else {
                text.addClass("wt-strike");
            }
        });
    });
}

var applySaveTextOfItem = function(id) {
    "use strict";
    // Save text of item
    prevtime = parseInt(new Date().getTime());
    curval = "";
    t = null;
    $(document).on("keyup", "#wt-list-item-input-" + id, function() {
        var id = $(this).data("id");
        if (id === 0) {
            // Don't auto-save the first item.
            return;
        }
        curtime = parseInt(new Date().getTime());
        next = prevtime + 500;
        prevtime = curtime;
        if (curtime < next) {
            clearTimeout(t);
            var text = $("#wt-list-item-input-" + id).val();
            text = text.replace(/'/, "\\'");
            t = setTimeout("saveText('" + id + "', '" + text + "', 'false')", 500);
            return;
        }
    });
}

var doApplySaveOnEnter = function(thiz, e) {
    "use strict";
    if (editing || $("#wt-list-item-input-0").is(":focus")) {
        editing = false;
    } else {
        return;
    }
    e.preventDefault();
    var id = thiz.data("id");
    var text = $("#wt-list-item-input-" + id).val();
    if (id === 0) {
        saveText(null, text, true);
    } else {
        var markon = new Markon();
        // TODO: Retrieve the post-processed text instead of what the user entered. Primarily to grab the @<syntax>
        $("#wt-list-item-" + id).html("<p class=\"wt-list-item-text\">" 
                + buildDoneCheckbox(id) + " " + buildStrikeCheckbox(id) 
                + " <span id=\"wt-text-" + id + "\" class=\"wt-text\" data-id=\"" + id 
                + "\">" + markon.render(escapeHtml(text)) + "</span></p>");
        applyEditItem(id);
        applyRemoveItem(id);
        applyStrikeItem(id);
        applySaveTextOfItem(id);
        applySaveOnEnter(id);
        applyTooltip();
        saveText(id, text, true);
    }

    thiz.val("");
}

var applySaveOnEnter = function(id) {
    "use strict";
    // Hitting tener on item removes text input and saves item
    $("#wt-list-item-input-" + id).keypress(function (e) {
        var thiz = $(this);
        thiz.on("blur", function() {
            doApplySaveOnEnter(thiz, e);
        });
        if (e.which === 13 || e.which === 27) {
            doApplySaveOnEnter(thiz, e);
        }
    });
}

var applyAllListClick = function() {
    "use strict";
    $(".wt-all-list-item").on("click", function() {
        window.location.hash = "#/list/" + $(this).data("list") + "/" + getHashVar(2);
    });
}

var applyTooltip = function() {
    if (!(/iPhone|iPod|iPad|Android|BlackBerry|phone/i).test(navigator.userAgent)) {
        $(".btn-tooltip").tooltip();
    }
}

var menuToggle = function() {
    $(".menu-toggle").unbind("click");
    $(".menu-toggle").on("click", function(e) {
        e.preventDefault();
        var wrapper = $("#wrapper");
        var clazz = "toggled";
        if (wrapper.hasClass(clazz)) {
            wrapper.removeClass(clazz);
        } else {
            wrapper.addClass(clazz);
        }
    });
}

var hideSideBar = function() {
    $("#wrapper").removeClass("toggled");
}

var setListsLink = function(secret) {
    $(".lists-link").attr("href", "#/lists/" + enc(secret));
}

var init = function() {
    "use strict";
    var hash = window.location.hash;
    hash = hash.replace(/^#/, "");
    var hashVars = hash.split("/");
    startConnection();
    switch(hashVars[1]) {
        case "list":
            list = hashVars[2];
            loadKey = "list-" + list;
            resetSortButtonActiveFirstLoad();
            load(list);
            seedSideBar(hashVars[3]);
            setListsLink(hashVars[3]);
            setPlaceholder(list);
            break;
        case "lists":
            loadAll();
            seedSideBar(hashVars[2]);
            setListsLink(hashVars[2]);
            break;
        default:
            window.location.hash = "#/list/inbox/" + hashVars[1];
            break;
    }
    menuToggle();
}

var isUndefined = function(o) {
    return undefined === o;
}

var getHashVar = function(key) {
    return window.location.hash.replace(/^#/, "").split("/")[key];
}

var loadAll = function() {
    $("#wt-list-item-0").hide();
    // Removes all list items if you've previously been on a list
    $(".wt-list-item").remove();
    $("title").text("all lists");
    $.getJSON("services/load-all/" + enc(getHashVar(2)), function(json) {
        // Mock items for testing grid layout
        //for (var i = 1; i < 100; i++) json.items.push(i);

        var total = $(json.items).size();
        var large = Math.floor(total / 4);
        var largeRemainder = total - (large * 3);
        var medium = Math.floor(total / 2);
        var mediumRemainder = total - medium;
        var small = Math.floor(total / 1);

        var list = $(".wt-list");
        if (total >= 4) {
            list.append("<div class='row'><div class='col-sm-12 col-md-6 col-lg-3' id='list-col-1'></div>"
                    + "<div class='col-sm-12 col-md-6 col-lg-3' id='list-col-2'></div>"
                    + "<div class='col-sm-12 col-md-6 col-lg-3' id='list-col-3'></div>"
                    + "<div class='col-sm-12 col-md-6 col-lg-3' id='list-col-4'></div></div>");
            $.each(json.items, function(i, item) {
                var coli = i + 1;
                var col;
                if (coli <= largeRemainder) {
                    col = $("#list-col-1");
                } else if (coli > largeRemainder && coli <= (largeRemainder + (large * 1))) {
                    col = $("#list-col-2");
                } else if (coli > (largeRemainder + (large * 1)) && coli <= (largeRemainder + (large * 2))) {
                    col = $("#list-col-3");
                } else {
                    col = $("#list-col-4");
                }
                col.append("<div class=\"wt-all-list-item\" data-list=\""
                        + escapeHtml(item) + "\"><a title=\"#" + escapeHtml(item) 
                        + "\" href=\"#/list/" + escapeHtml(item) + "/" + getHashVar(2) 
                        + "\">#" + escapeHtml(item) + "</a></div>");
            });
            list.append("</div>");
        } else {
            list.append("<div class='row'><div class='columns small-12 medium-12 large-12' id='list-col-1'></div></div>");
            $.each(json.items, function(i, item) {
                $("#list-col-1").append("<div class=\"wt-all-list-item\" data-list=\""
                        + escapeHtml(item) + "\"><a title=\"#" + escapeHtml(item) 
                        + "\" href=\"#/list/" + escapeHtml(item) + "/" + getHashVar(2) 
                        + "\">#" + escapeHtml(item) + "</a></div>");
            });
        }
        applyAllListClick();

        addStrikeHeader();
    });
}

var seedSideBar = function(secret) {
    $.getJSON("services/load-all/" + enc(secret), function(json) {
        var items = $.map(json.items, function(value, index) {
            return [value];
        });
        var sortedItems = $.map(json.items, function(value, index) {
            return [value];
        });
        sortedItems.sort(function(a, b) {
            return a.localeCompare(b);
        });
        // red, orange, yellow, green, blue, purple
        //var colors = [ "#e22d2d", "#e5ba1d", "#dde23b", "#21c621", "#3a82e0", "#a43ddb" ];
        var colors = [ "#960000", "#937d00", "#b7b100", "#108e00", "#00438c", "#590089" ];
        //var colors = [ "#606060" ];
        var split = Math.ceil(items.length / colors.length);
        $.each(sortedItems, function(i, item) {
            var c = 0;
            var style = "";
            // Disable
//            for (var j = 0; j < sortedItems.length; j += split) {
//                var jj = j / 10;
//                if (jj % split === 0) {
//                    c = 0;
//                }
//                var chunk = sortedItems.slice(j, j + split);
//                $.each(chunk, function(i, item2) {
//                    if (item2 === item) {
//                        style = " style = 'color:" + colors[c] + ";' ";
//                        console.log("Does '" + item2 + "' = '" + item + "'? " + style);
//                    }
//                });
//                c++;
//            }

            $(".sidebar-nav").append("<li class=\"wt-all-list-item-li\"><div class=\"wt-all-list-item\" data-list=\""
                    + escapeHtml(item) + "\"><a class=\"wt-all-list-item-a\" " + style + " title=\"#" + escapeHtml(item) 
                    + "\" href=\"#/list/" + escapeHtml(item) + "/" + enc(secret) 
                    + "\">#" + escapeHtml(item) + "</a></div></li>");
        });

        sortSideBar("list-name", "asc");
    });
    hideSideBar();
}

var sortSideBar = function(field, direction) {
    var items = $(".wt-all-list-item-li");
    if (field === "list-name") {
        if (direction === "asc") {
            items.sort(function (a, b) {
                var aa = $(a).find(".wt-all-list-item-a").text().replace(/^#/, "") || "";
                var bb = $(bb).find(".wt-all-list-item-a").text().replace(/^#/, "") || "";
                return aa.localeCompare(bb);
            });
        }
    }
}

var escapeDoubleQuotes = function(str) {
    if (undefined === str) {
        return str;
    }
    if (str === null) {
        return str;
    }
    return str.replace(/"/, "\\\"");
}

var buildPlaceholder = function(list) {
    return "Add to #" + list;
}

var setPlaceholder = function(list) {
    $("#wt-list-item-input-0").attr("placeholder", escapeDoubleQuotes(buildPlaceholder(list)));
}

var clearListBeforeLoading = function (sort) {
    // This if is because we don't need to re-order the left navbar
    // This remove() would remove all lists from the left navbar and not put them back.
    if (undefined !== sort && null !== sort) {
        $(".wt-all-list-item").remove();
    }
    $("#wt-list-item-0").show();
    $(".wt-list-item").remove();
};

var resetSortButtonActiveFirstLoad = function () {
    $(".sort-direction").removeClass("active");
    $(".sort-type").removeClass("active");
    $(".sort-asc").addClass("active");
    $(".sort-alpha").addClass("active");

    $(".sort-direction-2").removeClass("active");
    $(".sort-type-2").removeClass("active");
    $(".sort-asc-2").addClass("active");
    $(".sort-time-2").addClass("active");
}

var load = function(list) {
    resetSortButtonActiveFirstLoad();

    clearListBeforeLoading();

    $("title").text("#" + list);
    var loadKey = "list-" + list;
    // siam: localStorage turned off
    if (loadKey === "disabled" && localStorage.getItem(loadKey) != null) {
        var json = JSON.parse(localStorage.getItem(loadKey));
        addListItem(json.items);
        addStrikeHeader(true);
    } else {
        $.getJSON("services/load/" + enc(list) 
                + "/" + enc(getHashVar(3)), function(json) {
            if (localStorage.getItem(loadKey) == null) {
                localStorage.setItem(loadKey, JSON.stringify(json));
            }
            addListItem(json.items);

            addStrikeHeader(true);

            setPlaceholder(list);
        }).fail(function() {
            // siam: localStorage turned off
            if (loadKey === "disabled" && localStorage.getItem(loadKey) != null) {
                var json = JSON.parse(localStorage.getItem(loadKey));
                addListItem(json.items);
                addStrikeHeader(true);
            }
        });
    }
}

/**
 * The callback is expected to operate on a single list item.
 */
var loadItem = function (id, list, callback) {
    $.getJSON("services/load/" + enc(list) 
            + "/" + id + "/" + enc(getHashVar(3)), function(json) {
        if (json.items.length > 0) {
            // There should only be one item returned. We filter by the MongoId().
            callback(json.items[0]);
        } else {
            alert("Could not find list item " + id + " for list " + list);
        }
    }).fail(function() {
        alert("Could not load list item " + id + " for list " + list);
    });
}

var search = function (q) {
    $(".wt-list-item").remove();
    $.getJSON("services/search/" + enc(q) 
            + "/" + enc(getHashVar(3)), function(json) {
        addListItem(json.items);
    });
}

var addListItem = function (items) {
    var markon = new Markon(); 
    var previd = 0;
    $.each(items, function(i, item) {
        var id = item.id;
        var text = item.text;
        if (i === 0) {
            previd = 0;
        }
        var strike = item.strike ? "wt-strike" : "";
        var checked = item.strike ? "checked=\"checked\"" : "";
        $("#wt-list-item-" + previd).after("<div id=\"wt-list-item-" + id 
            + "\" class=\"wt-list-item\" data-id=\"" + id 
            + "\"><p class=\"wt-list-item-text\">" 
            + buildDoneCheckbox(id) + " " + buildStrikeCheckbox(id) + " <span id=\"wt-text-" 
            + id + "\" class=\"wt-text " + strike + "\" data-id=\"" + id 
            + "\">" + markon.render(escapeHtml(text)) + "</span> <span class=\"timestamp\">" 
            + item.timestamp + "</span></p></div>");
        applyEditItem(id);
        applyRemoveItem(id);
        applyStrikeItem(id);
        applyTooltip();
        previd = id;
    });
}

var sortByPriority = function() {
    "use strict";
}

var handleMessage = function(json) {
    "use strict";
    var jsonObj = JSON.parse(json);
    if (jsonObj.a === "message" && jsonObj.list === list) {
        if (jsonObj.actiontype === "strike") {
            var text = $("#wt-text-" + jsonObj.id);
            if (jsonObj.strike) {
                text.addClass("wt-strike");
            } else {
                text.removeClass("wt-strike");
            }
            $("#wt-list-item-chk-strike-" + jsonObj.id).prop("checked", jsonObj.strike);
        } else if (jsonObj.actiontype === "remove") {
            $("#wt-list-item-" + jsonObj.id).remove();
        } else if (jsonObj.actiontype === "add") {
            $("#wt-list-item-0").after("<div id=\"wt-list-item-" + jsonObj.id 
                + "\" class=\"wt-list-item\" data-id=\"" + jsonObj.id 
                + "\"><p class=\"wt-list-item-text\">" 
                + buildDoneCheckbox(jsonObj.id) + " " + buildStrikeCheckbox(jsonObj.id) 
                + " <span id=\"wt-text-" + jsonObj.id + "\" class=\"wt-text\" data-id=\"" + jsonObj.id 
                + "\">" + jsonObj.text + "</span></p></div>");
            applyEditItem(jsonObj.id);
            applyRemoveItem(jsonObj.id);
            applyStrikeItem(jsonObj.id);
            applySaveTextOfItem(jsonObj.id);
            applySaveOnEnter(jsonObj.id);
            applyTooltip();
        } else if (jsonObj.actiontype === "save") {
            $("#wt-list-item-" + jsonObj.id).html("<p class=\"wt-list-item-text\">" 
                + buildDoneCheckbox(jsonObj.id) + " " + buildStrikeCheckbox(jsonObj.id) 
                + " <span id=\"wt-text-" + jsonObj.id + "\" class=\"wt-text\" data-id=\"" + jsonObj.id 
                + "\">" + jsonObj.text + "</span></p>");
            applyEditItem(jsonObj.id);
            applyRemoveItem(jsonObj.id);
            applyStrikeItem(jsonObj.id);
            applySaveTextOfItem(jsonObj.id);
            applySaveOnEnter(jsonObj.id);
            applyTooltip();
        }
    }
}

// http://stackoverflow.com/a/901144/272159
var qs = function(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

var startConnection = function() {
    if (!useWebSockets) {
        return;
    }
    if (!connected) {
        conn = new WebSocket(webSocketUrl);

        conn.onopen = function(e) {
            connected = true;
            reConnecting = false;
        }

        conn.onclose = function(e) {
            connected = false;
            if (!reConnecting) {
                reConnect();
            }
        }

        conn.onerror = function(e) {
            connected = false;
            if (!reConnecting) {
                reConnect();
            }
        }

        conn.onmessage = function(e) {
            handleMessage(e.data);
        }
    }
}

var reConnect = function() {
    "use strict";
    reConnecting = true;
    if (!connected) {
        init();
        setTimeout(reConnect, 2000);
    }
}

var getListByOrder = function (direction, type, direction2, type2, list, secret, thiz) {
    if (thiz.hasClass("sort-direction")) {
        $(".sort-direction").removeClass("active");
        thiz.addClass("active");
    }
    if (thiz.hasClass("sort-type")) {
        $(".sort-type").removeClass("active");
        thiz.addClass("active");
    }
    if (thiz.hasClass("sort-direction-2")) {
        $(".sort-direction-2").removeClass("active");
        thiz.addClass("active");
    }
    if (thiz.hasClass("sort-type-2")) {
        $(".sort-type-2").removeClass("active");
        thiz.addClass("active");
    }

    clearListBeforeLoading();
    $.getJSON("services/sort/" + direction + "/type/" + enc(type) + "/sort/" + direction2 + "/type/" + enc(type2) + "/list/" + enc(list)
            + "/" + enc(secret), function (json) {
        addListItem(json.items);

        addStrikeHeader(true);

        setPlaceholder(list);
    }).fail(function() {
        if (localStorage.getItem(loadKey) != null) {
            var json = JSON.parse(localStorage.getItem(loadKey));
            addListItem(json.items);
            addStrikeHeader(true);
        }
    });
};

function Markon() {
}

Markon.prototype.render = function(str) {
    return this.mutate(str, [ this.code ]);
}

Markon.prototype.unRender = function(str) {
    return this.mutate(str, [ this.unCode ]);
}

Markon.prototype.mutate = function(str, mutators) {
    var html = str;
    for (m = 0; m < mutators.length; m++) {
        html = mutators[m](html);
    }
    return html;
}

Markon.prototype.code = function(str) {
    if (undefined === str || str === null || str.length === 0) {
        return str;
    }
    return str.replace(/`(.*?)`/g, "<code>$1</code>");
}

Markon.prototype.unCode = function(str) {
    if (undefined === str || str === null || str.length === 0) {
        return str;
    }
    return str.replace(/<code>(.*?)<\/code>/g, "`$1`");
}

$(document).ready(function(){

    init();

    $(window).on("hashchange", function() { 
        init();
    });

    $(".wt-list-item-input:first").focus();

    applySaveTextOfItem(0);
    applySaveOnEnter(0);

    hideSideBar();

    $(".search-button").on("click", function () {
        search($("#q").val());
    });

    $("#q").keypress(function (e) {
        var thiz = $(this);
        if (e.which === 13 || e.which === 27) {
            search($("#q").val());
        }
    });

    $(".sort-box.sort-asc").on("click", function () {
        direction = 1;
        getListByOrder(direction, type, direction2, type2, list, getHashVar(3), $(this));
    });
    $(".sort-box.sort-alpha").on("click", function () {
        type = "text";
        getListByOrder(direction, type, direction2, type2, list, getHashVar(3), $(this));
    });
    $(".sort-box.sort-label").on("click", function () {
        type = "labels";
        getListByOrder(direction, type, direction2, type2, list, getHashVar(3), $(this));
    });
    $(".sort-box.sort-priority").on("click", function () {
        type = "priority";
        getListByOrder(direction, type, direction2, type2, list, getHashVar(3), $(this));
    });
    $(".sort-box.sort-time").on("click", function () {
        type = "timestamp";
        getListByOrder(direction, type, direction2, type2, list, getHashVar(3), $(this));
    });
    $(".sort-box.sort-desc").on("click", function () {
        direction = -1;
        getListByOrder(direction, type, direction2, type2, list, getHashVar(3), $(this));
    });

    $(".sort-box.sort-asc-2").on("click", function () {
        direction2 = 1;
        getListByOrder(direction, type, direction2, type2, list, getHashVar(3), $(this));
    });
    $(".sort-box.sort-alpha-2").on("click", function () {
        type2 = "text";
        getListByOrder(direction, type, direction2, type2, list, getHashVar(3), $(this));
    });
    $(".sort-box.sort-label-2").on("click", function () {
        type2 = "labels";
        getListByOrder(direction, type, direction2, type2, list, getHashVar(3), $(this));
    });
    $(".sort-box.sort-priority-2").on("click", function () {
        type2 = "priority";
        getListByOrder(direction, type, direction2, type2, list, getHashVar(3), $(this));
    });
    $(".sort-box.sort-time-2").on("click", function () {
        type2 = "timestamp";
        getListByOrder(direction, type, direction2, type2, list, getHashVar(3), $(this));
    });
    $(".sort-box.sort-desc-2").on("click", function () {
        direction2 = -1;
        getListByOrder(direction, type, direction2, type2, list, getHashVar(3), $(this));
    });

});
