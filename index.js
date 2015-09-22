var pull = require('pull-stream');
var pushable = require('pull-pushable');

module.exports = function(el, id, tagStream, createSuggestionStream, opts) {
    opts = opts || {};
    var updateStream = pushable();
    var tags = {};

    var makeTagElement = opts.makeTagElement || function(tagName, forSuggestionBox) {
        return "<span>" + tagName + "</span>";
    };

    pull(
        tagStream,
        pull.filter(function(o) {
            o.type = o.type || 'put';
            if (o.type === 'put')
                return typeof tags[o.key] === 'undefined';
            return true;
        }),
        pull.through(function(o) {
            console.log(o);
            if (o.type === 'put') {
                tags[o.key] = o.value;
                var html = '<li name="'+ o.key +'">' + makeTagElement(o.value) + "</li>";
                el.insertAdjacentHTML('beforeend', html);
            } else {
                // TODO: html-sanitize the key!
                var item = el.querySelector('li[name=' + o.key+']');
                el.removeChild(item);
                delete tags[o.key];
            }
        }),
        pull.drain()
    );

    function sanitize(name) {
        return encodeURIComponent(name).replace('!','%'+("!".charCodeAt(0).toString(16)));
    }

    updateStream.addTag = function(tagName) {
        updateStream.push({
            type: 'put',
            key: sanitize(tagName),
            value: tagName
        });
    };

    return updateStream;
};

