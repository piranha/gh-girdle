// ==UserScript==
// @name           gh-girdle
// @namespace      gh-girdle
// @include        https://github.com/
// @require        http://underscorejs.org/underscore-min.js
// @require        http://zeptojs.com/zepto.min.js
// ==/UserScript==

function gh_news() {
    var containers = {};

    var render_template = function(tmpl, ctx) {
        // A custom, ghetto template function is required since firefox doesn't
        // like eval (which is what _.template uses) in context of greasemonkey
        // scripts
        return tmpl.replace(/<%-\s*(\w+)\s*%>/g, function(m, p1) {
            return ctx[p1];
        });
    };

    var repo_template = '' +
        '<div class="alert" style="padding-left: 0px;" data-girdled="<%- name %>">' +
            '<div class="body">' +
                '<div class="title" style="padding-left: 5px;">' +
                    '<a href="<%- name %>"><%- name %></a> ' +
                    '<span data-length="<%- name %>"></span>' +
                    '<a data-expander="<%- name %>" class="button" style="float: right;">expand</a>' +
                '</div>' +
                '<div data-compressed="<%- name %>" style="padding-left: 5px; margin-top: 5px;">' +
                '</div>' +
                '<div data-original="<%- name %>" style="clear: left; display: none; margin-top: 20px;">' +
                    '<div data-dropzone="<%- name %>"></div>' +
                '</div>' +
            '</div>' +
        '</div>';

    var icon_template = '<span class="octicon <%- icon %>" style="margin-right: 5px;" title="<%- title %>"></span>';

    function extract_repo($el) {
      var name = $el.text();
      if (name.indexOf('/') === -1) {
        name = $el.attr('href');
        if (name[0] === '/') {
          name = name.substring(1);
        }
      }
      var repo = _.first(name.split(/@|#/));
      return repo;
    }

    function engirdle(root) {
        var compressed = {};
        var $root = $(root);
        var $pagination = $root.find('.pagination');
        var this_user = $.trim($('.name', '#user-links').text());

        $('.alert', $root).each(function(i, e) {
            var $e = $(e);
            if ($e.attr("data-girdled")) {
                return;
            }
            var alert_classes = $e.attr('class').split(' ');
            var alert_type = _.first(_.reject(alert_classes, function(v){
                return !v || v === 'simple' || v === 'alert';
            }));

            var links = $('.title a', $e);
            var $key = $e.hasClass('fork') ? links.slice(1, 2) : links.last();
            var repo = extract_repo($key);

            if (_.isUndefined(compressed[repo])) {
                compressed[repo] = [];
            }
            compressed[repo].push($e.attr('data-girdled', repo).remove());
        });

        _.each(compressed, function(actions, repo) {
            var $html;

            if (_.isUndefined(containers[repo])) {
                $html = $(render_template(repo_template, {name:repo}));
                $html.insertBefore($pagination);

                containers[repo] = $html;

                var $expander = $('[data-expander]', $html);
                var $original = $('[data-original]', $html);

                $expander.click(function() {
                    var t = $expander.text();
                    if (t == 'expand') {
                        $compressed.hide();
                        $original.show();
                        $expander.text('compress');
                    } else {
                        $compressed.show();
                        $original.hide();
                        $expander.text('expand');
                    }
                });
            } else {
                $html = containers[repo];
            }

            var $dropzone = $("[data-dropzone='"+repo+"']", $html);
            var $compressed = $("[data-compressed='"+repo+"']", $html);
            _.each(actions, function(e) {
                $dropzone.append(e);
                var octicons = $('.octicon, .mega-octicon', e)
                    .attr('class')
                    .split(' ');
                var icon_type = _.first(_.reject(octicons, function(v){
                    return !v || v === 'octicon' || v === 'mega-octicon';
                }));
                var title = $.trim($('.title', e).text());
                var ctx = {icon: icon_type, title: title};
                $compressed.append($(render_template(icon_template, ctx)));
            });

            var l = $('.alert', $dropzone).length;
            var t = (l == 1) ? "had 1 event" : "had " + l + " events";
            $('[data-length]', $html).text(t);
        });
    }

    var run = function() {
      $(".news").each(function(i, e) {
        engirdle(e);
      });
    };

    run();

    window.addEventListener("message", function(event) {
        if ((event.source == window) &&
            (event.data.type == "GH_GIRDLE")) {
            run();
        }
    }, false);
}

function binder() {
    //Intercept the pageUpdate function and have it call engirdle
    var pageUpdate = $.fn.pageUpdate;
    $.fn.pageUpdate = function (a) {
        pageUpdate.call(this, a);
        window.postMessage({type: "GH_GIRDLE", text: "#YOLO"}, "*");
    };
}

function inject(func) {
    var text, el;

    el = document.createElement("script");
    el.setAttribute("type", "text/javascript");
    el.innerHTML = '(' + func + ')()';

    return document.body.appendChild(el);
}

gh_news();
inject(binder);
